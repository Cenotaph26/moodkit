// src/routes/templates.ts
import { Router, Response } from 'express'
import { z } from 'zod'
import { db } from '../lib/db'
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth'

const router = Router()

const TemplateSchema = z.object({
  name: z.string().min(1),
  firmId: z.string().optional(),
  products: z.string().optional(),
  tone: z.string().optional(),
  colorDir: z.string().optional(),
  avoid: z.string().optional(),
  platforms: z.array(z.string()).optional().default([]),
  targetAudience: z.string().optional(),
  notes: z.string().optional(),
})

// GET /api/templates
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let firmIds: string[]
    if (req.user!.role === 'ADMIN') {
      const all = await db.firm.findMany({ select: { id: true } })
      firmIds = all.map(f => f.id)
    } else {
      const m = await db.firmMember.findMany({ where: { userId: req.user!.id }, select: { firmId: true } })
      firmIds = m.map(x => x.firmId)
    }

    const templates = await db.briefTemplate.findMany({
      where: { OR: [{ firmId: null }, { firmId: { in: firmIds } }] },
      orderBy: { createdAt: 'desc' }
    })
    res.json(templates)
  } catch (err) {
    res.status(500).json({ error: 'Şablonlar alınamadı' })
  }
})

// POST /api/templates
router.post('/', requireAuth, requireRole('ADMIN', 'EDITOR'), async (req: AuthRequest, res: Response) => {
  try {
    const data = TemplateSchema.parse(req.body)
    const tpl = await db.briefTemplate.create({
      data: { ...data, createdById: req.user!.id }
    })
    res.status(201).json(tpl)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Şablon oluşturulamadı' })
  }
})

// DELETE /api/templates/:id
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    await db.briefTemplate.delete({ where: { id: req.params.id } })
    res.json({ message: 'Şablon silindi' })
  } catch (err) {
    res.status(500).json({ error: 'Şablon silinemedi' })
  }
})

export default router
