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

// POST /api/notifications — müşteri yorum/mesaj bildirimi oluştur
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { title, sub, briefId, targetUserIds } = req.body as {
      title: string
      sub?: string
      briefId?: string
      targetUserIds?: string[]
    }
    if (!title) return res.status(400).json({ error: 'title zorunlu' })

    // targetUserIds verilmişse onlara, yoksa ADMIN rolündeki tüm kullanıcılara bildir
    let recipientIds: string[] = targetUserIds || []
    if (!recipientIds.length) {
      const admins = await db.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
      recipientIds = admins.map(a => a.id)
    }
    // Göndereni de ekle (kendi bildirimi değilse)
    if (!recipientIds.includes(req.user!.id)) recipientIds.push(req.user!.id)

    const created = await db.notification.createMany({
      data: recipientIds.map(uid => ({
        userId: uid,
        briefId: briefId || null,
        title,
        sub: sub || null,
      }))
    })

    // WebSocket push
    try {
      const { sendWS } = await import('../index')
      for (const uid of recipientIds) sendWS(uid, { type: 'notif', title, sub: sub || null, briefId })
    } catch (_) {}

    res.status(201).json({ count: created.count })
  } catch (err) {
    res.status(500).json({ error: 'Bildirim oluşturulamadı' })
  }
})

export default router
