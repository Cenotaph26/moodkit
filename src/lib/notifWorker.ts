// src/lib/notifWorker.ts
// Redis kuyruğundan bildirimleri alır, PostgreSQL'e kaydeder
import { db } from './db'
import { popNotification } from './redis'

let running = false

export async function processNotifications() {
  if (running) return
  running = true

  try {
    let notif = await popNotification()
    while (notif) {
      await db.notification.create({
        data: {
          userId: notif.userId,
          briefId: notif.briefId || null,
          title: notif.title,
          sub: notif.sub || null,
        }
      })
      notif = await popNotification()
    }
  } catch (err) {
    console.error('Bildirim worker hatası:', err)
  } finally {
    running = false
  }
}

// Her 5 saniyede bir kuyruktan işle
export function startNotifWorker() {
  setInterval(processNotifications, 5000)
  console.log('✅ Bildirim worker başladı')
}
