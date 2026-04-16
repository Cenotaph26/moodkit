// src/lib/notifWorker.ts
// Redis kuyruğundan bildirimleri alır, PostgreSQL'e kaydeder, WebSocket ile gönderir
import { db } from './db'
import { popNotification } from './redis'

let running = false

export async function processNotifications() {
  if (running) return
  running = true

  try {
    let notif = await popNotification()
    while (notif) {
      const saved = await db.notification.create({
        data: {
          userId: notif.userId,
          briefId: notif.briefId || null,
          title: notif.title,
          sub: notif.sub || null,
        }
      })

      // Push to connected browser via WebSocket (lazy import to avoid circular dep)
      try {
        const { sendWS } = await import('../index')
        sendWS(notif.userId, { type: 'notif', ...saved })
      } catch (_) {}

      notif = await popNotification()
    }
  } catch (err) {
    console.error('Bildirim worker hatası:', err)
  } finally {
    running = false
  }
}

export function startNotifWorker() {
  setInterval(processNotifications, 5000)
  console.log('✅ Bildirim worker başladı')
}
