// src/seed.ts
// Demo data oluşturur - geliştirme ortamı için
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { db } from './lib/db'

async function seed() {
  console.log('🌱 Seed başlıyor...')

  // Admin user
  const adminPw = await bcrypt.hash('admin123', 12)
  const admin = await db.user.upsert({
    where: { email: 'ahmet@ajans.com' },
    update: {},
    create: {
      email: 'ahmet@ajans.com',
      name: 'Ahmet Yılmaz',
      password: adminPw,
      role: 'ADMIN',
      title: 'Kreatif Direktör'
    }
  })

  // Ekip üyeleri
  const pw = await bcrypt.hash('123456', 12)

  const selin = await db.user.upsert({
    where: { email: 'selin@ajans.com' },
    update: {},
    create: { email: 'selin@ajans.com', name: 'Selin Arslan', password: pw, role: 'EDITOR', prodRole: 'Grafiker', title: 'Grafik Tasarımcı' }
  })

  const can = await db.user.upsert({
    where: { email: 'can@ajans.com' },
    update: {},
    create: { email: 'can@ajans.com', name: 'Can Demir', password: pw, role: 'PROD', prodRole: 'Videograf', title: 'Videograf' }
  })

  const ece = await db.user.upsert({
    where: { email: 'ece@ajans.com' },
    update: {},
    create: { email: 'ece@ajans.com', name: 'Ece Kaya', password: pw, role: 'PROD', prodRole: 'Fotoğrafçı', title: 'Fotoğrafçı' }
  })

  const musteri = await db.user.upsert({
    where: { email: 'info@assoscoffee.com' },
    update: {},
    create: { email: 'info@assoscoffee.com', name: 'Assos Müşteri', password: pw, role: 'CLIENT', title: 'İşletme Sahibi' }
  })

  // Assos Coffee firması
  const firm = await db.firm.upsert({
    where: { id: 'assos-coffee-seed' },
    update: {},
    create: {
      id: 'assos-coffee-seed',
      name: 'Assos Coffee',
      sector: 'Kafe / F&B',
      color: '#3d2d12',
      contact: 'info@assoscoffee.com',
    }
  })

  // Üyeleri ekle
  for (const userId of [admin.id, selin.id, can.id, ece.id, musteri.id]) {
    await db.firmMember.upsert({
      where: { firmId_userId: { firmId: firm.id, userId } },
      update: {},
      create: { firmId: firm.id, userId }
    })
  }

  // Nisan 2026 Brief
  const brief = await db.brief.upsert({
    where: { id: 'assos-nisan-2026' },
    update: {},
    create: {
      id: 'assos-nisan-2026',
      firmId: firm.id,
      month: 'Nisan',
      year: 2026,
      stage: 'MB_IG',
      products: 'Banana Chocolate Cake, Karamel Crema Smoothie, Affagato, El Clasico, Tost, Breakfast Bowl',
      newProduct: true,
      newProductDesc: 'Blueberry Crumble & Vanilla Ice Cream — Nisan sonu lansman.',
      featured: '1. Blueberry Crumble\n2. Affagato\n3. El Clasico',
      tone: 'Minimal, temiz, doğal ışık. Ordinary Life estetiği.',
      colorDir: 'Krem, bej, kahve tonları.',
      avoid: 'Karmaşık grafikler, fazla metin, filtreli çekimler.',
      refs: 'https://www.instagram.com/reels/DOg15F0EYcw/',
      specialDay: 'Nisan sonu — Blueberry Crumble lansman',
      notes: 'Referans: @ordinarylifee',
    }
  })

  // 9 IG hücresi
  for (let i = 0; i < 9; i++) {
    await db.iGCell.upsert({
      where: { briefId_cellIndex: { briefId: brief.id, cellIndex: i } },
      update: {},
      create: { briefId: brief.id, cellIndex: i }
    })
  }

  // Örnek IG Moodboard kartları
  const cards = [
    { label: 'Kapak Reels — Smoothie', type: 'Video Referansı', taskType: 'Video', taskDesc: 'Smoothie el tutuşu Reels. Soft ışık, krem zemin. 10 sn.', taskFormat: '9:16 · 10 sn · 4K', taskDeadline: '12 Nisan', assigneeId: can.id, igCell: 0 },
    { label: 'Barista Sahne — Tray', type: 'Referans Görseli', taskType: 'Fotoğraf', taskDesc: 'Barista tray tutuyor. Gülümseme doğal. Bar arka planda.', taskFormat: 'RAW + JPEG, 4:5', taskDeadline: '10 Nisan', assigneeId: ece.id, igCell: 1 },
    { label: 'Affagato — İkonik Çekim', type: 'Ürün Kartı', taskType: 'Fotoğraf', taskDesc: 'Espresso dökülme freeze. Yanında browni. Siyah zemin.', taskFormat: 'RAW + JPEG', taskDeadline: '13 Nisan', assigneeId: ece.id, igCell: 7 },
  ]

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i]
    await db.moodboardCard.create({
      data: {
        briefId: brief.id,
        which: 'IG',
        type: c.type,
        label: c.label,
        status: i === 0 ? 'APPROVED' : 'PENDING',
        order: i,
        taskType: c.taskType,
        taskDesc: c.taskDesc,
        taskFormat: c.taskFormat,
        taskDeadline: c.taskDeadline,
        taskAssigneeId: c.assigneeId,
        taskIGCell: c.igCell,
        versions: {
          create: {
            vNum: 1,
            note: i === 0 ? 'Onaylandı' : 'İlk taslak',
            desc: c.taskDesc,
            createdBy: 'Ahmet Y.'
          }
        }
      }
    })
  }

  console.log('✅ Seed tamamlandı')
  console.log('\n📧 Demo hesaplar:')
  console.log('  Admin:    ahmet@ajans.com     / admin123')
  console.log('  Kreatif:  selin@ajans.com     / 123456')
  console.log('  Videograf: can@ajans.com      / 123456')
  console.log('  Fotoğraf: ece@ajans.com       / 123456')
  console.log('  Müşteri:  info@assoscoffee.com / 123456')

  await db.$disconnect()
}

seed().catch(e => {
  console.error(e)
  process.exit(1)
})
