# MoodKit — Faz 4: İş Akışları & Rol Kuralları

> Referans: [Faz 1](moodkit_faz1.md) | [Faz 2](moodkit_faz2.md) | [Faz 3](moodkit_faz3.md) | [Faz 5](moodkit_faz5.md)

---

## 1. Brief'ten Yayına — Ana İş Akışı

| Aşama | Stage Değeri | Tetikleyici |
|-------|-------------|------------|
| 1. Brief Alımı | `brief` | Brief formu ilk kaydedilince |
| 2. IG Moodboard | `mb_ig` | İlk IG kartı eklenince |
| 3. Kampanya MB | `mb_kamp` | İlk Kampanya kartı eklenince |
| 4. Müşteri Onayı | `mb_ig/mb_kamp` | Kartlar inceleniyor |
| 5. Görevler | `tasks` | Kartların %80'i onaylanınca (otomatik) |
| 6. İçerik Üretimi | `tasks` | Prodüksiyon süreci |
| 7. Yayın & Arşiv | `yayin` | Tüm görevler DONE olunca (otomatik) |

---

## 2. Aşama Geçiş Kuralları

### Otomatik geçiş tetikleyicileri

```
Brief kaydedilir               → stage: "brief"
İlk IG kart eklenir            → stage: "mb_ig"   (henüz "brief" ise)
İlk Kampanya kart eklenir      → stage: "mb_kamp" (henüz "mb_ig" ise)
Kartların %80'i onaylanır      → stage: "tasks"   (otomatik)
Tüm görevler DONE olur         → stage: "yayin"   (otomatik)
```

### Manuel geçiş
Yalnızca Admin `PUT /api/firms/:fid/briefs/:bid { stage: "..." }` ile değiştirebilir.

---

## 3. Moodboard Onay Akışı

### Kart durum döngüsü

```
PENDING (varsayılan)
  ↓ Kreatif versiyon yükler
REVIEW
  ↓ Müşteri/Admin inceler
  ├─→ APPROVED → Otomatik: Görev + IG Hücre oluşturulur
  └─→ REJECTED → Kreatif yeni versiyon yükler → tekrar REVIEW
```

### APPROVED otomatik aksiyon sırası (backend)

```
1. MoodboardCard.status = APPROVED
2. taskType dolu ise → Task tablosuna kayıt ekle (yoksa)
   { briefId, cardId, cardRef, type, desc, format, assigneeId, deadline, status:TODO }
3. which=IG && taskIGCell dolu ise → IGCell güncelle/oluştur
   { cellIndex:taskIGCell, mediaUrl:sonVersiyon.mediaUrl, type:videoUrl?REELS:POST }
4. Firma üyelerine Notification ekle
```

### Versiyon kuralı
- İlk kart eklenince: v1 otomatik
- Yeni versiyon yüklenince: kart otomatik REVIEW'a çekilir
- Aktif versiyon: her zaman en yüksek vNum
- Versiyon sayısı: sınırsız

---

## 4. Görev Yaşam Döngüsü

### Oluşturma yolları

| Yol | Nasıl | cardId |
|-----|-------|--------|
| Otomatik | Kart APPROVED yapılınca | Dolu |
| Manuel | "+ Görev Ekle" | null |

### Kanban geçişleri

```
TODO ──→ DOING ──→ DONE
  ↑          ↑
  └──────────┘  (geri alınabilir)
```

### Checklist kuralları
- Maks 20 madde/görev
- Ekleyebilir: assignee + Admin
- İşaretleyebilir: assignee + Editor + Admin
- Silebilir: yalnızca Admin
- Tüm maddeler tamamlanınca görev otomatik DONE olmaz

---

## 5. IG Grid Akışı

### Hücre ekleme yolları
1. Kart APPROVED + taskIGCell dolu → otomatik
2. "+ İçerik Ekle" → manuel

### Sürükle-bırak sıralama

```
dragCell = idx → swap → POST /ig/reorder { order: ["id0","id1",...] }
Backend: her IGCell.cellIndex = order dizisindeki sıra
```

### Hücre silme cascade

```
DELETE /ig/:cellId
Backend: WHERE briefId=x AND cellIndex > silinenkellIndex
         → SET cellIndex = cellIndex - 1
```

### Onay değerleri
- `approved=null` → Bekliyor (○)
- `approved=true` → Onaylı (✓ yeşil)
- `approved=false` → Reddedildi (✗ kırmızı)

---

## 6. Rol Bazlı Yetki Kuralları

### Firma & Brief

| Aksiyon | Admin | Editor | Prod | Client |
|---------|-------|--------|------|--------|
| Firma ekle/sil/düzenle | ✓ | ✗ | ✗ | ✗ |
| Tüm firmaları görme | ✓ | ✗ | ✗ | ✗ |
| Brief oluştur | ✓ | ✓ | ✗ | ✗ |
| Brief formu doldur | ✓ | ✓ | ✗ | ✗ |
| Brief sil | ✓ | ✗ | ✗ | ✗ |
| Brief aşaması değiştir | ✓ | ✗ | ✗ | ✗ |

### Moodboard

| Aksiyon | Admin | Editor | Prod | Client |
|---------|-------|--------|------|--------|
| Kart ekle/düzenle/sil | ✓ | ✓ | ✗ | ✗ |
| Versiyon yükle | ✓ | ✓ | ✗ | ✗ |
| Onayla/Reddet | ✓ | ✓ | ✗ | ✓ |

### Görevler

| Aksiyon | Admin | Editor | Prod | Client |
|---------|-------|--------|------|--------|
| Görev oluştur | ✓ | ✓ | ✗ | ✗ |
| Görev sil | ✓ | ✗ | ✗ | ✗ |
| Durum güncelle | ✓ | ✓ | ✓ | ✗ |
| Checklist madde ekle/işaretle | ✓ | ✓ | ✓ | ✗ |
| Personel paneli | ✓ | ✓ | ✓ | ✗ |

### IG Grid

| Aksiyon | Admin | Editor | Prod | Client |
|---------|-------|--------|------|--------|
| Hücre ekle/düzenle/sil | ✓ | ✓ | ✗ | ✗ |
| Hücre onayla | ✓ | ✓ | ✗ | ✓ |
| Müşteri grid portalı | ✓ | ✓ | ✓ | ✓ |

---

## 7. Bildirim Tetikleyicileri

| Tetikleyici | Kime | İçerik |
|-------------|------|--------|
| Kart APPROVED | Tüm firma üyeleri | `"[KartAdı] onaylandı · FirmaAdı"` |
| Kart REJECTED | Kartı ekleyen | `"[KartAdı] revize istendi"` |
| Yeni versiyon yüklendi | Admin + Editor | `"[KartAdı] v[N] yüklendi"` |
| Görev atandı | Atanan kişi | `"[GörevAdı] sana atandı"` |
| Görev DONE | Admin + oluşturan | `"[GörevAdı] tamamlandı"` |
| Müşteri yorum | Admin + Editor | `"Müşteri yorum yazdı · FirmaAdı"` |
| IG grid onaylandı | Tüm firma üyeleri | `"IG Grid onaylandı · FirmaAdı"` |

---

## 8. Embed & Video Player İş Akışı

```
URL → getLinkPlatform(url)
  YouTube/Shorts → toEmbed() → iframe embed
  Vimeo          → toEmbed() → iframe embed
  MP4/MOV/WebM   → <video> player
  TikTok         → GET /api/oembed → backend oEmbed → iframe
  Instagram      → instagram.com/reel/ID/embed/ dene → fallback UI
  Pinterest/Web  → önizleme kartı

openVideoPlayer(mediaUrl, videoUrl, label)
  → Harici yönlendirme YOK
  → Her zaman modal içinde oynatılır
```

### TikTok oEmbed backend

```
GET /api/oembed?url=...
→ fetch("https://www.tiktok.com/oembed?url="+url)
← { html: '<iframe src="...">' }
→ src parse et → { iframeSrc: "..." }
```

---

*← [Faz 3: Frontend](moodkit_faz3.md) | [Faz 5: Geliştirici Rehberi →](moodkit_faz5.md)*
