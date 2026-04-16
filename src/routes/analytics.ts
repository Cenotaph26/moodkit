// src/routes/analytics.ts
import { Router, Response } from 'express'
import { db } from '../lib/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/analytics/summary
router.get('/summary', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let firmIds: string[]
    if (req.user!.role === 'ADMIN') {
      const all = await db.firm.findMany({ select: { id: true } })
      firmIds = all.map(f => f.id)
    } else {
      const m = await db.firmMember.findMany({ where: { userId: req.user!.id }, select: { firmId: true } })
      firmIds = m.map(x => x.firmId)
    }

    const [taskGroups, cardGroups, briefGroups, recentActivity] = await Promise.all([
      db.task.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { brief: { firmId: { in: firmIds } } }
      }),
      db.moodboardCard.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { brief: { firmId: { in: firmIds } } }
      }),
      db.brief.groupBy({
        by: ['stage'],
        _count: { stage: true },
        where: { firmId: { in: firmIds } }
      }),
      db.activityLog.findMany({
        where: { firmId: { in: firmIds } },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ])

    const tasksByStatus: Record<string, number> = {}
    taskGroups.forEach(g => { tasksByStatus[g.status] = g._count.status })

    const cardsByStatus: Record<string, number> = {}
    cardGroups.forEach(g => { cardsByStatus[g.status] = g._count.status })

    const briefsByStage: Record<string, number> = {}
    briefGroups.forEach(g => { briefsByStage[g.stage] = g._count.stage })

    res.json({ tasksByStatus, cardsByStatus, briefsByStage, recentActivity })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Analitik alınamadı' })
  }
})

export default router
