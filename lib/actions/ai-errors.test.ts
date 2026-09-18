import { describe, expect, it } from "vitest"
import { mapAiActionError } from "./ai-errors"

describe("mapAiActionError", () => {
  it("maps raw Groq HTTP/JSON bodies to a generic failure", () => {
    expect(mapAiActionError(new Error('400 {"error":{"message":"bad"}}'))).toBe(
      "AI request failed.",
    )
  })

  it("keeps allowlisted app messages", () => {
    expect(mapAiActionError(new Error("AI rate limit, wait a minute and retry."))).toBe(
      "AI rate limit, wait a minute and retry.",
    )
    expect(mapAiActionError(new Error("AI is not configured."))).toBe("AI is not configured.")
    expect(mapAiActionError(new Error("Empty validation response"))).toBe(
      "Empty validation response",
    )
    expect(mapAiActionError(new Error("Empty RFQ response"))).toBe("Empty RFQ response")
  })
})
