// src/routes/search.ts
import { Router, Response } from 'express'
import { db } from '../lib/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/search?q=<query>&firmId=<optional>
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const q = String(req.query.q || '').trim()
    if (!q || q.length < 2) return res.json({ briefs: [], cards: [], tasks: [] })

    // Determine accessible firmIds
    let firmIds: string[]
    if (req.user!.role === 'ADMIN') {
      const allFirms = await db.firm.findMany({ select: { id: true } })
      firmIds = allFirms.map(f => f.id)
    } else {
      const memberships = await db.firmMember.findMany({
        where: { userId: req.user!.id },
        select: { firmId: true }
      })
      firmIds = memberships.map(m => m.firmId)
    }

    if (req.query.firmId) {
      const fid = String(req.query.firmId)
      if (firmIds.includes(fid)) firmIds = [fid]
      else return res.json({ briefs: [], cards: [], tasks: [] })
    }

    const [briefs, cards, tasks] = await Promise.all([
      db.brief.findMany({
        where: {
          firmId: { in: firmIds },
          OR: [
            { month: { contains: q, mode: 'insensitive' } },
            { notes: { contains: q, mode: 'insensitive' } },
            { products: { contains: q, mode: 'insensitive' } },
            { tone: { contains: q, mode: 'insensitive' } },
          ]
        },
        select: { id: true, firmId: true, month: true, year: true, stage: true },
        take: 5
      }),
      db.moodboardCard.findMany({
        where: {
          brief: { firmId: { in: firmIds } },
          OR: [
            { label: { contains: q, mode: 'insensitive' } },
            { type: { contains: q, mode: 'insensitive' } },
          ]
        },
        select: { id: true, briefId: true, label: true, type: true, which: true, status: true,
          brief: { select: { firmId: true } } },
        take: 5
      }),
      db.task.findMany({
        where: {
          brief: { firmId: { in: firmIds } },
          OR: [
            { desc: { contains: q, mode: 'insensitive' } },
            { cardRef: { contains: q, mode: 'insensitive' } },
            { type: { contains: q, mode: 'insensitive' } },
          ]
        },
        select: { id: true, briefId: true, desc: true, cardRef: true, type: true, status: true,
          brief: { select: { firmId: true } } },
        take: 5
      })
    ])

    res.json({
      briefs,
      cards: cards.map(c => ({ ...c, briefId_firmId: c.brief.firmId })),
      tasks: tasks.map(t => ({ ...t, briefId_firmId: t.brief.firmId }))
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Arama başarısız' })
  }
})

export default router
