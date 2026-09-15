import { getGroqClient, RFQ_MODEL, withRateLimitRetry } from "./client"

export type RfqInput = {
  spec: string
  quantity: number
  vendorName: string
  targetPrice?: number | null
  deliveryCluster: string
  userName: string
  userRole: string
}

export async function draftRfqEmail(input: RfqInput): Promise<string> {
  const client = getGroqClient()
  const completion = await withRateLimitRetry(() =>
    client.chat.completions.create(
      {
        model: RFQ_MODEL,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "Draft a plain-text RFQ email. Do not send it. Ask for BIS certification and mill test reports (MTR). Sign with the user's name and role.",
          },
          {
            role: "user",
            content: [
              `Vendor: ${input.vendorName}`,
              `Spec: ${input.spec}`,
              `Quantity: ${input.quantity}`,
              `Target price: ${input.targetPrice ?? "not specified"}`,
              `Delivery / industrial cluster: ${input.deliveryCluster}`,
              `Sign-off: ${input.userName} (${input.userRole})`,
            ].join("\n"),
          },
        ],
      },
      { timeout: 60_000 },
    ),
  )

  const content = completion.choices[0]?.message?.content
  if (!content || typeof content !== "string") throw new Error("Empty RFQ response")
  return content
}
