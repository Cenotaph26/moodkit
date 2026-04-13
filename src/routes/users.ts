// src/routes/users.ts
import { Router, Response } from 'express'
import { z } from 'zod'
import { db } from '../lib/db'
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/users - tüm kullanıcılar (admin)
router.get('/', requireAuth, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const users = await db.user.findMany({
      select: { id: true, name: true, email: true, role: true, prodRole: true, title: true, avatar: true, createdAt: true },
      orderBy: { name: 'asc' }
    })
    res.json(users)
  } catch (err) {
    res.status(500).json({ error: 'Kullanıcılar alınamadı' })
  }
})

// PUT /api/users/:id - profil güncelle
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Kendi profilini veya admin başkasını güncelleyebilir
    if (req.user!.id !== req.params.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Yetki yok' })
    }

    const data = z.object({
      name: z.string().optional(),
      title: z.string().optional(),
      prodRole: z.string().optional(),
      role: z.enum(['ADMIN', 'EDITOR', 'PROD', 'CLIENT']).optional(),
    }).parse(req.body)

    // Sadece admin role değiştirebilir
    if (data.role && req.user!.role !== 'ADMIN') delete data.role

    const user = await db.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, role: true, prodRole: true, title: true }
    })
    res.json(user)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Güncelleme başarısız' })
  }
})

export default router
