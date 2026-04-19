# MoodKit — Sprint 2: Link Önizleme & Performans

> Notion · Slack · Hootsuite esinli link unfurl sistemi + ilk yükleme optimizasyonu  
> Referans: [Sprint 1](moodkit_sprint1.md) | [Sprint 3](moodkit_sprint3.md)

---

## 1. Genel Bakış

Sprint 1'de kritik buglar giderildi (video oynatma, carousel çoklu fotoğraf, tarih picker). Sprint 2'nin odağı iki ana alan:

**Alan 1 — Link Önizleme Sistemi**
URL yapıştırılınca otomatik thumbnail + başlık + platform bilgisi çekme. YouTube, TikTok, Instagram, Pinterest, herhangi web sitesi destekli. Kullanıcı manuel görsel yüklemek zorunda kalmadan hızlı kart oluşturabilir.

**Alan 2 — İlk Yükleme Performansı**
Dashboard açılışta kartlar gecikmeli yükleniyor. `initApp` paralel hale getirilir, skeleton ekranlar eklenir. Lazy loading ile sadece görünen içerik yüklenir.

### Referans Uygulamalar

| Uygulama | Özellik | MoodKit Uyarlaması |
|----------|---------|-------------------|
| Slack | Link unfurl — URL yapıştırınca başlık+resim önizleme | Moodboard URL input'unda anlık önizleme kartı |
| Notion | Web bookmark — OG tag'lerden otomatik kart | Kart eklerken link → otomatik thumbnail doldurma |
| Hootsuite | Media library — platform bazlı önizleme | Platform rozeti + thumbnail + oynatma butonu |
| Buffer | YouTube/IG preview — link girilince kapak çekme | YouTube ID'den direkt thumbnail, TikTok oEmbed |

---

## 2. Link Önizleme Sistemi

### Platform Bazlı Thumbnail Stratejisi

> ⚠️ **Instagram Durumu (2025):** Meta oEmbed API artık token zorunlu. `instagram.com/p/ID/embed/` iframe çoğu durumda çalışmıyor. `thumbnail_url` alanı kaldırıldı (Kasım 2025). Çözüm: Open Graph scraping.

| Platform | Thumbnail Yöntemi | Oynatma | Token Gerekli? |
|----------|------------------|---------|---------------|
| YouTube | `ytimg.com/vi/{ID}/maxresdefault.jpg` — direkt | iframe embed | Hayır |
| YouTube Shorts | `ytimg.com/vi/{ID}/hqdefault.jpg` | iframe embed | Hayır |
| Vimeo | `api.vimeo.com/oembed?url=...` | iframe embed | Hayır |
| TikTok | `tiktok.com/oembed?url=...` → thumbnail_url | embed iframe src | Hayır |
| Instagram | Open Graph scraping → og:image | Uygulama içi link kartı | Hayır |
| Pinterest | Open Graph scraping → og:image | Uygulama içi link kartı | Hayır |
| Behance/Web | Open Graph scraping → og:image | Uygulama içi link kartı | Hayır |
| MP4/Video | Direkt dosya — video element poster | HTML5 video player | Hayır |

### Backend — /api/link-preview Endpoint

```ts
// src/routes/link-preview.ts
import fetch from 'node-fetch';
import * as cheerio from 'cheerio'; // npm install cheerio

router.get('/', requireAuth, async (req, res) => {
  const { url } = req.query as { url: string };
  if (!url) return res.status(400).json({ error: 'url gerekli' });
  try {
    const result = await fetchLinkPreview(url);
    res.json(result);
  } catch(e) {
    res.status(422).json({ error: 'Önizleme alınamadı', url });
  }
});

async function fetchLinkPreview(url: string) {
  const platform = detectPlatform(url);

  // ── YouTube ──────────────────────────────────────────────
  if (platform === 'youtube') {
    const id = extractYouTubeId(url);
    if (!id) throw new Error('YouTube ID bulunamadı');
    return {
      platform: 'YouTube',
      thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
      thumbnailFallback: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`,
      title: null,
      type: 'video',
    };
  }

  // ── Vimeo ─────────────────────────────────────────────────
  if (platform === 'vimeo') {
    const r = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
    const data = await r.json() as any;
    return {
      platform: 'Vimeo',
      thumbnail: data.thumbnail_url,
      embedUrl: `https://player.vimeo.com/video/${extractVimeoId(url)}`,
      title: data.title,
      type: 'video',
    };
  }

  // ── TikTok ────────────────────────────────────────────────
  if (platform === 'tiktok') {
    const r = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const data = await r.json() as any;
    const srcMatch = data.html?.match(/src="([^"]+)"/);
    return {
      platform: 'TikTok',
      thumbnail: data.thumbnail_url,
      embedUrl: srcMatch?.[1] || null,
      title: data.title,
      type: 'video',
    };
  }

  // ── Open Graph (Instagram, Pinterest, Behance, web) ───────
  const html = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; MoodKitBot/1.0)',
      'Accept': 'text/html',
    },
    redirect: 'follow',
  }).then(r => r.text());

  const $ = cheerio.load(html);
  const og = (prop: string) =>
    $(`meta[property="og:${prop}"]`).attr('content') ||
    $(`meta[name="og:${prop}"]`).attr('content') || null;

  return {
    platform: platform || 'web',
    thumbnail: og('image'),
    title: og('title') || $('title').text() || null,
    description: og('description'),
    siteName: og('site_name'),
    type: og('type') || 'link',
    embedUrl: null,
  };
}
```

### Platform Tespiti & URL Yardımcıları

```ts
function detectPlatform(url: string): string | null {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com'))     return 'vimeo';
  if (url.includes('tiktok.com'))    return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('pinterest.com')) return 'pinterest';
  if (url.includes('behance.net'))   return 'behance';
  if (/\.(mp4|mov|webm)$/i.test(url)) return 'video';
  return null;
}

function extractYouTubeId(url: string): string | null {
  const w = url.match(/[?&]v=([\w-]{11})/);         if (w) return w[1];
  const s = url.match(/youtu\.be\/([\w-]{11})/);     if (s) return s[1];
  const e = url.match(/(?:shorts|embed)\/([\w-]{11})/); if (e) return e[1];
  return null;
}

function extractVimeoId(url: string): string | null {
  return url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/)?.[1] || null;
}
```

### src/index.ts Kaydı

```ts
import linkPreviewRouter from './routes/link-preview';
app.use('/api/link-preview', requireAuth, linkPreviewRouter);
```

### npm Kurulum

```bash
npm install cheerio node-fetch
npm install -D @types/cheerio
```

---

## 3. Frontend — URL Input Önizleme

### onUrlInputChange() — 500ms Debounce

```js
let _previewTimer = null;

function onUrlInputChange(inputEl, previewContainerId) {
  clearTimeout(_previewTimer);
  const url = inputEl.value.trim();

  if (!url || !url.startsWith('http')) {
    document.getElementById(previewContainerId).innerHTML = '';
    return;
  }

  document.getElementById(previewContainerId).innerHTML = `
    <div style="padding:10px;font-size:11px;color:var(--txt3);
      background:var(--bg2);border-radius:8px;margin-top:6px">
      Önizleme yükleniyor...
    </div>`;

  _previewTimer = setTimeout(async () => {
    try {
      const data = await apiFetch('/api/link-preview?url=' + encodeURIComponent(url));
      renderLinkPreview(previewContainerId, data, url);
    } catch(e) {
      document.getElementById(previewContainerId).innerHTML = `
        <div style="font-size:10px;color:var(--amb);margin-top:4px">
          Önizleme alınamadı. Görsel yükleyebilirsiniz.
        </div>`;
    }
  }, 500);
}
```

### renderLinkPreview()

```js
function renderLinkPreview(containerId, data, url) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const platColors = {
    YouTube:'#ff0000', Vimeo:'#1AB7EA', TikTok:'#010101',
    Instagram:'#E1306C', Pinterest:'#E60023', Behance:'#1769FF', web:'#534AB7'
  };
  const platColor = platColors[data.platform] || '#534AB7';

  // Otomatik thumbnail doldur
  if (data.thumbnail) {
    window._mbc = window._mbc || {};
    if (!window._mbc.img) {
      window._mbc.img = data.thumbnail;
      const fpEl = document.getElementById('mbc-fp');
      if (fpEl) fpEl.innerHTML = `
        <img src="${data.thumbnail}" style="height:60px;border-radius:5px;object-fit:cover"
          onerror="this.style.display='none'">
        <div style="font-size:9px;color:var(--grn);margin-top:3px">✓ Otomatik thumbnail çekildi</div>`;
    }
  }

  el.innerHTML = `
    <div style="display:flex;gap:10px;padding:10px;border:0.5px solid var(--bdr);
      border-radius:8px;margin-top:8px;background:var(--bg);align-items:flex-start">
      <div style="width:3px;align-self:stretch;border-radius:2px;
        background:${platColor};flex-shrink:0"></div>
      ${data.thumbnail
        ? `<img src="${data.thumbnail}" loading="lazy"
            style="width:72px;height:54px;object-fit:cover;border-radius:6px;flex-shrink:0"
            onerror="this.style.display='none'">`
        : `<div style="width:72px;height:54px;border-radius:6px;background:${platColor}22;
             flex-shrink:0;display:flex;align-items:center;justify-content:center;
             font-size:10px;color:${platColor};font-weight:500">${data.platform||'Web'}</div>`}
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
          <span style="font-size:9px;font-weight:600;color:${platColor}">${data.platform||'Web'}</span>
          ${data.type==='video' ? `<span class="badge b-rd" style="font-size:8px">Video</span>` : ''}
        </div>
        ${data.title
          ? `<div style="font-size:11px;font-weight:500;color:var(--txt);
               overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
               max-width:260px">${data.title}</div>` : ''}
        <div style="font-size:9px;color:var(--txt3);margin-top:2px">
          ${url.replace(/^https?:\/\//, '').slice(0, 50)}</div>
        ${data.embedUrl
          ? `<div style="font-size:9px;color:var(--grn);margin-top:3px">
               ✓ Embed destekleniyor — uygulama içinde oynatılacak</div>`
          : `<div style="font-size:9px;color:var(--amb);margin-top:3px">
               Link kartı olarak gösterilecek</div>`}
      </div>
    </div>`;
}
```

### Modal URL Input Alanı Güncellemesi

```js
// showMod("add-mb") içinde URL input:
`<div class="fg">
  <label class="fl">Video / Referans URL</label>
  <input class="inp" id="mbc-url" placeholder="https://..."
    oninput="onUrlInputChange(this,'url-preview-${fid}-${bid}')"
    onpaste="setTimeout(()=>onUrlInputChange(this,'url-preview-${fid}-${bid}'),100)">
  <div id="url-preview-${fid}-${bid}"></div>
</div>
<div class="fg">
  <label class="fl">
    Görsel / Video yükle
    <span style="font-weight:400;color:var(--txt3)"> — opsiyonel (URL girilirse otomatik)</span>
  </label>
  ...
</div>`
```

---

## 4. Performans Optimizasyonları

### 4.1 initApp() Paralel Hale Getirme

```js
// ❌ Mevcut — seri, yavaş
async function initApp() {
  await loadMembers();
  await loadFirms();
  for (const f of firms) { await loadBriefs(f.id); }
  renderSB(); goHome();
}

// ✅ Yeni — paralel
async function initApp() {
  await Promise.all([loadMembers(), loadFirms()]);
  await Promise.all(firms.map(f => loadBriefsMeta(f.id)));
  renderSB(); goHome();
}
```

### 4.2 Lazy Loading — Brief Detayları

```js
// loadBriefsMeta: sadece id, month, year, stage, _count
async function loadBriefsMeta(fid) {
  const data = await apiFetch(`/api/firms/${fid}/briefs?meta=true`);
  const f = gF(fid);
  f.briefs = data.map(b => ({
    id: b.id, month: b.month, year: b.year, stage: b.stage,
    _cardCount: b._count?.cards || 0,
    mbIG: null, mbKamp: null, tasks: null, igCells: null,
    _loaded: false,
  }));
}

// openBrief vb.'de:
async function openBrief(fid, bid) {
  const b = gB(fid, bid);
  if (!b._loaded) await loadBriefFull(fid, bid); // ilk açılışta tam veri
  // ... render
}
```

### 4.3 Skeleton Ekranlar

```css
@keyframes skel {
  0%,100% { opacity:.6; }
  50%     { opacity:.3; }
}
.skel {
  background: var(--bg2);
  border-radius: 6px;
  animation: skel 1.4s ease-in-out infinite;
}
```

```js
function firmaSkeleton() {
  return `
    <div class="fc" style="pointer-events:none">
      <div class="fc-cover">
        <div class="skel" style="position:absolute;inset:0"></div>
      </div>
      <div class="fc-body">
        <div style="display:flex;gap:6px;margin-bottom:6px">
          <div class="skel" style="width:70px;height:18px;border-radius:20px"></div>
          <div class="skel" style="width:90px;height:18px;border-radius:20px"></div>
        </div>
        <div class="skel" style="height:4px;border-radius:4px;margin-bottom:4px"></div>
        <div class="skel" style="width:120px;height:10px;border-radius:4px"></div>
      </div>
    </div>`;
}

// goHome başında:
// firms.length === 0 ise Array(3).fill(0).map(firmaSkeleton).join('')
```

### 4.4 Image Lazy Loading

```js
// Tüm <img>'lere loading="lazy" ekle
// IG Grid için IntersectionObserver:
function lazyLoadIGCells() {
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.dataset.src;
        if (src) { img.src = src; img.removeAttribute('data-src'); }
        observer.unobserve(img);
      }
    });
  }, { rootMargin: '100px' });
  document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
}

// IG hücre thumbnail:
`<img data-src="${cell.src}"
  src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
  loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`
```

### 4.5 Redis Cache

```ts
// src/lib/cache.ts
export async function getCached<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
  const cached = await redis.get(key).catch(() => null);
  if (cached) return JSON.parse(cached);
  const data = await fetcher();
  await redis.set(key, JSON.stringify(data), 'EX', ttl).catch(() => {});
  return data;
}

// Kullanım — firms route (60 sn cache):
const firms = await getCached(`firms:all`, 60, () =>
  db.firm.findMany({ include: { _count: true } })
);
// Firma güncellenince: await redis.del('firms:all')
```

---

## 5. Yeni Bağımlılıklar

```bash
npm install cheerio node-fetch
npm install -D @types/cheerio
```

Prisma değişikliği yok. Link preview sonuçları mevcut `mediaUrl` alanına kaydedilir.

---

## Sprint 2 Özeti

Sprint tamamlandığında:
- URL yapıştırınca otomatik thumbnail + başlık (YouTube, TikTok, Vimeo, IG, Pinterest, web)
- YouTube: API key gerekmez — `ytimg.com` direkt
- TikTok: oEmbed API (token yok), embed src + thumbnail
- Instagram/Pinterest: Open Graph scraping, og:image
- Modal'da 500ms debounce ile anlık önizleme kartı
- `initApp()` paralel → yükleme ~%70 azalır
- Skeleton ekranlar — boş ekran yerine placeholder
- Image lazy loading — ekran dışı görseller yüklenmez
- Redis cache — firma listesi 60 sn cache'lenir

| Sprint | Durum | İçerik |
|--------|-------|--------|
| Sprint 1 | ✓ | Video oynatma, carousel çoklu fotoğraf, tarih picker |
| Sprint 2 | ✓ | Link önizleme, thumbnail otomatik çekme, performans |
| Sprint 3 | ○ | UX/UI iyileştirmeleri |
| Sprint 4 | ○ | AI Caption, WebSocket |

---

*[Sprint 3 →](moodkit_sprint3.md)*
