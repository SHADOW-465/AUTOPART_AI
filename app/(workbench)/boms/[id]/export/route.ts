import { NextResponse } from "next/server"
import { buildBomCsv, exportFilename } from "@/lib/boms/export"
import { loadBomDetail } from "@/lib/boms/view"
import { getDb } from "@/lib/db/app"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = loadBomDetail(getDb(), id)
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // UTF-8 byte-order mark so Excel reads ₹ and non-ASCII part names correctly.
  const csv = "﻿" + buildBomCsv(detail.lines)
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(detail.bom.bom_code)}"`,
      "Cache-Control": "no-store",
    },
  })
}
