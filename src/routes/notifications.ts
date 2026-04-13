// src/routes/notifications.ts
import { Router, Response } from 'express'
import { db } from '../lib/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/notifications
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await db.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
    res.json(notifications)
  } catch (err) {
    res.status(500).json({ error: 'Bildirimler alınamadı' })
  }
})

// PUT /api/notifications/read-all
router.put('/read-all', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await db.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true }
    })
    res.json({ message: 'Tümü okundu' })
  } catch (err) {
    res.status(500).json({ error: 'Güncelleme başarısız' })
  }
})

// PUT /api/notifications/:id/read
router.put('/:id/read', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await db.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { read: true }
    })
    res.json({ message: 'Okundu' })
  } catch (err) {
    res.status(500).json({ error: 'Güncelleme başarısız' })
  }
})

export default router
