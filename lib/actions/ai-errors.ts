const RATE_LIMIT = "AI rate limit, wait a minute and retry."
const NOT_CONFIGURED = "AI is not configured."
const ALLOWED = new Set([
  RATE_LIMIT,
  NOT_CONFIGURED,
  "Empty validation response",
  "Empty RFQ response",
])

export function mapAiActionError(error: unknown): string {
  const message = error instanceof Error ? error.message : ""
  if (ALLOWED.has(message)) return message
  return "AI request failed."
}
