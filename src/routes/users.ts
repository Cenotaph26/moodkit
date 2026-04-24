// src/routes/users.ts
import { Router, Response } from 'express'
import { z } from 'zod'
import { db } from '../lib/db'
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/users - tüm kullanıcılar
// Admin: herkesi görür
// Diğerleri: sadece isim/rol/prodRole bilgisi (form dropdown'ları için)
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'ADMIN'
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: isAdmin,  // Sadece admin email görür
        role: true,
        prodRole: true,
        title: true,
        avatar: true,
        createdAt: isAdmin
      },
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
    if (req.user!.id !== req.params.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Yetki yok' })
    }

    const data = z.object({
      name: z.string().optional(),
      title: z.string().optional(),
      prodRole: z.string().optional(),
      role: z.enum(['ADMIN', 'EDITOR', 'PROD', 'CLIENT']).optional(),
    }).parse(req.body)

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

// DELETE /api/users/:id - üye sil (sadece admin)
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    await db.user.delete({ where: { id: req.params.id } })
    res.json({ message: 'Kullanıcı silindi' })
  } catch (err) {
    res.status(500).json({ error: 'Silme başarısız' })
  }
})

// PATCH /api/users/:id/password - şifre değiştir
router.patch('/:id/password', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.id !== req.params.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Yetki yok' })
    }
    const { password } = z.object({ password: z.string().min(8) }).parse(req.body)
    const bcrypt = require('bcryptjs')
    const hashed = await bcrypt.hash(password, 12)
    await db.user.update({ where: { id: req.params.id }, data: { password: hashed } })
    res.json({ message: 'Şifre güncellendi' })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Şifre güncellenemedi' })
  }
})

export default router
