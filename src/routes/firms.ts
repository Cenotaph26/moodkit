// src/routes/firms.ts
import { Router, Response } from 'express'
import { z } from 'zod'
import { db } from '../lib/db'
import { cacheGet, cacheSet, cacheDelete, cacheDeletePattern } from '../lib/redis'
import { requireAuth, requireRole, requireFirmAccess, AuthRequest } from '../middleware/auth'

const router = Router()

const FirmSchema = z.object({
  name: z.string().min(1, 'Firma adı gerekli'),
  sector: z.string().optional(),
  color: z.string().optional(),
  contact: z.string().optional(),
})

// GET /api/firms - tüm firmalar (admin: hepsi, diğerleri: üyesi olduğu)
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cacheKey = `firms:${req.user!.id}`
    const cached = await cacheGet(cacheKey)
    if (cached) return res.json(cached)

    const firms = req.user!.role === 'ADMIN'
      ? await db.firm.findMany({
          include: {
            members: { include: { user: { select: { id: true, name: true, role: true, prodRole: true } } } },
            briefs: { orderBy: { createdAt: 'desc' }, take: 1 }
          },
          orderBy: { createdAt: 'desc' }
        })
      : await db.firm.findMany({
          where: { members: { some: { userId: req.user!.id } } },
          include: {
            members: { include: { user: { select: { id: true, name: true, role: true, prodRole: true } } } },
            briefs: { orderBy: { createdAt: 'desc' }, take: 1 }
          },
          orderBy: { createdAt: 'desc' }
        })

    await cacheSet(cacheKey, firms, 120)
    res.json(firms)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Firmalar alınamadı' })
  }
})

// GET /api/firms/:firmId
router.get('/:firmId', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const cacheKey = `firm:${req.params.firmId}`
    const cached = await cacheGet(cacheKey)
    if (cached) return res.json(cached)

    const firm = await db.firm.findUnique({
      where: { id: req.params.firmId },
      include: {
        members: { include: { user: { select: { id: true, name: true, role: true, prodRole: true, title: true } } } },
        briefs: { orderBy: { year: 'desc' } }
      }
    })
    if (!firm) return res.status(404).json({ error: 'Firma bulunamadı' })

    await cacheSet(cacheKey, firm)
    res.json(firm)
  } catch (err) {
    res.status(500).json({ error: 'Firma alınamadı' })
  }
})

// POST /api/firms - yeni firma (admin only)
router.post('/', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = FirmSchema.parse(req.body)
    const firm = await db.firm.create({
      data: {
        ...data,
        members: {
          create: { userId: req.user!.id } // Admin otomatik üye
        }
      },
      include: { members: true }
    })

    await cacheDeletePattern('firms:*')
    res.status(201).json(firm)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Firma oluşturulamadı' })
  }
})

// PUT /api/firms/:firmId
router.put('/:firmId', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = FirmSchema.partial().parse(req.body)
    const firm = await db.firm.update({
      where: { id: req.params.firmId },
      data
    })
    await cacheDelete(`firm:${req.params.firmId}`)
    await cacheDeletePattern('firms:*')
    res.json(firm)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Firma güncellenemedi' })
  }
})

// DELETE /api/firms/:firmId
router.delete('/:firmId', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    await db.firm.delete({ where: { id: req.params.firmId } })
    await cacheDelete(`firm:${req.params.firmId}`)
    await cacheDeletePattern('firms:*')
    res.json({ message: 'Firma silindi' })
  } catch (err) {
    res.status(500).json({ error: 'Firma silinemedi' })
  }
})

// POST /api/firms/:firmId/members - üye ekle
router.post('/:firmId/members', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = z.object({ userId: z.string() }).parse(req.body)
    const member = await db.firmMember.create({
      data: { firmId: req.params.firmId, userId },
      include: { user: { select: { id: true, name: true, role: true } } }
    })
    await cacheDelete(`firm:${req.params.firmId}`)
    await cacheDeletePattern('firms:*')
    res.status(201).json(member)
  } catch (err) {
    res.status(500).json({ error: 'Üye eklenemedi' })
  }
})

// DELETE /api/firms/:firmId/members/:userId
router.delete('/:firmId/members/:userId', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    await db.firmMember.delete({
      where: { firmId_userId: { firmId: req.params.firmId, userId: req.params.userId } }
    })
    await cacheDelete(`firm:${req.params.firmId}`)
    res.json({ message: 'Üye çıkarıldı' })
  } catch (err) {
    res.status(500).json({ error: 'Üye çıkarılamadı' })
  }
})

export default router
