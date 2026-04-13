// src/routes/tasks.ts
import { Router, Response } from 'express'
import { z } from 'zod'
import { db } from '../lib/db'
import { cacheDelete } from '../lib/redis'
import { requireAuth, requireFirmAccess, AuthRequest } from '../middleware/auth'

const router = Router({ mergeParams: true })

const TaskSchema = z.object({
  cardRef: z.string(),
  cardId: z.string().optional(),
  type: z.string(),
  desc: z.string(),
  format: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(['TODO', 'DOING', 'DONE']).optional(),
  deadline: z.string().optional(),
  assigneeId: z.string().optional(),
  order: z.number().optional(),
})

// GET /api/firms/:firmId/briefs/:briefId/tasks
router.get('/', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await db.task.findMany({
      where: { briefId: req.params.briefId },
      include: { assignee: { select: { id: true, name: true, prodRole: true, avatar: true } } },
      orderBy: { order: 'asc' }
    })
    res.json(tasks)
  } catch (err) {
    res.status(500).json({ error: 'Görevler alınamadı' })
  }
})

// POST /api/firms/:firmId/briefs/:briefId/tasks
router.post('/', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const data = TaskSchema.parse(req.body)
    const last = await db.task.findFirst({ where: { briefId: req.params.briefId }, orderBy: { order: 'desc' } })
    const task = await db.task.create({
      data: {
        ...data,
        briefId: req.params.briefId,
        createdById: req.user!.id,
        order: (last?.order ?? -1) + 1
      },
      include: { assignee: { select: { id: true, name: true, prodRole: true } } }
    })
    await cacheDelete(`brief:${req.params.briefId}`)
    res.status(201).json(task)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Görev oluşturulamadı' })
  }
})

// PUT /api/firms/:firmId/briefs/:briefId/tasks/:taskId
router.put('/:taskId', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const data = TaskSchema.partial().parse(req.body)
    const task = await db.task.update({
      where: { id: req.params.taskId },
      data,
      include: { assignee: { select: { id: true, name: true, prodRole: true } } }
    })
    await cacheDelete(`brief:${req.params.briefId}`)
    res.json(task)
  } catch (err) {
    res.status(500).json({ error: 'Görev güncellenemedi' })
  }
})

// DELETE /api/firms/:firmId/briefs/:briefId/tasks/:taskId
router.delete('/:taskId', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    await db.task.delete({ where: { id: req.params.taskId } })
    await cacheDelete(`brief:${req.params.briefId}`)
    res.json({ message: 'Görev silindi' })
  } catch (err) {
    res.status(500).json({ error: 'Görev silinemedi' })
  }
})

export default router
