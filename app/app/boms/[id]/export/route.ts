import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth/session"
import { buildBomCsv, exportFilename } from "@/lib/boms/export"
import { loadBomDetail } from "@/lib/boms/load"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { profile } = await requireUser()
  const supabase = await createServerClient()
  const detail = await loadBomDetail(supabase, profile.tenant_id, id)
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // UTF-8 byte-order mark so Excel reads non-ASCII part names correctly.
  const csv = "﻿" + buildBomCsv(detail.items, detail.alternatives, detail.validationsByAlt)
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(detail.bom.bom_code)}"`,
      "Cache-Control": "no-store",
    },
  })
}
