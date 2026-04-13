// src/lib/redis.ts
import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
})

redis.on('connect', () => console.log('✅ Redis bağlandı'))
redis.on('error', (err) => console.error('❌ Redis hata:', err.message))

// ── SESSION ───────────────────────────────────────────────
// JWT token'ı blacklist'e alır (logout)
export const SESSION_PREFIX = 'session:'
export const BLACKLIST_PREFIX = 'blacklist:'

export async function setSession(userId: string, token: string, ttlSeconds = 604800) {
  await redis.setex(`${SESSION_PREFIX}${token}`, ttlSeconds, userId)
}

export async function getSession(token: string): Promise<string | null> {
  return redis.get(`${SESSION_PREFIX}${token}`)
}

export async function deleteSession(token: string) {
  await redis.del(`${SESSION_PREFIX}${token}`)
}

export async function blacklistToken(token: string, ttlSeconds = 604800) {
  await redis.setex(`${BLACKLIST_PREFIX}${token}`, ttlSeconds, '1')
}

export async function isBlacklisted(token: string): Promise<boolean> {
  const v = await redis.get(`${BLACKLIST_PREFIX}${token}`)
  return v === '1'
}

// ── CACHE ─────────────────────────────────────────────────
// Sık okunan verileri cache'ler (firmalar, briefler)
export const CACHE_PREFIX = 'cache:'
const DEFAULT_TTL = 300 // 5 dakika

export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await redis.get(`${CACHE_PREFIX}${key}`)
  if (!data) return null
  try { return JSON.parse(data) as T }
  catch { return null }
}

export async function cacheSet(key: string, data: unknown, ttl = DEFAULT_TTL) {
  await redis.setex(`${CACHE_PREFIX}${key}`, ttl, JSON.stringify(data))
}

export async function cacheDelete(key: string) {
  await redis.del(`${CACHE_PREFIX}${key}`)
}

export async function cacheDeletePattern(pattern: string) {
  const keys = await redis.keys(`${CACHE_PREFIX}${pattern}`)
  if (keys.length > 0) await redis.del(...keys)
}

// ── NOTIFICATION QUEUE ────────────────────────────────────
// Bildirimleri Redis list'e push eder, işlenince PostgreSQL'e kaydeder
export const NOTIF_QUEUE = 'queue:notifications'

export interface NotifPayload {
  userId: string
  briefId?: string
  title: string
  sub?: string
}

export async function pushNotification(payload: NotifPayload) {
  await redis.lpush(NOTIF_QUEUE, JSON.stringify(payload))
}

export async function popNotification(): Promise<NotifPayload | null> {
  const data = await redis.rpop(NOTIF_QUEUE)
  if (!data) return null
  try { return JSON.parse(data) as NotifPayload }
  catch { return null }
}

// ── RATE LIMIT ────────────────────────────────────────────
export async function rateLimit(key: string, max: number, windowSec: number): Promise<boolean> {
  const redisKey = `ratelimit:${key}`
  const current = await redis.incr(redisKey)
  if (current === 1) await redis.expire(redisKey, windowSec)
  return current <= max
}

// ── ONLINE USERS (real-time için) ─────────────────────────
export async function setOnline(userId: string) {
  await redis.setex(`online:${userId}`, 30, '1')
}

export async function isOnline(userId: string): Promise<boolean> {
  const v = await redis.get(`online:${userId}`)
  return v === '1'
}
