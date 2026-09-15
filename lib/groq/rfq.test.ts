import { beforeEach, describe, expect, it, vi } from "vitest"

const create = vi.fn()

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>()
  return {
    ...actual,
    getGroqClient: () => ({
      chat: { completions: { create } },
    }),
  }
})

import { draftRfqEmail } from "./rfq"

describe("draftRfqEmail", () => {
  beforeEach(() => {
    create.mockReset()
  })

  it("returns 20b plain text containing spec and vendor", async () => {
    const spec = "IS 1367 M6x20 8.8"
    const vendorName = "Chennai Fasteners Pvt Ltd"
    create.mockResolvedValue({
      choices: [
        {
          message: {
            content: `Subject: RFQ for ${spec}\n\nDear ${vendorName},\nPlease quote BIS/MTR for the above spec.`,
          },
        },
      ],
    })
    const email = await draftRfqEmail({
      spec,
      quantity: 2500,
      vendorName,
      targetPrice: 8.2,
      deliveryCluster: "Chennai",
      userName: "Priya Kumar",
      userRole: "procurement_engineer",
    })
    expect(create.mock.calls[0][0].model).toBe("openai/gpt-oss-20b")
    expect(create.mock.calls[0][0].response_format).toBeUndefined()
    expect(email).toContain(spec)
    expect(email).toContain(vendorName)
  })
})
