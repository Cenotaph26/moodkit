// src/routes/time.ts
import { Router, Response } from 'express'
import { z } from 'zod'
import { db } from '../lib/db'
import { requireAuth, requireFirmAccess, AuthRequest } from '../middleware/auth'

const router = Router({ mergeParams: true })

// GET /time — list time entries for a task
router.get('/', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const entries = await db.timeEntry.findMany({
      where: { taskId: req.params.taskId },
      include: { user: { select: { name: true } } },
      orderBy: { loggedAt: 'desc' }
    })
    res.json(entries)
  } catch (err) {
    res.status(500).json({ error: 'Süreler alınamadı' })
  }
})

// POST /time — log time for a task
router.post('/', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { minutes, note } = z.object({
      minutes: z.number().min(1).max(480),
      note: z.string().optional()
    }).parse(req.body)

    const entry = await db.timeEntry.create({
      data: {
        taskId: req.params.taskId,
        userId: req.user!.id,
        minutes,
        note: note || null
      },
      include: { user: { select: { name: true } } }
    })
    res.status(201).json(entry)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Süre eklenemedi' })
  }
})

// GET /time/report — total minutes per user for a task
router.get('/report', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const entries = await db.timeEntry.findMany({
      where: { taskId: req.params.taskId },
      include: { user: { select: { name: true } } }
    })
    const totalMinutes = entries.reduce((s, e) => s + e.minutes, 0)
    const byUser: Record<string, { name: string; minutes: number }> = {}
    entries.forEach(e => {
      if (!byUser[e.userId]) byUser[e.userId] = { name: e.user.name || '?', minutes: 0 }
      byUser[e.userId].minutes += e.minutes
    })
    res.json({ totalMinutes, byUser: Object.values(byUser) })
  } catch (err) {
    res.status(500).json({ error: 'Rapor alınamadı' })
  }
})

export default router
