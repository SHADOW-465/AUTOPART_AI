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

export const VALIDATE_JSON_SCHEMA = {
  name: "metallurgy_validation",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "material_composition_result",
      "mechanical_properties_result",
      "dimensional_fit_result",
      "recommendation",
      "summary_markdown",
    ],
    properties: {
      material_composition_result: {
        type: "string",
        enum: ["EQUIVALENT", "SUPERIOR", "INFERIOR", "INCOMPATIBLE"],
      },
      mechanical_properties_result: {
        type: "string",
        enum: ["EQUIVALENT", "SUPERIOR", "INFERIOR", "INCOMPATIBLE"],
      },
      dimensional_fit_result: {
        type: "string",
        enum: ["INTERCHANGEABLE", "REQUIRES_MODIFICATION", "INCOMPATIBLE"],
      },
      recommendation: {
        type: "string",
        enum: ["SAFE_TO_SWITCH", "REQUIRES_TESTING", "NOT_RECOMMENDED"],
      },
      summary_markdown: { type: "string" },
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

const compositionResult = z.enum(["EQUIVALENT", "SUPERIOR", "INFERIOR", "INCOMPATIBLE"])

export const validationReportSchema = z.object({
  material_composition_result: compositionResult,
  mechanical_properties_result: compositionResult,
  dimensional_fit_result: z.enum(["INTERCHANGEABLE", "REQUIRES_MODIFICATION", "INCOMPATIBLE"]),
  recommendation: z.enum(["SAFE_TO_SWITCH", "REQUIRES_TESTING", "NOT_RECOMMENDED"]),
  summary_markdown: z.string(),
})

export type ValidationReport = z.infer<typeof validationReportSchema>
