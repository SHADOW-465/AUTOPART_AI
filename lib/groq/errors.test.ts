import { describe, expect, it } from "vitest"
import { mapAiError } from "./errors"

describe("mapAiError", () => {
  it("maps raw Groq HTTP/JSON bodies to a generic failure", () => {
    expect(mapAiError(new Error('400 {"error":{"message":"bad"}}'))).toBe(
      "AI request failed.",
    )
  })

  it("keeps allowlisted app messages", () => {
    expect(mapAiError(new Error("AI rate limit, wait a minute and retry."))).toBe(
      "AI rate limit, wait a minute and retry.",
    )
    expect(mapAiError(new Error("AI is not configured."))).toBe("AI is not configured.")
  })
})
