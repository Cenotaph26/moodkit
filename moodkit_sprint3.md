# MoodKit — Sprint 3: UX/UI İyileştirmeleri

> Canva · Frame.io · Planable · Later esinli — kart yükleme, moodboard, IG Grid deneyimi  
> Referans: [Sprint 2](moodkit_sprint2.md) | [Sprint 4](moodkit_sprint4.md)

---

## 1. Genel Bakış

Sprint 3 kullanıcıların "istediğim sonucu göremiyorum" sorununu çözer. Üç ana alan:

**Alan 1 — Kart Ekleme & Görsel Yükleme Deneyimi**
Drag & drop, gerçek boyutlu önizleme, upload progress, Canva ve Frame.io benzeri profesyonel upload UX.

**Alan 2 — Moodboard Kart Görünümü**
Platform ikonları her zaman görünür, durum kenarlık rengi, versiyon geçmişi erişimi, grid/liste geçişi.

**Alan 3 — IG Grid Gelişmiş Düzenleme**
Filtre sistemi, çoklu seçim, tarih etiketi. Later Visual Planner ve Planoly Grid esinli.

### Referans Uygulamalar

| Uygulama | İlham | MoodKit Uyarlaması |
|----------|-------|-------------------|
| Canva | Drag & drop upload, anlık crop, progress bar | Moodboard ve IG Grid yükleme modal'ı |
| Frame.io | Kart: versiyon badge, durum rengi, hover | Moodboard kart tasarımı güncelleme |
| Planable | Feed/grid geçişi, onay ikonları | Moodboard görünüm modu |
| Later | Visual Planner filtre + çoklu seçim | IG Grid filtre + shift-seçim |
| Planoly | Grid renk analizi, tarih etiketi | IG Grid tarih gösterimi |

---

## 2. Kart Ekleme & Görsel Yükleme Deneyimi

### 2.1 Drag & Drop Upload Alanı

```js
function renderUploadArea(keyName, fpId, accept='image/*,video/*') {
  return `
    <div class="upload-area" id="${fpId}-wrap"
      ondragover="event.preventDefault();this.classList.add('drag-over')"
      ondragleave="this.classList.remove('drag-over')"
      ondrop="handleDrop(event,'${fpId}','${keyName}')"
      onclick="document.getElementById('${fpId}-inp').click()">

      <input type="file" id="${fpId}-inp" accept="${accept}" multiple
        style="display:none"
        onchange="handleFileSelect(this,'${fpId}','${keyName}')">

      <div id="${fpId}-empty">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
          style="opacity:.4;margin-bottom:6px">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
            stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <div style="font-size:12px;font-weight:500;color:var(--txt2)">
          Dosyayı sürükle veya tıkla</div>
        <div style="font-size:10px;color:var(--txt3);margin-top:2px">
          JPG, PNG, GIF, MP4, MOV — maks 50MB</div>
      </div>

      <div id="${fpId}-preview" style="display:none"></div>

      <div id="${fpId}-progress" style="display:none">
        <div class="upload-prog-bar">
          <div class="upload-prog-fill" id="${fpId}-fill"></div>
        </div>
        <div style="font-size:10px;color:var(--txt3);margin-top:4px"
          id="${fpId}-pct">0%</div>
      </div>
    </div>`;
}
```

```css
.upload-area {
  border: 1.5px dashed var(--bdr2);
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color .15s, background .15s;
  min-height: 100px;
  display: flex; align-items: center; justify-content: center; flex-direction: column;
}
.upload-area:hover, .upload-area.drag-over {
  border-color: var(--acc);
  background: var(--abg);
}
.upload-prog-bar {
  height: 4px; background: var(--bg2); border-radius: 4px;
  overflow: hidden; width: 200px; margin: 0 auto;
}
.upload-prog-fill {
  height: 100%; background: var(--acc); border-radius: 4px; transition: width .3s;
}
```

### 2.2 handleDrop / handleFileSelect / processFiles

```js
function handleDrop(e, fpId, keyName) {
  e.preventDefault();
  document.getElementById(fpId + '-wrap').classList.remove('drag-over');
  processFiles(Array.from(e.dataTransfer.files), fpId, keyName);
}

function handleFileSelect(input, fpId, keyName) {
  processFiles(Array.from(input.files), fpId, keyName);
  input.value = '';
}

function processFiles(files, fpId, keyName) {
  if (!files.length) return;

  const isCarousel = document.getElementById('nic-t')?.value === 'carousel'
    || document.getElementById('mbc-type')?.value === 'Carousel';

  if (isCarousel && files.length > 1) {
    processCarouselFiles(files, fpId, keyName);
    return;
  }

  const file = files[0];
  const url  = URL.createObjectURL(file);
  const isVid = file.type.startsWith('video/');

  window[keyName] = { img: isVid ? null : url, blob: isVid ? url : null, isVid, file };
  showUploadPreview(fpId, url, isVid, file);
}

function showUploadPreview(fpId, url, isVid, file) {
  const empty   = document.getElementById(fpId + '-empty');
  const preview = document.getElementById(fpId + '-preview');
  if (empty) empty.style.display = 'none';
  if (preview) {
    preview.style.display = 'block';
    preview.innerHTML = isVid
      ? `<video src="${url}" style="max-height:160px;border-radius:8px;max-width:100%"
           controls muted playsinline></video>
         <div style="font-size:10px;color:var(--txt3);margin-top:4px">
           ${file.name} · ${(file.size/1024/1024).toFixed(1)} MB</div>`
      : `<img src="${url}"
           style="max-height:160px;border-radius:8px;max-width:100%;object-fit:contain">
         <div style="font-size:10px;color:var(--txt3);margin-top:4px">
           ${file.name} · ${(file.size/1024/1024).toFixed(1)} MB</div>`;
  }
}
```

### 2.3 Carousel — 20 Fotoğrafa Kadar

```js
const MAX_CAROUSEL_SLIDES = 20;

function processCarouselFiles(files, fpId, keyName) {
  const limited = files.slice(0, MAX_CAROUSEL_SLIDES);
  const slides  = limited.map(f => ({
    url: URL.createObjectURL(f), name: f.name, size: f.size,
  }));

  window[keyName] = {
    img: slides[0].url,
    slides: slides.map(s => s.url),
    isCarousel: true,
    slideCount: slides.length,
  };

  const preview = document.getElementById(fpId + '-preview');
  const empty   = document.getElementById(fpId + '-empty');
  if (empty) empty.style.display = 'none';
  if (preview) {
    preview.style.display = 'block';
    preview.innerHTML = `
      <div style="font-size:11px;font-weight:500;color:var(--txt);margin-bottom:8px">
        ${slides.length} fotoğraf seçildi
        ${files.length > MAX_CAROUSEL_SLIDES ? ` (maks ${MAX_CAROUSEL_SLIDES})` : ''}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${slides.map((s, i) => `
          <div style="position:relative">
            <img src="${s.url}" loading="lazy"
              style="width:60px;height:60px;object-fit:cover;border-radius:6px;
                     border:0.5px solid var(--bdr)">
            <div style="position:absolute;top:2px;right:2px;width:16px;height:16px;
              border-radius:50%;background:rgba(0,0,0,.5);color:#fff;font-size:8px;
              display:flex;align-items:center;justify-content:center">${i+1}</div>
            <div style="position:absolute;bottom:2px;right:2px;cursor:pointer;
              color:#fff;font-size:10px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.8))"
              onclick="removeCarouselSlide('${fpId}','${keyName}',${i})">✕</div>
          </div>`
        ).join('')}
      </div>`;
  }
}

function removeCarouselSlide(fpId, keyName, idx) {
  if (!window[keyName]?.slides) return;
  window[keyName].slides.splice(idx, 1);
  if (!window[keyName].slides.length) {
    window[keyName] = { img: null, slides: [], isCarousel: true };
    document.getElementById(fpId + '-empty').style.display = 'flex';
    document.getElementById(fpId + '-preview').style.display = 'none';
    return;
  }
  window[keyName].img = window[keyName].slides[0];
  processCarouselFiles([], fpId, keyName);
}
```

### 2.4 addIGCell — Carousel Desteği

```js
async function addIGCell(fid, bid) {
  const nic  = window._nic || {};
  let   type = document.getElementById('nic-t').value;

  if (nic.isCarousel && nic.slides?.length > 1) type = 'carousel';
  else if (nic.isVid) type = 'reels';

  const b       = gB(fid, bid);
  const newCell = {
    id: Date.now(), type,
    src: nic.img || null,
    slides: nic.slides || [],
    cap: document.getElementById('nic-cap')?.value || '',
    hash: document.getElementById('nic-hash')?.value || '',
    date: document.getElementById('nic-d')?.value || '',
    videoUrl: document.getElementById('nic-v')?.value || '',
    approved: null, likes: '0', cmts: '0',
  };
  b.igCells.push(newCell);

  await apiUpdateIGCell(fid, bid, b.igCells.indexOf(newCell), {
    type: type.toUpperCase(),
    mediaUrl: nic.img || null,
    slides: nic.slides || [],
    videoUrl: newCell.videoUrl || null,
    caption: newCell.cap,
    hashtags: newCell.hash,
    publishDate: newCell.date,
  }).catch(e => console.error(e));

  toast(
    type === 'reels'    ? 'Reels eklendi ✓' :
    type === 'carousel' ? `Carousel eklendi (${nic.slides?.length || 1} fotoğraf) ✓` :
                          'İçerik eklendi ✓',
    'success'
  );
  openIG(fid, bid);
}
```

---

## 3. Moodboard Kart Görünümü

### 3.1 Kart Anatomisi — Yeni Düzen

```
Sol üst:   Platform rozeti — her zaman görünür, renk kodlu (YT=kırmızı / IG=gradient / TT=siyah)
Sağ üst:   Versiyon pill (v1, v2...) — tıklanınca versiyon geçmişi açılır
Sol kenar: 3px renk şeridi — duruma göre (approved=yeşil / review=mor / rejected=kırmızı)
Thumbnail: 90px, object-fit:cover — video = oynat ikonu + platform badge
Hover:     ↗ detay + ✕ sil (overlay)
Gövde:     başlık + tür + durum badge + deadline etiketi
```

### 3.2 CSS

```css
/* Sol kenar — durum rengi */
.mbc { border-radius:10px; overflow:hidden; position:relative; }
.mbc::before {
  content: ""; position: absolute;
  left: 0; top: 0; bottom: 0; width: 3px;
  border-radius: 2px 0 0 2px; transition: background .2s;
}
.mbc[data-status="approved"]::before { background: #27500A; }
.mbc[data-status="review"]::before   { background: #534AB7; }
.mbc[data-status="rejected"]::before { background: #A32D2D; }
.mbc[data-status="pending"]::before  { background: transparent; }

/* Platform rozeti — sol üst, her zaman görünür */
.mb-plat {
  position: absolute; top: 7px; left: 7px; z-index: 3;
  padding: 2px 6px; border-radius: 4px;
  font-size: 8px; font-weight: 700; color: #fff;
}

/* Versiyon pill — sağ üst, tıklanabilir */
.mb-ver { position: absolute; top: 7px; right: 7px; z-index: 3; cursor: pointer; }
.mb-ver:hover { opacity: .7; }

/* Hover overlay */
.mbov {
  position: absolute; inset: 0;
  background: rgba(0,0,0,.35); opacity: 0; transition: opacity .15s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.mbc:hover .mbov { opacity: 1; }
```

### 3.3 renderMBG() Güncellemesi

```js
function renderMBG(gridId, fid, bid, which) {
  const b     = gB(fid, bid);
  const cards = which === 'ig' ? b.mbIG : b.mbKamp;
  const grid  = document.getElementById(gridId);
  if (!grid) return;
  if (!cards.length) { grid.innerHTML = ''; return; }

  grid.innerHTML = cards.map(c => {
    const cv      = c.versions?.[c.versions.length - 1];
    const url     = cv?.url || c.url || '';
    const plat    = getLinkPlatform(url);
    const platBg  = plat?.color || '#534AB7';
    const verNum  = c.versions?.length || 1;

    return `
      <div class="mbc" data-status="${c.status}"
        onclick="openMBDet('${fid}','${bid}','${which}','${c.id}')">

        <div class="mbth">
          ${mbThumbHtml(c)}

          ${plat ? `<div class="mb-plat" style="background:${platBg}">${plat.icon}</div>` : ''}

          <div class="mb-ver"
            onclick="event.stopPropagation();
              showVersionHistory('${fid}','${bid}','${which}','${c.id}')">
            <span class="badge b-pu" style="font-size:8px">v${verNum}</span>
          </div>

          <div class="mbov">
            <div class="ovb">↗</div>
            <div class="ovb" style="color:var(--red)"
              onclick="event.stopPropagation();
                delMBC('${fid}','${bid}','${which}','${c.id}')">✕</div>
          </div>
        </div>

        <div class="mbb">
          <div class="mbt">${c.label}</div>
          <div class="mbsub">${c.type}</div>
          <div class="mbft">
            <span class="badge ${STATUS_BADGES[c.status]||'bgr'}" style="font-size:9px">
              ${STATUS_LABELS[c.status]||'Bekliyor'}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}
```

### 3.4 Grid / Liste Görünüm Modu

```js
// Moodboard başlık satırına butonlar:
`<div style="display:flex;gap:4px;border:0.5px solid var(--bdr2);
  border-radius:7px;padding:2px;background:var(--bg2)">
  <button class="btn bs ${mbViewMode==='grid'?'btn-p':'bg0'}"
    onclick="setMbViewMode('${fid}','${bid}','${which}','grid')"
    style="border-radius:5px">⊞</button>
  <button class="btn bs ${mbViewMode==='list'?'btn-p':'bg0'}"
    onclick="setMbViewMode('${fid}','${bid}','${which}','list')"
    style="border-radius:5px">☰</button>
</div>`

// Liste görünümü — Planable feed view:
function renderMbList(gridId, fid, bid, which) {
  const b     = gB(fid, bid);
  const cards = which === 'ig' ? b.mbIG : b.mbKamp;
  const el    = document.getElementById(gridId);
  if (!el) return;
  el.style.gridTemplateColumns = '1fr';

  el.innerHTML = cards.map(c => {
    const cv  = c.versions?.[c.versions.length - 1];
    const img = cv?.img || c.img;
    return `
      <div style="display:flex;gap:12px;padding:10px;border:0.5px solid var(--bdr);
        border-radius:10px;background:var(--bg);cursor:pointer;margin-bottom:6px"
        data-status="${c.status}"
        onclick="openMBDet('${fid}','${bid}','${which}','${c.id}')">
        <div style="width:72px;height:54px;border-radius:7px;overflow:hidden;
          flex-shrink:0;background:var(--bg2);position:relative">
          ${img ? `<img src="${img}" loading="lazy"
            style="width:100%;height:100%;object-fit:cover">` : ''}
        </div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-size:12px;font-weight:500">${c.label}</span>
            <span class="badge ${STATUS_BADGES[c.status]||'bgr'}" style="font-size:9px">
              ${STATUS_LABELS[c.status]||'Bekliyor'}</span>
          </div>
          <div style="font-size:10px;color:var(--txt3)">
            ${c.type} · v${c.versions?.length||1}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
          <div class="btn bgn-btn bs"
            onclick="event.stopPropagation();
              setMBS('${fid}','${bid}','${which}','${c.id}','approved')">✓</div>
          <div class="btn brd-btn bs"
            onclick="event.stopPropagation();
              setMBS('${fid}','${bid}','${which}','${c.id}','rejected')">✗</div>
        </div>
      </div>`;
  }).join('');
}
```

---

## 4. IG Grid Gelişmiş Düzenleme

### 4.1 Filtre Sistemi

```js
let _igFilter = 'all';

function renderIGFilterBar(fid, bid, activeFilter='all') {
  const b = gB(fid, bid);
  const counts = {
    all:      b.igCells.length,
    post:     b.igCells.filter(c => c.type === 'post').length,
    reels:    b.igCells.filter(c => c.type === 'reels').length,
    carousel: b.igCells.filter(c => c.type === 'carousel').length,
  };
  return `
    <div style="display:flex;gap:2px;background:var(--bg2);border-radius:8px;
      padding:3px;margin-bottom:12px">
      ${['all','post','reels','carousel'].map(f => `
        <button class="btn bs" style="border-radius:6px;
          ${activeFilter===f
            ? 'background:var(--bg);border-color:var(--bdr2);color:var(--txt)'
            : 'background:transparent;border-color:transparent;color:var(--txt3)'}"
          onclick="setIGFilter('${fid}','${bid}','${f}')">
          ${{all:'Tümü',post:'Post',reels:'Reels',carousel:'Carousel'}[f]}
          <span style="color:var(--txt3)"> ${counts[f]}</span>
        </button>`
      ).join('')}
    </div>`;
}

function setIGFilter(fid, bid, filter) {
  _igFilter = filter;
  renderIGCells(fid, bid);
}

// renderIGCells içinde filtre:
function renderIGCells(fid, bid) {
  const b     = gB(fid, bid);
  const cells = _igFilter === 'all'
    ? b.igCells
    : b.igCells.filter(c => c.type === _igFilter);
  // ... mevcut render kodu, cells kullan
}
```

### 4.2 Çoklu Seçim + Toplu Onay

```js
let _igSelected = new Set();

function igCellClick(event, fid, bid, cellId) {
  if (event.shiftKey || event.ctrlKey || event.metaKey) {
    event.stopPropagation();
    _igSelected.has(cellId) ? _igSelected.delete(cellId) : _igSelected.add(cellId);
    updateIGSelectionUI(fid, bid);
    return;
  }
  _igSelected.clear();
  updateIGSelectionUI(fid, bid);
  viewCell(fid, bid, cellId);
}

function updateIGSelectionUI(fid, bid) {
  const count = _igSelected.size;
  const bar   = document.getElementById('ig-select-bar');
  if (!bar) return;
  if (count > 0) {
    bar.style.display = 'flex';
    bar.innerHTML = `
      <span style="font-size:11px;color:var(--txt2)">${count} seçildi</span>
      <div class="btn bgn-btn bs"
        onclick="bulkIGApprove('${fid}','${bid}',true)">✓ Tümünü Onayla</div>
      <div class="btn brd-btn bs"
        onclick="bulkIGApprove('${fid}','${bid}',false)">✗ Tümünü Reddet</div>
      <div class="btn bg0 bs"
        onclick="_igSelected.clear();updateIGSelectionUI('${fid}','${bid}')">İptal</div>`;
  } else {
    bar.style.display = 'none';
  }
}

async function bulkIGApprove(fid, bid, approved) {
  const b   = gB(fid, bid);
  const ids = Array.from(_igSelected);
  ids.forEach(id => {
    const cell = b.igCells.find(c => c.id === id);
    if (cell) cell.approved = approved;
  });
  _igSelected.clear();
  await apiFetch(`/api/firms/${fid}/briefs/${bid}/ig/bulk-approve`, {
    method: 'PATCH', body: { ids, approved }
  }).catch(e => console.error(e));
  renderIGCells(fid, bid);
  toast(`${ids.length} hücre ${approved ? 'onaylandı' : 'reddedildi'} ✓`, 'success');
}
```

### 4.3 Tarih Etiketi Görünümü (Planoly stili)

```js
function renderIGCellWithDate(cell, fid, bid) {
  const typeIcon = cell.type === 'reels' ? '▶' : cell.type === 'carousel' ? '⧉' : '';
  return `
    <div class="igc" data-id="${cell.id||''}"
      onclick="igCellClick(event,'${fid}','${bid}','${cell.id}')">
      ${cell.src
        ? `<img src="${cell.src}" loading="lazy"
            style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`
        : `<div style="position:absolute;inset:0;
             background:linear-gradient(135deg,#111827,#374151)"></div>`}
      ${typeIcon ? `<div style="position:absolute;top:3px;right:3px;z-index:2;
        color:#fff;font-size:10px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))">${typeIcon}</div>` : ''}
      ${cell.approved===true  ? `<div class="igc-ok">✓</div>` : ''}
      ${cell.approved===false ? `<div style="position:absolute;bottom:3px;right:3px;
        z-index:2;color:#ff6b6b;font-size:10px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))">✗</div>` : ''}
      ${cell.date ? `
        <div class="igc-date-bar">
          <div style="font-size:8px;color:#fff;text-align:center">
            ${formatIGDate(cell.date)}</div>
        </div>` : ''}
      <div class="igc-sel-overlay" style="display:none;position:absolute;inset:0;
        background:rgba(83,74,183,.4);border:2px solid #534AB7;z-index:3">
        <div style="position:absolute;top:3px;left:3px;width:14px;height:14px;
          border-radius:50%;background:#534AB7;display:flex;align-items:center;
          justify-content:center;font-size:8px;color:#fff">✓</div>
      </div>
    </div>`;
}

function formatIGDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  } catch(e) { return dateStr; }
}
```

```css
/* Hover'da tarih göster */
.igc-date-bar {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,.7));
  padding: 14px 4px 3px;
  opacity: 0; transition: opacity .15s;
}
.igc:hover .igc-date-bar { opacity: 1; }
```

### 4.4 Backend — Toplu Onay Endpoint

```ts
// src/routes/ig.ts
router.patch('/bulk-approve', requireAuth, requireFirmAccess, async (req, res) => {
  const { ids, approved } = req.body;
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ error: 'ids zorunlu' });
  }
  await db.iGCell.updateMany({
    where: { id: { in: ids }, briefId: req.params.briefId },
    data: { approved },
  });
  res.json({ updated: ids.length });
});
```

---

## 5. Genel UX Dokunuşları

### 5.1 Toast Sistemi — Çok Tipli

```js
function toast(msg, type='info', dur=2400) {
  const t = document.getElementById('toast');
  const colors = {
    info:    { bg:'var(--bg)',   text:'var(--txt)',  border:'var(--bdr2)' },
    success: { bg:'var(--gbg)',  text:'var(--grn)',  border:'#C0DD97'     },
    error:   { bg:'var(--rbg)',  text:'var(--red)',  border:'#F09595'     },
    warning: { bg:'var(--ambg)', text:'var(--amb)',  border:'#FAC775'     },
  };
  const c = colors[type] || colors.info;
  t.style.cssText = `display:block;background:${c.bg};color:${c.text};border:0.5px solid ${c.border};`;
  t.textContent = msg;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.style.display = 'none', dur);
}

// Kullanım:
toast('Kart eklendi ✓',        'success');
toast('Hata: ' + e.message,    'error');
toast('Bağlantı kesildi',      'warning');
toast('Versiyon yükleniyor...','info');
```

### 5.2 Boş Durum Standartı

```js
function emptyState(icon, title, desc, btnText, btnFn) {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;
      padding:40px 20px;text-align:center;gap:10px">
      <div style="font-size:32px;opacity:.25">${icon}</div>
      <div style="font-size:13px;font-weight:500;color:var(--txt2)">${title}</div>
      <div style="font-size:11px;color:var(--txt3);max-width:240px;line-height:1.5">${desc}</div>
      ${btnText
        ? `<button class="btn bp" onclick="${btnFn}" style="margin-top:6px">${btnText}</button>`
        : ''}
    </div>`;
}

// Örnekler:
emptyState('📋','Brief yok','İlk briefi ekleyerek başla',
  '+ Brief Ekle', `addBrief('${fid}')`)
emptyState('🎨','Moodboard boş','Referans görsel veya video ekle',
  '+ Kart Ekle', `showMod('add-mb','${fid}','${bid}','ig')`)
emptyState('📸','IG Grid boş','İlk içerik hücresini ekle',
  '+ İçerik Ekle', `showMod('add-ig','${fid}','${bid}')`)
```

### 5.3 Kart Ekleme Animasyonu

```css
@keyframes cardIn {
  from { opacity:0; transform:scale(.92); }
  to   { opacity:1; transform:scale(1);   }
}
@keyframes cardHighlight {
  0%   { box-shadow: 0 0 0 2px #27500A; }
  100% { box-shadow: 0 0 0 0 transparent; }
}
.mb-card-new {
  animation: cardIn .25s ease, cardHighlight 1.5s ease .25s;
}
```

```js
// addMbCard sonrasında:
setTimeout(() => {
  const cards = document.querySelectorAll('.mb-card');
  const last  = cards[cards.length - 1];
  if (last) {
    last.classList.add('mb-card-new');
    last.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}, 100);
```

---

## Sprint 3 Özeti

Sprint tamamlandığında:
- Drag & drop görsel/video yükleme — büyük drop zone, anında önizleme
- Upload progress bar — yükleme yüzdesi
- Carousel: 20 fotoğrafa kadar, thumbnail önizleme + sıra numarası + kaldırma
- Moodboard kart sol kenarlığı: durum rengi (yeşil/mor/kırmızı)
- Platform rozeti her zaman görünür sol üst — renk kodlu
- Versiyon pill tıklanabilir → versiyon geçmişi
- Grid / Liste görünüm modu geçişi
- IG Grid filtre: Tümü / Post / Reels / Carousel
- Çoklu seçim (shift+tıkla) + toplu onayla/reddet
- Tarih etiketi hover'da görünür
- `PATCH /ig/bulk-approve` backend endpoint
- Toast: başarı/hata/uyarı/bilgi renk kodlu
- Boş durum ekranları standartlaştırıldı
- Kart ekleme animasyonu — yeşil vurgu

| Sprint | Durum | İçerik |
|--------|-------|--------|
| Sprint 1 | ✓ | Video oynatma, carousel çoklu fotoğraf, tarih picker |
| Sprint 2 | ✓ | Link önizleme, thumbnail otomatik çekme, performans |
| Sprint 3 | ✓ | Upload deneyimi, moodboard kart, IG Grid gelişmiş |
| Sprint 4 | ○ | AI Caption önerisi, WebSocket gerçek zamanlı |

---

*← [Sprint 2](moodkit_sprint2.md)*
