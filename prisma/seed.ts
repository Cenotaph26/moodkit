// prisma/seed.ts — Örnek veri: Moda markası + ekip + brief + kartlar + IG cells
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seed başlıyor...')

  // ── EKIP ──────────────────────────────────────────────────
  const adminPw = await bcrypt.hash('admin1234', 10)
  const prodPw  = await bcrypt.hash('prod1234', 10)
  const clientPw = await bcrypt.hash('client1234', 10)

  const admin = await db.user.upsert({
    where: { email: 'admin@moodkit.dev' },
    update: {},
    create: { name: 'Ali Çelik', email: 'admin@moodkit.dev', password: adminPw, role: 'ADMIN', title: 'Kreatif Direktör' }
  })
  const editor = await db.user.upsert({
    where: { email: 'editor@moodkit.dev' },
    update: {},
    create: { name: 'Selin Kaya', email: 'editor@moodkit.dev', password: prodPw, role: 'EDITOR', title: 'Kreatif', prodRole: 'Grafiker' }
  })
  const videograf = await db.user.upsert({
    where: { email: 'video@moodkit.dev' },
    update: {},
    create: { name: 'Mert Arslan', email: 'video@moodkit.dev', password: prodPw, role: 'PROD', title: 'Videograf', prodRole: 'Videograf' }
  })
  const foto = await db.user.upsert({
    where: { email: 'foto@moodkit.dev' },
    update: {},
    create: { name: 'Ayşe Demir', email: 'foto@moodkit.dev', password: prodPw, role: 'PROD', title: 'Fotoğrafçı', prodRole: 'Fotoğrafçı' }
  })
  const client = await db.user.upsert({
    where: { email: 'musteri@novamoda.com' },
    update: {},
    create: { name: 'Zeynep Nova', email: 'musteri@novamoda.com', password: clientPw, role: 'CLIENT', title: 'Marka Müdürü' }
  })
  console.log('✅ Ekip oluşturuldu')

  // ── FİRMA ─────────────────────────────────────────────────
  const existing = await db.firm.findFirst({ where: { name: 'Nova Moda' } })
  if (existing) {
    console.log('⚠️  Nova Moda zaten var, seed atlanıyor')
    await db.$disconnect()
    return
  }

  const firm = await db.firm.create({
    data: {
      name: 'Nova Moda',
      sector: 'Moda',
      color: '#993556',
      contact: 'musteri@novamoda.com',
      members: {
        create: [
          { userId: admin.id },
          { userId: editor.id },
          { userId: videograf.id },
          { userId: foto.id },
          { userId: client.id },
        ]
      }
    }
  })
  console.log('✅ Firma oluşturuldu:', firm.name)

  // ── BRİEF ─────────────────────────────────────────────────
  const brief = await db.brief.create({
    data: {
      firmId: firm.id,
      month: 'Mayıs',
      year: 2026,
      products: 'Yaz koleksiyonu — elbise, bluz, etek',
      tone: 'Modern, feminen, doğal',
      colorDir: 'Toprak tonları, bej, terracotta, yeşil',
      avoid: 'Aşırı filtreli fotoğraf, karanlık tonlar',
      platforms: ['Instagram', 'TikTok'],
      targetAudience: '22-35 yaş, şehirli kadın',
      notes: 'Mayıs sonu yeni koleksiyon lansmanı. Ürün çekimleri 15 Mayıs\'ta.',
      stage: 'MB_IG',
      specialDay: 'Anneler Günü (12 Mayıs)',
      specialContent: 'Anneler Günü özel içerik serisi — 3 post',
      hasAd: true,
      budget: '15.000 TL',
    }
  })
  console.log('✅ Brief oluşturuldu')

  // ── IG MOODBOARD KARTLARI ─────────────────────────────────
  const cardData = [
    {
      which: 'IG' as const,
      type: 'Atmosfer/Mood',
      label: 'Toprak Tonu Atmosfer',
      taskType: 'Fotoğraf',
      taskDesc: 'Toprak tonu arka plan, doğal ışık, ürün fotoğrafı. 1:1 kare format.',
      taskFormat: '1:1 · 4K · JPEG',
      taskDeadline: '2026-05-10',
      taskAssigneeId: foto.id,
      taskIGCell: 0,
      mediaUrl: null,
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
    {
      which: 'IG' as const,
      type: 'Video Referansı',
      label: 'Koleksiyon Tanıtım Reels',
      taskType: 'Video',
      taskDesc: 'Yaz koleksiyonu tanıtım reels. Müzik: lounge/chill. 15-30 sn.',
      taskFormat: '9:16 · 30 sn · 4K',
      taskDeadline: '2026-05-12',
      taskAssigneeId: videograf.id,
      taskIGCell: 1,
      mediaUrl: null,
      videoUrl: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
    },
    {
      which: 'IG' as const,
      type: 'Ürün Kartı',
      label: 'Anneler Günü Ürün Post',
      taskType: 'Grafik',
      taskDesc: 'Anneler Günü özel tasarım. Pembe/krem tonlar. Ürün + slogan.',
      taskFormat: '1:1 · PNG · 300dpi',
      taskDeadline: '2026-05-08',
      taskAssigneeId: editor.id,
      taskIGCell: 2,
      mediaUrl: null,
      videoUrl: null,
    },
  ]

  for (const cd of cardData) {
    const { mediaUrl, videoUrl, taskType, taskDesc, taskFormat, taskDeadline, taskAssigneeId, taskIGCell, ...rest } = cd
    const card = await db.moodboardCard.create({
      data: {
        ...rest,
        briefId: brief.id,
        order: cardData.indexOf(cd),
        taskType, taskDesc, taskFormat, taskDeadline,
        taskAssigneeId: taskAssigneeId || null,
        taskIGCell,
        status: 'PENDING',
        versions: {
          create: {
            vNum: 1,
            note: 'İlk taslak',
            desc: taskDesc || '',
            mediaUrl: mediaUrl || null,
            videoUrl: videoUrl || null,
            createdBy: admin.name,
          }
        }
      }
    })
    // IG grid hücresi oluştur
    if (taskIGCell !== undefined && taskIGCell !== null) {
      await db.iGCell.upsert({
        where: { briefId_cellIndex: { briefId: brief.id, cellIndex: taskIGCell } },
        create: {
          briefId: brief.id,
          cellIndex: taskIGCell,
          type: taskType === 'Video' ? 'REELS' : 'POST',
          mediaUrl: mediaUrl || null,
          videoUrl: videoUrl || null,
          caption: card.label,
          hashtags: '#novamoda #yaz2026 #moda',
        },
        update: {}
      })
    }
  }
  console.log('✅ IG Moodboard kartları oluşturuldu')

  // ── KAMPANYA MOODBOARD ────────────────────────────────────
  const kampCards = [
    {
      type: 'Afiş/Billboard',
      label: 'Yaz Kampanyası Afişi',
      taskType: 'Grafik',
      taskDesc: 'Billboard formatı. Toprak tonu kolaj. A3 baskı kalitesi.',
      taskFormat: 'A3 · 300dpi · CMYK',
      taskDeadline: '2026-05-15',
      taskAssigneeId: editor.id,
      videoUrl: null,
    },
    {
      type: 'Kampanya Videosu',
      label: 'TikTok Tanıtım Filmi',
      taskType: 'Video',
      taskDesc: '45 saniyelik TikTok tanıtım videosu. Trend müzik, hızlı kesim.',
      taskFormat: '9:16 · 45 sn · 1080p',
      taskDeadline: '2026-05-14',
      taskAssigneeId: videograf.id,
      videoUrl: 'https://www.youtube.com/watch?v=FVfAjLNXsmQ',
    },
  ]

  for (const kc of kampCards) {
    const { videoUrl, taskType, taskDesc, taskFormat, taskDeadline, taskAssigneeId, ...rest } = kc
    await db.moodboardCard.create({
      data: {
        ...rest,
        which: 'KAMP',
        briefId: brief.id,
        order: kampCards.indexOf(kc),
        taskType, taskDesc, taskFormat, taskDeadline,
        taskAssigneeId: taskAssigneeId || null,
        status: 'PENDING',
        versions: {
          create: {
            vNum: 1,
            note: 'İlk taslak',
            desc: taskDesc || '',
            videoUrl: videoUrl || null,
            createdBy: admin.name,
          }
        }
      }
    })
  }
  console.log('✅ Kampanya Moodboard kartları oluşturuldu')

  // ── KANBAN GÖREVLERİ ─────────────────────────────────────
  const tasks = [
    { cardRef: 'Fotoğraf Çekimi — Toprak Tonu', type: 'Fotoğraf', desc: 'Yaz koleksiyonu ürün fotoğraf çekimi. Stüdyo + doğal ışık.', format: '1:1 · 4K', deadline: '2026-05-10', assigneeId: foto.id, status: 'TODO' as const },
    { cardRef: 'Koleksiyon Reels', type: 'Video', desc: 'Koleksiyon tanıtım reels — müzik licensingı halloldu.', format: '9:16 · 30 sn', deadline: '2026-05-12', assigneeId: videograf.id, status: 'DOING' as const },
    { cardRef: 'Anneler Günü Grafik', type: 'Grafik', desc: 'Anneler Günü özel post tasarımı. 3 farklı varyasyon.', format: '1:1 · PNG', deadline: '2026-05-08', assigneeId: editor.id, status: 'DONE' as const },
    { cardRef: 'Yaz Kampanyası Afişi', type: 'Grafik', desc: 'Billboard + dijital afiş paketi.', format: 'A3 · 300dpi', deadline: '2026-05-15', assigneeId: editor.id, status: 'TODO' as const },
    { cardRef: 'TikTok Filmi', type: 'Video', desc: 'TikTok tanıtım filmi — senaryo onaylandı.', format: '9:16 · 45 sn', deadline: '2026-05-14', assigneeId: videograf.id, status: 'TODO' as const },
  ]

  for (let i = 0; i < tasks.length; i++) {
    await db.task.create({
      data: {
        ...tasks[i],
        briefId: brief.id,
        order: i,
        createdById: admin.id,
      }
    })
  }
  console.log('✅ Kanban görevleri oluşturuldu')

  console.log('\n🎉 Seed tamamlandı!')
  console.log('📧 Giriş bilgileri:')
  console.log('  Admin  : admin@moodkit.dev / admin1234')
  console.log('  Editor : editor@moodkit.dev / prod1234')
  console.log('  Video  : video@moodkit.dev / prod1234')
  console.log('  Foto   : foto@moodkit.dev / prod1234')
  console.log('  Müşteri: musteri@novamoda.com / client1234')
}

main()
  .catch(e => { console.error('❌ Seed hatası:', e); process.exit(1) })
  .finally(() => db.$disconnect())
