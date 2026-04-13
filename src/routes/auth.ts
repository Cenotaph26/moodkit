// src/routes/auth.ts
import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { db } from '../lib/db'
import { setSession, deleteSession, blacklistToken } from '../lib/redis'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const RegisterSchema = z.object({
  email: z.string().email('Geçerli email girin'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
  name: z.string().min(2, 'İsim en az 2 karakter olmalı'),
  role: z.enum(['ADMIN', 'EDITOR', 'PROD', 'CLIENT']).optional(),
  prodRole: z.string().optional(),
  title: z.string().optional(),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = RegisterSchema.parse(req.body)

    const existing = await db.user.findUnique({ where: { email: data.email } })
    if (existing) return res.status(400).json({ error: 'Bu email zaten kayıtlı' })

    const hashed = await bcrypt.hash(data.password, 12)
    const user = await db.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashed,
        role: data.role || 'PROD',
        prodRole: data.prodRole,
        title: data.title,
      },
      select: { id: true, email: true, name: true, role: true, prodRole: true, title: true }
    })

    const token = generateToken(user.id)
    await setSession(user.id, token)

    res.cookie('token', token, cookieOptions())
    res.status(201).json({ user, token })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message })
    console.error(err)
    res.status(500).json({ error: 'Kayıt başarısız' })
  }
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const data = LoginSchema.parse(req.body)

    const user = await db.user.findUnique({ where: { email: data.email } })
    if (!user) return res.status(401).json({ error: 'Email veya şifre hatalı' })

    const valid = await bcrypt.compare(data.password, user.password)
    if (!valid) return res.status(401).json({ error: 'Email veya şifre hatalı' })

    const token = generateToken(user.id)
    await setSession(user.id, token)

    res.cookie('token', token, cookieOptions())
    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, prodRole: user.prodRole, title: user.title },
      token
    })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Giriş başarısız' })
  }
})

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const token = req.headers.authorization?.slice(7) || (req as any).cookies?.token
    if (token) {
      await deleteSession(token)
      await blacklistToken(token)
    }
    res.clearCookie('token')
    res.json({ message: 'Çıkış yapıldı' })
  } catch (err) {
    res.status(500).json({ error: 'Çıkış başarısız' })
  }
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await db.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, name: true, role: true, prodRole: true, title: true, avatar: true }
  })
  res.json(user)
})

function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET as string
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn']
  return jwt.sign({ userId }, secret, { expiresIn })
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 gün
  }
}

export default router
