import Groq from "groq-sdk"

export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured")
  return new Groq({ apiKey, maxRetries: 0 })
}

export const EXTRACT_MODEL = "openai/gpt-oss-20b"
export const VALIDATE_MODEL = "openai/gpt-oss-120b"
export const RFQ_MODEL = "openai/gpt-oss-20b"

const MAX_RETRIES = 3

export async function withRateLimitRetry<T>(fn: () => Promise<T>, maxRetries = MAX_RETRIES): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!isRateLimitError(error) || attempt === maxRetries) {
        throw toUserFacingError(error)
      }
      await sleep(getRetryAfterMs(error))
    }
  }
  throw toUserFacingError(lastError)
}

function isRateLimitError(error: unknown): boolean {
  return (error as { status?: number }).status === 429
}

function getRetryAfterMs(error: unknown): number {
  const headers = (error as { headers?: Headers | Record<string, string | undefined> }).headers
  if (!headers) return 0
  const raw =
    typeof (headers as Headers).get === "function"
      ? (headers as Headers).get("retry-after")
      : (headers as Record<string, string | undefined>)["retry-after"]
  const seconds = Number(raw ?? 0)
  if (!Number.isFinite(seconds) || seconds < 0) return 0
  return seconds * 1000
}

function toUserFacingError(error: unknown): Error {
  const status = (error as { status?: number }).status
  if (status === 429) return new Error("AI rate limit, wait a minute and retry.")
  if (status === 401 || status === 403) return new Error("AI is not configured.")
  return error instanceof Error ? error : new Error("AI request failed.")
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
