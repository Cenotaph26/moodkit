// prisma/seed.ts — Tam örnek veri: 2 marka, 7 kişilik ekip, 3 brief, moodboard, görevler, IG grid
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seed başlıyor...')

  // ── ŞİFRELER ───────────────────────────────────────────────
  const adminPw    = await bcrypt.hash('admin1234', 10)
  const editorPw   = await bcrypt.hash('editor1234', 10)
  const prodPw     = await bcrypt.hash('prod1234', 10)
  const clientPw   = await bcrypt.hash('client1234', 10)

  // ── EKIP (7 kişi) ─────────────────────────────────────────
  const admin = await db.user.upsert({
    where: { email: 'admin@moodkit.dev' },
    update: {},
    create: { name: 'Ali Çelik', email: 'admin@moodkit.dev', password: adminPw, role: 'ADMIN', title: 'Kreatif Direktör' }
  })
  const editor = await db.user.upsert({
    where: { email: 'editor@moodkit.dev' },
    update: {},
    create: { name: 'Selin Kaya', email: 'editor@moodkit.dev', password: editorPw, role: 'EDITOR', title: 'Kreatif', prodRole: 'Grafiker' }
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
  const copywriter = await db.user.upsert({
    where: { email: 'copy@moodkit.dev' },
    update: {},
    create: { name: 'Berk Yıldız', email: 'copy@moodkit.dev', password: prodPw, role: 'PROD', title: 'Metin Yazarı', prodRole: 'Grafiker' }
  })
  const clientNova = await db.user.upsert({
    where: { email: 'musteri@novamoda.com' },
    update: {},
    create: { name: 'Zeynep Nova', email: 'musteri@novamoda.com', password: clientPw, role: 'CLIENT', title: 'Marka Müdürü' }
  })
  const clientBrew = await db.user.upsert({
    where: { email: 'musteri@brewlab.com' },
    update: {},
    create: { name: 'Can Öztürk', email: 'musteri@brewlab.com', password: clientPw, role: 'CLIENT', title: 'İşletme Sahibi' }
  })
  console.log('✅ Ekip (7 kişi) oluşturuldu')

  // ── FİRMA 1: NOVA MODA ─────────────────────────────────────
  const existingNova = await db.firm.findFirst({ where: { name: 'Nova Moda' } })
  if (!existingNova) {
    const nova = await db.firm.create({
      data: {
        name: 'Nova Moda', sector: 'Moda', color: '#993556',
        contact: 'musteri@novamoda.com',
        members: { create: [
          { userId: admin.id }, { userId: editor.id }, { userId: videograf.id },
          { userId: foto.id }, { userId: copywriter.id }, { userId: clientNova.id },
        ]}
      }
    })
    await seedNovaModa(nova.id, admin, editor, videograf, foto, copywriter)
    console.log('✅ Nova Moda oluşturuldu')
  } else {
    console.log('⚠️  Nova Moda zaten var, atlanıyor')
  }

  // ── FİRMA 2: BREWLAB COFFEE ────────────────────────────────
  const existingBrew = await db.firm.findFirst({ where: { name: 'BrewLab Coffee' } })
  if (!existingBrew) {
    const brew = await db.firm.create({
      data: {
        name: 'BrewLab Coffee', sector: 'Kafe/F&B', color: '#854F0B',
        contact: 'musteri@brewlab.com',
        members: { create: [
          { userId: admin.id }, { userId: editor.id },
          { userId: foto.id }, { userId: copywriter.id }, { userId: clientBrew.id },
        ]}
      }
    })
    await seedBrewLab(brew.id, admin, editor, foto, copywriter)
    console.log('✅ BrewLab Coffee oluşturuldu')
  } else {
    console.log('⚠️  BrewLab Coffee zaten var, atlanıyor')
  }

  console.log('\n🎉 Seed tamamlandı!')
  console.log('📧 Giriş bilgileri:')
  console.log('  Admin      : admin@moodkit.dev / admin1234')
  console.log('  Editor     : editor@moodkit.dev / editor1234')
  console.log('  Videograf  : video@moodkit.dev / prod1234')
  console.log('  Fotoğrafçı : foto@moodkit.dev / prod1234')
  console.log('  Copywriter : copy@moodkit.dev / prod1234')
  console.log('  Müşteri 1  : musteri@novamoda.com / client1234')
  console.log('  Müşteri 2  : musteri@brewlab.com / client1234')
}

// ── NOVA MODA — 2 Brief ────────────────────────────────────────
async function seedNovaModa(firmId: string, admin: any, editor: any, videograf: any, foto: any, copywriter: any) {
  // Brief 1: Mayıs 2026 — aktif (MB_IG)
  const brief1 = await db.brief.create({
    data: {
      firmId, month: 'Mayıs', year: 2026, stage: 'MB_IG',
      products: 'Yaz koleksiyonu — elbise, bluz, etek, şort\nToprak tonu serileri (5 SKU)\nHafif kumaş kıyafetler',
      tone: 'Modern, feminen, doğal. Boho-chic etkisi. Rahat ama şık.',
      colorDir: 'Toprak tonları, bej, terracotta, yeşil, krem',
      avoid: 'Aşırı filtreli fotoğraf, karanlık tonlar, soğuk renkler',
      refs: 'https://www.instagram.com/toteme/',
      platforms: ['Instagram', 'TikTok'],
      targetAudience: '22-38 yaş, şehirli kadın, trend takipçisi',
      notes: 'Mayıs sonu yeni koleksiyon lansmanı. Ürün çekimleri 15 Mayıs\'ta stüdyoda.',
      specialDay: 'Anneler Günü (12 Mayıs)',
      specialContent: 'Anneler Günü özel içerik serisi — 3 post, 1 story seti',
      hasAd: true, budget: '18.000 TL',
      newProduct: true,
      newProductDesc: 'Toprak tonu koleksiyonu — 5 farklı ürün, ilk kez piyasada.',
      featured: 'Terracotta elbise modeli — koleksiyonun yıldız ürünü',
    }
  })

  // IG Moodboard Kartları
  type CardStatus = 'PENDING' | 'REVIEW' | 'APPROVED' | 'REJECTED'
  type TaskStatus = 'TODO' | 'DOING' | 'DONE'

  const igCards: Array<{
    type: string; label: string; taskType: string; taskDesc: string;
    taskFormat: string; taskDeadline: string; taskAssigneeId: string;
    taskIGCell: number; videoUrl: string | null;
    mbStatus: CardStatus; taskStatus: TaskStatus;
  }> = [
    {
      type: 'Atmosfer/Mood', label: 'Toprak Tonu Atmosfer',
      taskType: 'Fotoğraf', taskDesc: 'Toprak tonu arka plan, doğal ışık. 1:1 kare format. Model dışı, sadece ürün.',
      taskFormat: '1:1 · 4K · JPEG', taskDeadline: '2026-05-10',
      taskAssigneeId: foto.id, taskIGCell: 0,
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      mbStatus: 'REVIEW', taskStatus: 'DOING',
    },
    {
      type: 'Video Referansı', label: 'Koleksiyon Tanıtım Reels',
      taskType: 'Video', taskDesc: 'Yaz koleksiyonu tanıtım reels. Müzik: lounge/chill vibe. 15-30 sn.',
      taskFormat: '9:16 · 30 sn · 4K', taskDeadline: '2026-05-12',
      taskAssigneeId: videograf.id, taskIGCell: 1,
      videoUrl: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
      mbStatus: 'PENDING', taskStatus: 'TODO',
    },
    {
      type: 'Ürün Kartı', label: 'Anneler Günü Ürün Post',
      taskType: 'Grafik', taskDesc: 'Anneler Günü özel tasarım. Pembe/krem tonlar. Ürün + slogan. 3 varyasyon.',
      taskFormat: '1:1 · PNG · 300dpi', taskDeadline: '2026-05-08',
      taskAssigneeId: editor.id, taskIGCell: 2,
      videoUrl: null, mbStatus: 'APPROVED', taskStatus: 'DONE',
    },
    {
      type: 'Referans Görseli', label: 'Minimal Kumaş Detay',
      taskType: 'Fotoğraf', taskDesc: 'Kumaş dokusu makro çekim. Bej/krem arka plan. Minimal kompozisyon.',
      taskFormat: '4:5 · 4K · JPEG', taskDeadline: '2026-05-13',
      taskAssigneeId: foto.id, taskIGCell: 3,
      videoUrl: null, mbStatus: 'PENDING', taskStatus: 'TODO',
    },
    {
      type: 'Tipografi', label: 'Koleksiyon İsim Posteri',
      taskType: 'Grafik', taskDesc: '"Toprak" koleksiyonu tipografi posteri. Minimal. Serif font. Krem zemin.',
      taskFormat: '1:1 · PNG · 300dpi', taskDeadline: '2026-05-11',
      taskAssigneeId: editor.id, taskIGCell: 4,
      videoUrl: null, mbStatus: 'PENDING', taskStatus: 'TODO',
    },
    {
      type: 'Not/Brief', label: 'TikTok Trend Reels',
      taskType: 'Video', taskDesc: 'TikTok trend formatında ürün showcase. 15 saniye. Hızlı kesim.',
      taskFormat: '9:16 · 15 sn · 1080p', taskDeadline: '2026-05-14',
      taskAssigneeId: videograf.id, taskIGCell: 5,
      videoUrl: 'https://www.youtube.com/watch?v=FVfAjLNXsmQ',
      mbStatus: 'PENDING', taskStatus: 'TODO',
    },
  ]

  for (let i = 0; i < igCards.length; i++) {
    const cd = igCards[i]
    const card = await db.moodboardCard.create({
      data: {
        which: 'IG', briefId: brief1.id, order: i,
        type: cd.type, label: cd.label, status: cd.mbStatus,
        taskType: cd.taskType, taskDesc: cd.taskDesc, taskFormat: cd.taskFormat,
        taskDeadline: cd.taskDeadline, taskAssigneeId: cd.taskAssigneeId,
        taskIGCell: cd.taskIGCell,
        versions: { create: { vNum: 1, note: 'İlk taslak', desc: cd.taskDesc, videoUrl: cd.videoUrl, createdBy: admin.name } }
      }
    })
    await db.iGCell.upsert({
      where: { briefId_cellIndex: { briefId: brief1.id, cellIndex: cd.taskIGCell } },
      create: {
        briefId: brief1.id, cellIndex: cd.taskIGCell,
        type: cd.taskType === 'Video' ? 'REELS' : 'POST',
        videoUrl: cd.videoUrl, caption: cd.label,
        hashtags: '#novamoda #yaz2026 #moda #topraktonu',
        publishDate: new Date(cd.taskDeadline + 'T10:00').toISOString(),
        approved: cd.mbStatus === 'APPROVED' ? true : null,
      },
      update: {}
    })
    await db.task.create({
      data: {
        briefId: brief1.id, cardId: card.id, cardRef: cd.label,
        type: cd.taskType, desc: cd.taskDesc, format: cd.taskFormat,
        source: 'IG Moodboard', assigneeId: cd.taskAssigneeId,
        deadline: cd.taskDeadline, status: cd.taskStatus, order: i,
        createdById: admin.id,
      }
    })
  }

  // Kampanya Moodboard
  const kampCards = [
    { type: 'Afiş/Billboard', label: 'Yaz Kampanyası Afişi', taskType: 'Grafik', taskDesc: 'Billboard formatı. Toprak tonu kolaj. A3 baskı.', taskFormat: 'A3 · 300dpi · CMYK', taskDeadline: '2026-05-15', taskAssigneeId: editor.id },
    { type: 'Kampanya Videosu', label: 'TikTok Tanıtım Filmi', taskType: 'Video', taskDesc: '45 sn TikTok tanıtım filmi. Trend müzik, hızlı kesim.', taskFormat: '9:16 · 45 sn · 1080p', taskDeadline: '2026-05-14', taskAssigneeId: videograf.id, videoUrl: 'https://www.youtube.com/watch?v=FVfAjLNXsmQ' },
    { type: 'Story Seti', label: 'Koleksiyon Story Seti', taskType: 'Grafik', taskDesc: '5 parçalı story seti. Swipe formatı. Ürün detayları + fiyatlar.', taskFormat: '9:16 · PNG · 5 slayt', taskDeadline: '2026-05-12', taskAssigneeId: editor.id },
  ]

  for (let i = 0; i < kampCards.length; i++) {
    const kc = kampCards[i] as any
    await db.moodboardCard.create({
      data: {
        which: 'KAMP', briefId: brief1.id, order: i,
        type: kc.type, label: kc.label, status: 'PENDING',
        taskType: kc.taskType, taskDesc: kc.taskDesc, taskFormat: kc.taskFormat,
        taskDeadline: kc.taskDeadline, taskAssigneeId: kc.taskAssigneeId,
        versions: { create: { vNum: 1, note: 'İlk taslak', desc: kc.taskDesc, videoUrl: kc.videoUrl || null, createdBy: admin.name } }
      }
    })
  }

  // Brief 2: Nisan 2026 — tamamlanmış (YAYIN)
  const brief2 = await db.brief.create({
    data: {
      firmId, month: 'Nisan', year: 2026, stage: 'YAYIN',
      products: 'İlkbahar koleksiyonu — trençkot, bluz, bol pantolon',
      tone: 'Taze, enerjik, genç. Sokak stili etkisi.',
      colorDir: 'Pasteller — lila, mint, açık sarı, beyaz',
      avoid: 'Karanlık renkler, ağır kumaş görselleri',
      platforms: ['Instagram'],
      targetAudience: '18-30 yaş, üniversiteli kadın',
      hasAd: false, budget: '12.000 TL',
    }
  })
  await db.task.createMany({ data: [
    { briefId: brief2.id, cardRef: 'İlkbahar Lookbook', type: 'Fotoğraf', desc: 'Lookbook çekimi tamamlandı', status: 'DONE', order: 0, createdById: admin.id, assigneeId: foto.id, deadline: '2026-04-05', source: 'Kampanya MB' },
    { briefId: brief2.id, cardRef: 'Pastel Tone Reels', type: 'Video', desc: 'Reels montajı tamamlandı', status: 'DONE', order: 1, createdById: admin.id, assigneeId: videograf.id, deadline: '2026-04-08', source: 'IG Moodboard' },
    { briefId: brief2.id, cardRef: 'Koleksiyon Grafik Seti', type: 'Grafik', desc: '5 post grafik tamamlandı', status: 'DONE', order: 2, createdById: admin.id, assigneeId: editor.id, deadline: '2026-04-03', source: 'Kampanya MB' },
  ]})
  const captions = ['Pastel tonlarla baharı karşıla 🌸', 'Yeni koleksiyon 💜', 'İlkbahar enerjisi ✨', 'Nova Moda × Bahar', 'Hafifliğin rengi', 'Trend × Konfor']
  for (let i = 0; i < 6; i++) {
    await db.iGCell.create({ data: {
      briefId: brief2.id, cellIndex: i,
      type: i % 3 === 1 ? 'REELS' : 'POST',
      caption: captions[i], hashtags: '#novamoda #ilkbahar2026 #pastel',
      publishDate: new Date(2026, 3, i + 3).toISOString(),
      approved: true,
    }})
  }
}

// ── BREWLAB COFFEE — 1 Brief ───────────────────────────────────
async function seedBrewLab(firmId: string, admin: any, editor: any, foto: any, copywriter: any) {
  const brief = await db.brief.create({
    data: {
      firmId, month: 'Mayıs', year: 2026, stage: 'TASKS',
      products: 'Yaz menüsü — soğuk içecekler (7 yeni ürün)\nCold brew serisi, meyveli latte, smoothie bowl',
      tone: 'Sıcak, davetkar, artisanal. "El yapımı" hissi. Rustik ama modern.',
      colorDir: 'Kahverengi tonları, krem, terracotta, mat yeşil, turuncu',
      avoid: 'Plastik görünüm, endüstriyel his, soğuk renkler, karmaşık kompozisyon',
      refs: 'https://www.instagram.com/oneship.coffee/',
      platforms: ['Instagram', 'TikTok'],
      targetAudience: '20-40 yaş, kahve meraklısı, specialty coffee kültürü',
      notes: 'Yaz menüsü 1 Haziran\'da lansmanı yapılacak. Tüm çekimler mağazada.',
      specialDay: 'Dünya Kahve Günü (25 Mayıs)',
      specialContent: 'Kahve Günü özel içerik — signature cold brew hikayesi',
      hasAd: true, budget: '8.500 TL',
    }
  })

  // IG Moodboard — tüm onaylı (TASKS aşamasına geçiş için %80+ onaylı)
  const brewIGCards = [
    { label: 'Cold Brew Atmosfer', type: 'Atmosfer/Mood', taskType: 'Fotoğraf', taskDesc: 'Cold brew ürün fotoğrafı. Ahşap zemin. Doğal ışık.', taskFormat: '1:1 · 4K · JPEG', taskDeadline: '2026-05-20', taskAssigneeId: foto.id, taskIGCell: 0 },
    { label: 'Smoothie Bowl Reels', type: 'Video Referansı', taskType: 'Video', taskDesc: 'Smoothie bowl hazırlık süreci reels. 15-20 sn. Top-down çekim.', taskFormat: '9:16 · 20 sn · 4K', taskDeadline: '2026-05-22', taskAssigneeId: foto.id, taskIGCell: 1 },
    { label: 'Yaz Menü Announcement', type: 'Ürün Kartı', taskType: 'Grafik', taskDesc: 'Yaz menüsü duyuru posteri. El yazısı font. Krem arka plan.', taskFormat: '1:1 · PNG · 300dpi', taskDeadline: '2026-05-18', taskAssigneeId: editor.id, taskIGCell: 2 },
    { label: 'Barista POV Video', type: 'Video Referansı', taskType: 'Video', taskDesc: 'Barista gözünden cold brew hazırlama. 30 sn. Ambians müzik.', taskFormat: '9:16 · 30 sn · 4K', taskDeadline: '2026-05-23', taskAssigneeId: foto.id, taskIGCell: 3 },
  ]

  for (let i = 0; i < brewIGCards.length; i++) {
    const bc = brewIGCards[i]
    const card = await db.moodboardCard.create({
      data: {
        which: 'IG', briefId: brief.id, order: i,
        type: bc.type, label: bc.label, status: 'APPROVED',
        taskType: bc.taskType, taskDesc: bc.taskDesc, taskFormat: bc.taskFormat,
        taskDeadline: bc.taskDeadline, taskAssigneeId: bc.taskAssigneeId,
        taskIGCell: bc.taskIGCell,
        versions: { create: { vNum: 1, note: 'İlk taslak — onaylandı', desc: bc.taskDesc, createdBy: admin.name } }
      }
    })
    await db.iGCell.upsert({
      where: { briefId_cellIndex: { briefId: brief.id, cellIndex: bc.taskIGCell } },
      create: {
        briefId: brief.id, cellIndex: bc.taskIGCell,
        type: bc.taskType === 'Video' ? 'REELS' : 'POST',
        caption: card.label, hashtags: '#brewlab #kahve #coldbrew #yaz2026',
        publishDate: new Date(bc.taskDeadline + 'T09:00').toISOString(),
        approved: true,
      },
      update: {}
    })
  }

  // Kanban görevleri (karışık durumlar — gerçekçi proje süreci)
  type TaskStatus = 'TODO' | 'DOING' | 'DONE'
  const brewTasks: Array<{ cardRef: string; type: string; desc: string; format: string; deadline: string; assigneeId: string; status: TaskStatus; source: string }> = [
    { cardRef: 'Cold Brew Ürün Fotoğrafı', type: 'Fotoğraf', desc: 'Tüm cold brew ürünlerinin stüdyo çekimi. 7 farklı içecek.', format: '1:1 · 4K · JPEG', deadline: '2026-05-20', assigneeId: foto.id, status: 'DOING', source: 'IG Moodboard' },
    { cardRef: 'Smoothie Bowl Reels Montaj', type: 'Video', desc: 'Çekimler tamamlandı. Müzik seçildi. Montaj aşamasında.', format: '9:16 · 20 sn', deadline: '2026-05-22', assigneeId: foto.id, status: 'DOING', source: 'IG Moodboard' },
    { cardRef: 'Yaz Menü Afişi', type: 'Grafik', desc: 'A3 baskı formatı. Hem dijital hem basılı kullanılacak.', format: 'A3 · 300dpi · CMYK', deadline: '2026-05-18', assigneeId: editor.id, status: 'DONE', source: 'Kampanya MB' },
    { cardRef: 'Barista Hikaye Serisi', type: 'Metin', desc: 'Barista hikayelerini anlatan 3 caption. Samimi dil.', format: '280 karakter', deadline: '2026-05-25', assigneeId: copywriter.id, status: 'TODO', source: 'Manuel' },
    { cardRef: 'Mağaza Dış Çekim', type: 'Fotoğraf', desc: 'Mağaza dış cephe + vitrin fotoğrafları. Altın saat.', format: '4:3 · 4K · JPEG', deadline: '2026-05-28', assigneeId: foto.id, status: 'TODO', source: 'Manuel' },
    { cardRef: 'Kahve Günü Story Seti', type: 'Grafik', desc: '25 Mayıs Kahve Günü için 5 story slaytı.', format: '9:16 · PNG · 5 slayt', deadline: '2026-05-24', assigneeId: editor.id, status: 'TODO', source: 'Manuel' },
  ]

  for (let i = 0; i < brewTasks.length; i++) {
    await db.task.create({ data: { ...brewTasks[i], briefId: brief.id, order: i, createdById: admin.id } })
  }
}

main()
  .catch(e => { console.error('❌ Seed hatası:', e); process.exit(1) })
  .finally(() => db.$disconnect())
