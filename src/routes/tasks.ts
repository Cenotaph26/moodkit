// src/routes/tasks.ts
import { Router, Response } from 'express'
import { z } from 'zod'
import { db } from '../lib/db'
import { cacheDelete, pushNotification } from '../lib/redis'
import { requireAuth, requireFirmAccess, AuthRequest } from '../middleware/auth'
import { logActivity } from '../lib/activity'

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
      include: {
        assignee: { select: { id: true, name: true, prodRole: true, avatar: true } },
        checkItems: { orderBy: { order: 'asc' } }
      },
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
    const prev = await db.task.findUnique({ where: { id: req.params.taskId } })
    const task = await db.task.update({
      where: { id: req.params.taskId },
      data,
      include: { assignee: { select: { id: true, name: true, prodRole: true } } }
    })
    if (data.status && prev?.status !== data.status) {
      await logActivity({
        userId: req.user!.id, firmId: req.params.firmId, briefId: req.params.briefId,
        action: 'task.status_changed', entity: 'Task', entityId: task.id,
        meta: { from: prev?.status, to: data.status, desc: task.desc }
      })

      // Tüm görevler DONE → YAYIN aşamasına geç
      if (data.status === 'DONE') {
        const allTasks = await db.task.findMany({ where: { briefId: req.params.briefId } })
        const allDone = allTasks.length > 0 && allTasks.every(t => t.status === 'DONE')
        if (allDone) {
          await db.brief.update({ where: { id: req.params.briefId }, data: { stage: 'YAYIN' } })
          await cacheDelete(`briefs:${req.params.firmId}`)
          const firm = await db.firm.findUnique({ where: { id: req.params.firmId }, include: { members: true } })
          const brief = await db.brief.findUnique({ where: { id: req.params.briefId } })
          if (firm && brief) {
            for (const member of firm.members) {
              await pushNotification({
                userId: member.userId, briefId: req.params.briefId,
                title: `${brief.month} ${brief.year} → Yayın`,
                sub: firm.name + ' · Tüm görevler tamamlandı'
              })
            }
          }
        }
      }
    }
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

// POST /tasks/:taskId/check — add checklist item
router.post('/:taskId/check', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { text } = z.object({ text: z.string().min(1) }).parse(req.body)
    const last = await db.checkItem.findFirst({ where: { taskId: req.params.taskId }, orderBy: { order: 'desc' } })
    const item = await db.checkItem.create({
      data: { taskId: req.params.taskId, text, order: (last?.order ?? -1) + 1 }
    })
    res.status(201).json(item)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Madde eklenemedi' })
  }
})

// PATCH /tasks/:taskId/check/:checkId — toggle done
router.patch('/:taskId/check/:checkId', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { done } = z.object({ done: z.boolean() }).parse(req.body)
    const item = await db.checkItem.update({ where: { id: req.params.checkId }, data: { done } })
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: 'Madde güncellenemedi' })
  }
})

// DELETE /tasks/:taskId/check/:checkId
router.delete('/:taskId/check/:checkId', requireAuth, requireFirmAccess, async (req: AuthRequest, res: Response) => {
  try {
    await db.checkItem.delete({ where: { id: req.params.checkId } })
    res.json({ message: 'Madde silindi' })
  } catch (err) {
    res.status(500).json({ error: 'Madde silinemedi' })
  }
})

export default router
