import { describe, expect, it } from "vitest"
import { parsePdf } from "./pdf"
import { AffineDOMMatrix } from "./pdf-env"

// Minimal one-page PDF with a text layer containing a CSV-style BOM table.
function buildPdf(lines: string[]): ArrayBuffer {
  const text = lines.map((l, i) => `BT /F1 10 Tf 40 ${780 - i * 14} Td (${l.replace(/[()\\]/g, "\\$&")}) Tj ET`).join("\n")
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
  ]
  let pdf = "%PDF-1.4\n"
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new TextEncoder().encode(pdf).buffer as ArrayBuffer
}

describe("parsePdf (real pdf.js)", () => {
  it("extracts rows from a text-layer PDF", async () => {
    const result = await parsePdf(
      buildPdf(["Part No,Description,Specification,Qty,Rate", "P-1,Hex head screw,ISO 4017 M8x20 8.8,6,3.90", "P-2,Hex nut,DIN 934 M8 8,6,1.40"]),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toHaveLength(2)
    expect(Object.values(result.rows[0].cells)).toContain("ISO 4017 M8x20 8.8")
    // Parsed with our pure-JS DOMMatrix, not the native canvas package serverless hosts lack.
    expect((globalThis as { DOMMatrix?: unknown }).DOMMatrix).toBe(AffineDOMMatrix)
  })
})
