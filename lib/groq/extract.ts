import { chunkRows } from "@/lib/ingestion/chunk"
import type { NormalizedBomItem, RawBomRow } from "@/lib/ingestion/types"
import { EXTRACT_MODEL, getGroqClient, withRateLimitRetry } from "./client"
import { EXTRACT_JSON_SCHEMA, extractResponseSchema } from "./schemas"

const CHUNK_TIMEOUT_MS = 60_000

export async function extractItemsFromRows(rows: RawBomRow[]): Promise<NormalizedBomItem[]> {
  const client = getGroqClient()
  const out: NormalizedBomItem[] = []
  for (const chunk of chunkRows(rows)) {
    out.push(...(await extractChunk(client, chunk)))
  }
  return out
}

async function extractChunk(
  client: ReturnType<typeof getGroqClient>,
  chunk: RawBomRow[],
): Promise<NormalizedBomItem[]> {
  const completion = await withRateLimitRetry(() =>
    client.chat.completions.create(
      {
        model: EXTRACT_MODEL,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "Extract BOM line items from the given rows. All schema fields are required; use empty string or 0 when a value is missing. Never omit fields.",
          },
          { role: "user", content: JSON.stringify(chunk) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: EXTRACT_JSON_SCHEMA,
        },
      },
      { timeout: CHUNK_TIMEOUT_MS },
    ),
  )

  const content = completion.choices[0]?.message?.content
  if (!content) return []
  const parsed = extractResponseSchema.parse(typeof content === "string" ? JSON.parse(content) : content)
  return parsed.items.flatMap((item) => {
    if (item.part_name.trim() === "" && item.original_spec.trim() === "") return []
    const mapped: NormalizedBomItem = {
      lineNumber: item.line_number,
      partNumber: item.part_number,
      partName: item.part_name,
      originalSpec: item.original_spec,
      quantity: item.quantity,
      unitCost: item.unit_cost,
      supplier: item.supplier,
      material: item.material,
      category: item.category,
    }
    return [mapped]
  })
}
