# MoodKit — Faz 5: Geliştirici Rehberi

> Referans: [Faz 1](moodkit_faz1.md) | [Faz 2](moodkit_faz2.md) | [Faz 3](moodkit_faz3.md) | [Faz 4](moodkit_faz4.md)

---

## 1. Yeni Özellik Ekleme Adımları

### 1.1 Backend — Yeni endpoint

```bash
# 1. Prisma şemasına alan/model ekle
# 2. Migration oluştur
npx prisma migrate dev --name add_feature
npx prisma generate

# 3. Route dosyasına endpoint ekle
# 4. src/index.ts'de route'u bağla (yoksa)
# 5. curl ile test et
curl -X POST http://localhost:8080/api/.../yeni \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alan": "değer"}'
```

### 1.2 Frontend — Yeni view

```js
// 1. HTML'e view div ekle
<div id="v-yeniview" class="view"></div>

// 2. Load fonksiyonu yaz
async function loadYeniData(fid, bid) {
  const data = await apiFetch(`/api/firms/${fid}/briefs/${bid}/yeni`);
  gB(fid, bid).yeniData = data;
}

// 3. View fonksiyonu — async + null guard + showV
async function openYeniView(fid, bid) {
  curFid = fid; curBid = bid;
  openAcc(fid); lastView = 'yeniview';
  const f = gF(fid); if (!f) return;
  if (!f.briefs?.length) await loadBriefs(fid);
  let b = gB(fid, bid);
  if (!b && f.briefs?.length) { bid = f.briefs[0].id; b = f.briefs[0]; }
  if (!b) return;
  await loadYeniData(fid, bid);
  setBC([{label:'Dashboard',fn:'goHome()'},{label:f.name},{label:'Yeni View'}]);
  document.getElementById('v-yeniview').innerHTML = `...`;
  showV('yeniview');
}

// 4. Sidebar'a link ekle (renderSB içinde)
`<div class="asub" onclick="openYeniView('${f.id}','${b.id}')">· Yeni View</div>`

// 5. closeMod'a case ekle
else if (lastView === 'yeniview' && curFid && curBid) openYeniView(curFid, curBid);
```

---

## 2. İsimlendirme Kuralları

### Backend (TypeScript)

| Kategori | Format | Örnek |
|----------|--------|-------|
| Dosya | kebab-case.ts | `auth.ts`, `notif-worker.ts` |
| Fonksiyon | camelCase | `loadBriefs()`, `createCheckItem()` |
| Değişken | camelCase | `firmId`, `checkItems` |
| Sabit | UPPER_SNAKE | `JWT_SECRET`, `ROLE_LEVEL` |
| Enum | UPPER_SNAKE | `ADMIN`, `PENDING`, `TODO` |
| DB alanı | camelCase | `createdAt`, `taskAssigneeId` |

### Frontend (JavaScript)

| Kategori | Format | Örnek |
|----------|--------|-------|
| View fonk. | openXxx(fid,bid) | `openBrief`, `openMbIG` |
| Render fonk. | renderXxx() | `renderMBG`, `renderTC` |
| Action fonk. | verbNoun() | `addMbCard`, `saveVer` |
| Load fonk. | loadXxx() | `loadFirms`, `loadTasks` |
| Modal tipi | verb-noun string | `"add-firm"`, `"edit-mb"` |
| HTML ID | kebab-case | `"v-brief"`, `"nic-cap"` |
| CSS class | kısa kebab | `.mbc`, `.tcf`, `.aw-h` |

---

## 3. Kritik Kod Kuralları (İhlal Edilmez)

```js
// ❌ YANLIŞ — ReferenceError
onclick="openBrief('"+fid+"','"+bid+"')"

// ✅ DOĞRU — template literal
onclick="openBrief('${fid}','${bid}')"

// ❌ YANLIŞ — null guard yok
async function openBrief(fid, bid) {
  renderBrief(gB(fid,bid)); // crash
}

// ✅ DOĞRU — null guard var
async function openBrief(fid, bid) {
  const f = gF(fid); if (!f) return;
  if (!f.briefs?.length) await loadBriefs(fid);
  let b = gB(fid, bid);
  if (!b && f.briefs?.length) { bid = f.briefs[0].id; b = f.briefs[0]; }
  if (!b) return;
  // render...
}

// Versiyon yüklenince kart REVIEW'a çekilir, APPROVED olmaz
// IGCell.cellIndex backend'de hesaplanır (MAX+1), frontend göndermez
// Client rolü edit/create yapamaz → requireRole("EDITOR") şart
```

---

## 4. Hata Yönetimi

### Backend hata formatı

```
{ "error": "Açıklama" }

HTTP 400 → Validation hatası
HTTP 401 → Token yok/geçersiz
HTTP 403 → Yetki yok
HTTP 404 → Kayıt bulunamadı
HTTP 409 → Çakışma (duplicate)
HTTP 500 → Sunucu hatası
```

### apiFetch wrapper

```js
async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${_token}` },
    method: opts.method || 'GET',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Bilinmeyen hata' }));
    if (res.status === 401) { showLogin(); throw new Error('Oturum süresi doldu'); }
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}
```

### Optimistic update pattern

```js
async function toggleCheck(fid, bid, tid, cid, done) {
  const ci = getCheckItem(tid, cid);
  ci.done = done;          // 1. Optimistic UI güncelle
  updateProgressBar(tid);
  try {
    await apiFetch(`.../check/${cid}`, { method:'PATCH', body:{done} });
  } catch(e) {
    ci.done = !done;       // 2. Hata → geri al
    updateProgressBar(tid);
    toast('Hata: ' + e.message);
  }
}
// Optimistic update KULLANILMAZ: POST (ID bilinmez), DELETE (cascade), APPROVED (tetikleyici)
```

### Yaygın Prisma hata kodları

| Kod | Anlam | HTTP |
|-----|-------|------|
| P2002 | Unique constraint | 409 |
| P2003 | Foreign key hatası | 404 |
| P2025 | Kayıt bulunamadı | 404 |
| P2014 | İlişki zorunlu | 400 |

---

## 5. Yapay Zeka ile Çalışma

### Dokümanları context olarak verme

```bash
# Yöntem 1: Spesifik faz mention
> @docs/moodkit_faz2.md  ← backend işi
> @docs/moodkit_faz3.md  ← frontend işi
> @docs/moodkit_faz4.md  ← akış/yetki sorunu

# Yöntem 2: CLAUDE.md (otomatik yükleme)
cat moodkit_faz1.md moodkit_faz2.md moodkit_faz3.md \
    moodkit_faz4.md moodkit_faz5.md > CLAUDE.md
```

### Etkili prompt şablonları

```
# Backend endpoint:
"@docs/moodkit_faz2.md bölüm 3.6'ya göre /api/tasks/mine endpoint'ini yaz.
requireAuth + requireFirmAccess kullan.
Task + checkItems + card(son versiyon) + brief + firm include et."

# Frontend view:
"@docs/moodkit_faz3.md bölüm 8'e göre showPersonelPanel() fonksiyonunu yaz.
- Template literal kullan (string concat yok)
- async + null guard
- loadMyTasks() ile veri çek
- getRefMedia() helper ile referans görsel göster"

# Yeni özellik:
"@docs/moodkit_faz5.md bölüm 1'deki adımları takip ederek
[özellik adı] ekle. Backend + frontend birlikte yaz."
```

### Kontrol listesi (AI üretimini doğrulama)

- [ ] Tüm onclick'ler template literal mi?
- [ ] Async fonksiyonlarda null guard var mı?
- [ ] loadXxx() çağrısı yapılıyor mu?
- [ ] showV() son satırda mı?
- [ ] closeMod() case'i eklendi mi?
- [ ] Error toast gösteriliyor mu?

---

## 6. Frontend Kontrol Listesi

```js
// Tarayıcı konsolunda hızlı test:
firms              // State dolu mu?
curFid             // Doğru firma seçili mi?
gF(curFid)         // Firma objesi var mı?
gB(curFid, curBid) // Brief objesi var mı?

// onclick çalışmıyorsa:
// "ReferenceError: xyz is not defined" → string concat hatası
// console.log ile fid/bid değerlerini kontrol et
```

---

## 7. Deploy & Bakım

```toml
# railway.toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npx prisma migrate deploy && npm start"
healthcheckPath = "/health"
healthcheckTimeout = 120
```

### Şema değişikliği akışı

```bash
# 1. Lokalde schema.prisma güncelle
# 2. Migration oluştur
npx prisma migrate dev --name add_feature
# 3. Migration dosyasını commit et
git add prisma/migrations/
git commit -m "feat: add feature schema"
git push
# 4. Railway otomatik migrate deploy çalıştırır
```

> ⚠️ Production'da asla `migrate dev` çalıştırma. Lokalde oluştur, commit et.

### Ortam değişkenleri

```env
DATABASE_URL   = postgresql://...
REDIS_URL      = rediss://...  (TLS için rediss://)
JWT_SECRET     = min 32 karakter
JWT_EXPIRES_IN = 1d
PORT           = 8080 (Railway otomatik)
NODE_ENV       = production
```

---

*← [Faz 4: İş Akışları](moodkit_faz4.md)*
