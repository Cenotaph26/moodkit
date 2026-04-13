# MoodKit — Kurulum & Deploy

## Yerel Geliştirme

### 1. Bağımlılıkları kur
```bash
npm install
```

### 2. .env dosyasını hazırla
```bash
cp .env.example .env
# .env dosyasını düzenle — DATABASE_URL ve REDIS_URL ekle
```

### 3. PostgreSQL ve Redis çalıştır (Docker ile)
```bash
docker run -d --name moodkit-pg \
  -e POSTGRES_DB=moodkit \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 postgres:16

docker run -d --name moodkit-redis \
  -p 6379:6379 redis:7
```

### 4. .env DATABASE_URL güncelle
```
DATABASE_URL="postgresql://user:password@localhost:5432/moodkit"
REDIS_URL="redis://localhost:6379"
```

### 5. Veritabanı şemasını oluştur
```bash
npm run db:push
npm run db:generate
```

### 6. Demo data ekle (opsiyonel)
```bash
npm run db:seed
```

### 7. Sunucuyu başlat
```bash
npm run dev
# http://localhost:3000
```

---

## Railway Deploy

### Adım 1 — Railway projesi oluştur
1. railway.app → New Project
2. "Deploy from GitHub repo" seç
3. Bu repoyu bağla

### Adım 2 — PostgreSQL ekle
1. Railway dashboard → + New
2. Database → PostgreSQL
3. `DATABASE_URL` otomatik environment variable olarak eklenir

### Adım 3 — Redis ekle
1. Railway dashboard → + New
2. Database → Redis
3. `REDIS_URL` otomatik eklenir

### Adım 4 — Environment Variables ekle
Railway dashboard → Variables:
```
JWT_SECRET=cok-uzun-guclu-secret-min-64-karakter
NODE_ENV=production
FRONTEND_URL=https://senin-domain.up.railway.app
```

### Adım 5 — Deploy
Git push → Railway otomatik build ve deploy eder.

İlk deploy'da otomatik çalışır:
```
prisma db push   (şema oluştur)
npm start        (sunucu başlat)
```

### Adım 6 — Seed (opsiyonel)
Railway dashboard → Terminal:
```bash
npm run db:seed
```

---

## Frontend

`public/` klasörüne `moodkit.html` dosyasını koy ve `index.html` olarak yeniden adlandır.

```bash
cp moodkit.html public/index.html
```

Frontend API çağrıları için `public/index.html` içindeki JS'e şunu ekle:
```js
const API = '' // Aynı domain, relative URL kullan
```

---

## API Endpoints

### Auth
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Firmalar
```
GET    /api/firms
POST   /api/firms
GET    /api/firms/:firmId
PUT    /api/firms/:firmId
DELETE /api/firms/:firmId
POST   /api/firms/:firmId/members
DELETE /api/firms/:firmId/members/:userId
```

### Briefler
```
GET    /api/firms/:firmId/briefs
POST   /api/firms/:firmId/briefs
GET    /api/firms/:firmId/briefs/:briefId
PUT    /api/firms/:firmId/briefs/:briefId
DELETE /api/firms/:firmId/briefs/:briefId
```

### Moodboard Kartları
```
GET    /api/firms/:firmId/briefs/:briefId/cards
POST   /api/firms/:firmId/briefs/:briefId/cards
PUT    /api/firms/:firmId/briefs/:briefId/cards/:cardId
DELETE /api/firms/:firmId/briefs/:briefId/cards/:cardId
POST   /api/firms/:firmId/briefs/:briefId/cards/:cardId/versions
```

### Görevler
```
GET    /api/firms/:firmId/briefs/:briefId/tasks
POST   /api/firms/:firmId/briefs/:briefId/tasks
PUT    /api/firms/:firmId/briefs/:briefId/tasks/:taskId
DELETE /api/firms/:firmId/briefs/:briefId/tasks/:taskId
```

### IG Grid
```
GET  /api/firms/:firmId/briefs/:briefId/ig
PUT  /api/firms/:firmId/briefs/:briefId/ig/:cellIndex
PUT  /api/firms/:firmId/briefs/:briefId/ig/reorder
POST /api/firms/:firmId/briefs/:briefId/ig/approve-all
```

### Bildirimler
```
GET /api/notifications
PUT /api/notifications/read-all
PUT /api/notifications/:id/read
```

---

## Redis Kullanımı

| Amaç | Key Pattern | TTL |
|------|-------------|-----|
| Session | `session:{token}` | 7 gün |
| Blacklist | `blacklist:{token}` | 7 gün |
| Cache (firmalar) | `cache:firms:{userId}` | 2 dk |
| Cache (brief) | `cache:brief:{id}` | 5 dk |
| Bildirim kuyruğu | `queue:notifications` | — |
| Online kullanıcı | `online:{userId}` | 30 sn |
| Rate limit | `ratelimit:{key}` | pencere süresi |

---

## Proje Yapısı

```
moodkit/
├── prisma/
│   └── schema.prisma        # Veritabanı şeması
├── src/
│   ├── index.ts             # Express ana dosya
│   ├── seed.ts              # Demo data
│   ├── lib/
│   │   ├── db.ts            # Prisma client
│   │   ├── redis.ts         # Redis client + helpers
│   │   └── notifWorker.ts   # Bildirim queue worker
│   ├── middleware/
│   │   └── auth.ts          # JWT + Redis auth
│   └── routes/
│       ├── auth.ts
│       ├── firms.ts
│       ├── briefs.ts
│       ├── moodboard.ts
│       ├── tasks.ts
│       ├── ig.ts
│       ├── notifications.ts
│       └── users.ts
├── public/
│   └── index.html           # Frontend (moodkit.html buraya)
├── .env.example
├── railway.toml
├── package.json
└── tsconfig.json
```
