import { SAMPLE_FILES } from "@/lib/samples"

export const dynamic = "force-static"

export function generateStaticParams() {
  return Object.keys(SAMPLE_FILES).map((file) => ({ file }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  const csv = SAMPLE_FILES[file]
  if (!csv) return new Response("Not found", { status: 404 })
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"`,
    },
  })
}
