# MoodKit — Faz 6: Dashboard Tasarım Sistemi & Kod Referansı

> Onaylanan dashboard tasarımının tüm bileşenleri CSS + HTML + JS şablonlarıyla belgelenmiştir.  
> Claude Code'a doğrudan kodlatmak için hazırlanmıştır.

---

## 1. Dashboard Genel Yapısı

`goHome()` çağrıldığında `v-home.innerHTML`'e sırasıyla yazılır:

```
1. Sayfa Başlığı      (.pg-hd)
2. Stat Kartları      (.stats)
3. Firma Kartları     (.firma-grid)
4. İki Kolon          (.two-col)
   Sol: Moodboard Grid + Embed Tablosu
   Sağ: IG Grid Mockup + Aktivite Feed
5. Kanban Önizleme   (.kb-cols)
```

### Layout CSS

```css
.app        { display:flex; flex-direction:column; min-height:100vh }
.tb         { height:48px; background:var(--bg); border-bottom:0.5px solid var(--bdr); position:sticky; top:0; z-index:50 }
.body       { display:flex; flex:1 }
.sb         { width:200px; flex-shrink:0; border-right:0.5px solid var(--bdr); background:var(--bg) }
.content    { flex:1; padding:20px; overflow-y:auto; background:var(--bg3) }
.stats      { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px }
.firma-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; margin-bottom:24px }
.two-col    { display:grid; grid-template-columns:1fr 340px; gap:16px; margin-bottom:24px }
.mb-grid    { display:grid; grid-template-columns:repeat(3,1fr); gap:8px }
.kb-cols    { display:grid; grid-template-columns:repeat(3,1fr); gap:8px }
```

---

## 2. Topbar

```html
<div class="tb">
  <span class="logo">mood<em>kit</em></span>
  <div style="width:0.5px;height:16px;background:var(--bdr2);margin:0 4px"></div>
  <div class="bc" id="bc"><span class="bcu">Dashboard</span></div>
  <div class="tb-r">
    <div class="notif" onclick="toggleN()"><!-- zil svg --><div class="notif-dot" id="ndot" style="display:none"></div></div>
    <div id="npanel" style="display:none"><!-- bildirim listesi --></div>
    <div class="av">${initials}</div>
    <span style="font-size:11px;color:var(--txt2)">${name}</span>
    <span class="badge b-pu">${role}</span>
  </div>
</div>
```

```css
.tb    { height:48px; background:var(--bg); border-bottom:0.5px solid var(--bdr); display:flex; align-items:center; padding:0 16px; gap:10px; position:sticky; top:0; z-index:50 }
.logo  { font-size:15px; font-weight:500; letter-spacing:-.4px }
.logo em { color:#534AB7; font-style:normal }
.bc    { display:flex; align-items:center; gap:4px; font-size:11px; flex:1 }
.bcr   { color:var(--txt3); cursor:pointer } .bcr:hover { color:var(--txt2) }
.bcu   { color:var(--txt); font-weight:500 }
.tb-r  { display:flex; align-items:center; gap:8px; margin-left:auto }
.av    { width:26px; height:26px; border-radius:50%; background:#EEEDFE; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:500; color:#534AB7 }
.notif { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; position:relative; border:0.5px solid var(--bdr); background:var(--bg) }
.notif-dot { position:absolute; top:5px; right:5px; width:6px; height:6px; border-radius:50%; background:#E24B4A; border:1.5px solid var(--bg) }
```

---

## 3. Sidebar

```css
.sb      { width:200px; background:var(--bg); border-right:0.5px solid var(--bdr); padding:8px 0; flex-shrink:0; overflow-y:auto }
.sb-sec  { font-size:9px; color:var(--txt3); padding:10px 12px 4px; font-weight:500; letter-spacing:.8px; text-transform:uppercase }
.sbi     { padding:5px 10px; border-radius:8px; font-size:12px; color:var(--txt2); cursor:pointer; display:flex; align-items:center; gap:7px; margin:1px 6px; transition:background .12s }
.sbi:hover { background:var(--bg2) }
.sbi.on  { background:#EEEDFE; color:#3C3489; font-weight:500 }
.aw-h    { display:flex; align-items:center; gap:6px; padding:5px 9px; cursor:pointer; border-radius:8px; font-size:12px; margin:1px 6px; transition:background .12s }
.aw-h:hover { background:var(--bg2) }
.aw-dot  { width:8px; height:8px; border-radius:50%; flex-shrink:0 }
.aw-lbl  { flex:1; font-weight:500; color:var(--txt); font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
.aw-sub  { padding:4px 9px; font-size:11px; color:var(--txt3); cursor:pointer; border-radius:6px; margin:0 6px 0 18px; transition:background .12s,color .12s }
.aw-sub:hover { background:var(--bg2); color:var(--txt2) }
.sb-add  { padding:5px 10px; border-radius:8px; font-size:11px; color:#534AB7; cursor:pointer; display:flex; align-items:center; gap:5px; margin:2px 6px }
.sb-add:hover { background:#EEEDFE }
```

### renderSB()

```js
function renderSB() {
  const showPersonel = _me?.role === 'prod' || _me?.role === 'editor';
  document.getElementById('sbi-personel').style.display = showPersonel ? 'flex' : 'none';

  document.getElementById('firm-list').innerHTML = firms.map(f => `
    <div class="aw" id="aw-${f.id}">
      <div class="aw-h" onclick="document.getElementById('aw-${f.id}').classList.toggle('open')">
        <div class="aw-dot" style="background:${f.color}"></div>
        <span class="aw-lbl">${f.name}</span>
        <span class="aw-arr">›</span>
      </div>
      <div class="abody">
        ${(f.briefs||[]).map(b => `
          <div class="aw-sub" onclick="openBrief('${f.id}','${b.id}')">■ ${b.month} ${b.year}</div>
          <div class="aw-sub" style="padding-left:16px" onclick="openMbIG('${f.id}','${b.id}')">· IG Moodboard</div>
          <div class="aw-sub" style="padding-left:16px" onclick="openMbK('${f.id}','${b.id}')">· Kampanya MB</div>
          <div class="aw-sub" style="padding-left:16px" onclick="openTasks('${f.id}','${b.id}')">· Görevler</div>
          <div class="aw-sub" style="padding-left:16px" onclick="openIG('${f.id}','${b.id}')">· IG Grid</div>
          <div class="aw-sub" style="padding-left:16px" onclick="openYayin('${f.id}','${b.id}')">· Yayın</div>
          <div class="aw-sub" style="padding-left:16px" onclick="openCal('${f.id}','${b.id}')">· Takvim</div>
        `).join('')}
        <div class="aw-sub" style="color:var(--acc)" onclick="addBrief('${f.id}')">+ Yeni Brief</div>
      </div>
    </div>`
  ).join('');
}
```

---

## 4. Stat Kartları

```css
.stats    { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px }
.stat     { background:var(--bg); border:0.5px solid var(--bdr); border-radius:10px; padding:14px 16px }
.stat-lbl { font-size:10px; color:var(--txt3); font-weight:500; text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px }
.stat-val { font-size:22px; font-weight:500; color:var(--txt) }
.stat-chg { font-size:10px; margin-top:4px }
.chg-up   { color:#27500A } .chg-dn { color:#A32D2D }
```

**4 Metrik:**
- Aktif Firmalar → `firms.length`
- Bekleyen Onay → tüm briflerde `status==="pending"` kart sayısı
- Aktif Görev → tüm briflerde `status==="todo"` task sayısı
- IG İçerik Onayı → `(approved===true hücre / toplam hücre) × 100`

---

## 5. Firma Kartları

```css
.fc        { background:var(--bg); border:0.5px solid var(--bdr); border-radius:12px; overflow:hidden; cursor:pointer; transition:transform .15s,border-color .15s }
.fc:hover  { transform:translateY(-2px); border-color:var(--bdr2) }
.fc-cover  { height:80px; position:relative; overflow:hidden }
.fc-overlay { position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:8px 12px;background:linear-gradient(to top,rgba(0,0,0,.6),transparent) }
.fc-name   { color:#fff; font-size:13px; font-weight:500 }
.fc-sec    { color:rgba(255,255,255,.65); font-size:10px }
.fc-body   { padding:10px 12px }
.fc-row    { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px }
.prog      { height:4px; background:var(--bg2); border-radius:4px; overflow:hidden; margin-bottom:4px }
.prog-f    { height:100%; background:#534AB7; border-radius:4px }
.prog-lbl  { font-size:9px; color:var(--txt3) }
.fc-add    { display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;color:var(--txt3);border-style:dashed;min-height:142px }
.fc-add:hover { color:var(--acc); border-color:var(--acc) }
```

### Aşama → Badge Eşleşmesi

| stage | badge class | metin | progress rengi |
|-------|------------|-------|----------------|
| brief | .b-gr | Brief | #534AB7 |
| mb_ig | .b-pu | IG Moodboard | #534AB7 |
| mb_kamp | .b-am | Kampanya MB | #633806 |
| tasks | .b-bl | Görevler | #27500A |
| yayin | .b-gn | Yayın | #27500A |

### renderFirmaCard(f)

```js
function renderFirmaCard(f) {
  const lb = f.briefs[f.briefs.length - 1];
  const src = getFirmCoverSrc(f); // Son brief'in onaylı IG hücresi
  const { approved, total, pending, pct } = getFirmProgress(f);
  const firstBid = f.briefs[0]?.id || '';

  const stageBadge = { brief:['b-gr','Brief'], mb_ig:['b-pu','IG Moodboard'],
    mb_kamp:['b-am','Kampanya MB'], tasks:['b-bl','Görevler'], yayin:['b-gn','Yayın'] }[lb?.stage] || ['b-gr','—'];
  const progColor = { mb_ig:'#534AB7', mb_kamp:'#633806', tasks:'#27500A', yayin:'#27500A' }[lb?.stage] || '#534AB7';

  return `
    <div class="fc" onclick="openBrief('${f.id}','${firstBid}')">
      <div class="fc-cover" style="background:linear-gradient(135deg,${f.color},${f.color}88)">
        ${src ? `<img src="${src}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.65">` : ''}
        <div class="fc-overlay">
          <div class="fc-name">${f.name}</div>
          <div class="fc-sec">${f.sector}</div>
        </div>
        <div style="position:absolute;top:6px;right:6px;display:grid;grid-template-columns:1fr 1fr;gap:2px;opacity:.5">
          ${(lb?.igCells||[]).slice(0,4).map(c =>
            `<div style="width:18px;height:18px;border-radius:2px;background:rgba(255,255,255,.2)"></div>`
          ).join('')}
        </div>
      </div>
      <div class="fc-body">
        ${lb ? `
          <div class="fc-row">
            <span class="badge b-am">${lb.month} ${lb.year}</span>
            <span class="badge ${stageBadge[0]}">${stageBadge[1]}</span>
          </div>
          <div class="prog"><div class="prog-f" style="width:${pct}%;background:${progColor}"></div></div>
          <div class="prog-lbl">${approved}/${total} kart onaylı${pending > 0 ? ` · ${pending} bekliyor` : ''}</div>
        ` : '<div class="prog-lbl">Brief yok</div>'}
      </div>
    </div>`;
}
```

---

## 6. Moodboard Mini Grid

```css
.mb-grid  { display:grid; grid-template-columns:repeat(3,1fr); gap:8px }
.mb-card  { border:0.5px solid var(--bdr); border-radius:10px; overflow:hidden; cursor:pointer; background:var(--bg); transition:transform .12s,border-color .12s }
.mb-card:hover { transform:translateY(-1px); border-color:var(--bdr2) }
.mb-thumb { width:100%; height:90px; position:relative; overflow:hidden; background:var(--bg2) }
.mb-ov    { position:absolute;inset:0;background:rgba(0,0,0,.3);opacity:0;transition:opacity .15s;display:flex;align-items:center;justify-content:center;gap:6px }
.mb-card:hover .mb-ov { opacity:1 }
.ov-btn   { width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.9);border:none;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center }
.v-pip    { position:absolute; top:6px; right:6px; z-index:2 }
.mb-info  { padding:7px 8px }
.mb-title { font-size:11px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-bottom:2px }
.mb-type  { font-size:9px; color:var(--txt3) }
```

### Platform Thumbnail Tipleri

| Platform | Arka Plan | Overlay İçerik | Badge |
|----------|-----------|----------------|-------|
| YouTube/Vimeo | `#0f0f0f` + opsiyonel img opacity:.6 | ▶ oynat dairesi (30px) | `.b-rd "YouTube"` |
| Instagram | `linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)` | IG ikonu + "Instagram Reels" | `rgba beyaz "IG"` |
| TikTok | `#010101` | TT ikonu + "TikTok" etiketi | `.b-rd "TikTok"` |
| Pinterest | `linear-gradient(135deg,#E60023,#ad081b)` | Pi ikonu | `rgba beyaz "Pi"` |
| Behance/Web | `linear-gradient(135deg,#0f172a,#1e293b)` | Dünya ikonu + domain | `.b-bl "Web"` |
| Görsel | — | `<img object-fit:cover>` | `v-pip: .b-pu "v2"` |

### Durum Metni

```js
function statusText(status) {
  return { approved: `<span style="color:#27500A;font-weight:500">✓ Onaylı</span>`,
    review:   `<span style="color:#534AB7;font-weight:500">● İnceleme</span>`,
    pending:  `<span style="color:#633806;font-weight:500">⏳ Bekliyor</span>`,
    rejected: `<span style="color:#A32D2D;font-weight:500">✗ Revize</span>`,
  }[status] || '';
}
```

---

## 7. Embed Desteği Tablosu

```js
const EMBED_LIST = [
  { bg:'#ff0000',       icon:'▶',  color:'#fff', title:'YouTube & YouTube Shorts',       src:'youtube.com/watch?v=... · youtu.be/... · shorts/...', badge:'b-gn', badgeText:'Embed ✓' },
  { bg:'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)', icon:'IG', color:'#fff', title:'Instagram Reels & Posts', src:'instagram.com/reel/... · /p/...', badge:'b-am', badgeText:'oEmbed ↗' },
  { bg:'#010101',       icon:'TT', color:'#fff', title:'TikTok Videoları',               src:'tiktok.com/@user/video/...', badge:'b-am', badgeText:'oEmbed ↗' },
  { bg:'#1AB7EA',       icon:'Vi', color:'#fff', title:'Vimeo',                          src:'vimeo.com/...', badge:'b-gn', badgeText:'Embed ✓' },
  { bg:'#E60023',       icon:'Pi', color:'#fff', title:'Pinterest, Behance, Web',        src:'Herhangi bir URL → önizleme kartı', badge:'b-bl', badgeText:'Önizleme' },
  { bg:'var(--bg2)',    icon:'mp4',color:'var(--txt2)', title:'Direkt Video Dosyaları',  src:'.mp4 · .mov · .webm — inline player', badge:'b-gn', badgeText:'Video ✓' },
];
```

---

## 8. IG Grid Telefon Mockup

```css
.panel      { background:var(--bg); border:0.5px solid var(--bdr); border-radius:12px; padding:14px }
.ig-mock    { background:#fff; border:0.5px solid #dbdbdb; border-radius:14px; overflow:hidden; font-family:-apple-system,sans-serif }
.ig-top     { background:#fff; padding:2px 10px 0; display:flex; justify-content:space-between; font-size:8px; font-weight:700; color:#1a1a1a }
.ig-hdr     { display:flex; align-items:center; padding:6px 10px; border-bottom:0.5px solid #dbdbdb; gap:7px }
.ig-av      { width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:700; color:#fff }
.ig-name    { font-size:10px; font-weight:700; color:#1a1a1a }
.ig-grid    { display:grid; grid-template-columns:repeat(3,1fr); gap:1.5px; padding:1.5px }
.igc        { aspect-ratio:1; position:relative; overflow:hidden; background:#f0f0f0; cursor:pointer }
.igc img    { position:absolute; inset:0; width:100%; height:100%; object-fit:cover }
.igc-ok     { position:absolute; bottom:3px; right:3px; z-index:2; color:#fff; font-size:10px; filter:drop-shadow(0 1px 2px rgba(0,0,0,.6)) }
.igc-type   { position:absolute; top:3px; right:3px; z-index:2; color:#fff; font-size:10px; filter:drop-shadow(0 1px 2px rgba(0,0,0,.6)) }
```

**Hücre ikonları:**
- `approved=true` → sol alt `✓`
- `type='reels'` → sağ üst `▶`
- `type='carousel'` → sağ üst `⧉`
- Bekliyor/boş → merkez `⏳` (opacity .3)
- Ekle → dashed border + `+` merkez (onclick: `showMod('add-ig',...)`)

---

## 9. Aktivite Feed

```css
.act-item { display:flex; align-items:flex-start; gap:9px; padding:8px 0; border-bottom:0.5px solid var(--bdr) }
.act-item:last-child { border-bottom:none }
.act-dot  { width:7px; height:7px; border-radius:50%; flex-shrink:0; margin-top:4px }
.act-txt  { font-size:11px; color:var(--txt2); line-height:1.4; flex:1 }
.act-time { font-size:9px; color:var(--txt3); white-space:nowrap }
```

| Olay | Nokta Rengi |
|------|-------------|
| onaylandı / atandı | `#534AB7` mor |
| reddedildi / revize | `#E24B4A` kırmızı |
| yüklendi / tamamlandı | `#27500A` yeşil |
| güncellendi | `#633806` amber |

```js
function getNotifColor(title) {
  if (title.includes('onaylandı') || title.includes('atandı'))   return '#534AB7';
  if (title.includes('reddedildi') || title.includes('revize'))  return '#E24B4A';
  if (title.includes('yüklendi') || title.includes('tamamlandı'))return '#27500A';
  if (title.includes('güncellendi')) return '#633806';
  return '#9a9a94';
}
function formatRelativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const min = Math.floor(diff/60000), hour = Math.floor(diff/3600000);
  if (min < 1) return 'Az önce'; if (min < 60) return `${min} dk`;
  if (hour < 24) return `${hour} sa`; return 'Dün';
}
```

---

## 10. Kanban Önizleme

```css
.kb-col     { background:var(--bg2); border-radius:10px; padding:8px }
.tc         { background:var(--bg); border:0.5px solid var(--bdr); border-radius:8px; padding:8px 9px; margin-bottom:6px; position:relative; overflow:hidden; cursor:grab }
.tc:hover   { border-color:var(--bdr2) }
.tc-acc     { position:absolute; left:0; top:0; bottom:0; width:3px }
.tc.done    { opacity:.6 } .tc.done .tc-title { text-decoration:line-through }
.tc.dragging { opacity:.3; transform:rotate(1.5deg) }
.progress-bar  { height:3px; background:var(--bg3); border-radius:3px; overflow:hidden; margin-top:4px; padding-left:8px }
.progress-fill { height:100%; border-radius:3px }
```

### Görev Tipi → Renk Şeridi

| Tip | Renk | Badge |
|-----|------|-------|
| Video | `#E24B4A` | `.b-rd` |
| Grafik | `#534AB7` | `.b-pu` |
| Fotoğraf | `#378ADD` | `.b-bl` |
| Metin | `#639922` | `.b-gn` |
| Animasyon | `#BA7517` | `.b-am` |

---

## 11. Badge & Buton Sistemi

```css
.badge  { display:inline-flex;align-items:center;padding:2px 7px;border-radius:20px;font-size:9px;font-weight:500;white-space:nowrap }
.b-pu   { background:#EEEDFE; color:#3C3489 }
.b-gn   { background:#EAF3DE; color:#27500A }
.b-am   { background:#FAEEDA; color:#633806 }
.b-rd   { background:#FCEBEB; color:#A32D2D }
.b-gr   { background:var(--bg2); color:var(--txt2) }
.b-bl   { background:#E6F1FB; color:#0C447C }

.btn        { padding:5px 12px;border-radius:8px;border:0.5px solid var(--bdr2);background:transparent;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;font-family:inherit }
.btn:hover  { background:var(--bg2) }
.btn-p      { background:#534AB7; color:#fff; border-color:#534AB7 }
.btn-p:hover{ background:#3C3489 }
.btn.bg0    { border-color:transparent }
.btn.bs     { padding:3px 9px; font-size:10px }
.btn.bgn-btn{ background:#EAF3DE; color:#27500A; border-color:#C0DD97 }
.btn.brd-btn{ background:#FCEBEB; color:#A32D2D; border-color:#F09595 }
.btn.bam-btn{ background:#FAEEDA; color:#633806; border-color:#FAC775 }
.btn.bpu-btn{ background:#EEEDFE; color:#3C3489; border-color:#AFA9EC }
```

---

## 12. CSS Root Değişkenleri

```css
:root {
  --bg: #fff;   --bg2: #f7f6f3;   --bg3: #efefeb;
  --txt: #1a1a18;  --txt2: #5a5a54;  --txt3: #9a9a94;
  --bdr: rgba(0,0,0,.07);  --bdr2: rgba(0,0,0,.14);
  --acc: #534AB7;  --abg: #EEEDFE;  --atxt: #3C3489;
  --grn: #27500A;  --gbg: #EAF3DE;
  --amb: #633806;  --ambg: #FAEEDA;
  --red: #A32D2D;  --rbg: #FCEBEB;
  --blu: #0C447C;  --bbg: #E6F1FB;
  --r6: 6px;  --r8: 8px;  --r12: 12px;  --r16: 16px;
}
```

---

*← [Faz 5: Geliştirici Rehberi](moodkit_faz5.md)*
