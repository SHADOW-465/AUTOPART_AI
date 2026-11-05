"use server"

import { readFile } from "node:fs/promises"
import path from "node:path"
import { redirect } from "next/navigation"
import { importBom, processBomFile } from "@/lib/boms/import"
import { rematchBom } from "@/lib/boms/rematch"
import { getDb } from "@/lib/db/client"
import { logEvent } from "@/lib/repo/audit"
import { deleteBom, getBom, updateBomMeta } from "@/lib/repo/boms"
import { optionalNumber, optionalText, refresh, text, toError, type ActionResult, type ActionState } from "./form"

export async function uploadBomAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const file = fd.get("file")
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a BOM file to upload." }
  let bomId: string
  try {
    const result = await importBom(getDb(), {
      filename: file.name || "upload.csv",
      mime: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
      customer_name: optionalText(fd, "customer_name"),
      annual_volume: optionalNumber(fd, "annual_volume", "Annual volume", { min: 0, integer: true }),
    })
    if (!("bomId" in result)) return { error: result.error }
    bomId = result.bomId
  } catch (error) {
    return toError(error)
  }
  refresh()
  redirect(`/boms/${bomId}`)
}

export async function loadSampleBomAction(): Promise<ActionResult> {
  let bomId: string
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "samples", "sample-bom.csv"))
    const result = await importBom(getDb(), {
      filename: "sample-bom.csv",
      mime: "text/csv",
      bytes: new Uint8Array(bytes),
      title: "Sample – compact SUV underbody kit",
      customer_name: "Sample OEM",
    })
    if (!("bomId" in result)) return { error: result.error }
    bomId = result.bomId
  } catch (error) {
    return toError(error)
  }
  refresh()
  redirect(`/boms/${bomId}`)
}

export async function updateBomMetaAction(bomId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const db = getDb()
    const bom = getBom(db, bomId)
    if (!bom) return { error: "BOM not found." }
    const volume = optionalNumber(fd, "annual_volume", "Annual volume", { min: 0, integer: true }) ?? 0
    updateBomMeta(db, bomId, {
      title: text(fd, "title") || bom.title,
      customer_name: optionalText(fd, "customer_name"),
      vehicle_platform: optionalText(fd, "vehicle_platform"),
      annual_volume: volume,
    })
    if (volume !== bom.annual_volume) {
      logEvent(db, {
        bom_id: bomId,
        entity_type: "bom",
        entity_id: bomId,
        action: "bom.volume_changed",
        summary: `Annual volume changed from ${bom.annual_volume.toLocaleString("en-IN")} to ${volume.toLocaleString("en-IN")}.`,
      })
    }
  } catch (error) {
    return toError(error)
  }
  refresh()
  return { ok: true, message: "Saved." }
}

export async function rematchBomAction(bomId: string): Promise<ActionResult> {
  try {
    const db = getDb()
    const { lines, matched } = rematchBom(db, bomId)
    logEvent(db, {
      bom_id: bomId,
      entity_type: "bom",
      entity_id: bomId,
      action: "bom.rematched",
      summary: `Re-matched ${lines} lines against the current standards library and price list; ${matched} matched.`,
    })
    refresh()
    return { ok: true, message: `Re-matched: ${matched} of ${lines} lines matched.` }
  } catch (error) {
    return toError(error)
  }
}

export async function reimportBomAction(bomId: string): Promise<ActionResult> {
  const result = await processBomFile(getDb(), bomId)
  refresh()
  return "error" in result ? result : { ok: true, message: "Re-imported from the original file." }
}

export async function deleteBomAction(bomId: string): Promise<ActionResult> {
  try {
    deleteBom(getDb(), bomId)
  } catch (error) {
    return toError(error)
  }
  refresh()
  redirect("/boms")
}
