export async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY

  if (!apiKey) {
    // Provide mock responses for demo when API key is not available
    return getMockResponse(prompt)
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to generate response."
  } catch (error) {
    console.error("Gemini API error:", error)
    return "Error connecting to AI service. Please check your API key and try again."
  }
}

function getMockResponse(prompt: string): string {
  // Check if it's a technical validation request
  if (prompt.includes("metallurgist") || prompt.includes("Technical Validation")) {
    return `**TECHNICAL VALIDATION REPORT**

**Specification Comparison: DIN 912 vs IS 1367**

**Material Composition:**
• DIN 912: Carbon steel, Grade 8.8 (C: 0.15-0.40%, Mn: 0.60-0.90%)
• IS 1367: Carbon steel, Grade 8.8 (C: 0.15-0.40%, Mn: 0.60-0.90%)
• Result: ✅ Equivalent material composition

**Mechanical Properties:**
• Tensile Strength: Both 800 MPa minimum
• Yield Strength: Both 640 MPa minimum  
• Hardness: Both 23-34 HRC
• Result: ✅ Identical mechanical properties

**Dimensional Interchangeability:**
• Thread: M6 x 1.0 pitch (ISO metric) - Compatible
• Length: 20mm nominal - Compatible
• Head diameter: 10mm - Compatible
• Result: ✅ Fully interchangeable

**Surface Finish:**
• Both specifications allow zinc plating or phosphate coating
• Result: ✅ Compatible surface treatments

**Compliance Status:**
• IS 1367 is BIS certified and ARAI approved for automotive use
• Meets AIS-071 requirements for fasteners
• Result: ✅ Fully compliant for Indian automotive applications

**Risk Assessment:**
• No dimensional or mechanical property concerns
• Same failure mode characteristics
• Equivalent fatigue life expectancy

**RECOMMENDATION: ✅ SAFE TO SWITCH**
The IS 1367 M6x20 Grade 8.8 is a direct equivalent to DIN 912 and is recommended for use. This switch will provide cost savings while maintaining full technical compliance.`
  }

  // Otherwise, it's an email draft request
  return `Subject: RFQ - IS 1367 M6x20 Grade 8.8 Fasteners | Qty: 2,500 Units

Dear Sir/Madam,

I hope this email finds you well. We are reaching out regarding a procurement requirement for our automotive manufacturing operations.

**Requirement Details:**
• Part Specification: IS 1367 M6x20 Grade 8.8 Hex Socket Bolt
• Quantity Required: 2,500 units
• Delivery Location: Chennai, Tamil Nadu
• Required Lead Time: Within 14 days of order confirmation

**Request for Quotation:**
We kindly request you to provide:
1. Best unit price for the above quantity
2. Volume discount structure for recurring orders (5,000+ units/month)
3. Current stock availability
4. Delivery timeline and shipping terms
5. Payment terms

**Compliance Requirements:**
Please include copies of:
• BIS certification for IS 1367 compliance
• ARAI approval certificate (if available)
• Material test certificates
• Quality assurance documentation

This is for Tier-2 automotive component manufacturing, and we are looking to establish a long-term supplier relationship for fastener requirements.

Please respond at your earliest convenience. We are evaluating multiple suppliers and aim to finalize the order within this week.

Best Regards,

Rajesh Kumar
Operations Manager
[Company Name]
Contact: +91 98XXX XXXXX
Email: rajesh.kumar@company.com

---
Note: This is an automated RFQ generated via SEION AutoPart AI procurement system.`
}
