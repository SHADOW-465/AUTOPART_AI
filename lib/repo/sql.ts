import type { SQLInputValue } from "node:sqlite"
import type { Db } from "@/lib/db/client"

type Param = string | number | null | Uint8Array | undefined | boolean

function bind(params: Param[]): SQLInputValue[] {
  return params.map((p) => (p === undefined ? null : typeof p === "boolean" ? (p ? 1 : 0) : p))
}

// node:sqlite returns null-prototype rows; copy them into plain objects so they can cross
// the server → client component boundary and behave like ordinary objects everywhere else.
export function all<T>(db: Db, sql: string, ...params: Param[]): T[] {
  return db.prepare(sql).all(...bind(params)).map((row) => ({ ...row }) as unknown as T)
}

export function get<T>(db: Db, sql: string, ...params: Param[]): T | null {
  const row = db.prepare(sql).get(...bind(params))
  return row ? ({ ...row } as unknown as T) : null
}

export function run(db: Db, sql: string, ...params: Param[]): { changes: number } {
  const result = db.prepare(sql).run(...bind(params))
  return { changes: Number(result.changes) }
}

/** Builds "?, ?, ?" for an IN (...) clause. */
export function placeholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(", ")
}

export function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}
