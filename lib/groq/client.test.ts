import { describe, expect, it, vi } from "vitest"

const GroqMock = vi.hoisted(() => vi.fn())

vi.mock("groq-sdk", () => ({
  default: GroqMock,
}))

import { getGroqClient } from "./client"

describe("getGroqClient", () => {
  it("throws if GROQ_API_KEY is missing", () => {
    const prev = process.env.GROQ_API_KEY
    delete process.env.GROQ_API_KEY
    try {
      expect(() => getGroqClient()).toThrow("GROQ_API_KEY is not configured")
    } finally {
      if (prev === undefined) delete process.env.GROQ_API_KEY
      else process.env.GROQ_API_KEY = prev
    }
  })

  it("constructs Groq with maxRetries 0", () => {
    GroqMock.mockReset()
    GroqMock.mockImplementation(function GroqStub(this: object) {
      return this
    })
    const prev = process.env.GROQ_API_KEY
    process.env.GROQ_API_KEY = "test-key"
    try {
      getGroqClient()
      expect(GroqMock).toHaveBeenCalledWith({ apiKey: "test-key", maxRetries: 0 })
    } finally {
      if (prev === undefined) delete process.env.GROQ_API_KEY
      else process.env.GROQ_API_KEY = prev
    }
  })
})
