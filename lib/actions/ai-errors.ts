const RATE_LIMIT = "AI rate limit, wait a minute and retry."
const NOT_CONFIGURED = "AI is not configured."

export function mapAiActionError(error: unknown): string {
  const message = error instanceof Error ? error.message : ""
  if (message === RATE_LIMIT || message.includes("rate limit")) return RATE_LIMIT
  if (
    message === NOT_CONFIGURED ||
    message.includes("GROQ_API_KEY") ||
    message.includes("not configured")
  ) {
    return NOT_CONFIGURED
  }
  if (message && !message.trim().startsWith("{") && message.length < 200) return message
  return "AI request failed."
}
