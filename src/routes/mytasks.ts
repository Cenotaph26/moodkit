// src/routes/mytasks.ts
import { Router, Response } from 'express'
import { db } from '../lib/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/tasks/mine — kişiye atanan tüm görevler (Personel Paneli)
router.get('/mine', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const where: any = { assigneeId: req.user!.id }
    const { status, briefId } = req.query
    if (status) where.status = String(status).toUpperCase()
    if (briefId) where.briefId = String(briefId)

    const tasks = await db.task.findMany({
      where,
      include: {
        checkItems: { orderBy: { order: 'asc' } },
        card: {
          include: {
            versions: { orderBy: { vNum: 'desc' }, take: 1 }
          }
        },
        brief: {
          include: { firm: { select: { id: true, name: true, color: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(tasks)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Görevler alınamadı' })
  }
})

export default router
