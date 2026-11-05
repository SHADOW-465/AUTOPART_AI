import type { Db } from "@/lib/db/client"
import { DEFAULT_SETTINGS } from "@/lib/db/seed"
import type { Settings } from "@/lib/db/types"
import { all, run } from "./sql"

export function getSettings(db: Db): Settings {
  const rows = all<{ key: string; value: string }>(db, "SELECT key, value FROM settings")
  const map = { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) }
  const volume = Number.parseInt(map.default_annual_volume ?? "", 10)
  return {
    company_name: map.company_name ?? "",
    plant_location: map.plant_location ?? "",
    contact_name: map.contact_name ?? "",
    contact_email: map.contact_email ?? "",
    contact_phone: map.contact_phone ?? "",
    gstin: map.gstin ?? "",
    default_annual_volume: Number.isFinite(volume) && volume >= 0 ? volume : 0,
  }
}

export function saveSettings(db: Db, values: Partial<Settings>): void {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue
    run(
      db,
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      key,
      String(value).trim(),
    )
  }
}
