// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { db } from '../lib/db'
import { getSession, isBlacklisted, setOnline } from '../lib/redis'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    name: string
    role: string
  }
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req)
    if (!token) return res.status(401).json({ error: 'Token gerekli' })

    // Redis blacklist kontrolü
    if (await isBlacklisted(token)) {
      return res.status(401).json({ error: 'Oturum sonlandırılmış' })
    }

    // Redis session kontrolü
    const sessionUserId = await getSession(token)
    if (!sessionUserId) {
      return res.status(401).json({ error: 'Oturum bulunamadı' })
    }

    // JWT doğrula
    const secret = process.env.JWT_SECRET!
    const payload = jwt.verify(token, secret) as { userId: string }

    // Kullanıcıyı DB'den al (kritik bilgiler için)
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true }
    })

    if (!user) return res.status(401).json({ error: 'Kullanıcı bulunamadı' })

    req.user = user

    // Online durumunu güncelle (Redis TTL 30s)
    await setOnline(user.id)

    next()
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Oturum süresi doldu' })
    }
    return res.status(401).json({ error: 'Geçersiz token' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Giriş gerekli' })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' })
    }
    next()
  }
}

// Firma üyeliği kontrolü
export async function requireFirmAccess(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Giriş gerekli' })
  if (req.user.role === 'ADMIN') return next() // Admin her şeyi görebilir

  const firmId = req.params.firmId || req.body.firmId
  if (!firmId) return res.status(400).json({ error: 'Firma ID gerekli' })

  const member = await db.firmMember.findUnique({
    where: { firmId_userId: { firmId, userId: req.user.id } }
  })

  if (!member) return res.status(403).json({ error: 'Bu firmaya erişiminiz yok' })
  next()
}

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  const cookie = (req as any).cookies?.token
  if (cookie) return cookie
  return null
}
