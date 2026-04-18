# MoodKit — Faz 2: Veritabanı Şeması & Backend API

> Referans: [Faz 1](moodkit_faz1.md) | [Faz 3](moodkit_faz3.md)

---

## 1. Veritabanı Şeması

Tüm veriler PostgreSQL'de Prisma ORM üzerinden yönetilir.

> **Null sütunu:** `✓` = nullable (opsiyonel), `—` = zorunlu

---

### 1.1 User

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String                     // bcrypt hash, round:12
  role      Role                       // ADMIN | EDITOR | PROD | CLIENT
  title     String?                    // Ünvan
  prodRole  String?                    // Videograf | Grafiker | Fotoğrafçı | Kreatif Direktör
  avatar    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role { ADMIN  EDITOR  PROD  CLIENT }
```

**Rol Yetkileri:**
| Rol | Yetki |
|-----|-------|
| `ADMIN` | Tüm yetkiler. Firma/brief/üye yönetimi. Başka admin atayabilir. |
| `EDITOR` | Brief doldurma, moodboard kartı ekleme, versiyon yükleme |
| `PROD` | Kanban görevlerini görme/güncelleme, checklist işaretleme |
| `CLIENT` | Yalnızca müşteri portalı: onay/revize, yorum |

---

### 1.2 Firm

```prisma
model Firm {
  id        String       @id @default(cuid())
  name      String
  sector    String?
  color     String       @default("#1a1a2e")  // UI rengi
  contact   String?                            // Müşteri e-posta
  createdAt DateTime     @default(now())
  members   FirmMember[]
  briefs    Brief[]
}
```

---

### 1.3 FirmMember

Hangi kullanıcının hangi firmayı görebileceğini belirler.

```prisma
model FirmMember {
  id        String   @id @default(cuid())
  firmId    String                      // FK → Firm
  userId    String                      // FK → User
  createdAt DateTime @default(now())
  firm      Firm     @relation(...)
  user      User     @relation(...)
}
```

> **Kural:** `ADMIN` FirmMember kaydına gerek yok — middleware'de tüm firmalara erişir.
> `EDITOR`/`PROD`/`CLIENT` yalnızca kaydı olan firmaları görür.

---

### 1.4 Brief

```prisma
model Brief {
  id        String         @id @default(cuid())
  firmId    String                              // FK → Firm
  month     String                              // "Nisan"
  year      Int                                 // 2026
  stage     Stage          @default(brief)
  answers   Json?                               // Form cevapları (yapılandırılmamış)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  cards     MoodboardCard[]
  tasks     Task[]
  igCells   IGCell[]
}

enum Stage { brief  mb_ig  mb_kamp  tasks  yayin }
```

---

### 1.5 MoodboardCard

```prisma
model MoodboardCard {
  id             String        @id @default(cuid())
  briefId        String                           // FK → Brief
  which          CardType                         // IG | KAMP
  type           String                           // "Referans Görseli", "Afiş"...
  label          String
  status         CardStatus    @default(PENDING)
  order          Int                              // Sıralama
  taskType       String?                          // "Video", "Grafik"...
  taskDesc       String?                          // Detaylı görev tanımı
  taskFormat     String?                          // "9:16 · 30 sn · 4K"
  taskDeadline   String?                          // "20 Nisan"
  taskAssigneeId String?                          // FK → User
  taskIGCell     Int?                             // Hangi IG hücresine gidecek
  createdAt      DateTime      @default(now())
  versions       CardVersion[]
}

enum CardType   { IG  KAMP }
enum CardStatus { PENDING  REVIEW  APPROVED  REJECTED }
```

> **Otomatik Aksiyon — APPROVED olunca:**
> 1. `taskType + taskDesc` varsa → `Task` tablosuna kayıt ekler (yoksa)
> 2. `which=IG` ve `taskIGCell` doluysa → `IGCell` günceller/oluşturur
> 3. Firma üyelerine bildirim gönderir

---

### 1.6 CardVersion

```prisma
model CardVersion {
  id        String        @id @default(cuid())
  cardId    String                              // FK → MoodboardCard
  vNum      Int                                 // 1'den başlar
  note      String                              // "Ne değişti?"
  desc      String?
  mediaUrl  String?                             // Görsel URL
  videoUrl  String?                             // YouTube/Vimeo/mp4 URL
  createdBy String                              // Yükleyen adı (metin)
  createdAt DateTime      @default(now())
}
```

> İlk kart eklendiğinde `v1` otomatik oluşturulur.
> Yeni versiyon eklenince kart `REVIEW` durumuna çekilir.

---

### 1.7 Task

```prisma
model Task {
  id          String      @id @default(cuid())
  briefId     String                           // FK → Brief
  cardId      String?                          // FK → MoodboardCard (manuel=null)
  cardRef     String                           // Kaynak kart başlığı
  type        String                           // Video|Grafik|Fotoğraf|Metin|Animasyon
  desc        String
  format      String?
  source      String?                          // "IG Moodboard"|"Kampanya MB"|"Manuel"
  assigneeId  String?                          // FK → User
  deadline    String?
  status      TaskStatus  @default(TODO)
  order       Int
  createdById String                           // FK → User
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  checkItems  CheckItem[]
}

enum TaskStatus { TODO  DOING  DONE }
```

---

### 1.8 CheckItem *(Yeni)*

```prisma
model CheckItem {
  id        String   @id @default(cuid())
  taskId    String                          // FK → Task
  text      String                          // "RAW dosyalar teslim edildi"
  done      Boolean  @default(false)
  order     Int
  createdAt DateTime @default(now())
}
```

**Kullanım:**
- Kanban kartı genişletilince checkbox olarak görünür
- Personel Paneli'nde kişiye özel tüm görevlerin maddeleri tek ekranda
- `done/total` → progress bar

---

### 1.9 IGCell

```prisma
model IGCell {
  id          String   @id @default(cuid())
  briefId     String                        // FK → Brief
  cellIndex   Int                           // Pozisyon (0'dan başlar, sınırsız)
  type        IGType                        // POST | REELS | CAROUSEL
  mediaUrl    String?
  videoUrl    String?
  caption     String?
  hashtags    String?
  publishDate String?                       // "15 Nis 10:00"
  approved    Boolean?                      // null=bekliyor, true, false
  likes       String?
  cmts        String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([briefId, cellIndex])
}

enum IGType { POST  REELS  CAROUSEL }
```

> **Hücre Sayısı Sınırsız:**
> - Yeni hücre: `cellIndex = MAX(cellIndex) + 1`
> - Sürükle-bırak: tüm `cellIndex` değerleri toplu güncellenir (`/ig/reorder`)
> - Silme: silinen hücreden büyük tüm `cellIndex` 1 azaltılır

---

### 1.10 Notification

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String                    // FK → User (kime)
  briefId   String?                   // FK → Brief
  title     String
  sub       String                    // "Nike TR · Az önce"
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

---

### 1.11 Tablo İlişkileri

```
User ─────────── FirmMember ──── Firm
  │                                │
  │ (assigneeId)                Brief
  │                                │
  ├── Task ◄──────────── MoodboardCard
  │     │                        │
  │   CheckItem             CardVersion
  │
  └── Notification      IGCell ◄── Brief
```

---

## 2. Backend Middleware

### 2.1 requireAuth

```ts
export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token gerekli' });

  const blacklisted = await redis.get('bl:' + token);
  if (blacklisted) return res.status(401).json({ error: 'Token geçersiz' });

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded; // { id, name, role }
  next();
}
```

### 2.2 requireRole(minRole)

```ts
const ROLE_LEVEL = { CLIENT: 1, PROD: 2, EDITOR: 3, ADMIN: 4 };

export function requireRole(minRole: string) {
  return (req, res, next) => {
    if (ROLE_LEVEL[req.user.role] < ROLE_LEVEL[minRole]) {
      return res.status(403).json({ error: 'Yetersiz yetki' });
    }
    next();
  };
}
```

### 2.3 requireFirmAccess

```ts
export async function requireFirmAccess(req, res, next) {
  if (req.user.role === 'ADMIN') return next();

  const { firmId } = req.params;
  const access = await db.firmMember.findFirst({
    where: { firmId, userId: req.user.id }
  });

  if (!access) return res.status(403).json({ error: 'Erişim yok' });
  next();
}
```

---

## 3. API Endpoint'leri

> **Auth sütunu:** `Public` = token gerekmez | `Auth` = token gerekir | `Admin` = yalnızca ADMIN

### 3.1 Auth — `/api/auth`

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| `POST` | `/api/auth/register` | Auth | Yeni kullanıcı. Body: `{name,email,password,role,title,prodRole}` |
| `POST` | `/api/auth/login` | Public | Giriş. Response: `{token, user}` |
| `POST` | `/api/auth/logout` | Auth | Token blacklist'e ekle |
| `GET`  | `/api/auth/me` | Auth | Mevcut kullanıcı bilgisi |

### 3.2 Kullanıcılar — `/api/users`

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| `GET`    | `/api/users` | Auth | Listele. Admin: e-posta görür. Diğerleri: isim/rol. |
| `PUT`    | `/api/users/:id` | Auth | Profil güncelle. `{name,title,prodRole,role}` |
| `PATCH`  | `/api/users/:id/password` | Auth | Şifre güncelle. `{password}` |
| `DELETE` | `/api/users/:id` | Admin | Kullanıcı sil |

### 3.3 Firmalar — `/api/firms`

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| `GET`    | `/api/firms` | Auth | Erişilebilir firmalar |
| `POST`   | `/api/firms` | Admin | Yeni firma. `{name,sector,color,contact}` |
| `PUT`    | `/api/firms/:id` | Admin | Firma güncelle |
| `DELETE` | `/api/firms/:id` | Admin | Sil (briefs cascade) |
| `POST`   | `/api/firms/:id/members` | Admin | Üye ekle. `{userId}` |
| `DELETE` | `/api/firms/:id/members/:uid` | Admin | Üye çıkar |

### 3.4 Briefler — `/api/firms/:fid/briefs`

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| `GET`    | `…/briefs` | Auth+Firm | Liste |
| `POST`   | `…/briefs` | Auth+Firm | Yeni. `{month,year}` |
| `GET`    | `…/briefs/:bid` | Auth+Firm | Detay + kartlar + görevler + IG |
| `PUT`    | `…/briefs/:bid` | Auth+Firm | Güncelle. `{month,year,stage,answers}` |
| `DELETE` | `…/briefs/:bid` | Admin | Sil (cascade) |

### 3.5 Moodboard Kartları — `…/briefs/:bid/cards`

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| `GET`    | `…/cards` | Auth+Firm | `?which=IG\|KAMP` filtresi. Versiyonlar dahil. |
| `POST`   | `…/cards` | Auth+Firm | Yeni kart. `{which,type,label,desc,mediaUrl,videoUrl,taskType,taskDesc,taskFormat,taskDeadline,taskAssigneeId,taskIGCell}` |
| `PUT`    | `…/cards/:cid` | Auth+Firm | Güncelle (partial) |
| `DELETE` | `…/cards/:cid` | Auth+Firm | Sil |
| `PATCH`  | `…/cards/:cid/status` | Auth+Firm | `{status}` → APPROVED ise otomatik görev+IG oluşturur |
| `POST`   | `…/cards/:cid/versions` | Auth+Firm | Yeni versiyon. `{note,desc,mediaUrl,videoUrl}` → kart REVIEW'a çekilir |

### 3.6 Görevler — `…/briefs/:bid/tasks`

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| `GET`    | `…/tasks` | Auth+Firm | `?assigneeId` filtresi. CheckItem'lar dahil. |
| `GET`    | `/api/tasks/mine` | Auth | **Kişiye özel** tüm görevler (Personel Paneli için) |
| `POST`   | `…/tasks` | Auth+Firm | Manuel görev ekle |
| `PUT`    | `…/tasks/:tid` | Auth+Firm | Güncelle. `{status,desc,...}` |
| `DELETE` | `…/tasks/:tid` | Auth+Firm | Sil |
| `POST`   | `…/tasks/:tid/check` | Auth+Firm | CheckItem ekle. `{text}` |
| `PATCH`  | `…/tasks/:tid/check/:cid` | Auth+Firm | `{done: true/false}` |
| `DELETE` | `…/tasks/:tid/check/:cid` | Auth+Firm | CheckItem sil |

### 3.7 IG Grid — `…/briefs/:bid/ig`

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| `GET`    | `…/ig` | Auth+Firm | Hücreler (cellIndex sırası) |
| `POST`   | `…/ig` | Auth+Firm | Yeni hücre. `cellIndex = MAX+1` |
| `PUT`    | `…/ig/:cellId` | Auth+Firm | Hücre güncelle. `{type,mediaUrl,videoUrl,caption,hashtags,publishDate,approved}` |
| `DELETE` | `…/ig/:cellId` | Auth+Firm | Sil → sonraki cellIndex'ler 1 azalır |
| `POST`   | `…/ig/reorder` | Auth+Firm | Sıralama. `{order: ["id1","id2",...]}` |
| `POST`   | `…/ig/approve-all` | Auth+Firm | Tümünü onayla |

### 3.8 Bildirimler — `/api/notifications`

| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| `GET`   | `/api/notifications` | Auth | Son 20 bildirim |
| `PATCH` | `/api/notifications/read` | Auth | Tümünü okundu |
| `PATCH` | `/api/notifications/:id` | Auth | Tek bildirimi okundu |

---

## 4. Personel Paneli — Backend Gereksinimleri

### Yeni Endpoint

```
GET /api/tasks/mine
```

**Response yapısı (Task + ilişkiler dahil):**
```ts
const tasks = await db.task.findMany({
  where: { assigneeId: req.user.id },
  include: {
    checkItems: { orderBy: { order: 'asc' } },
    card: {
      include: {
        versions: { orderBy: { vNum: 'desc' }, take: 1 } // yalnızca son versiyon
      }
    },
    brief: { include: { firm: true } }
  },
  orderBy: { createdAt: 'desc' }
});
```

**Query parametreleri:**
- `?status=todo|doing|done` → filtrele
- `?briefId=...` → belirli bir briefe ait

---

## 5. IG Grid Mimarisi

### Hücre Ekleme

```
POST /ig  { type, mediaUrl, videoUrl, caption, hashtags, publishDate }
Backend: cellIndex = (SELECT MAX(cellIndex) FROM IGCell WHERE briefId) + 1
```

### Sürükle-Bırak Sıralama

```
Drag → swap → POST /ig/reorder { order: ["id0","id1","id2",...] }
Backend: her hücrenin cellIndex'ini güncelle (order array sırası = yeni index)
```

### Hücre Silme Cascade

```
DELETE /ig/:cellId
Backend:
  1. Hücreyi sil
  2. WHERE briefId=x AND cellIndex > silinencellIndex → cellIndex -= 1
```

---

*← [Faz 1: Proje Özeti](moodkit_faz1.md) | [Faz 3: Frontend →](moodkit_faz3.md)*
