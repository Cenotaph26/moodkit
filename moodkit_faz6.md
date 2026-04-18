# MoodKit — Faz 6: Dashboard Tasarım & Kod Referansı

> Buffer · Hootsuite · Later · Planable esinli  
> Referans: [Faz 3](moodkit_faz3.md) | [Faz 4](moodkit_faz4.md) | [Faz 5](moodkit_faz5.md)

---

## 1. İlham Alınan Uygulamalar

### Buffer → Firma Kartları

Buffer'ın sosyal hesap kart yapısı MoodKit'te firma kartına dönüştürüldü:

| Buffer | MoodKit |
|--------|---------|
| Platform ikonu | Firma rengi gradient kapak |
| Kuyruk sayısı | Onaylı/toplam kart progress bar |
| Hesap durumu | Brief aşama badge'i |
| Hover elevation | `translateY(-2px)` |

```css
.fc {
  background: var(--bg);
  border: 0.5px solid var(--bdr);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform .15s, border-color .15s;
}
.fc:hover { transform: translateY(-2px); border-color: var(--bdr2); }
.fc-cover  { height: 80px; position: relative; }
.fc-body   { padding: 10px 12px; }
```

### Hootsuite → Moodboard İçerik Grid

Her platform kendi rengiyle ayrışır, video içeriklerde oynat ikonu görünür.

**Platform renk kodları:**

| Platform | Renk | Embed Durumu |
|----------|------|-------------|
| YouTube | `#ff0000` | ✅ iframe embed |
| Instagram | gradient `#833ab4→#fd1d1d→#fcb045` | ⚠ embed dene → fallback |
| TikTok | `#010101` | ⚠ oEmbed API |
| Pinterest | `#E60023` | ❌ önizleme kartı |
| Vimeo | `#1AB7EA` | ✅ iframe embed |
| Behance | `#1769FF` | ❌ önizleme kartı |
| Web/Genel | `--acc` | ❌ önizleme kartı |
| MP4/Video | `--bg2` | ✅ `<video>` player |

```css
.mb-thumb { width: 100%; height: 90px; position: relative; overflow: hidden; }
.mb-ov    { position:absolute;inset:0;background:rgba(0,0,0,.3);opacity:0;transition:opacity .15s }
.mb-card:hover .mb-ov { opacity: 1; }
```

### Later → IG Grid Telefon Mockup

```css
.ig-mock {
  background: #fff;              /* Her zaman beyaz — IG gerçek görünümü */
  border: 0.5px solid #dbdbdb;
  border-radius: 14px;
  font-family: -apple-system, sans-serif;  /* Instagram gerçek fontu */
}
.ig-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5px;     /* Instagram'ın gerçek gap değeri */
  padding: 1.5px;
}
.igc { aspect-ratio: 1; position: relative; overflow: hidden; background: #f0f0f0; }
```

**Hücre ikonları:**
- Onaylı: sol alt `✓` (beyaz, drop-shadow)
- Reels: sağ üst `▶`  |  Carousel: sağ üst `⧉`
- Bekliyor: merkez `⏳` (rgba .3)
- Boş: dashed border + `+` merkez

### Planable → Kanban Onay Workflow

```css
.tc         { background:var(--bg);border:0.5px solid var(--bdr);border-radius:8px;padding:8px 9px;position:relative;overflow:hidden;cursor:grab }
.tc-acc     { position:absolute;left:0;top:0;bottom:0;width:3px }  /* Sol renk şeridi */
.tc.done    { opacity:.6 }
.tc.done .tc-title { text-decoration: line-through }
.tc.dragging { opacity:.3; transform:rotate(1.5deg) }
```

**Görev tipi renk şeritleri:**

| Tip | Renk |
|-----|------|
| Video | `#E24B4A` |
| Grafik | `#534AB7` |
| Fotoğraf | `#378ADD` |
| Metin | `#639922` |
| Animasyon | `#BA7517` |

---

## 2. Embed & Video Player Sistemi

### getLinkPlatform(url)

```js
function getLinkPlatform(url) {
  if (!url) return null;
  if (url.includes('youtube.com') || url.includes('youtu.be'))
    return { name:'YouTube',   color:'#ff0000', icon:'YT',  embed:true };
  if (url.includes('vimeo.com'))
    return { name:'Vimeo',     color:'#1AB7EA', icon:'Vi',  embed:true };
  if (/\.(mp4|mov|webm)$/i.test(url))
    return { name:'Video',     color:'#534AB7', icon:'mp4', embed:true };
  if (url.includes('tiktok.com'))
    return { name:'TikTok',    color:'#010101', icon:'TT',  embed:'oembed' };
  if (url.includes('instagram.com'))
    return { name:'Instagram', color:'#E1306C', icon:'IG',  embed:'try' };
  if (url.includes('pinterest.com'))
    return { name:'Pinterest', color:'#E60023', icon:'Pi',  embed:false };
  if (url.includes('behance.net'))
    return { name:'Behance',   color:'#1769FF', icon:'Be',  embed:false };
  return { name:'Link', color:'#534AB7', icon:'↗', embed:false };
}
```

### toEmbed(url)

```js
function toEmbed(url) {
  if (!url) return null;
  if (url.includes('/embed/')) return url;

  // YouTube
  if (url.includes('watch?v='))
    return `https://www.youtube.com/embed/${url.split('watch?v=')[1].split('&')[0]}?rel=0&modestbranding=1`;
  if (url.includes('youtu.be/'))
    return `https://www.youtube.com/embed/${url.split('youtu.be/')[1].split('?')[0]}?rel=0&modestbranding=1`;
  if (url.includes('/shorts/'))
    return `https://www.youtube.com/embed/${url.split('/shorts/')[1].split('?')[0]}`;

  // Vimeo
  if (url.includes('vimeo.com/'))
    return `https://player.vimeo.com/video/${url.split('vimeo.com/')[1].split('?')[0]}`;

  // Direkt dosya
  if (/\.(mp4|mov|webm)$/i.test(url)) return url;

  // Instagram Reels (embed dene)
  const igMatch = url.match(/instagram\.com\/reel\/([\w-]+)/);
  if (igMatch) return `https://www.instagram.com/reel/${igMatch[1]}/embed/`;

  return null; // TikTok, Pinterest, Web → null
}
```

### openVideoPlayer(mediaUrl, videoUrl, label)

```js
async function openVideoPlayer(mediaUrl, videoUrl, label) {
  const platform = getLinkPlatform(videoUrl);
  let embedSrc = toEmbed(videoUrl);

  // TikTok: backend oEmbed
  if (platform?.embed === 'oembed') {
    try {
      const r = await apiFetch('/api/oembed?url=' + encodeURIComponent(videoUrl));
      embedSrc = r.iframeSrc;
    } catch(e) { embedSrc = null; }
  }

  // Modal içerik kararı:
  // embed var → iframe (YouTube 16:9, TikTok/IG 9:16)
  // mp4/mov   → <video controls>
  // hiçbiri   → thumbnail + fallback UI

  showPlayerModal(buildPlayerHtml(embedSrc, videoUrl, mediaUrl, platform), label, platform);
}
```

### TikTok oEmbed — Backend Endpoint

```ts
// src/routes/oembed.ts
router.get('/', requireAuth, async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url gerekli' });

  try {
    const r = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    const data = await r.json();
    const srcMatch = data.html?.match(/src="([^"]+)"/);
    const iframeSrc = srcMatch?.[1] || null;
    if (!iframeSrc) return res.status(422).json({ error: 'embed desteklenmiyor' });
    res.json({ iframeSrc, title: data.title });
  } catch(e) {
    res.status(500).json({ error: 'oEmbed alınamadı' });
  }
});

// src/index.ts:
app.use('/api/oembed', requireAuth, oembedRouter);
```

### URL Input Uyarı Sistemi

```js
function onUrlChange(inputEl) {
  const url = inputEl.value.trim();
  const p = getLinkPlatform(url);
  const hint = document.getElementById('url-hint');

  if (p?.embed === false) {
    hint.innerHTML = `<span style="color:var(--amb);font-size:10px">
      ⚠ ${p.name} embed desteklenmiyor. Kapak görseli yükleyin.</span>`;
  } else if (p?.embed === 'oembed' || p?.embed === 'try') {
    hint.innerHTML = `<span style="color:var(--acc);font-size:10px">
      ✓ ${p.name} player destekleniyor. Thumbnail opsiyonel.</span>`;
  } else if (p?.embed === true) {
    hint.innerHTML = `<span style="color:var(--grn);font-size:10px">
      ✓ ${p.name} — otomatik embed edilecek.</span>`;
  } else {
    hint.innerHTML = '';
  }
}
```

---

## 3. Dashboard Bileşen Fonksiyonları

### calcStats()

```js
function calcStats() {
  const totalFirms = firms.length;

  const pendingApprovals = firms.reduce((acc, f) =>
    acc + f.briefs.reduce((ba, b) =>
      ba + [...b.mbIG, ...b.mbKamp].filter(c => c.status === 'pending').length
    , 0)
  , 0);

  const activeTasks = firms.reduce((acc, f) =>
    acc + f.briefs.reduce((ba, b) =>
      ba + b.tasks.filter(t => t.status === 'todo').length
    , 0)
  , 0);

  let totalCells = 0, approvedCells = 0;
  firms.forEach(f => f.briefs.forEach(b => {
    b.igCells.forEach(c => { totalCells++; if (c.approved === true) approvedCells++; });
  }));
  const igApprovalPct = totalCells ? Math.round(approvedCells / totalCells * 100) : 0;

  return { totalFirms, pendingApprovals, activeTasks, igApprovalPct };
}
```

### getFirmCoverSrc(firm)

```js
function getFirmCoverSrc(firm) {
  const lastBrief = firm.briefs[firm.briefs.length - 1];
  if (!lastBrief) return null;
  const approvedCell = lastBrief.igCells.find(c => c.approved && c.src);
  if (approvedCell) return approvedCell.src;
  return lastBrief.igCells.find(c => c.src)?.src || null;
}
```

### getFirmProgress(firm)

```js
function getFirmProgress(firm) {
  const lastBrief = firm.briefs[firm.briefs.length - 1];
  if (!lastBrief) return { approved:0, total:0, pending:0, pct:0 };
  const allCards = [...lastBrief.mbIG, ...lastBrief.mbKamp];
  const total    = allCards.length;
  const approved = allCards.filter(c => c.status === 'approved').length;
  const pending  = allCards.filter(c => c.status === 'pending').length;
  return { approved, total, pending, pct: total ? Math.round(approved/total*100) : 0 };
}
```

### mbThumbHtml(card) — Platform bazlı thumbnail

```js
function mbThumbHtml(card) {
  const cv   = card.versions?.[card.versions.length - 1];
  const url  = cv?.url || card.url || '';
  const img  = cv?.img || card.img;
  const plat = getLinkPlatform(url);

  // Video platform (YouTube, Vimeo, TikTok, IG)
  if (url && plat?.embed !== false) {
    return `
      <div style="position:absolute;inset:0;background:#0f0f0f;display:flex;align-items:center;justify-content:center">
        ${img ? `<img src="${img}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.6">` : ''}
        <div style="position:relative;z-index:1;width:30px;height:30px;border-radius:50%;
          background:rgba(255,255,255,.15);border:1.5px solid rgba(255,255,255,.3);
          display:flex;align-items:center;justify-content:center">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="white"><polygon points="4,2 10,6 4,10"/></svg>
        </div>
      </div>
      <div style="position:absolute;top:6px;right:6px;z-index:2">
        <span class="badge b-rd" style="font-size:8px">${plat.name}</span>
      </div>`;
  }

  // Link platformu (Pinterest, Behance, web)
  if (url && plat && !img) {
    return `<div style="position:absolute;inset:0;background:${plat.color};
      display:flex;align-items:center;justify-content:center">
      <span style="color:rgba(255,255,255,.8);font-size:16px;font-weight:600">${plat.icon}</span>
    </div>`;
  }

  // Görsel varsa
  if (img) return `<img src="${img}" loading="lazy">`;

  // Placeholder
  return `<div style="position:absolute;inset:0;background:linear-gradient(135deg,#1a1a2e,#2d1f08)"></div>`;
}
```

---

## 4. Aktivite Feed

```js
function renderActivityFeed(container) {
  container.innerHTML = notifs.slice(0, 20).map(n => `
    <div class="act-item">
      <div class="act-dot" style="background:${getNotifColor(n)}"></div>
      <div class="act-txt"><strong>${n.title}</strong> — ${n.sub}</div>
      <div class="act-time">${formatTime(n.createdAt)}</div>
    </div>`
  ).join('') || '<div style="padding:16px;text-align:center;font-size:11px;color:var(--txt3)">Henüz aktivite yok</div>';
}

function getNotifColor(n) {
  if (n.title.includes('onaylandı'))  return '#534AB7';
  if (n.title.includes('reddedildi')) return '#A32D2D';
  if (n.title.includes('yüklendi'))   return '#27500A';
  if (n.title.includes('tamamlandı')) return '#27500A';
  if (n.title.includes('atandı'))     return '#534AB7';
  if (n.title.includes('güncellendi'))return '#633806';
  return '#9a9a94';
}

function formatTime(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const min = Math.floor(diff / 60000);
  const hour = Math.floor(diff / 3600000);
  if (min < 1)   return 'Az önce';
  if (min < 60)  return `${min} dk`;
  if (hour < 24) return `${hour} sa`;
  return 'Dün';
}
```

---

## 5. Layout CSS

```css
/* Ana layout */
.app   { display:flex; flex-direction:column; min-height:100vh }
.body  { display:flex; flex:1; min-height:0; overflow:hidden }
.sidebar { width:204px; flex-shrink:0; overflow-y:auto; border-right:0.5px solid var(--bdr) }
.content { flex:1; overflow-y:auto; background:var(--bg3); padding:20px }

/* Dashboard grid'leri */
.stats      { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px }
.firma-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px }
.two-col    { display:grid; grid-template-columns:1fr 340px; gap:16px }
.mb-grid    { display:grid; grid-template-columns:repeat(3,1fr); gap:8px }
.kb-cols    { display:grid; grid-template-columns:repeat(3,1fr); gap:8px }
```

### goHome() şablonu

```js
function goHome() {
  curFid = null; curBid = null;
  setSBI('home');
  setBC([{ label: 'Dashboard' }]);

  const { totalFirms, pendingApprovals, activeTasks, igApprovalPct } = calcStats();

  document.getElementById('v-home').innerHTML = `
    <div class="pg-hd">
      <div>
        <div class="pg-title">Dashboard</div>
        <div class="pg-sub">${totalFirms} aktif firma</div>
      </div>
      <button class="btn btn-p" onclick="showMod('add-firm')">+ Firma Ekle</button>
    </div>

    <div class="stats">
      <div class="stat"><div class="stat-lbl">Aktif Firmalar</div><div class="stat-val">${totalFirms}</div></div>
      <div class="stat"><div class="stat-lbl">Bekleyen Onay</div><div class="stat-val">${pendingApprovals}</div></div>
      <div class="stat"><div class="stat-lbl">Aktif Görev</div><div class="stat-val">${activeTasks}</div></div>
      <div class="stat"><div class="stat-lbl">IG Onay</div><div class="stat-val">${igApprovalPct}%</div></div>
    </div>

    <div class="sec-hd"><span class="sec-title">Firmalar</span></div>
    <div class="firma-grid">
      ${firms.map(renderFirmaCard).join('')}
      <div class="fc fc-add" onclick="showMod('add-firm')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" opacity=".4">
          <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="1.5"/>
          <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        <span style="font-size:11px">Firma ekle</span>
      </div>
    </div>

    ${firms.length ? activeMoodboardSection() : ''}
    ${firms.length ? kanbanPreviewSection() : ''}
  `;

  showV('home');
  renderSB();
  renderN();
}
```

---

## 6. CSS Değişkenler (Root)

```css
:root {
  --bg: #ffffff;   --bg2: #f7f6f3;   --bg3: #efefeb;
  --txt: #1a1a18;  --txt2: #5a5a54;  --txt3: #9a9a94;
  --bdr: rgba(0,0,0,.07);  --bdr2: rgba(0,0,0,.14);
  --acc: #534AB7;  --abg: #EEEDFE;  --atxt: #3C3489;
  --grn: #27500A;  --gbg:  #EAF3DE;
  --amb: #633806;  --ambg: #FAEEDA;
  --red: #A32D2D;  --rbg:  #FCEBEB;
  --blu: #0C447C;  --bbg:  #E6F1FB;
  --r6: 6px; --r8: 8px; --r12: 12px; --r16: 16px;
}
```

### Responsive kırılma noktaları

| Genişlik | Değişim |
|----------|---------|
| > 1200px | Tam layout — tüm bileşenler yan yana |
| 900–1200px | Stat: 2x2, two-col: tek kolon |
| 768–900px | Firma grid: 2 kolon |
| < 768px | Sidebar gizlenir |
| < 480px | Firma grid: 1 kolon, stat: dikey |

---

*← [Faz 5: Geliştirici Rehberi](moodkit_faz5.md)*
