import os from "node:os"
import path from "node:path"
import { flag, openDatabase, resolveStorage, type Db, type StorageInfo } from "./client"
import { seedDemoData } from "./demo"
import { seedIfEmpty } from "./seed"

type Globals = { __seionDb?: Db; __seionStorage?: StorageInfo }
const globalForDb = globalThis as unknown as Globals

function isUnwritable(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException)?.code
  return (
    code === "EROFS" ||
    code === "ENOENT" ||
    code === "EACCES" ||
    code === "EPERM" ||
    code === "ENOTDIR" ||
    code === "EEXIST" ||
    /read-?only|unable to open/i.test(String((error as Error)?.message))
  )
}

function open(storage: StorageInfo): Db {
  const db = openDatabase(storage.path, { seed: false })
  const fresh = seedIfEmpty(db)
  if (fresh && storage.demoData) {
    try {
      seedDemoData(db)
    } catch (error) {
      console.error("SEION: demo data could not be loaded", error)
    }
  }
  return db
}

const FALLBACK_PATH = path.join(os.tmpdir(), "seion", "seion.db")

/** The app-wide connection, opened lazily and cached for the life of the server process. */
export function getDb(): Db {
  if (globalForDb.__seionDb) return globalForDb.__seionDb
  let storage = resolveStorage()
  let db: Db
  try {
    db = open(storage)
  } catch (error) {
    if (!isUnwritable(error) || storage.path === FALLBACK_PATH) throw error
    // Read-only filesystem and no DATABASE_PATH: keep the app usable on temporary storage instead of crashing.
    console.warn(`SEION: cannot write ${storage.path} (${(error as Error).message}); falling back to temporary storage.`)
    storage = { path: FALLBACK_PATH, ephemeral: true, demoData: flag(process.env.SEION_DEMO_DATA) ?? true }
    db = open(storage)
  }
  globalForDb.__seionStorage = storage
  globalForDb.__seionDb = db
  return db
}

export function getStorageInfo(): StorageInfo {
  getDb()
  return globalForDb.__seionStorage!
}
