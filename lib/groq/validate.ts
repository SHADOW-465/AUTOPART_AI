import { getGroqClient, VALIDATE_MODEL, withRateLimitRetry } from "./client"
import { VALIDATE_JSON_SCHEMA, validationReportSchema, type ValidationReport } from "./schemas"

const DEFAULT_APPLICATION_NOTE = "automotive fastener / structural, underbody unless specified"

export type ValidationInput = {
  originalSpec: string
  originalCatalog: unknown
  alternativeSpec: string
  alternativeCatalog: unknown
  applicationNote?: string
}

export type { ValidationReport }

export async function validateAlternative(input: ValidationInput): Promise<ValidationReport> {
  const client = getGroqClient()
  const applicationNote = input.applicationNote?.trim() || DEFAULT_APPLICATION_NOTE
  const completion = await withRateLimitRetry(() =>
    client.chat.completions.create(
      {
        model: VALIDATE_MODEL,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You are a metallurgist validating whether an Indian Standard alternative can replace a foreign-standard part. Use catalog numbers as given; do not invent or change indian_standard_code. Return only the JSON schema.",
          },
          {
            role: "user",
            content: JSON.stringify({
              original_spec: input.originalSpec,
              original_catalog: input.originalCatalog,
              alternative_spec: input.alternativeSpec,
              alternative_catalog: input.alternativeCatalog,
              application_note: applicationNote,
            }),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: VALIDATE_JSON_SCHEMA,
        },
      },
      { timeout: 60_000 },
    ),
  )

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error("Empty validation response")
  const parsed = typeof content === "string" ? JSON.parse(content) : content
  return validationReportSchema.parse(parsed)
}
