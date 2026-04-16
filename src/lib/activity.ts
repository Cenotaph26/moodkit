// src/lib/activity.ts
import { db } from './db'

export async function logActivity(params: {
  userId: string
  firmId?: string
  briefId?: string
  action: string
  entity: string
  entityId: string
  meta?: object
}) {
  try {
    await db.activityLog.create({
      data: {
        userId: params.userId,
        firmId: params.firmId,
        briefId: params.briefId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        meta: params.meta as any,
      }
    })
  } catch (err) {
    // Activity logging is non-critical — swallow errors
    console.error('Activity log hatası:', err)
  }
}
