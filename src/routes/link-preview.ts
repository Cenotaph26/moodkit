// src/routes/link-preview.ts
import { Router, Response } from 'express'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

function extractYouTubeId(url: string): string | null {
  const w = url.match(/[?&]v=([\w-]{11})/)
  if (w) return w[1]
  const s = url.match(/youtu\.be\/([\w-]{11})/)
  if (s) return s[1]
  const e = url.match(/(?:shorts|embed)\/([\w-]{11})/)
  if (e) return e[1]
  return null
}

function extractVimeoId(url: string): string | null {
  return url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/)?.[1] || null
}

function detectPlatform(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube'
  if (url.includes('vimeo.com')) return 'Vimeo'
  if (url.includes('tiktok.com')) return 'TikTok'
  if (url.includes('instagram.com')) return 'Instagram'
  if (url.includes('pinterest.com')) return 'Pinterest'
  if (url.includes('behance.net')) return 'Behance'
  if (/\.(mp4|mov|webm)$/i.test(url)) return 'Video'
  return 'Web'
}

function parseOG(html: string, tag: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']og:${tag}["'][^>]+content=["']([^"']+)["']`, 'i')
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:${tag}["']`, 'i')
  return html.match(re)?.[1] || html.match(re2)?.[1] || null
}

function parseTitle(html: string): string | null {
  return html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1]?.trim() || null
}

// GET /api/link-preview?url=...
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { url } = req.query as { url: string }
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url gerekli' })

  try {
    const platform = detectPlatform(url)

    // ── YouTube ──────────────────────────────────────────────
    if (platform === 'YouTube') {
      const id = extractYouTubeId(url)
      if (!id) return res.status(422).json({ error: 'YouTube ID bulunamadı' })
      return res.json({
        platform: 'YouTube',
        thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
        thumbnailFallback: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        embedUrl: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`,
        title: null,
        type: 'video',
      })
    }

    // ── Vimeo ─────────────────────────────────────────────────
    if (platform === 'Vimeo') {
      const r = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`)
      if (r.ok) {
        const data = await r.json() as any
        const vid = extractVimeoId(url)
        return res.json({
          platform: 'Vimeo',
          thumbnail: data.thumbnail_url || null,
          embedUrl: vid ? `https://player.vimeo.com/video/${vid}` : null,
          title: data.title || null,
          type: 'video',
        })
      }
    }

    // ── TikTok ────────────────────────────────────────────────
    if (platform === 'TikTok') {
      const r = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MoodKitBot/1.0)' } }
      )
      if (r.ok) {
        const data = await r.json() as any
        const srcMatch = data.html?.match(/src="([^"]+)"/)
        return res.json({
          platform: 'TikTok',
          thumbnail: data.thumbnail_url || null,
          embedUrl: srcMatch?.[1] || null,
          title: data.title || null,
          type: 'video',
        })
      }
    }

    // ── Open Graph (Instagram, Pinterest, Behance, web) ───────
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MoodKitBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(6000),
    })

    if (!resp.ok) {
      return res.json({ platform, thumbnail: null, title: null, embedUrl: null, type: 'link' })
    }

    const html = await resp.text()
    const thumbnail = parseOG(html, 'image') || null
    const title = parseOG(html, 'title') || parseTitle(html) || null
    const description = parseOG(html, 'description') || null
    const siteName = parseOG(html, 'site_name') || null

    return res.json({ platform, thumbnail, title, description, siteName, embedUrl: null, type: 'link' })

  } catch (e) {
    res.status(422).json({ error: 'Önizleme alınamadı' })
  }
})

export default router
