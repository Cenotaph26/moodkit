# MoodKit — Faz 3: Frontend Mimarisi & UI/UX

> Referans: [Faz 1](moodkit_faz1.md) | [Faz 2](moodkit_faz2.md)

---

## 1. SPA Yapısı

**Tek dosya:** `public/index.html` — CSS + HTML + JS bir arada. Framework yok.

### Prensipler
1. **Template literals** — Tüm onclick'lerde ID'ler template literal ile geçirilir (asla string concat)
2. **View sistemi** — `showV(v)` ile `.act` class toggle — tüm view'lar DOM'da her zaman var
3. **State in memory** — `firms[]`, `members[]`, `notifs[]` global diziler
4. **API-first** — Data değişikliği önce API, sonra local state
5. **Optimistic UI** — Checklist gibi ufak işlemler önce UI, hata olursa geri al

```js
// ✅ DOĞRU — template literal
onclick="openBrief('${fid}','${bid}')"
ondrop="dropTask(event,'${col.id}','${fid}','${bid}')"
ondragstart="startDT(event,'${t.id}')"

// ❌ YANLIŞ — ReferenceError üretir
onclick="openBrief('"+fid+"','"+bid+"')"
```

### View ID'leri
```
v-home      → Dashboard
v-brief     → Brief formu
v-mb-ig     → IG Moodboard
v-mb-k      → Kampanya Moodboard
v-tasks     → Kanban görevler
v-ig        → IG Grid
v-yayin     → Yayın
v-cal       → Takvim
v-team      → Ekip üyeleri
v-personel  → Personel paneli
v-cust      → Müşteri portalı
v-modal     → Modal (showMod ile doldurulur)
v-det       → Kart detay
```

---

## 2. Init & Auth Akışı

```js
(async function() {
  if (_token && _me) {
    try {
      const fresh = await apiFetch('/api/auth/me');
      _me = fresh;
      await initApp(); // loadMembers → loadFirms → loadBriefs → renderSB → goHome
    } catch(e) {
      localStorage.clear();
      showLogin();
    }
  } else {
    showLogin();
  }
})();
```

---

## 3. Shell

### Topbar
```
Sol:  moodkit logo + breadcrumb (#bc)
Sağ:  🔔 bildirim zili + avatar + ad + rol badge + Çıkış
```
Breadcrumb: `Dashboard › Nike TR › Nisan 2026 › IG Moodboard`  
Son eleman tıklanamaz (`bcu`), öncekiler tıklanabilir (`bcr`).

### Sidebar
```
PLATFORM
  🏠 Dashboard
  👤 Ekip Üyeleri
  ✅ Benim Görevlerim   [yalnızca PROD/EDITOR]

FİRMALAR
  ● Firma ▸
      ■ Ay Yıl Brief
        · IG Moodboard
        · Kampanya MB
        · Görevler
        · IG Grid
        · Yayın
        · Takvim
      + Yeni Brief

+ Firma Ekle
```

---

## 4. Dashboard — `v-home`

```
[Aktif Firmalar N] [Bekleyen Görev N] [Toplam Görev N]
─────────────────────────────────────
Firma kartları grid (auto-fill, min 190px):
  → Kapak görseli + firma rengi overlay + isim + sektör
  → Son brief badge (ay/yıl + aşama)
  → Progress bar: onaylanan/toplam kart
  → onclick: openBrief('${f.id}','${f.briefs[0]?.id||""}')
  Son kart: dashed "+ Firma Ekle"

Boş: ikon + metin + [+ Firma Ekle]
```

---

## 5. Brief — `v-brief`

`openBrief(fid, bid)` — **async + null guard**

```
Başlık + [Sil] [IG Moodboard →] [Kaydet]
─────────────────────────────────────
Bölüm 1: Dönem     → Ay seçici + Yıl
Bölüm 2: Ürünler   → textarea + yeni ürün radio
Bölüm 3: Yönlendirme → ton + renk + kaçınılacaklar + referans
Bölüm 4: Özel      → özel gün + talep + ek notlar
```

```js
// Null guard (tüm view fonksiyonlarında tekrarlanır)
async function openBrief(fid, bid) {
  const f = gF(fid); if (!f) return;
  if (!f.briefs?.length) await loadBriefs(fid);
  let b = gB(fid, bid);
  if (!b && f.briefs?.length) { bid = f.briefs[0].id; b = f.briefs[0]; }
  if (!b) return;
  // render...
}
```

---

## 6. Moodboard — `v-mb-ig` / `v-mb-k`

### Liste

```
Başlık + [Müşteri Görünümü] [+ Kart Ekle]
Progress bar
─────────────────────────────────────
Kart grid (.mbg, auto-fill min 220px):
  .mbc → .mbth (thumbnail 180px) + .mbb (gövde)
  Thumbnail: görsel/video + hover overlay ([↗][✕]) + versiyon badge
  Gövde: başlık + tür + açıklama (2 satır) + durum badge + atanan
  Click → openMBDet(fid,bid,which,cid)
```

### Kart Detay — `v-det`

```
[← Moodboard]  başlık  tür badge  durum badge
─────────────────────────────────────
2 Kolon:

SOL:
  Medya alanı:
    YouTube/Vimeo → iframe embed
    MP4/WebM/MOV  → <video controls>
    Görsel        → <img>
    Instagram/link → tıklanabilir link
    Hiçbiri       → gradient placeholder
  Açıklama kutusu
  [✓ Onayla] [✗ Reddet] [● İncele] [✎ Düzenle]

SAĞ:
  Versiyon Geçmişi:
    v1, v2... → not + tarih + thumbnail
    [+ Yeni Versiyon Ekle]
  Görev Tanımı:
    tip + deadline + açıklama + format + atanan
```

### Onay Akışı (`setMBS`)

```js
async function setMBS(fid, bid, which, cid, status) {
  c.status = status;
  await apiSetCardStatus(fid, bid, cid, status);
  if (status === 'approved' && c.task) {
    // → IG hücresine kopyala (which=ig && igCell var ise)
    // → Kanban'a görev ekle (yoksa)
  }
  openMBDet(fid, bid, which, cid); // ekranı güncelle
}
```

---

## 7. Görevler — Kanban — `v-tasks`

### Drag & Drop

```js
// Task kartında:
ondragstart="startDT(event,'${t.id}')"
ondragend="endDT(event)"

// Sütunda:
ondrop="dropTask(event,'${col.id}','${fid}','${bid}')"

async function dropTask(e, newStatus, fid, bid) {
  e.preventDefault();
  if (!dragTid) return;
  const task = b.tasks.find(t => t.id === dragTid);
  if (task && task.status !== newStatus) {
    task.status = newStatus;        // Optimistic
    renderTC(fid, bid);
    await apiUpdateTask(fid, bid, task.id, { status: newStatus.toUpperCase() });
  }
}
```

### Checklist

```js
async function toggleCheck(fid, bid, tid, cid, done) {
  const ci = task.checkItems.find(c => c.id === cid);
  ci.done = done;          // Optimistic update
  updateProgressBar(tid);
  try {
    await apiFetch(`/api/firms/${fid}/briefs/${bid}/tasks/${tid}/check/${cid}`,
      { method: 'PATCH', body: { done } });
  } catch(e) {
    ci.done = !done;       // Geri al
    updateProgressBar(tid);
  }
}
```

---

## 8. Personel Paneli — `v-personel`

`showPersonelPanel()` → `GET /api/tasks/mine`

```
Başlık "Benim Görevlerim"
─────────────────────────────────────
Özet: [Toplam N] [Bekliyor N] [Üretimde N] [Tamamlandı N]
─────────────────────────────────────
Filtre: Tümü | Bekliyor | Üretimde | Tamamlandı
─────────────────────────────────────
Görev listesi (genişletilebilir kartlar):
  Kapalı: firma + brief + başlık + tür badge + deadline + progress N/M
  Açık:
    REFERANS GÖRSEL (son versiyon mediaUrl/videoUrl)
    Görev tanımı + format
    CHECKLİST (checkbox maddeleri)
    [+ Madde Ekle]
```

**Referans görsel mantığı:**
```js
function getRefMedia(task) {
  const lastVer = task.card?.versions?.[0]; // take:1 ile son versiyon
  if (!lastVer) return null;                // Manuel görev
  if (lastVer.videoUrl) return `<iframe/video src="${toEmbed(lastVer.videoUrl)}">`;
  if (lastVer.mediaUrl) return `<img src="${lastVer.mediaUrl}">`;
  return null;
}
```

---

## 9. IG Grid — `v-ig`

`openIG(fid, bid)` → `loadIGCells()` → `renderIGCells()`

### Ekran

```
Başlık + N içerik / N onaylı + [Müşteri Onayı] [+ İçerik Ekle]
─────────────────────────────────────
2 Kolon:

SOL: Telefon Mockup (Instagram görünümü)
  Status bar + profil header + istatistikler
  3 kolonlu grid (cellIndex sırasına göre):
    Her hücre: aspect-ratio:1 + görsel + hover overlay
    Reels: sağ üst ▶    Carousel: sağ üst ⧉
    Onaylı: sol alt ✓   Draggable: true

SAĞ: İçerik Listesi
  Küçük thumb + tip + tarih + caption + onay ikonu
```

### IG Grid Drag & Drop

```js
// JS event listener — onclick attr değil (closure ile fid/bid geçilir)
d.addEventListener('dragstart', e => {
  dragCell = idx;
  d.style.opacity = '.3';
  e.dataTransfer.setData('text/plain', idx);
});

d.addEventListener('drop', e => {
  e.preventDefault();
  if (dragCell === null || dragCell === idx) return;
  [b.igCells[dragCell], b.igCells[idx]] = [b.igCells[idx], b.igCells[dragCell]];
  dragCell = null;
  renderIGCells(fid, bid);
  // POST /ig/reorder → backend cellIndex'leri günceller
  apiFetch(`/api/firms/${fid}/briefs/${bid}/ig/reorder`, {
    method: 'POST',
    body: { order: b.igCells.map(c => c.id) }
  });
});
```

### Post Detay (`viewCell`)

```
Reels → openReels()   [dikey video, klavye ArrowUp/Down]
Post/Carousel:
  SOL: Tam Instagram post UI
    profil header + kare görsel + ♡ 💬 ➤ 🔖 + beğeni + caption + hashtag
    Carousel: ← → oklar + nokta göstergesi
  SAĞ: [✓ Onayla] [✗ Reddet] + Caption düzenle + [Kaydet]
```

---

## 10. Modal Sistemi

`showMod(type, ...args)` → `v-modal`'a HTML yazar → `showV('modal')`  
`closeMod()` → `lastView`'a döner

### Modal Tipleri

| tip | Açıklama |
|-----|----------|
| `add-firm` | Firma adı, sektör, renk, e-posta |
| `add-mb` | Kart ekle: tür, başlık, açıklama, URL, görsel, görev tanımı |
| `edit-mb` | Kartı düzenle (mevcut değerler dolu gelir) |
| `add-ver` | Yeni versiyon: not, açıklama, görsel/video |
| `add-task` | Manuel görev: tür, atanan, açıklama, format, deadline |
| `add-ig` | IG içerik ekle: tip, tarih, URL, görsel, caption, hashtag |
| `edit-ig` | IG hücre düzenle |
| `add-member` | Üye: ad, e-posta, ünvan, rol, prodrol, şifre |
| `edit-member` | Üye düzenle + opsiyonel şifre değiştir |

### Dosya Yükleme

```js
function prevFile(fpId, input, key) {
  const file = input.files[0];
  const url  = URL.createObjectURL(file);
  const isVid = isVidFile(file);

  window[key] = { img: isVid ? null : url, blob: isVid ? url : null, isVid };

  document.getElementById(fpId).innerHTML = isVid
    ? `<video src="${url}" style="height:60px" muted></video>`
    : `<img src="${url}" style="height:60px;object-fit:cover">`;
}

// Kaydederken:
// const mbc = window['_mbc'] || { img: null, isVid: false };
// mediaUrl: mbc.img || null
```

---

## 11. Ekip Yönetimi — `v-team`

```
Başlık + [+ Üye Ekle]
─────────────────────────────────────
Her üye kartı:
  Avatar + Ad + e-posta + ünvan + prodrol
  Rol badge: Admin(mor) / Kreatif(yeşil) / Prodüksiyon(turuncu) / Müşteri(gri)
  [✎ Düzenle] [✕ Sil]
```

**sessionStorage backup:**
```js
async function loadMembers() {
  try {
    const data = await apiFetch('/api/users');
    members = data.map(...);
    sessionStorage.setItem('mk_members', JSON.stringify(members)); // backup
  } catch(e) {
    const backup = sessionStorage.getItem('mk_members');
    if (backup) members = JSON.parse(backup); // 403 olsa bile kaybolmaz
  }
}
```

---

## 12. UI/UX Tasarım Sistemi

### Renk Paleti

```css
/* Ana renkler */
--bg:   #fff       --bg2:  #f7f6f3    --bg3:  #efefeb
--txt:  #1a1a18    --txt2: #5a5a54    --txt3: #9a9a94
--bdr:  rgba(0,0,0,.07)               --bdr2: rgba(0,0,0,.14)

/* Accent (mor) */
--acc:  #534AB7    --abg:  #EEEDFE    --atxt: #3C3489

/* Durum renkleri */
--grn:  #27500A    --gbg:  #EAF3DE    /* Onaylı / Başarı */
--amb:  #633806    --ambg: #FAEEDA    /* Bekliyor / Uyarı */
--red:  #A32D2D    --rbg:  #FCEBEB    /* Reddedildi / Hata */
--blu:  #0C447C    --bbg:  #E6F1FB    /* Bilgi */
--cor:  #712B13    --cbg:  #FAECE7    /* Kampanya MB */
```

### Tipografi

| Element | Boyut | Ağırlık | Yer |
|---------|-------|---------|-----|
| Sayfa başlığı | 16px | 600 | Her view üstü |
| Bölüm başlığı | 14px | 600 | Modal, kart içi |
| Kart başlığı | 13px | 500 | Firma adı, kart etiketi |
| Gövde | 13px | 400 | Ana içerik |
| İkincil | 12px | 400 | Açıklamalar |
| Küçük | 11px | 400 | Tarih, meta |
| Mikro | 10px | 500 | Badge'ler |
| Nano | 9px | 400 | IG mockup içi |

Font: `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif` — harici font yok.

### Spacing

4px bazlı grid. Tüm değerler 4'ün katı: `4, 6, 8, 10, 12, 14, 16, 20px`

### Border Radius

```css
--r8:  8px    /* Butonlar, inputlar */
--r12: 12px   /* Ana kartlar */
--r16: 16px   /* Modal, telefon mockup */
50%           /* Avatar */
```

### Buton Hiyerarşisi

| Class | Görünüm | Ne Zaman |
|-------|---------|----------|
| `.btn.bp` | Mor dolu | **Primary** — tek ekranda bir tane |
| `.btn.bg0` | Ghost | İkincil, geri, iptal |
| `.btn.bs` | Küçük | Dar alan |
| `.btn.bgn-btn` | Yeşil | Onayla, tamamla |
| `.btn.brd-btn` | Kırmızı | Reddet, sil (confirm ister) |
| `.btn.bam-btn` | Turuncu | İncelemeye al |
| `.btn.bpu-btn` | Mor açık | Müşteri görünümü, öne çıkar |

**Kural:** Yan yana butonlarda en sağ = primary, soldan sağa önem azalır.  
Örnek: `[İptal]  [Kaydet]` → İptal=ghost, Kaydet=primary

### Badge Sistemi

| Class | Renk | Kullanım |
|-------|------|---------|
| `.bpu` | Mor | Admin, IG MB aşaması, versiyon |
| `.bgn` | Yeşil | Onaylı, tamamlandı, Kreatif rol |
| `.bam` | Turuncu | Bekliyor, Prodüksiyon rol |
| `.brd` | Kırmızı | Reddedildi, Video görev tipi |
| `.bgr` | Gri | Nötr, Müşteri rol |
| `.bbl` | Mavi | Bilgi, IG Grid onayı |

### Durum Tutarlılığı

Her durum uygulamanın her yerinde aynı renk:

```
PENDING/Bekliyor    → turuncu  (.bam)
REVIEW/İncelemede   → mor      (.bpu)
APPROVED/Onaylı     → yeşil    (.bgn)
REJECTED/Reddedildi → kırmızı  (.brd)
TODO                → turuncu  (.bam)
DOING               → mor      (.bpu)
DONE                → yeşil    (.bgn)
```

### Kart Tipleri

**Genel Kart (`.card .cp`):**  
`border:.5px solid --bdr, radius:--r12, padding:14px 16px`  
Hover: `.card-hov` → `translateY(-2px) + box-shadow`

**Moodboard Kartı (`.mbc`):**  
Thumbnail 180px + hover overlay (opacity 0→1) + gövde

**Kanban Task Kartı (`.tc`):**  
Sol renk şeridi (3px) + başlık + açıklama + footer  
Sürükleme: `opacity:.3, rotate(1.5deg)` → `.dragging`  
Tamamlanan: `opacity:.6, text-decoration:line-through` → `.done`

### Animasyonlar

| Element | Animasyon |
|---------|-----------|
| Buton `:active` | `scale(.98)` |
| Firma/MB kart hover | `translateY(-2px) + shadow` |
| Progress bar | `width transition .4s` |
| Sürüklenen kart | `opacity:.3 + rotate(1.5deg)` |
| Overlay hover | `opacity 0→1, .15s` |
| Sidebar ok | `rotate(90deg)` when `.open` |

### Layout Desenleri

```css
/* Shell */
.app       → flex column, height:100vh
.sidebar   → width:204px, flex-shrink:0
.content   → flex:1, overflow-y:auto

/* İçerik desenleri */
tek kolon        → max-width:520-680px, margin:0 auto
iki kolon (1:1)  → grid-template-columns:1fr 1fr
iki kolon (3:1)  → grid-template-columns:1fr 240px  (IG Grid)
auto-fill        → repeat(auto-fill,minmax(190px,1fr))  (Dashboard)
moodboard grid   → repeat(auto-fill,minmax(220px,1fr))
kanban           → repeat(3,1fr)
IG mockup içi    → repeat(3,1fr)
```

### Empty State Kuralları

1. Her zaman bir aksiyon butonu içerir
2. İkon `opacity:.3`
3. Metin 12px, ortalı, `--txt3` rengi
4. Minimum 32px padding

### UX Kuralları

**Navigasyon:**
- Breadcrumb her zaman tam hiyerarşiyi gösterir
- Her alt ekranda `[← Geri]` butonu bulunur
- Modal kapanınca `lastView`'a dönülür

**Geri Bildirim:**
- Başarı: toast `"Kaydedildi ✓"` (2.4 sn)
- Hata: toast `"Hata: " + e.message`
- Tehlikeli aksiyon: `confirm()` dialog

**Erişilebilirlik:**
- Tüm inputlarda `<label>` zorunlu
- Renk tek başına bilgi taşımaz (metin veya ikon eşliğinde)
- Focus glow: `box-shadow: 0 0 0 3px rgba(83,74,183,.1)`

---

*← [Faz 2: Veritabanı & API](moodkit_faz2.md)*
