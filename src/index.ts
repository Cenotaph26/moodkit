// src/index.ts
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import path from 'path'

import authRouter from './routes/auth'
import firmsRouter from './routes/firms'
import briefsRouter from './routes/briefs'
import moodboardRouter from './routes/moodboard'
import tasksRouter from './routes/tasks'
import igRouter from './routes/ig'
import notificationsRouter from './routes/notifications'
import usersRouter from './routes/users'

import { startNotifWorker } from './lib/notifWorker'

const app = express()
const PORT = parseInt(process.env.PORT || '3000')

// ── MIDDLEWARE ────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Frontend inline script için
}))

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(cookieParser())

// Statik dosyalar (frontend HTML)
app.use(express.static(path.join(__dirname, '../public')))

// ── API ROUTES ────────────────────────────────────────────
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/firms', firmsRouter)

// Brief routes (firma altında)
app.use('/api/firms/:firmId/briefs', briefsRouter)

// Nested routes (firma → brief altında)
app.use('/api/firms/:firmId/briefs/:briefId/cards', moodboardRouter)
app.use('/api/firms/:firmId/briefs/:briefId/tasks', tasksRouter)
app.use('/api/firms/:firmId/briefs/:briefId/ig', igRouter)

// ── HEALTH CHECK ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  })
})

// ── FRONTEND FALLBACK ─────────────────────────────────────
// SPA için tüm istekleri index.html'e yönlendir
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

// ── ERROR HANDLER ─────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Sunucu hatası' })
})

// ── START ─────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 MoodKit server: http://localhost:${PORT}`)
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}\n`)
  startNotifWorker()
})

export default app
