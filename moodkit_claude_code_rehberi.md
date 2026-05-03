# MoodKit — Claude Code Geliştirme Rehberi

> Bu dosyayı Claude Code'a ver:
> **"Bu dokümandaki tasarım sistemi, bileşenler ve sayfa yapılarını kullanarak MoodKit'in `public/index.html` dosyasını ve Express backend'ini yaz."**

---

## 1. Proje Genel Bakış

**MoodKit** — Kreatif ajansların müşterileriyle içerik üretim ve onay süreçlerini yönettiği web uygulaması.

| Özellik | Değer |
|---------|-------|
| Backend | Node.js + TypeScript + Express |
| ORM | Prisma + PostgreSQL |
| Cache | Redis |
| Frontend | Vanilla JS — tek dosya SPA (`public/index.html`) |
| Deploy | Railway |
| Font | Inter (Google Fonts) |

---

## 2. Klasör Yapısı

```
moodkit/
├── src/
│   ├── index.ts
│   ├── routes/
│   │   ├── firms.ts
│   │   ├── briefs.ts
│   │   ├── moodboard.ts        # IG Moodboard kartları
│   │   ├── kamp-moodboard.ts   # Kampanya MB kartları
│   │   ├── ig-grid.ts
│   │   ├── tasks.ts
│   │   ├── members.ts
│   │   └── link-preview.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── requireRole.ts
│   └── lib/
│       ├── db.ts               # Prisma client singleton
│       ├── redis.ts
│       └── cache.ts
├── public/
│   └── index.html              # Tüm frontend burası
├── prisma/
│   └── schema.prisma
└── package.json
```

---

## 3. Design System — CSS Token'ları

```css
/* index.html <style> içine :root olarak ekle */
:root {
  /* Arka plan katmanları */
  --bg:  #f0ede6;   /* Sayfa zemini — krem */
  --bg2: #e8e4da;   /* İkincil yüzey */
  --bg3: #dedad0;   /* Üçüncül yüzey */

  /* Kart */
  --card: #ffffff;

  /* Siyah ramp */
  --blk:  #1a1a18;  /* Primary buton, başlık, ana accent */
  --blk2: #2c2c28;  /* Hover */

  /* Amber ramp */
  --amb:  #C8720A;  /* CTA buton, Onayla, Yayınla */
  --ambL: #FEF3DC;  /* Açık amber bg */

  /* Gri ramp */
  --gry:  #ede9e0;  /* Hover bg, kanban kolon bg */
  --gry2: #d8d4ca;  /* Surface buton bg, segmented bg, border */
  --gry3: #b4b0a6;  /* Muted kenarlık */

  /* Metin */
  --t1: #1a1a18;    /* Birincil metin */
  --t2: #5c5852;    /* İkincil metin */
  --t3: #9c9890;    /* Üçüncül / placeholder / etiket */

  /* Kenarlıklar */
  --bdr:  rgba(26,26,24,.09);
  --bdr2: rgba(26,26,24,.18);

  /* Durum — Onaylı */
  --ok-c:  #1a5c1a;
  --ok-bg: rgba(26,92,26,.08);
  --ok-br: rgba(26,92,26,.18);

  /* Durum — Bekliyor */
  --wt-c:  #8a5000;
  --wt-bg: #FEF3DC;
  --wt-br: rgba(200,114,10,.22);

  /* Durum — Revize / Hata */
  --er-c:  #7a1818;
  --er-bg: rgba(160,30,30,.08);
  --er-br: rgba(160,30,30,.18);
}
```

---

## 4. Tipografi Skalası

```
Display  → 16px / font-weight:600 / letter-spacing:-.35px  → Sayfa başlıkları (.ph)
Title    → 13px / font-weight:500 / letter-spacing:-.2px   → Kart başlıkları
Body     → 12px / font-weight:400                          → Form, paragraph içerik
Small    → 11px / font-weight:400                          → Meta bilgi, hücre içi
Caption  → 10px / font-weight:400 / color:var(--t3)        → Timestamp, subtitle
Label    → 9px  / font-weight:500 / uppercase / tracking:.06em → Form label (.fl)
Micro    → 9px  / font-weight:600                          → Badge içi
Nano     → 8-7px                                           → Platform rozeti, versiyon
```

---

## 5. Buton Sistemi

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-family: 'Inter', system-ui, sans-serif;
  cursor: pointer;
  font-weight: 500;
  letter-spacing: -.1px;
  transition: all .12s;
  white-space: nowrap;
  border: none;
}
.btn:active { transform: scale(.97); }

/* ── Varyantlar ── */
.btn.solid   { background:var(--blk);  color:#fff;        border-radius:999px; padding:0 16px; height:34px; font-size:12px; }
.btn.solid:hover   { background:var(--blk2); }

.btn.amber   { background:var(--amb);  color:#fff;        border-radius:999px; padding:0 16px; height:34px; font-size:12px; }
.btn.amber:hover   { background:#a85d08; }

.btn.outline { background:var(--card); color:var(--blk);  border:1.5px solid var(--bdr2); border-radius:999px; padding:0 14px; height:34px; font-size:12px; }
.btn.outline:hover { background:var(--gry); }

.btn.surface { background:var(--gry2); color:var(--blk); border-radius:999px; padding:0 14px; height:34px; font-size:12px; }
.btn.surface:hover { background:var(--gry3); }

.btn.out-a   { background:var(--card); color:var(--amb);  border:1.5px solid var(--amb); border-radius:999px; padding:0 14px; height:34px; font-size:12px; }
.btn.out-a:hover   { background:var(--ambL); }

/* ── Boyutlar ── */
.btn.sm { height:28px; padding:0 12px; font-size:11px; }
.btn.xs { height:22px; padding:0 9px;  font-size:10px; }
.btn.lg { height:40px; padding:0 20px; font-size:13px; }

/* ── İkon-only ── */
.btn.ico    { border-radius:50%; padding:0; }
.btn.ico.md { width:34px; height:34px; }
.btn.ico.sm { width:28px; height:28px; }
.btn.ico.xs { width:22px; height:22px; }
```

**Kullanım örnekleri:**
```html
<button class="btn solid">+ Firma Ekle</button>
<button class="btn solid sm"><svg .../>Brief Ekle</button>
<button class="btn amber sm">Onayla</button>
<button class="btn amber xs">Yayınla</button>
<button class="btn outline sm">Düzenle</button>
<button class="btn outline xs">İptal</button>
<button class="btn surface xs">Tümünü gör</button>
<button class="btn out-a xs">Revize</button>
<button class="btn ico md solid"><svg .../></button>
```

---

## 6. Badge Sistemi

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 600;
  white-space: nowrap;
}

/* Durum badge'leri */
.b-ok  { background:var(--ok-bg); color:var(--ok-c); border:.5px solid var(--ok-br); }
.b-rv  { background:#e0ddd6;       color:#3a3832;     border:.5px solid #c4c0b8; }      /* İnceleme */
.b-wt  { background:var(--wt-bg); color:var(--wt-c); border:.5px solid var(--wt-br); } /* Bekliyor */
.b-er  { background:var(--er-bg); color:var(--er-c); border:.5px solid var(--er-br); } /* Revize/Hata */
.b-blk { background:var(--blk);   color:#fff; }                                         /* Admin, siyah pill */
.b-amb { background:var(--ambL);  color:#7a4000; border:.5px solid var(--wt-br); }
.b-gry { background:#c8c4bc;      color:#2a2a24; border:.5px solid #a8a49c; }           /* Nötr */
```

---

## 7. Tag / Filtre Pill

```css
.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all .1s;
}
.tag.filled { background:var(--blk); color:#fff; }
.tag.ot     { background:var(--card); color:var(--t1); border:1.5px solid var(--bdr2); }
.tag.ot:hover { background:var(--gry); }
.tag.sf     { background:var(--gry2); color:var(--t1); }
.tag.sf:hover { background:var(--gry3); }
```

---

## 8. Segmented Control

```css
.seg   { display:inline-flex; background:var(--gry2); border-radius:10px; padding:2px; gap:1px; }
.seg-b { padding:4px 11px; border-radius:8px; font-size:11px; font-weight:500; cursor:pointer; color:var(--t2); border:none; background:transparent; font-family:'Inter',system-ui; transition:all .1s; }
.seg-b.on { background:var(--card); color:var(--t1); box-shadow:0 1px 3px rgba(0,0,0,.08); }
```

```html
<div class="seg">
  <button class="seg-b on">Tümü 9</button>
  <button class="seg-b">Post 3</button>
  <button class="seg-b">Reels 4</button>
  <button class="seg-b">Carousel 2</button>
</div>
```

---

## 9. Form Elemanları

```css
/* Label */
.fl {
  font-size: 9px; font-weight: 500; color: var(--t3);
  text-transform: uppercase; letter-spacing: .06em;
  margin-bottom: 4px; display: block;
}

/* Input — yuvarlak */
.inp {
  width: 100%; height: 36px; padding: 0 12px;
  border: 1px solid var(--bdr2); border-radius: 10px;
  font-size: 12px; color: var(--t1); background: var(--card);
  font-family: 'Inter', system-ui; outline: none;
}
.inp:focus { border-color: var(--blk); box-shadow: 0 0 0 3px rgba(26,26,24,.06); }

/* Textarea */
.ta { min-height: 72px; padding: 10px 12px; resize: vertical; border-radius: 10px; line-height: 1.5; }

/* Arama kutusu (pill şekli) */
.inp-row {
  display: flex; align-items: center; gap: 7px;
  padding: 0 12px; height: 36px;
  border: 1px solid var(--bdr2); border-radius: 999px; background: var(--card);
}
.inp-row input { border:none; outline:none; flex:1; font-size:12px; color:var(--t1); background:transparent; font-family:'Inter',system-ui; }
.inp-row input::placeholder { color: var(--t3); }
```

---

## 10. Aşama Navigation Pill'leri (Brief sayfası)

```css
.stage-nav  { display:flex; align-items:center; gap:5px; flex-wrap:nowrap; overflow-x:auto; padding-bottom:2px; margin-bottom:16px; }
.stage-pill { padding:5px 12px; border-radius:999px; font-size:10px; font-weight:500; cursor:pointer; white-space:nowrap; transition:all .12s; user-select:none; }
.stage-pill.done   { background:var(--ok-bg); color:var(--ok-c); border:.5px solid var(--ok-br); }
.stage-pill.active { background:var(--blk);   color:#fff; }
.stage-pill.todo   { background:var(--gry2);  color:var(--t2);  border:.5px solid var(--bdr); }
.stage-pill.todo:hover { background:var(--gry3); color:var(--t1); }
.stage-arrow { color:var(--t3); font-size:11px; flex-shrink:0; }
```

```html
<div class="stage-nav">
  <span class="stage-pill done"   onclick="go('brief')">✓ Brief</span>
  <span class="stage-arrow">→</span>
  <span class="stage-pill active" onclick="go('mb')">● IG Moodboard</span>
  <span class="stage-arrow">→</span>
  <span class="stage-pill todo"   onclick="go('mb-kamp')">Kampanya MB</span>
  <span class="stage-arrow">→</span>
  <span class="stage-pill todo"   onclick="go('tasks')">Görevler</span>
  <span class="stage-arrow">→</span>
  <span class="stage-pill todo"   onclick="go('yayin')">Yayın</span>
</div>
```

---

## 11. Kart Bileşenleri

### 11.1 Stat Kartı

```css
.stat   { background:var(--card); border-radius:12px; border:1px solid var(--bdr); padding:14px 16px; }
.stat-l { font-size:10px; font-weight:500; color:var(--t3); text-transform:uppercase; letter-spacing:.06em; margin-bottom:4px; }
.stat-v { font-size:22px; font-weight:600; color:var(--t1); letter-spacing:-.5px; line-height:1; }
.stat-c { font-size:10px; margin-top:3px; }
```

```html
<div class="stat">
  <div class="stat-l">Bekleyen Onay</div>
  <div class="stat-v">12</div>
  <div class="stat-c" style="color:var(--er-c)">4 yeni eklendi</div>
</div>
```

### 11.2 Moodboard Kartı

```css
.mb-card { background:var(--card); border-radius:12px; border:1px solid var(--bdr); overflow:hidden; position:relative; cursor:pointer; transition:border-color .12s,transform .12s; }
.mb-card:hover { border-color:var(--bdr2); transform:translateY(-1px); }

/* Sol durum şeridi */
.mb-card::before { content:""; position:absolute; left:0; top:0; bottom:0; width:3px; z-index:1; }
.mb-card[data-s="ok"]::before { background:rgba(26,92,26,.55); }
.mb-card[data-s="rv"]::before { background:var(--gry3); }
.mb-card[data-s="wt"]::before { background:var(--amb); }
.mb-card[data-s="er"]::before { background:rgba(160,30,30,.6); }

/* Hover overlay */
.mb-ov { position:absolute; inset:0; background:rgba(0,0,0,.3); opacity:0; transition:opacity .12s; display:flex; align-items:center; justify-content:center; gap:5px; z-index:2; }
.mb-card:hover .mb-ov { opacity:1; }
.mb-ov-btn { width:24px; height:24px; border-radius:50%; background:rgba(255,255,255,.92); display:flex; align-items:center; justify-content:center; font-size:10px; cursor:pointer; border:none; }

/* Platform rozeti */
.mb-plat { position:absolute; top:6px; left:8px; z-index:2; padding:2px 6px; border-radius:4px; font-size:7px; font-weight:600; color:#fff; }
```

**Platform renkleri:**
```
YT  → background:#cc2200
IG  → background:rgba(0,0,0,.35)   (üstünde gradient var)
TT  → background:rgba(255,255,255,.15)
Pi  → background:rgba(0,0,0,.35)
Vi  → background:#1AB7EA
Web → background:var(--gry3)
Görsel → background:var(--gry3)
```

**Tam HTML şablonu:**
```html
<div class="mb-card" data-s="ok">
  <div style="height:82px; background:#1a1a18; display:flex; align-items:center; justify-content:center; position:relative;">
    <!-- Oynat ikonu (video kartları için) -->
    <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center">
      <svg width="9" height="9" viewBox="0 0 12 12" fill="white"><polygon points="4,2 10,6 4,10"/></svg>
    </div>
    <!-- Platform rozeti -->
    <div class="mb-plat" style="background:#cc2200">YT</div>
    <!-- Versiyon badge -->
    <div style="position:absolute;top:6px;right:8px;z-index:2">
      <span style="background:rgba(255,255,255,.18);color:#fff;font-size:7px;padding:1px 5px;border-radius:4px;font-weight:600">v2</span>
    </div>
    <!-- Hover overlay -->
    <div class="mb-ov">
      <div class="mb-ov-btn">↗</div>
      <div class="mb-ov-btn" style="color:var(--er-c)">✕</div>
    </div>
  </div>
  <div style="padding:8px 9px 9px 11px">
    <div style="font-size:11px;font-weight:500;margin-bottom:3px">Smoothie Serisi</div>
    <div style="display:flex;align-items:center;justify-content:space-between">
      <span class="badge b-ok">Onaylı</span>
      <span style="font-size:9px;color:var(--t3)">22 Nis</span>
    </div>
  </div>
</div>
```

### 11.3 Firma Kartı

```html
<div style="background:var(--card);border-radius:12px;border:1px solid var(--bdr);overflow:hidden;cursor:pointer" onclick="go('brief')">
  <!-- Kapak -->
  <div style="height:70px;background:#1a1a18;position:relative;display:flex;align-items:flex-end;padding:8px 12px;">
    <div style="position:absolute;inset:0;background:linear-gradient(155deg,#2c2c28,#1a1a18)"></div>
    <div style="position:relative;z-index:1">
      <div style="font-size:12px;font-weight:600;color:#fff">Assos Kahve</div>
      <div style="font-size:10px;color:rgba(255,255,255,.38);margin-top:1px">Kafe / F&B</div>
    </div>
  </div>
  <!-- Bilgi -->
  <div style="padding:10px 12px">
    <div style="display:flex;justify-content:space-between;margin-bottom:5px">
      <span class="badge b-wt">Nis 2026</span>
      <span class="badge b-rv">IG Moodboard</span>
    </div>
    <div class="prog"><div class="pf" style="width:60%"></div></div>
    <div style="font-size:9px;color:var(--t3);margin-top:3px">9/15 onaylı · 3 bekliyor</div>
  </div>
</div>
```

### 11.4 Kanban Görev Kartı

```css
.kb-col { background:var(--gry); border-radius:12px; padding:10px; }
.kb-ch  { display:flex; align-items:center; justify-content:space-between; margin-bottom:9px; }
.kb-t   { font-size:12px; font-weight:500; color:var(--t1); }
.tc     { background:var(--card); border-radius:10px; border:1px solid var(--bdr); padding:10px 11px; margin-bottom:5px; position:relative; overflow:hidden; cursor:grab; }
.tc:hover { border-color:var(--bdr2); }
.tc-acc { position:absolute; left:0; top:0; bottom:0; width:3px; }
```

```html
<div class="tc">
  <div class="tc-acc" style="background:var(--amb)"></div>
  <div style="font-size:11px;font-weight:500;padding-left:9px;margin-bottom:2px">Smoothie Reels</div>
  <div style="font-size:9px;color:var(--t3);padding-left:9px;margin-bottom:6px">9:16 · 30sn · 4K</div>
  <div style="padding-left:9px;margin-bottom:5px"><span class="badge b-wt">Video</span></div>
  <!-- Checklist progress (opsiyonel) -->
  <div style="padding-left:9px;margin-bottom:4px">
    <div style="display:flex;justify-content:space-between;font-size:8px;color:var(--t3);margin-bottom:2px"><span>Checklist</span><span>2/4</span></div>
    <div class="prog"><div class="pf" style="width:50%"></div></div>
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;padding-left:9px">
    <div style="display:flex;align-items:center;gap:4px">
      <div style="width:18px;height:18px;border-radius:50%;background:var(--gry2);display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:600;color:var(--t2)">CD</div>
      <span style="font-size:9px;color:var(--t2)">Can D.</span>
    </div>
    <span class="badge b-er">22 Nis</span>
  </div>
</div>
```

### 11.5 Kampanya İş Kartı

```html
<div style="background:var(--card);border-radius:12px;border:1px solid var(--bdr);overflow:hidden;border-color:rgba(200,114,10,.3)">
  <!-- Durum başlık bandı -->
  <div style="background:var(--ambL);padding:10px 12px;border-bottom:1px solid rgba(200,114,10,.2)">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <span class="badge b-wt">Müşteri Talebi</span>
      <span style="font-size:9px;color:var(--t3)">18 Nis</span>
    </div>
  </div>
  <!-- İçerik -->
  <div style="padding:12px">
    <div style="font-size:13px;font-weight:600;margin-bottom:4px">Billboard Tasarımı</div>
    <div style="font-size:11px;color:var(--t2);margin-bottom:10px;line-height:1.55">
      Ana cadde billboard'u. 14×4m format. Smoothie sezonunu duyuracak. Koyu arka plan, ürün görseli ön planda.
    </div>
    <!-- Özellik kutuları -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px">
      <div style="background:var(--gry);border-radius:8px;padding:8px">
        <div style="font-size:9px;color:var(--t3);margin-bottom:2px">Format</div>
        <div style="font-size:11px;font-weight:500">14×4m</div>
      </div>
      <div style="background:var(--gry);border-radius:8px;padding:8px">
        <div style="font-size:9px;color:var(--t3);margin-bottom:2px">Teslim</div>
        <div style="font-size:11px;font-weight:500">25 Nisan</div>
      </div>
    </div>
    <!-- Butonlar -->
    <div style="display:flex;gap:5px">
      <button class="btn solid xs" style="flex:1;justify-content:center">Göreve Dönüştür</button>
      <button class="btn outline xs">Düzenle</button>
    </div>
  </div>
</div>
```

### 11.6 Info Block

```css
.info     { display:flex; gap:9px; padding:10px 12px; border-radius:10px; font-size:11px; line-height:1.55; }
.info.ok  { background:var(--ok-bg); color:var(--ok-c); }
.info.wt  { background:var(--wt-bg); color:var(--wt-c); }
.info.er  { background:var(--er-bg); color:var(--er-c); }
.info-ico { width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }
```

```html
<div class="info wt">
  <div class="info-ico" style="background:var(--amb)">
    <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
      <path d="M6 3v4M6 9v.5" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  </div>
  <div><strong style="font-weight:600">4 kart onayınızı bekliyor.</strong> Her kartı inceleyip onayla veya revize isteyin.</div>
</div>
```

### 11.7 List Cell

```css
.cell { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; border:1px solid var(--bdr); background:var(--card); cursor:pointer; transition:all .1s; margin-bottom:5px; }
.cell:hover { background:var(--gry); border-color:var(--bdr2); }
```

### 11.8 Progress Bar

```css
.prog { height:2px; background:var(--gry2); border-radius:2px; overflow:hidden; margin:4px 0; }
.pf   { height:100%; border-radius:2px; background:var(--blk); }
```

### 11.9 Skeleton

```css
.skel { background:var(--gry); border-radius:6px; animation:sk 1.4s ease infinite; }
@keyframes sk { 0%,100%{opacity:.75} 50%{opacity:.38} }
```

### 11.10 IG Grid Hücresi

```css
.igcell      { border-radius:8px; overflow:hidden; position:relative; cursor:pointer; background:var(--gry2); aspect-ratio:1; }
.igcell-ov   { position:absolute; inset:0; background:rgba(0,0,0,.3); opacity:0; transition:opacity .12s; display:flex; align-items:flex-end; justify-content:space-between; padding:6px; }
.igcell:hover .igcell-ov { opacity:1; }
.igcell-btn  { width:24px; height:24px; border-radius:50%; background:rgba(255,255,255,.92); display:flex; align-items:center; justify-content:center; font-size:10px; cursor:pointer; border:none; }
.igcell.empty { border:1.5px dashed var(--bdr2); display:flex; align-items:center; justify-content:center; }
.igcell.empty:hover { border-color:var(--blk); }
```

**IG hücre ikonları (absolute konumlu):**
```html
<!-- Sağ üst: içerik tipi -->
<div style="position:absolute;top:5px;right:5px;color:#fff;font-size:10px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.8));z-index:1">▶</div>  <!-- Reels -->
<div style="position:absolute;top:5px;right:5px;...">⧉</div>  <!-- Carousel -->
<!-- Sağ alt: onay durumu -->
<div style="position:absolute;bottom:5px;right:5px;color:#fff;font-size:10px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.8));z-index:1">✓</div>
```

### 11.11 IG Profil Önizleme (Telefon Mockup)

```css
/* Container: width:184px (dashboard'da) */
.ig-phone   { background:#fff; border:.5px solid #dbdbdb; border-radius:13px; overflow:hidden; }
.ig-ph-top  { padding:3px 9px 0; display:flex; justify-content:space-between; font-size:8px; font-weight:700; color:#1a1a1a; font-family:system-ui; }
.ig-ph-hdr  { display:flex; align-items:center; padding:6px 9px; border-bottom:.5px solid #dbdbdb; gap:6px; }
.ig-ph-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; padding:1px; }
.ig-ph-cell { aspect-ratio:1; background:#f0f0f0; }
```

```html
<div class="ig-phone">
  <div class="ig-ph-top"><span>9:41</span><span>●●●</span></div>
  <div class="ig-ph-hdr">
    <div style="width:22px;height:22px;border-radius:50%;background:#1a1a18;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;color:#fff;font-family:system-ui;flex-shrink:0">AK</div>
    <span style="font-size:9px;font-weight:700;color:#1a1a1a;font-family:system-ui">assos_kahve</span>
  </div>
  <div class="ig-ph-grid">
    <div class="ig-ph-cell" style="background:#1c1917"></div>
    <div class="ig-ph-cell" style="background:#0a0a0f"></div>
    <div class="ig-ph-cell" style="background:#2d1f08"></div>
    <div class="ig-ph-cell" style="background:#111827"></div>
    <div class="ig-ph-cell" style="background:var(--gry)"></div>
    <div class="ig-ph-cell" style="background:#1a1208"></div>
  </div>
</div>
```

---

## 12. App Shell Yapısı

```css
/* Boşluk yok, tam ekran */
* { box-sizing:border-box; margin:0; padding:0; }
html, body { height:100%; overflow:hidden; }
body { font-family:'Inter',system-ui,sans-serif; color:var(--t1); background:var(--bg); -webkit-font-smoothing:antialiased; }

/* Shell */
.app    { display:flex; flex-direction:column; height:100vh; }
.tb     { height:48px; background:var(--card); border-bottom:1px solid var(--bdr); display:flex; align-items:center; padding:0 18px; gap:12px; flex-shrink:0; }
.layout { display:flex; flex:1; overflow:hidden; min-height:0; }
.sb     { width:196px; background:var(--card); border-right:1px solid var(--bdr); display:flex; flex-direction:column; overflow-y:auto; flex-shrink:0; padding:10px 0 12px; }
.cnt    { flex:1; overflow-y:auto; padding:20px 22px; background:var(--bg); min-height:0; }

/* Sayfa görünürlüğü */
.page    { display:none; }
.page.on { display:block; }
```

---

## 13. Sidebar HTML + CSS

```css
.sb-lbl      { font-size:10px; font-weight:500; color:var(--t3); letter-spacing:.07em; text-transform:uppercase; padding:10px 14px 4px; display:block; }
.sb-nav      { display:flex; align-items:center; gap:9px; padding:6px 10px; border-radius:8px; margin:0 6px 1px; cursor:pointer; font-size:12px; color:var(--t2); transition:background .1s,color .1s; white-space:nowrap; }
.sb-nav:hover{ background:var(--gry); color:var(--t1); }
.sb-nav.on   { background:var(--blk); color:#fff; font-weight:500; }
.sb-nav svg  { flex-shrink:0; opacity:.5; }
.sb-nav.on svg { opacity:1; }
.sb-hr       { height:1px; background:var(--bdr); margin:8px 12px; }
.firm-row    { display:flex; align-items:center; justify-content:space-between; padding:6px 10px; border-radius:8px; margin:0 6px 1px; cursor:pointer; font-size:12px; font-weight:500; color:var(--t1); transition:background .1s; }
.firm-row:hover { background:var(--gry); }
.firm-count  { font-size:10px; font-weight:400; color:var(--t3); }
.sub-link    { display:block; padding:5px 10px 5px 20px; border-radius:8px; margin:0 6px 1px; font-size:11px; color:var(--t3); cursor:pointer; transition:background .1s,color .1s; }
.sub-link:hover { background:var(--gry); color:var(--t2); }
.sub-link.on { color:var(--t1); font-weight:500; }
.sub-link.on::before { content:""; display:inline-block; width:3px; height:3px; border-radius:50%; background:var(--t1); margin-right:6px; vertical-align:middle; margin-bottom:1px; }
.sb-add      { display:flex; align-items:center; gap:7px; padding:6px 10px; border-radius:8px; margin:4px 6px 0; font-size:12px; color:var(--amb); cursor:pointer; transition:background .1s; }
.sb-add:hover { background:var(--ambL); }
```

```html
<div class="sb">
  <span class="sb-lbl">Genel</span>
  <div class="sb-nav on" id="si-home" onclick="go('home')">
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M2 7.5L8 2l6 5.5V14a.5.5 0 01-.5.5h-3.5V10h-4v4.5H2.5A.5.5 0 012 14V7.5z" stroke="currentColor" stroke-width="1.2"/>
    </svg>
    Dashboard
  </div>
  <div class="sb-nav" id="si-pers" onclick="go('pers')">
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" stroke-width="1.2"/>
      <path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" stroke-width="1.2"/>
    </svg>
    Görevlerim
    <span class="badge b-amb" style="font-size:8px;padding:1px 5px;margin-left:auto">3</span>
  </div>
  <div class="sb-nav" id="si-cust" onclick="go('cust')">
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
      <path d="M5 7h6M5 9.5h4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
    </svg>
    Müşteri Paneli
  </div>
  <div class="sb-hr"></div>
  <span class="sb-lbl">Firmalar</span>

  <!-- Firma bloğu — tekrar et her firma için -->
  <div class="firm-row" onclick="toggleFirm('f1')">
    <span style="font-size:12px;font-weight:500">Assos Kahve</span>
    <span class="firm-count" id="cnt-f1">6 brief</span>
  </div>
  <div id="subs-f1">
    <div class="sub-link on"  onclick="go('brief')">Nisan 2026</div>
    <div class="sub-link"     onclick="go('mb')">IG Moodboard</div>
    <div class="sub-link"     onclick="go('mb-kamp')">Kampanya MB</div>
    <div class="sub-link"     onclick="go('ig')">IG Grid</div>
    <div class="sub-link"     onclick="go('tasks')">Görevler</div>
    <div class="sub-link"     onclick="go('yayin')">Yayın</div>
  </div>

  <div class="sb-hr"></div>
  <div class="sb-add">
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" stroke-width="1.5"/>
      <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1.5"/>
    </svg>
    Firma ekle
  </div>
</div>
```

---

## 14. Navigasyon JavaScript

```js
// ─── Sayfa haritası ──────────────────────────────────────
const bcMap = {
  home:      'Dashboard',
  brief:     'Assos Kahve · Brief',
  mb:        'Assos Kahve · IG Moodboard',
  'mb-kamp': 'Assos Kahve · Kampanya MB',
  ig:        'Assos Kahve · IG Grid',
  tasks:     'Assos Kahve · Görevler',
  pers:      'Görevlerim',
  cust:      'Müşteri Paneli',
  yayin:     'Yayın Takvimi',
};

// Sidebar ana nav öğesi → sayfa eşlemesi
const siMap = {
  home: 'si-home',
  pers: 'si-pers',
  cust: 'si-cust',
};

// Alt sayfa sırası (subs-f1 içindeki sıra)
const subMap = {
  brief: 0, mb: 1, 'mb-kamp': 2, ig: 3, tasks: 4, yayin: 5,
};

// ─── Ana geçiş fonksiyonu ─────────────────────────────────
function go(id) {
  // 1. Sayfa göster
  document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
  document.getElementById('page-' + id)?.classList.add('on');

  // 2. Sidebar ana nav
  document.querySelectorAll('.sb-nav').forEach(s => s.classList.remove('on'));
  if (siMap[id]) document.getElementById(siMap[id])?.classList.add('on');

  // 3. Sub-link aktif
  document.querySelectorAll('.sub-link').forEach(s => s.classList.remove('on'));
  if (subMap[id] !== undefined) {
    const links = document.querySelectorAll('#subs-f1 .sub-link');
    links[subMap[id]]?.classList.add('on');
  }

  // 4. Breadcrumb
  const bc = document.getElementById('bc');
  if (bc) {
    const parts = (bcMap[id] || 'Dashboard').split(' · ');
    bc.innerHTML = parts.map((p, i) =>
      i < parts.length - 1
        ? `<span class="bcr" onclick="go('${i === 0 ? 'home' : 'brief'}')">${p}</span><span class="bcs">·</span>`
        : `<span class="bcu">${p}</span>`
    ).join('');
  }

  // 5. Stage pill'lerini güncelle
  updateStagePills(id);
}

// ─── Stage pill güncelleyici ──────────────────────────────
function updateStagePills(currentPage) {
  const order = ['brief', 'mb', 'mb-kamp', 'tasks', 'yayin'];
  const idx = order.indexOf(currentPage);
  document.querySelectorAll('.stage-pill').forEach((pill, i) => {
    pill.className = 'stage-pill';
    if (i < idx)        pill.classList.add('done');
    else if (i === idx) pill.classList.add('active');
    else                pill.classList.add('todo');
  });
}

// ─── Firma accordion ─────────────────────────────────────
function toggleFirm(id) {
  const subs = document.getElementById('subs-' + id);
  if (!subs) return;
  subs.style.display = subs.style.display !== 'none' ? 'none' : 'block';
}

// ─── İlk yükleme ─────────────────────────────────────────
go('home');
```

---

## 15. Sayfa İçerikleri — Layout Açıklamaları

### 15.1 Dashboard (`page-home`)

```
Layout: display:flex; flex-direction:column; gap:16px

1. Stat grid: display:grid; grid-template-columns:repeat(4,1fr); gap:8px
   → 4 stat kartı: Firmalar, Bekleyen, Aktif Görev, IG Onay %

2. Firma kartları: display:grid; grid-template-columns:repeat(auto-fill,minmax(168px,1fr)); gap:8px
   → 3 firma kartı + 1 dashed "ekle" placeholder

3. İki sütun: display:grid; grid-template-columns:1fr 272px; gap:12px
   Sol:
     - IG Moodboard önizleme (3 kart, repeat(3,1fr))
     - Görevler (2 cell list item)
   Sağ (272px):
     - IG Grid widget (ig-phone mockup, tam genişlik, 2 buton altında)
     - Son Aktivite (dot + metin + timestamp, 3 item)
```

### 15.2 Brief (`page-brief`)

```
1. Stage nav (tıklanabilir, 5 pill)
2. Firma header kartı:
   - Sol: AK avatar (32px, siyah bg) + ad + sektör/ay
   - Sağ: b-ok badge + outline "Düzenle" butonu
3. Form grid: display:grid; grid-template-columns:1fr 1fr; gap:10px
   Textarea'lar (min-height:88px):
     - Ürünler / Hizmetler  (çok satır yazılabilir)
     - Hedef Kitle
     - Ton & Stil
     - Özel Günler & Kampanyalar
   Input'lar:
     - İçerik Dağılımı
     - Referans Hesaplar
   Tam genişlik textarea:
     - Genel Notlar (placeholder ile)
4. Accordion: "Önceki brief'ler"
```

### 15.3 IG Moodboard (`page-mb`)

```
1. Toolbar: tag filtreler (Tümü/Onaylı/Bekliyor/Revize) + grid/liste seg + solid buton
2. Kart grid: repeat(4,1fr); gap:8px
   - Her kart: 82px thumbnail + platform rozeti + versiyon badge + hover overlay + durum badge
   - Sol şerit rengi: data-s attr
   - Son hücre: dashed "Kart ekle" placeholder
```

### 15.4 Kampanya MB (`page-mb-kamp`)

```
1. Info block (amber)
2. Toolbar: tag filtreler + amber "Kart Ekle" butonu
3. Kart grid: repeat(3,1fr); gap:10px
   - Durum başlık bandı + başlık + açıklama paragrafı + 2 özellik kutusu + butonlar
   - Son hücre: dashed placeholder
```

### 15.5 IG Grid (`page-ig`)

```
Layout: display:grid; grid-template-columns:1fr 184px; gap:14px

Sol:
  - Hücre grid: repeat(3,1fr); gap:6px
  - 8 dolu hücre + boş hücreler (dashed)
  - Her hücre: aspect-ratio:1; hover overlay (↗ + ✕)
  - Hücre ikonları: ▶ Reels sağ üst, ⧉ Carousel sağ üst, ✓ Onaylı sağ alt
  - Alt not: "Shift+tıkla çoklu seçim · Sürükle-bırak sıralama"

Sağ (184px):
  - IG profil önizleme kartı (ig-phone, tam genişlik)
  - Dağılım kartı (3 progress bar: Post/Reels/Carousel)
```

### 15.6 Görevler (`page-tasks`)

```
1. Segmented filtre + solid "Görev Ekle"
2. 3 sütun kanban: display:grid; grid-template-columns:repeat(3,1fr); gap:10px
   Bekliyor (b-wt badge): 2-3 görev kartı
   Üretimde (b-gry badge): 1-2 görev kartı (checklist progress ile)
   Tamamlandı (b-ok badge): opacity:.6, line-through başlık
```

### 15.7 Personel Paneli (`page-pers`)

```
1. Segmented: Aktif / Bu Hafta / Tamamlanan
2. Aktif görev kartları (display:flex; flex-direction:column; gap:8px):
   - Sol renk şeridi (3px)
   - padding-left:10px içinde:
     - Başlık + meta satırı (sağda badge'ler)
     - Referans görsel (52×38px, siyah bg)
     - Checklist (progress bar + checkbox listesi)
     - Alt: versiyon yükleme dashed alanı + amber "Teslim Et" butonu
   - Bekleyen görev: opacity:.75, gri şerit, sadece başlık satırı
```

### 15.8 Müşteri Paneli (`page-cust`)

```
1. Siyah header banner (14px bold beyaz başlık + "Müşteri Görünümü" badge)
2. Info block (amber)
3. Toolbar: amber "Tümünü Onayla" + outline "Seçiliyi Reddet" + özet metin
4. Kart grid: repeat(3,1fr); gap:10px
   - Her kart: 92px thumbnail + başlık + meta + buton çifti (Onayla/Revize)
   - Onaylı: yeşil kenarlık + b-ok badge (buton yok)
   - Revize: kırmızı kenarlık + info.er block içinde revize notu
```

### 15.9 Yayın (`page-yayin`)

```
1. Info block (yeşil)
2. Segmented: Liste / Takvim + amber "Tümünü Yayınla"
3. Liste: display:flex; flex-direction:column; gap:5px
   Her satır (card padding:11px 13px):
     display:grid; grid-template-columns:70px 1fr auto auto; gap:10px; align-items:center
     → Tarih | Başlık+meta | Durum badge | Aksiyon butonu
   Hazır → amber "Yayınla"
   Planlı → outline "Düzenle"
   Bekliyor → surface "Ekle"
```

---

## 16. Veritabanı Şeması (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Firm {
  id        String   @id @default(cuid())
  name      String
  sector    String?
  coverUrl  String?
  color     String?  @default("#1a1a18")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  briefs    Brief[]
}

model Brief {
  id           String     @id @default(cuid())
  firmId       String
  month        Int
  year         Int
  stage        String     @default("brief")
  // brief | mb | mb-kamp | tasks | yayin
  products     String?    @db.Text
  audience     String?    @db.Text
  tone         String?    @db.Text
  specialDays  String?    @db.Text
  distribution String?
  references   String?
  notes        String?    @db.Text
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  firm         Firm       @relation(fields:[firmId], references:[id], onDelete:Cascade)
  mbIG         MBCard[]
  mbKamp       KampCard[]
  igCells      IGCell[]
  tasks        Task[]
}

model MBCard {
  id          String    @id @default(cuid())
  briefId     String
  label       String
  type        String    @default("image") // image | video | link
  platform    String?   // YT | IG | TT | Pi | Vi | Web | Gorsel
  mediaUrl    String?
  videoUrl    String?
  linkUrl     String?
  thumbnailUrl String?
  status      String    @default("pending")
  // pending | review | approved | rejected
  verNo       Int       @default(1)
  publishDate DateTime?
  brief       Brief     @relation(fields:[briefId], references:[id], onDelete:Cascade)
}

model KampCard {
  id           String    @id @default(cuid())
  briefId      String
  title        String
  description  String?   @db.Text
  format       String?
  deliveryDate DateTime?
  status       String    @default("pending")
  // pending | review | approved | rejected
  brief        Brief     @relation(fields:[briefId], references:[id], onDelete:Cascade)
}

model IGCell {
  id          String    @id @default(cuid())
  briefId     String
  cellIndex   Int       // Backend hesaplar
  type        String    @default("post") // post | reels | carousel
  mediaUrl    String?
  slides      String[]  @default([]) // Carousel için URL dizisi
  videoUrl    String?
  caption     String?   @db.Text
  hashtags    String?
  publishDate DateTime?
  approved    Boolean?
  brief       Brief     @relation(fields:[briefId], references:[id], onDelete:Cascade)

  @@unique([briefId, cellIndex])
}

model Task {
  id          String    @id @default(cuid())
  briefId     String
  title       String
  description String?   @db.Text
  type        String?   // Video | Grafik | Fotograf | Metin | Animasyon
  specs       String?
  status      String    @default("pending")
  // pending | in-progress | done
  assigneeId  String?
  assignee    Member?   @relation(fields:[assigneeId], references:[id])
  dueDate     DateTime?
  checklist   Json?     // [{ text: string, done: boolean }]
  brief       Brief     @relation(fields:[briefId], references:[id], onDelete:Cascade)
}

model Member {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  role      String   @default("EDITOR")
  // ADMIN | EDITOR | VIEWER | CLIENT
  createdAt DateTime @default(now())
  tasks     Task[]
}
```

---

## 17. API Endpoint'leri

```
# Firma
GET    /api/firms                                        → firma listesi
POST   /api/firms                                        → firma ekle
PATCH  /api/firms/:fid                                   → firma güncelle
DELETE /api/firms/:fid                                   → firma sil

# Brief
GET    /api/firms/:fid/briefs                            → brief listesi (?meta=true → lite)
POST   /api/firms/:fid/briefs                            → brief ekle
GET    /api/firms/:fid/briefs/:bid                       → brief detayı
PATCH  /api/firms/:fid/briefs/:bid                       → brief güncelle (stage dahil)

# IG Moodboard
GET    /api/firms/:fid/briefs/:bid/mb-ig                 → kartlar
POST   /api/firms/:fid/briefs/:bid/mb-ig                 → kart ekle
PATCH  /api/firms/:fid/briefs/:bid/mb-ig/:cid            → kart güncelle (status, verNo)
DELETE /api/firms/:fid/briefs/:bid/mb-ig/:cid            → kart sil

# Kampanya Moodboard
GET    /api/firms/:fid/briefs/:bid/mb-kamp               → iş kartları
POST   /api/firms/:fid/briefs/:bid/mb-kamp               → iş kartı ekle
PATCH  /api/firms/:fid/briefs/:bid/mb-kamp/:cid          → güncelle
DELETE /api/firms/:fid/briefs/:bid/mb-kamp/:cid          → sil

# IG Grid
GET    /api/firms/:fid/briefs/:bid/ig-cells              → hücreler
POST   /api/firms/:fid/briefs/:bid/ig-cells              → hücre ekle
PATCH  /api/firms/:fid/briefs/:bid/ig-cells/:cid         → güncelle (approved dahil)
DELETE /api/firms/:fid/briefs/:bid/ig-cells/:cid         → sil
PATCH  /api/firms/:fid/briefs/:bid/ig-cells/bulk-approve → { ids[], approved: bool }

# Görevler
GET    /api/firms/:fid/briefs/:bid/tasks                 → görev listesi
POST   /api/firms/:fid/briefs/:bid/tasks                 → görev ekle
PATCH  /api/firms/:fid/briefs/:bid/tasks/:tid            → güncelle (status, checklist)
DELETE /api/firms/:fid/briefs/:bid/tasks/:tid            → sil

# Üyeler
GET    /api/members                                      → üye listesi
POST   /api/members                                      → üye ekle

# Link Preview
GET    /api/link-preview?url=...                         → { platform, thumbnail, embedUrl, title, type }
```

---

## 18. Link Preview Servisi

```typescript
// src/routes/link-preview.ts
// Bağımlılıklar: npm install cheerio node-fetch

import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

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
  return url.match(/[?&]v=([\w-]{11})/)?.[1]
    || url.match(/youtu\.be\/([\w-]{11})/)?.[1]
    || url.match(/(?:shorts|embed)\/([\w-]{11})/)?.[1]
    || null;
}

export async function fetchLinkPreview(url: string) {
  const platform = detectPlatform(url);

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

  // Open Graph fallback — IG, Pinterest, Behance, herhangi web
  const html = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; MoodKitBot/1.0)',
      'Accept': 'text/html',
    },
    redirect: 'follow',
  }).then(r => r.text());

  const $ = cheerio.load(html);
  const og = (prop: string) =>
    $(`meta[property="og:${prop}"]`).attr('content') || null;

  return {
    platform: platform || 'web',
    thumbnail: og('image'),
    title: og('title') || $('title').text() || null,
    description: og('description'),
    type: og('type') || 'link',
    embedUrl: null,
  };
}
```

---

## 19. Performans Kuralları

```js
// ✅ initApp — paralel yükleme (seri değil)
async function initApp() {
  await Promise.all([loadMembers(), loadFirms()]);
  await Promise.all(firms.map(f => loadBriefsMeta(f.id)));
  renderSB();
  go('home');
}

// ✅ Lazy loading — brief detayları sadece o brief açılınca
async function openBrief(fid, bid) {
  const b = gB(fid, bid);
  if (!b._loaded) await loadBriefFull(fid, bid);
  go('brief');
}

// ✅ Image lazy loading
// Tüm <img> → loading="lazy"
// IG hücreleri için IntersectionObserver:
function lazyLoadIGCells() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const img = e.target;
        const src = img.dataset.src;
        if (src) { img.src = src; img.removeAttribute('data-src'); }
        observer.unobserve(img);
      }
    });
  }, { rootMargin: '100px' });
  document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
}
```

---

## 20. Kritik Kurallar

| # | Kural |
|---|-------|
| 1 | `onclick` içi dinamik ID'ler → **template literal** zorunlu: `` onclick=`go('${id}')` `` |
| 2 | Async view fonksiyonları → her zaman **null guard**: `if (!el) return;` |
| 3 | Yeni versiyon yüklenince → kart **REVIEW**'a çekilir (APPROVED değil) |
| 4 | `IGCell.cellIndex` → **backend** hesaplar, frontend göndermez |
| 5 | CLIENT rolü → edit/create yapamaz → tüm write endpoint'lerde `requireRole("EDITOR")` |
| 6 | `btn.surface` → `background:var(--gry2)` = `#d8d4ca` (kontrast için —gry değil) |
| 7 | Alt boşluk yok → `.cnt { min-height:0; overflow-y:auto; }` — `.layout { min-height:0; }` |
| 8 | Sidebar'da nokta/renk yok — sadece yazı + font ağırlığı hiyerarşisi |
| 9 | Stage pill'leri tıklanabilir ve `updateStagePills()` tetikler |
| 10 | IG Grid profil önizleme container → **184px** genişlik |

---

## 21. Claude Code'a Verilecek Prompt

Aşağıdaki promptu Claude Code'a kopyala:

```
Bu dosyadaki (moodkit_claude_code_rehberi.md) tasarım sistemi, CSS token'ları,
bileşenler ve sayfa yapılarını kullanarak MoodKit'i kodla.

FRONTEND (public/index.html):
- Vanilla JS, sıfır framework
- Tüm CSS :root token'ları, bileşen stilleri ve layout bu dosyadaki tanımlarla
- 9 sayfa: home, brief, mb, mb-kamp, ig, tasks, pers, cust, yayin
- App shell: .app → .tb + .layout → .sb + .cnt
- .cnt ve .layout → min-height:0 (alt boşluk yok)
- Sidebar: toggleFirm() accordion, .sub-link.on aktif link
- go() fonksiyonu: breadcrumb + sidebar + sub-link + stage pill günceller
- Brief sayfası: stage pill'ler tıklanabilir, updateStagePills() çalışır
- IG Grid: profil önizleme 184px container, repeat(3,1fr) büyük hücreler
- Buton kontrast: .btn.surface → background:var(--gry2) = #d8d4ca
- Font: Inter — Google Fonts CDN

BACKEND (src/):
- Express + TypeScript + Prisma + Redis
- Bu dosyadaki tüm API endpoint'leri eksiksiz kodla
- Link preview: cheerio + node-fetch, YouTube/TikTok/OG fallback
- requireRole middleware: CLIENT sadece GET yapabilir
- initApp: paralel Promise.all yükleme
```
