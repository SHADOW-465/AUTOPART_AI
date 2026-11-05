import { mkdirSync } from "node:fs"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"
import { MIGRATIONS } from "./schema"
import { seedIfEmpty } from "./seed"

export type Db = DatabaseSync

const globalForDb = globalThis as unknown as { __seionDb?: Db }

export function defaultDatabasePath(): string {
  const configured = process.env.DATABASE_PATH?.trim()
  return configured ? path.resolve(configured) : path.join(process.cwd(), "data", "seion.db")
}

/** Opens (and migrates + seeds) a database. Use ":memory:" in tests. */
export function openDatabase(file: string, options: { seed?: boolean } = {}): Db {
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec("PRAGMA foreign_keys = ON")
  if (file !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL")
    db.exec("PRAGMA busy_timeout = 5000")
  }
  migrate(db)
  if (options.seed !== false) seedIfEmpty(db)
  return db
}

export function migrate(db: Db): void {
  const current = (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version
  for (let version = current; version < MIGRATIONS.length; version++) {
    transaction(db, () => {
      db.exec(MIGRATIONS[version])
      db.exec(`PRAGMA user_version = ${version + 1}`)
    })
  }
}

/** The app-wide connection, created lazily on first use. */
export function getDb(): Db {
  if (!globalForDb.__seionDb) {
    globalForDb.__seionDb = openDatabase(defaultDatabasePath())
  }
  return globalForDb.__seionDb
}

/** Runs fn inside BEGIN/COMMIT, rolling back on any error. Nested calls join the outer transaction. */
export function transaction<T>(db: Db, fn: () => T): T {
  if (db.isTransaction) return fn()
  db.exec("BEGIN IMMEDIATE")
  try {
    const result = fn()
    db.exec("COMMIT")
    return result
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
}

export function newId(): string {
  return crypto.randomUUID()
}

export function nowIso(): string {
  return new Date().toISOString()
}
