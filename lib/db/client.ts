import { mkdirSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"
import { MIGRATIONS } from "./schema"
import { seedIfEmpty } from "./seed"

export type Db = DatabaseSync

export type StorageInfo = {
  path: string
  /** True when the file lives on temporary storage (serverless /tmp) and is lost on restart. */
  ephemeral: boolean
  /** Whether demo BOMs, decisions and RFQs are loaded into a brand-new database. */
  demoData: boolean
}

/** Serverless platforms only allow writes under the OS temp dir (/tmp). */
type Env = Record<string, string | undefined>

export function isServerless(env: Env = process.env): boolean {
  return Boolean(env.VERCEL || env.AWS_LAMBDA_FUNCTION_NAME || env.NETLIFY || env.LAMBDA_TASK_ROOT)
}

export function flag(value: string | undefined): boolean | null {
  if (value == null || value.trim() === "") return null
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase())
}

export function resolveStorage(env: Env = process.env, cwd = process.cwd()): StorageInfo {
  const configured = env.DATABASE_PATH?.trim()
  const serverless = isServerless(env)
  const ephemeral = !configured && serverless
  const file = configured
    ? path.resolve(cwd, configured)
    : serverless
      ? path.join(os.tmpdir(), "seion", "seion.db")
      : path.join(cwd, "data", "seion.db")
  // Demo data defaults on where storage is temporary (a hosted demo), off for real plant installs.
  const demoData = flag(env.SEION_DEMO_DATA) ?? ephemeral
  return { path: file, ephemeral, demoData }
}

/** Opens, migrates and (unless seed: false) seeds a database. Use ":memory:" in tests. */
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

const depth = new WeakMap<Db, number>()

/** Runs fn inside BEGIN/COMMIT, rolling back on any error. Nested calls join the outer transaction. */
export function transaction<T>(db: Db, fn: () => T): T {
  const level = depth.get(db) ?? 0
  if (level > 0) {
    depth.set(db, level + 1)
    try {
      return fn()
    } finally {
      depth.set(db, level)
    }
  }
  db.exec("BEGIN IMMEDIATE")
  depth.set(db, 1)
  try {
    const result = fn()
    db.exec("COMMIT")
    return result
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  } finally {
    depth.set(db, 0)
  }
}

export function newId(): string {
  return crypto.randomUUID()
}

export function nowIso(): string {
  return new Date().toISOString()
}
