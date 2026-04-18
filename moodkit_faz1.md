# MoodKit — Faz 1: Proje Özeti & Mimari Genel Bakış

> Bu doküman yapay zeka destekli geliştirme süreçlerinde ortak referans olarak kullanılmak üzere hazırlanmıştır.

---

## 1. Projenin Amacı ve Kapsamı

### 1.1 MoodKit Nedir?

MoodKit, kreatif ajansların müşteri projelerini uçtan uca yönetmesini sağlayan web tabanlı bir ajans operasyon platformudur.

**Temel İş Akışı:**
1. **Brief Alımı** → Müşteriden aylık içerik yönlendirmesi topla
2. **IG Moodboard** → Instagram içeriklerinin görsel yönlendirme kartlarını oluştur
3. **Kampanya Moodboard** → Afiş, billboard, reklam materyallerini planla
4. **Müşteri Onayı** → Müşteri kartları onaylasın ya da revize istesin
5. **Görevler** → Onaylanan kartlardan otomatik Kanban görevi oluştur
6. **IG Grid** → Sınırsız hücreli Instagram grid planı oluştur, sürükle-bırak ile sırala
7. **Yayın** → Onay durumlarını raporla, arşive al

---

### 1.2 Kimler Kullanır?

**Ajans Tarafı:**
- `ADMIN` — Firma ekle/sil, brief yönet, tüm içeriklere erişim, üye yönetimi
- `EDITOR` (Kreatif Ekip) — Brief doldur, moodboard kartı ekle, versiyon yükle
- `PROD` (Prodüksiyon) — Kanban görevlerini takip et, tamamlanan işleri işaretle

**Müşteri Tarafı:**
- `CLIENT` — Yalnızca müşteri portalını görür; moodboard kartlarını onaylar veya revize ister, IG grid'i inceler, yorum bırakır

---

### 1.3 Kapsam

**Kapsam İçinde:**
- Çok kullanıcılı auth sistemi (JWT + bcrypt)
- Firma ve brief bazlı proje yönetimi
- IG Moodboard ve Kampanya Moodboard (kart ekleme, versiyon geçmişi, durum yönetimi)
- Müşteri onay portalı (rol bazlı görünüm)
- Kanban görev yönetimi (sürükle-bırak + checklist)
- IG Grid planlama (sınırsız hücre, sürükle-bırak sıralama)
- Bildirim sistemi (Redis pub/sub)
- Takvim görünümü
- Personel Paneli (kişiye özel görev + referans görsel + checklist)

**Kapsam Dışında:**
- Direkt sosyal medya yayını (API entegrasyonu yok)
- Dosya depolama (CDN/S3 yok — URL tabanlı)
- Mobil uygulama (responsive web, native değil)
- E-posta bildirimi (yalnızca in-app)

---

## 2. Teknik Stack

| Katman | Teknoloji | Açıklama |
|--------|-----------|----------|
| Frontend | Vanilla JS + HTML/CSS | Single-file SPA. Framework yok. Template literal ile DOM. Build step gerektirmez. |
| Backend | Node.js + TypeScript | Express.js REST API. ts-node ile çalıştırma. |
| ORM | Prisma | PostgreSQL şeması, migration, tip güvenli sorgu. Schema-first. |
| Veritabanı | PostgreSQL | İlişkisel veri, foreign key bütünlüğü. |
| Cache/Pub-Sub | Redis | JWT blacklist, oturum cache, bildirim kuyruğu. |
| Auth | JWT + bcrypt | Access token (1 gün). Şifre hash: bcrypt round 12. |
| Deploy | Railway | PostgreSQL ve Redis dahil. GitHub auto-deploy. |

**Neden Vanilla JS?**
- Tek HTML dosyası → deploy basit, build adımı yok
- Tüm state JS objesinde → localStorage/sessionStorage yeterli
- Yapay zeka ile çalışırken: tüm kod tek dosyada, context anlaşılır
- Dezavantaj: component reuse yok, büyük projede bakımı zorlaşır

**package.json dependencies:**
```json
{
  "dependencies": {
    "@prisma/client": "^5.x",
    "bcryptjs": "^2.x",
    "cors": "^2.x",
    "express": "^4.x",
    "ioredis": "^5.x",
    "jsonwebtoken": "^9.x",
    "zod": "^3.x",
    "dotenv": "^16.x"
  }
}
```

---

## 3. Klasör Yapısı

```
moodkit/
├── prisma/
│   ├── schema.prisma          # Veritabanı şeması (tek kaynak)
│   └── migrations/
│
├── src/
│   ├── index.ts               # Entry point, Express app, middleware
│   ├── seed.ts                # İlk admin + örnek veri
│   ├── middleware/
│   │   └── auth.ts            # requireAuth, requireRole, requireFirmAccess
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── redis.ts           # Redis client + helpers
│   │   └── notifWorker.ts     # Bildirim worker
│   └── routes/
│       ├── auth.ts            # /api/auth/*
│       ├── firms.ts           # /api/firms/*
│       ├── briefs.ts          # /api/firms/:fid/briefs/*
│       ├── moodboard.ts       # /api/firms/:fid/briefs/:bid/cards/*
│       ├── tasks.ts           # /api/firms/:fid/briefs/:bid/tasks/*
│       ├── ig.ts              # /api/firms/:fid/briefs/:bid/ig/*
│       ├── users.ts           # /api/users/*
│       └── notifications.ts   # /api/notifications/*
│
├── public/
│   └── index.html             # Tüm frontend (CSS + HTML + JS tek dosya)
│
├── .env
├── .env.example
├── railway.toml
├── tsconfig.json
└── package.json
```

### Kritik Kural — Frontend Kod Yazım Standardı

> ⚠️ **ZORUNLU:** Tüm `onclick="..."` içindeki ID'ler **template literal** ile geçirilir.

```js
// ✅ DOĞRU
onclick="openBrief('${fid}','${bid}')"
ondrop="dropTask(event,'${col.id}','${fid}','${bid}')"
ondragstart="startDT(event,'${t.id}')"

// ❌ YANLIŞ — CUID'lerde ReferenceError üretir
onclick="openBrief('"+fid+"','"+bid+"')"
```

---

## 4. Veri Akışı

### 4.1 İstek-Yanıt Döngüsü

```
KULLANICI  →  onclick="openBrief('firmId','briefId')"
           ↓
FRONTEND   →  openBrief() çağrılır
           →  apiFetch('/api/firms/firmId/briefs') 
           →  Header: Authorization: Bearer <JWT>
           ↓
BACKEND    →  requireAuth → token doğrula
           →  requireFirmAccess → erişim kontrolü
           →  Route handler → Prisma DB sorgu
           →  JSON response
           ↓
FRONTEND   →  firms[x].briefs[y] = mappedData
           →  HTML üret → DOM'a yaz → showV()
```

### 4.2 Auth Akışı

```
LOGIN:
  POST /api/auth/login { email, password }
  → bcrypt.compare()
  → jwt.sign({ id, role }, SECRET, { expiresIn: '1d' })
  ← { token, user }
  Frontend: localStorage.setItem('mk_token', token)

HER İSTEK:
  Header: Authorization: Bearer <token>
  → requireAuth middleware
  → jwt.verify(token, SECRET)
  → req.user = { id, name, role }

LOGOUT:
  POST /api/auth/logout
  → Token Redis blacklist'e eklenir
  Frontend: localStorage.removeItem('mk_token')
```

### 4.3 Frontend State Değişkenleri

| Değişken | Tip | İçerik |
|----------|-----|--------|
| `firms` | Array | Tüm firmalar + brief'ler + kartlar + görevler + IG hücreleri |
| `members` | Array | Tüm kullanıcılar. sessionStorage'a yedeklenir. |
| `notifs` | Array | Bildirimler. En fazla son 20. |
| `curFid` | String\|null | Aktif firma ID'si |
| `curBid` | String\|null | Aktif brief ID'si |
| `lastView` | String\|null | Son aktif view. Modal kapanınca döner. |
| `dragTid` | String\|null | Sürüklenen görev ID'si |
| `dragCell` | Number\|null | Sürüklenen IG hücre index'i |

### 4.4 firms[] Objesi Yapısı

```js
firms = [
  {
    id:     "cuid-firma",
    name:   "Nike Türkiye",
    sector: "Spor",
    color:  "#1a1a2e",
    briefs: [
      {
        id:    "cuid-brief",
        month: "Nisan",
        year:  2026,
        stage: "mb_ig",  // brief | mb_ig | mb_kamp | tasks | yayin
        answers: { products, tone, colorDir, ... },
        mbIG: [
          {
            id: "cuid-kart",
            type: "Referans Görseli",
            label: "Urban Atlet",
            desc: "...",
            url: "https://youtube.com/...",
            img: "https://...",
            isVid: false,
            status: "pending",  // pending | review | approved | rejected
            versions: [
              { v: 1, date: "15 Nis", by: "Ahmet Y.", note: "...", img: null, url: "" }
            ],
            task: {
              type: "Video",
              desc: "...",
              format: "9:16 · 30 sn",
              assignee: "cuid-user",
              dl: "20 Nisan",
              igCell: 0  // Hangi IG hücresine gidecek (index)
            }
          }
        ],
        mbKamp: [ /* Aynı yapı */ ],
        tasks: [
          {
            id: "cuid-task",
            cardRef: "Urban Atlet",
            type: "Video",
            desc: "...",
            format: "...",
            source: "IG Moodboard",
            assignee: "cuid-user",
            deadline: "20 Nisan",
            status: "todo",  // todo | doing | done
            checkItems: [
              { id: "cuid-ci", text: "RAW teslim edildi", done: false, order: 0 }
            ]
          }
        ],
        igCells: [
          {
            id: "cuid-cell",
            cellIndex: 0,    // Pozisyon (sınırsız hücre, sürükle ile değişir)
            type: "post",    // post | reels | carousel
            src: "https://...",
            cap: "Caption",
            hash: "#marka",
            date: "15 Nis 10:00",
            videoUrl: "",
            approved: null,  // null | true | false
            likes: "1.2B",
            cmts: "45"
          }
          // ... sınırsız hücre
        ]
      }
    ]
  }
]
```

---

## 5. Ortam Değişkenleri & Deploy

### .env

```env
DATABASE_URL="postgresql://user:pass@host:5432/moodkit"
REDIS_URL="rediss://default:pass@host:6379"
JWT_SECRET="en-az-32-karakter-rastgele-string"
JWT_EXPIRES_IN="1d"
PORT=8080
NODE_ENV="production"
```

### railway.toml

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npx prisma migrate deploy && npm start"
healthcheckPath = "/health"
healthcheckTimeout = 120
```

### Geliştirme Ortamı

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npx ts-node src/seed.ts
npm run dev
# http://localhost:8080
```

---

## 6. Genel Tasarım Kuralları

### CSS Değişkenleri (Özet)

```css
--bg: #fff          --bg2: #f7f6f3     --bg3: #efefeb
--txt: #1a1a18      --txt2: #5a5a54    --txt3: #9a9a94
--acc: #534AB7      --abg: #EEEDFE     --atxt: #3C3489
--grn: #27500A      --gbg: #EAF3DE
--red: #A32D2D      --rbg: #FCEBEB
--amb: #633806      --ambg: #FAEEDA
--blu: #0C447C      --bbg: #E6F1FB
--r8: 8px           --r12: 12px        --r16: 16px
```

### View Sistemi

```js
// HTML'de tüm view'lar tanımlı, CSS'de display:none
// showV() ile aktif olan gösterilir:
function showV(v) {
  document.querySelectorAll('.view').forEach(e => e.classList.remove('act'));
  document.getElementById('v-' + v)?.classList.add('act');
}

// View ID'leri:
// v-home, v-brief, v-mb-ig, v-mb-k, v-tasks
// v-ig, v-yayin, v-cal, v-team, v-personel
// v-cust, v-modal, v-det
```

---

*Faz 2: Veritabanı Şeması & Backend API → moodkit_faz2.md*
*Faz 3: Frontend Mimarisi & UI/UX → moodkit_faz3.md*
