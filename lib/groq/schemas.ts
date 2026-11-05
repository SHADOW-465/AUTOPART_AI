import { z } from "zod"

const extractItemProperties = {
  line_number: { type: "number" },
  part_number: { type: "string" },
  part_name: { type: "string" },
  original_spec: { type: "string" },
  quantity: { type: "number" },
  unit_cost: { type: "number" },
  supplier: { type: "string" },
  material: { type: "string" },
  category: { type: "string" },
} as const

const extractItemRequired = [
  "line_number",
  "part_number",
  "part_name",
  "original_spec",
  "quantity",
  "unit_cost",
  "supplier",
  "material",
  "category",
] as const

export const EXTRACT_JSON_SCHEMA = {
  name: "bom_extract",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["items"],
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: extractItemRequired,
          properties: extractItemProperties,
        },
      },
    },
  },
} as const

export const extractItemSchema = z.object({
  line_number: z.number(),
  part_number: z.string(),
  part_name: z.string(),
  original_spec: z.string(),
  quantity: z.number(),
  unit_cost: z.number(),
  supplier: z.string(),
  material: z.string(),
  category: z.string(),
})

export const extractResponseSchema = z.object({
  items: z.array(extractItemSchema),
})
