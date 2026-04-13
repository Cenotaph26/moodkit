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

// ── HEALTH CHECK — en üstte, her şeyden önce ─────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── MIDDLEWARE ────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }))

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(cookieParser())

// Statik dosyalar
app.use(express.static(path.join(__dirname, '../public')))

// ── API ROUTES ────────────────────────────────────────────
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/firms', firmsRouter)

app.use('/api/firms/:firmId/briefs', briefsRouter)
app.use('/api/firms/:firmId/briefs/:briefId/cards', moodboardRouter)
app.use('/api/firms/:firmId/briefs/:briefId/tasks', tasksRouter)
app.use('/api/firms/:firmId/briefs/:briefId/ig', igRouter)

// ── FRONTEND FALLBACK ─────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

// ── ERROR HANDLER ─────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Sunucu hatası' })
})

// ── START ─────────────────────────────────────────────────
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 MoodKit server: http://0.0.0.0:${PORT}`)
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔑 JWT_SECRET set: ${!!process.env.JWT_SECRET}`)
  console.log(`🗄️  DATABASE_URL set: ${!!process.env.DATABASE_URL}`)
  console.log(`🟥 REDIS_URL set: ${!!process.env.REDIS_URL}\n`)
  startNotifWorker()
})

server.on('error', (err) => {
  console.error('❌ Server başlatma hatası:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:', reason)
})

export default app
