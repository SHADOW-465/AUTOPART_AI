import { newId, nowIso, type Db } from "@/lib/db/client"
import type { AuditEvent } from "@/lib/db/types"
import { all, run } from "./sql"

export function logEvent(
  db: Db,
  event: { bom_id?: string | null; entity_type: string; entity_id?: string | null; action: string; summary: string },
): void {
  run(
    db,
    "INSERT INTO audit_events (id, bom_id, entity_type, entity_id, action, summary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    newId(), event.bom_id ?? null, event.entity_type, event.entity_id ?? null, event.action, event.summary, nowIso(),
  )
}

export function listEventsForBom(db: Db, bomId: string, limit = 50): AuditEvent[] {
  return all<AuditEvent>(db, "SELECT * FROM audit_events WHERE bom_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?", bomId, limit)
}
