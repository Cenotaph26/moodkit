// src/routes/ig.ts
import { Router, Response } from 'express'
import { z } from 'zod'
import { db } from '../lib/db'
import { cacheDelete } from '../lib/redis'
import { requireAuth, requireFirmAccess, AuthRequest } from '../middleware/auth'

const router = Router({ mergeParams: true })

const CellSchema = z.object({
  type: z.enum(['POST', 'REELS', 'CAROUSEL']).optional(),
  mediaUrl: z.string().optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  caption: z.string().optional(),
  hashtags: z.string().optional(),
  publishDate: z.string().optional(),
  approved: z.boolean().optional().nullable(),
  slides: z.array(z.string()).optional(),
})

// GET /ig
router.get('/', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const cells = await db.iGCell.findMany({
      where: { briefId: req.params.briefId },
      orderBy: { cellIndex: 'asc' }
    })
    res.json(cells)
  } catch (err) {
    res.status(500).json({ error: 'IG Grid alınamadı' })
  }
})

// POST /ig — yeni hücre ekle
router.post('/', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const data = CellSchema.parse(req.body)
    const last = await db.iGCell.findFirst({
      where: { briefId: req.params.briefId },
      orderBy: { cellIndex: 'desc' }
    })
    const cellIndex = (last?.cellIndex ?? -1) + 1
    const cell = await db.iGCell.create({
      data: { briefId: req.params.briefId, cellIndex, ...data }
    })
    await cacheDelete(`brief:${req.params.briefId}`)
    res.status(201).json(cell)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Hücre eklenemedi' })
  }
})

// PUT /ig/:cellId — hücre güncelle (ID ile)
router.put('/:cellId', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    // cellId sayısal gelirse eski index-based uyumluluk için upsert
    const isIndex = /^\d+$/.test(req.params.cellId)
    const data = CellSchema.parse(req.body)

    if (isIndex) {
      const cellIndex = parseInt(req.params.cellId)
      const cell = await db.iGCell.upsert({
        where: { briefId_cellIndex: { briefId: req.params.briefId, cellIndex } },
        create: { briefId: req.params.briefId, cellIndex, ...data },
        update: data
      })
      await cacheDelete(`brief:${req.params.briefId}`)
      return res.json(cell)
    }

    const cell = await db.iGCell.update({
      where: { id: req.params.cellId },
      data
    })
    await cacheDelete(`brief:${req.params.briefId}`)
    res.json(cell)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'IG hücresi güncellenemedi' })
  }
})

// DELETE /ig/:cellId — sil, sonraki hücrelerin indexini azalt
router.delete('/:cellId', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const cell = await db.iGCell.findUnique({ where: { id: req.params.cellId } })
    if (!cell) return res.status(404).json({ error: 'Hücre bulunamadı' })

    await db.iGCell.delete({ where: { id: req.params.cellId } })

    // Sonraki hücrelerin cellIndex'ini 1 azalt
    await db.iGCell.updateMany({
      where: { briefId: req.params.briefId, cellIndex: { gt: cell.cellIndex } },
      data: { cellIndex: { decrement: 1 } }
    })

    await cacheDelete(`brief:${req.params.briefId}`)
    res.json({ message: 'Hücre silindi' })
  } catch (err) {
    res.status(500).json({ error: 'Hücre silinemedi' })
  }
})

// POST /ig/reorder — sürükle-bırak sıralama (ID array ile)
router.post('/reorder', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { order } = z.object({ order: z.array(z.string()) }).parse(req.body)

    await db.$transaction(
      order.map((id, newIndex) =>
        db.iGCell.update({ where: { id }, data: { cellIndex: newIndex } })
      )
    )

    await cacheDelete(`brief:${req.params.briefId}`)
    res.json({ message: 'Sıralama güncellendi' })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Sıralama güncellenemedi' })
  }
})

// POST /ig/approve-all
router.post('/approve-all', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    await db.iGCell.updateMany({
      where: { briefId: req.params.briefId },
      data: { approved: true }
    })
    await cacheDelete(`brief:${req.params.briefId}`)
    res.json({ message: 'Tümü onaylandı' })
  } catch (err) {
    res.status(500).json({ error: 'Onay başarısız' })
  }
})

// PATCH /ig/bulk-approve — toplu onayla / reddet
router.patch('/bulk-approve', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { ids, approved } = req.body as { ids: string[]; approved: boolean }
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ error: 'ids zorunlu' })
    }
    await db.iGCell.updateMany({
      where: { id: { in: ids }, briefId: req.params.briefId },
      data: { approved },
    })
    await cacheDelete(`brief:${req.params.briefId}`)
    res.json({ updated: ids.length })
  } catch (err) {
    res.status(500).json({ error: 'Toplu onay başarısız' })
  }
})

export default router
