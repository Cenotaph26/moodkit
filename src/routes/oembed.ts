// src/routes/oembed.ts
import { Router, Response } from 'express'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/oembed?url=...
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { url } = req.query
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url gerekli' })

  try {
    const r = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`)
    if (!r.ok) return res.status(422).json({ error: 'embed desteklenmiyor' })
    const data = await r.json() as { html?: string; title?: string }
    const srcMatch = data.html?.match(/src="([^"]+)"/)
    const iframeSrc = srcMatch?.[1] || null
    if (!iframeSrc) return res.status(422).json({ error: 'embed desteklenmiyor' })
    res.json({ iframeSrc, title: data.title || '' })
  } catch (e) {
    res.status(500).json({ error: 'oEmbed alınamadı' })
  }
})

export default router
