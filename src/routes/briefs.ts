// src/routes/briefs.ts
import { Router, Response } from 'express'
import { z } from 'zod'
import { db } from '../lib/db'
import { cacheGet, cacheSet, cacheDelete, pushNotification } from '../lib/redis'
import { requireAuth, requireFirmAccess, requireRole, AuthRequest } from '../middleware/auth'
import { logActivity } from '../lib/activity'

const router = Router({ mergeParams: true }) // firmId params'tan geliyor

const BriefSchema = z.object({
  month: z.string(),
  year: z.number().int().min(2024),
  stage: z.enum(['BRIEF', 'MB_IG', 'MB_KAMP', 'TASKS', 'YAYIN']).optional(),
  products: z.string().optional(),
  newProduct: z.boolean().optional(),
  newProductDesc: z.string().optional(),
  featured: z.string().optional(),
  tone: z.string().optional(),
  colorDir: z.string().optional(),
  avoid: z.string().optional(),
  refs: z.string().optional(),
  hasAd: z.boolean().optional(),
  budget: z.string().optional(),
  platforms: z.array(z.string()).optional(),
  targetAudience: z.string().optional(),
  adAreas: z.string().optional(),
  specialDay: z.string().optional(),
  specialContent: z.string().optional(),
  notes: z.string().optional(),
})

// GET /api/firms/:firmId/briefs
router.get('/', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const cacheKey = `briefs:${req.params.firmId}`
    const cached = await cacheGet(cacheKey)
    if (cached) return res.json(cached)

    const briefs = await db.brief.findMany({
      where: { firmId: req.params.firmId },
      include: {
        moodboardCards: {
          include: { versions: { orderBy: { vNum: 'desc' }, take: 1 } },
          orderBy: { order: 'asc' }
        },
        tasks: { orderBy: { order: 'asc' } },
        igCells: { orderBy: { cellIndex: 'asc' } }
      },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }]
    })

    await cacheSet(cacheKey, briefs, 60)
    res.json(briefs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Briefler alınamadı' })
  }
})

// GET /api/firms/:firmId/briefs/:briefId
router.get('/:briefId', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const cacheKey = `brief:${req.params.briefId}`
    const cached = await cacheGet(cacheKey)
    if (cached) return res.json(cached)

    const brief = await db.brief.findFirst({
      where: { id: req.params.briefId, firmId: req.params.firmId },
      include: {
        moodboardCards: {
          include: { versions: { orderBy: { vNum: 'asc' } } },
          orderBy: { order: 'asc' }
        },
        tasks: {
          include: { assignee: { select: { id: true, name: true, prodRole: true } } },
          orderBy: { order: 'asc' }
        },
        igCells: { orderBy: { cellIndex: 'asc' } }
      }
    })

    if (!brief) return res.status(404).json({ error: 'Brief bulunamadı' })

    await cacheSet(cacheKey, brief)
    res.json(brief)
  } catch (err) {
    res.status(500).json({ error: 'Brief alınamadı' })
  }
})

// POST /api/firms/:firmId/briefs
router.post('/', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const data = BriefSchema.parse(req.body)

    // Aynı ay/yıl için zaten brief var mı?
    const existing = await db.brief.findFirst({
      where: { firmId: req.params.firmId, month: data.month, year: data.year }
    })
    if (existing) return res.status(400).json({ error: 'Bu dönem için zaten brief var' })

    const brief = await db.brief.create({
      data: { ...data, firmId: req.params.firmId },
      include: { moodboardCards: true, tasks: true, igCells: true }
    })

    // 9 boş IG hücresi oluştur
    await db.iGCell.createMany({
      data: Array.from({ length: 9 }, (_, i) => ({
        briefId: brief.id,
        cellIndex: i
      }))
    })

    await cacheDelete(`briefs:${req.params.firmId}`)
    res.status(201).json(brief)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message })
    console.error(err)
    res.status(500).json({ error: 'Brief oluşturulamadı' })
  }
})

// PUT /api/firms/:firmId/briefs/:briefId
router.put('/:briefId', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const data = BriefSchema.partial().parse(req.body)
    const brief = await db.brief.update({
      where: { id: req.params.briefId },
      data
    })

    await cacheDelete(`brief:${req.params.briefId}`)
    await cacheDelete(`briefs:${req.params.firmId}`)

    // Eğer stage değiştiyse bildirim gönder + aktivite logla
    if (data.stage) {
      const firm = await db.firm.findUnique({ where: { id: req.params.firmId }, include: { members: true } })
      if (firm) {
        const stageLabels: Record<string, string> = {
          MB_IG: 'IG Moodboard', MB_KAMP: 'Kampanya MB',
          TASKS: 'Görevler', YAYIN: 'Yayın'
        }
        for (const member of firm.members) {
          await pushNotification({
            userId: member.userId,
            briefId: req.params.briefId,
            title: `${brief.month} ${brief.year} → ${stageLabels[data.stage] || data.stage}`,
            sub: firm.name + ' · Az önce'
          })
        }
        await logActivity({
          userId: req.user!.id, firmId: req.params.firmId, briefId: req.params.briefId,
          action: 'brief.stage_changed', entity: 'Brief', entityId: brief.id,
          meta: { to: data.stage, month: brief.month, year: brief.year }
        })
      }
    }

    res.json(brief)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Brief güncellenemedi' })
  }
})

// DELETE /api/firms/:firmId/briefs/:briefId
router.delete('/:briefId', requireAuth, requireRole('ADMIN', 'EDITOR'), async (req: AuthRequest, res: Response) => {
  try {
    // Kaç brief var kontrol et
    const count = await db.brief.count({ where: { firmId: req.params.firmId } })
    if (count <= 1) return res.status(400).json({ error: 'En az 1 brief olmalı' })

    await db.brief.delete({ where: { id: req.params.briefId } })
    await cacheDelete(`brief:${req.params.briefId}`)
    await cacheDelete(`briefs:${req.params.firmId}`)
    res.json({ message: 'Brief silindi' })
  } catch (err) {
    res.status(500).json({ error: 'Brief silinemedi' })
  }
})

// GET /api/firms/:firmId/briefs/:briefId/activity
router.get('/:briefId/activity', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '50')), 100)
    const logs = await db.activityLog.findMany({
      where: { briefId: req.params.briefId },
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
    res.json(logs)
  } catch (err) {
    res.status(500).json({ error: 'Aktivite alınamadı' })
  }
})

// GET /api/firms/:firmId/briefs/:briefId/budget
router.get('/:briefId/budget', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const [brief, items] = await Promise.all([
      db.brief.findFirst({ where: { id: req.params.briefId }, select: { budgetTotal: true, budgetCurrency: true } }),
      db.budgetItem.findMany({ where: { briefId: req.params.briefId }, orderBy: { createdAt: 'asc' } })
    ])
    res.json({ budgetTotal: brief?.budgetTotal, budgetCurrency: brief?.budgetCurrency || 'TRY', items })
  } catch (err) {
    res.status(500).json({ error: 'Bütçe alınamadı' })
  }
})

// PUT /api/firms/:firmId/briefs/:briefId/budget
router.put('/:briefId/budget', requireAuth, requireRole('ADMIN', 'EDITOR'), async (req: AuthRequest, res: Response) => {
  try {
    const { budgetTotal, budgetCurrency } = z.object({
      budgetTotal: z.number().optional(),
      budgetCurrency: z.string().optional()
    }).parse(req.body)
    await db.brief.update({ where: { id: req.params.briefId }, data: { budgetTotal, budgetCurrency } })
    await cacheDelete(`brief:${req.params.briefId}`)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Bütçe güncellenemedi' })
  }
})

const BudgetItemSchema = z.object({
  label: z.string().min(1),
  amount: z.number().min(0),
  category: z.string(),
  note: z.string().optional(),
  paidAt: z.string().optional(),
})

// POST /api/firms/:firmId/briefs/:briefId/budget/items
router.post('/:briefId/budget/items', requireAuth, requireRole('ADMIN', 'EDITOR'), async (req: AuthRequest, res: Response) => {
  try {
    const data = BudgetItemSchema.parse(req.body)
    const item = await db.budgetItem.create({
      data: { ...data, briefId: req.params.briefId, paidAt: data.paidAt ? new Date(data.paidAt) : null }
    })
    await cacheDelete(`brief:${req.params.briefId}`)
    res.status(201).json(item)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Kalem eklenemedi' })
  }
})

// DELETE /api/firms/:firmId/briefs/:briefId/budget/items/:itemId
router.delete('/:briefId/budget/items/:itemId', requireAuth, requireRole('ADMIN', 'EDITOR'), async (req: AuthRequest, res: Response) => {
  try {
    await db.budgetItem.delete({ where: { id: req.params.itemId } })
    await cacheDelete(`brief:${req.params.briefId}`)
    res.json({ message: 'Kalem silindi' })
  } catch (err) {
    res.status(500).json({ error: 'Kalem silinemedi' })
  }
})

export default router
