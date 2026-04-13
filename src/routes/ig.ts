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

// GET /api/firms/:firmId/briefs/:briefId/ig
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

// PUT /api/firms/:firmId/briefs/:briefId/ig/:cellIndex
router.put('/:cellIndex', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const cellIndex = parseInt(req.params.cellIndex)
    if (isNaN(cellIndex) || cellIndex < 0 || cellIndex > 8) {
      return res.status(400).json({ error: 'Geçersiz hücre indeksi (0-8)' })
    }

    const data = CellSchema.parse(req.body)
    const cell = await db.iGCell.upsert({
      where: { briefId_cellIndex: { briefId: req.params.briefId, cellIndex } },
      create: { briefId: req.params.briefId, cellIndex, ...data },
      update: data
    })

    await cacheDelete(`brief:${req.params.briefId}`)
    res.json(cell)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'IG hücresi güncellenemedi' })
  }
})

// PUT /api/firms/:firmId/briefs/:briefId/ig/reorder - sürükle bırak sıralama
router.put('/reorder', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { indices } = z.object({ indices: z.array(z.number()) }).parse(req.body)
    if (indices.length !== 9) return res.status(400).json({ error: '9 hücre indeksi gerekli' })

    const cells = await db.iGCell.findMany({
      where: { briefId: req.params.briefId },
      orderBy: { cellIndex: 'asc' }
    })

    // Yeni sıralamaya göre güncelle
    await db.$transaction(
      indices.map((newIdx, oldIdx) =>
        db.iGCell.update({
          where: { briefId_cellIndex: { briefId: req.params.briefId, cellIndex: oldIdx } },
          data: { cellIndex: newIdx + 100 } // Önce 100+ yap, çakışma önle
        })
      ).concat(
        indices.map((newIdx, oldIdx) =>
          db.iGCell.update({
            where: { briefId_cellIndex: { briefId: req.params.briefId, cellIndex: oldIdx + 100 } },
            data: { cellIndex: newIdx }
          })
        )
      )
    )

    await cacheDelete(`brief:${req.params.briefId}`)
    res.json({ message: 'Sıralama güncellendi' })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Sıralama güncellenemedi' })
  }
})

// POST /api/firms/:firmId/briefs/:briefId/ig/approve-all
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

export default router
