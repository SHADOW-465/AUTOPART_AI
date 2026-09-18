"use server"

import { redirect } from "next/navigation"
import { logAudit } from "@/lib/audit/log"
import { canUpload } from "@/lib/auth/roles"
import { requireUser } from "@/lib/auth/session"
import { processBom } from "@/lib/boms/process"
import { createServerClient } from "@/lib/supabase/server"

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_EXT = new Set(["xlsx", "csv", "pdf"])
const ALLOWED_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/csv",
  "application/pdf",
  "application/octet-stream",
  "application/vnd.ms-excel",
  "",
])

export async function uploadBomAction(
  formData: FormData,
): Promise<{ bomId: string } | { error: string }> {
  const { user, profile } = await requireUser()
  if (!canUpload(profile.role)) {
    return { error: "Forbidden" }
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a BOM file to upload" }
  }
  if (file.size > MAX_BYTES) {
    return { error: "File must be 10MB or smaller" }
  }

  const filename = file.name || "upload"
  const ext = extensionOf(filename)
  const mime = file.type || ""
  if (!isAllowedUpload(ext, mime)) {
    if (ext === "xls") return { error: "Export as .xlsx or CSV" }
    if (ext === "step" || ext === "stp") {
      return { error: "CAD/STEP files are not supported. Export as .xlsx or CSV." }
    }
    return { error: "Upload an .xlsx, .csv, or .pdf file" }
  }

  const supabase = await createServerClient()
  const bomCode = `BOM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const title = titleFromFilename(filename)

  const { data: bom, error: insertError } = await supabase
    .from("boms")
    .insert({
      tenant_id: profile.tenant_id,
      bom_code: bomCode,
      title,
      status: "DRAFT",
      source_filename: filename,
      source_mime: mime || null,
      created_by: user.id,
    })
    .select("id")
    .single()

  if (insertError || !bom) {
    console.error("boms insert failed", insertError)
    return { error: "Could not create BOM" }
  }

  const bomId = bom.id as string
  const storagePath = `${profile.tenant_id}/${bomId}/${filename}`
  const buffer = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage.from("bom-uploads").upload(storagePath, buffer, {
    contentType: mime || "application/octet-stream",
    upsert: false,
  })

  if (uploadError) {
    console.error("bom-uploads failed", uploadError)
    await supabase
      .from("boms")
      .update({ status: "FAILED", error_message: "Could not store upload" })
      .eq("id", bomId)
      .eq("tenant_id", profile.tenant_id)
    return { error: "Could not store upload" }
  }

  await supabase
    .from("boms")
    .update({ source_storage_path: storagePath })
    .eq("id", bomId)
    .eq("tenant_id", profile.tenant_id)

  await logAudit({
    action: "bom.uploaded",
    entityType: "bom",
    entityId: bomId,
    metadata: { filename, mime, size: file.size },
  })

  try {
    await processBom(bomId, profile.tenant_id, buffer, mime, filename)
  } catch (err) {
    const message = err instanceof Error ? err.message : "BOM processing failed"
    return { error: message }
  }

  redirect(`/app/boms/${bomId}`)
}

function extensionOf(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename
  const dot = base.lastIndexOf(".")
  if (dot < 0) return ""
  return base.slice(dot + 1).toLowerCase()
}

function isAllowedUpload(ext: string, mime: string): boolean {
  if (ALLOWED_EXT.has(ext)) {
    if (!mime || ALLOWED_MIME.has(mime.toLowerCase())) return true
    if (ext === "xlsx" && mime.toLowerCase().includes("spreadsheet")) return true
    if (ext === "csv" && mime.toLowerCase().includes("csv")) return true
    if (ext === "pdf" && mime.toLowerCase().includes("pdf")) return true
  }
  if (mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return true
  if (mime === "text/csv") return true
  if (mime === "application/pdf") return true
  return false
}

function titleFromFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename
  const trimmed = base.replace(/\.[^.]+$/, "").trim()
  return trimmed || "Untitled BOM"
}
