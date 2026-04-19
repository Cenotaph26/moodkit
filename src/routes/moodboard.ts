// src/routes/moodboard.ts
import { Router, Response } from 'express'
import { z } from 'zod'
import { db } from '../lib/db'
import { cacheDelete, pushNotification } from '../lib/redis'
import { requireAuth, requireFirmAccess, AuthRequest } from '../middleware/auth'
import { logActivity } from '../lib/activity'

const router = Router({ mergeParams: true })

const CardSchema = z.object({
  which: z.enum(['IG', 'KAMP']),
  type: z.string().min(1),
  label: z.string().min(1),
  status: z.enum(['PENDING', 'REVIEW', 'APPROVED', 'REJECTED']).optional(),
  order: z.number().optional(),
  taskType: z.string().optional(),
  taskDesc: z.string().optional(),
  taskFormat: z.string().optional(),
  taskDeadline: z.string().optional(),
  taskAssigneeId: z.string().optional(),
  taskIGCell: z.number().min(0).max(8).optional(),
})

const VersionSchema = z.object({
  note: z.string().min(1),
  desc: z.string().optional(),
  mediaUrl: z.string().optional(),
  videoUrl: z.string().optional(),
})

// GET /api/firms/:firmId/briefs/:briefId/cards
router.get('/', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { which } = req.query
    const cards = await db.moodboardCard.findMany({
      where: {
        briefId: req.params.briefId,
        ...(which ? { which: which as 'IG' | 'KAMP' } : {})
      },
      include: { versions: { orderBy: { vNum: 'asc' } } },
      orderBy: { order: 'asc' }
    })
    res.json(cards)
  } catch (err) {
    res.status(500).json({ error: 'Kartlar alınamadı' })
  }
})

// POST /api/firms/:firmId/briefs/:briefId/cards
router.post('/', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const data = CardSchema.parse(req.body)
    const { desc, mediaUrl, videoUrl } = req.body

    // Sıra numarası
    const last = await db.moodboardCard.findFirst({
      where: { briefId: req.params.briefId, which: data.which },
      orderBy: { order: 'desc' }
    })

    const card = await db.moodboardCard.create({
      data: {
        ...data,
        briefId: req.params.briefId,
        order: (last?.order ?? -1) + 1,
        versions: {
          create: {
            vNum: 1,
            note: 'İlk taslak',
            desc: desc || '',
            mediaUrl: mediaUrl || null,
            videoUrl: videoUrl || null,
            createdBy: req.user!.name
          }
        }
      },
      include: { versions: true }
    })

    // Otomatik aşama geçişi
    await autoAdvanceStageOnCardAdd(req.params.briefId, req.params.firmId, data.which)

    await cacheDelete(`brief:${req.params.briefId}`)
    res.status(201).json(card)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message })
    console.error(err)
    res.status(500).json({ error: 'Kart oluşturulamadı' })
  }
})

// PUT /api/firms/:firmId/briefs/:briefId/cards/:cardId
router.put('/:cardId', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const data = CardSchema.partial().parse(req.body)
    const prevCard = await db.moodboardCard.findUnique({ where: { id: req.params.cardId } })

    const card = await db.moodboardCard.update({
      where: { id: req.params.cardId },
      data,
      include: { versions: { orderBy: { vNum: 'asc' } } }
    })

    // Onay durumu değiştiyse görev oluştur + bildirim gönder
    if (data.status === 'APPROVED' && prevCard?.status !== 'APPROVED') {
      await handleApproval(card, req.params.briefId, req.user!.id)
      await logActivity({
        userId: req.user!.id, firmId: req.params.firmId, briefId: req.params.briefId,
        action: 'card.approved', entity: 'MoodboardCard', entityId: card.id,
        meta: { label: card.label, from: prevCard?.status }
      })
    } else if (data.status === 'REJECTED' && prevCard?.status !== 'REJECTED') {
      await logActivity({
        userId: req.user!.id, firmId: req.params.firmId, briefId: req.params.briefId,
        action: 'card.rejected', entity: 'MoodboardCard', entityId: card.id,
        meta: { label: card.label }
      })
    }

    await cacheDelete(`brief:${req.params.briefId}`)
    res.json(card)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Kart güncellenemedi' })
  }
})

// DELETE /api/firms/:firmId/briefs/:briefId/cards/:cardId
router.delete('/:cardId', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    await db.moodboardCard.delete({ where: { id: req.params.cardId } })
    await cacheDelete(`brief:${req.params.briefId}`)
    res.json({ message: 'Kart silindi' })
  } catch (err) {
    res.status(500).json({ error: 'Kart silinemedi' })
  }
})

// POST /api/firms/:firmId/briefs/:briefId/cards/:cardId/versions
router.post('/:cardId/versions', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const data = VersionSchema.parse(req.body)

    const card = await db.moodboardCard.findUnique({
      where: { id: req.params.cardId },
      include: { versions: true }
    })
    if (!card) return res.status(404).json({ error: 'Kart bulunamadı' })

    const newVNum = card.versions.length + 1

    const [version] = await db.$transaction([
      db.cardVersion.create({
        data: {
          cardId: req.params.cardId,
          vNum: newVNum,
          ...data,
          createdBy: req.user!.name
        }
      }),
      // Yeni versiyon eklenince incelemeye al
      db.moodboardCard.update({
        where: { id: req.params.cardId },
        data: { status: 'REVIEW' }
      })
    ])

    // Bildirim gönder
    const brief = await db.brief.findUnique({
      where: { id: req.params.briefId },
      include: { firm: { include: { members: true } } }
    })
    if (brief) {
      for (const member of brief.firm.members) {
        await pushNotification({
          userId: member.userId,
          briefId: req.params.briefId,
          title: `v${newVNum} yüklendi: ${card.label}`,
          sub: brief.firm.name + ' · Az önce'
        })
      }
    }

    await cacheDelete(`brief:${req.params.briefId}`)
    res.status(201).json(version)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Versiyon eklenemedi' })
  }
})

// ── Otomatik aşama geçiş: ilk IG/KAMP kartı eklenince ────
async function autoAdvanceStageOnCardAdd(briefId: string, firmId: string, which: 'IG' | 'KAMP') {
  const brief = await db.brief.findUnique({ where: { id: briefId } })
  if (!brief) return

  let nextStage: 'MB_IG' | 'MB_KAMP' | null = null
  if (which === 'IG' && brief.stage === 'BRIEF') nextStage = 'MB_IG'
  else if (which === 'KAMP' && brief.stage === 'MB_IG') nextStage = 'MB_KAMP'

  if (!nextStage) return

  await db.brief.update({ where: { id: briefId }, data: { stage: nextStage } })
  await cacheDelete(`briefs:${firmId}`)

  const firm = await db.firm.findUnique({ where: { id: firmId }, include: { members: true } })
  if (!firm) return
  const stageLabels: Record<string, string> = { MB_IG: 'IG Moodboard', MB_KAMP: 'Kampanya MB' }
  for (const member of firm.members) {
    await pushNotification({
      userId: member.userId, briefId,
      title: `${brief.month} ${brief.year} → ${stageLabels[nextStage]}`,
      sub: firm.name + ' · Az önce'
    })
  }
}

// ── Onay handler ──────────────────────────────────────────
async function handleApproval(card: any, briefId: string, approverId: string) {
  const tasks = []

  // IG grid'e kopyala
  if (card.which === 'IG' && card.taskIGCell !== null && card.taskIGCell !== undefined) {
    const latestVersion = card.versions?.[card.versions.length - 1]
    await db.iGCell.upsert({
      where: { briefId_cellIndex: { briefId, cellIndex: card.taskIGCell } },
      create: {
        briefId,
        cellIndex: card.taskIGCell,
        type: card.taskType === 'Video' ? 'REELS' : 'POST',
        mediaUrl: latestVersion?.mediaUrl || null,
        videoUrl: latestVersion?.videoUrl || null,
        caption: card.label,
      },
      update: {
        mediaUrl: latestVersion?.mediaUrl || undefined,
        videoUrl: latestVersion?.videoUrl || undefined,
        type: card.taskType === 'Video' ? 'REELS' : 'POST',
      }
    })
  }

  // Kanban'a görev ekle (eğer yoksa)
  if (card.taskType && card.taskDesc) {
    const existing = await db.task.findFirst({
      where: { briefId, cardRef: card.label }
    })
    if (!existing) {
      const last = await db.task.findFirst({ where: { briefId }, orderBy: { order: 'desc' } })
      await db.task.create({
        data: {
          briefId,
          cardId: card.id,
          cardRef: card.label,
          type: card.taskType,
          desc: card.taskDesc,
          format: card.taskFormat || null,
          source: card.which === 'IG' ? 'IG Moodboard' : 'Kampanya MB',
          assigneeId: card.taskAssigneeId || null,
          deadline: card.taskDeadline || null,
          status: 'TODO',
          order: (last?.order ?? -1) + 1,
          createdById: approverId
        }
      })
    }
  }

  // Bildirim + otomatik TASKS geçişi
  const brief = await db.brief.findUnique({
    where: { id: briefId },
    include: { firm: { include: { members: true } }, moodboardCards: true }
  })
  if (brief) {
    for (const member of brief.firm.members) {
      await pushNotification({
        userId: member.userId,
        briefId,
        title: `${card.label} onaylandı`,
        sub: brief.firm.name + ' · Az önce'
      })
    }

    // %80 kart onaylandıysa → TASKS aşamasına geç
    if (brief.stage === 'MB_IG' || brief.stage === 'MB_KAMP') {
      const total = brief.moodboardCards.length
      const approved = brief.moodboardCards.filter(c => c.status === 'APPROVED').length
      if (total > 0 && approved / total >= 0.8) {
        await db.brief.update({ where: { id: briefId }, data: { stage: 'TASKS' } })
        await cacheDelete(`briefs:${brief.firmId}`)
        for (const member of brief.firm.members) {
          await pushNotification({
            userId: member.userId, briefId,
            title: `${brief.month} ${brief.year} → Görevler`,
            sub: brief.firm.name + ' · Kartların %80\'i onaylandı'
          })
        }
      }
    }
  }
}

export default router
