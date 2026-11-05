import { describe, expect, it } from "vitest"
import { buildRfq, mailtoHref, rfqCode, type RfqTemplateInput } from "./template"

const settings = {
  company_name: "Acme Auto Components Pvt Ltd",
  plant_location: "Sriperumbudur, Chennai",
  contact_name: "R. Kumar",
  contact_email: "purchase@acme.example",
  contact_phone: "+91 98400 00000",
  gstin: "33ABCDE1234F1Z5",
  default_annual_volume: 10000,
}

const input: RfqTemplateInput = {
  rfqCode: "RFQ-261105-AB12",
  supplierName: "ChennaiFasteners",
  supplierContact: null,
  isCode: "IS 1367 Part 3",
  partFamily: "hex_socket_cap_screw",
  mechanical: { property_class: "8.8", tensile_mpa_min: 800 },
  sourceSpec: "DIN 912 M6x20 8.8",
  partName: "Hex socket bolt",
  partNumber: "A-100",
  quantityPerVehicle: 4,
  annualVolume: 25000,
  targetUnitCost: 4.5,
  coatingNote: null,
  settings,
}

describe("rfqCode", () => {
  it("is date-stamped with a 4-character suffix", () => {
    expect(rfqCode(new Date("2026-11-05T10:00:00Z"), () => 0)).toBe("RFQ-261105-0000")
    expect(rfqCode()).toMatch(/^RFQ-\d{6}-[0-9A-Z]{4}$/)
  })
})

describe("buildRfq", () => {
  it("includes spec, quantities, compliance asks and signature", () => {
    const { subject, body } = buildRfq(input)
    expect(subject).toBe("RFQ-261105-AB12: IS 1367 Part 3 – Hex socket bolt")
    expect(body).toContain("Dear ChennaiFasteners team,")
    expect(body).toContain("Hex socket bolt (A-100)")
    expect(body).toContain("Current spec:      DIN 912 M6x20 8.8")
    expect(body).toContain("IS 1367 Part 3 (hex socket cap screw)")
    expect(body).toContain("property class 8.8, tensile ≥ 800 MPa")
    expect(body).toContain("4 per vehicle, approx. 1,00,000 per year")
    expect(body).toContain("INR 4.50 per unit")
    expect(body).toContain("BIS licence number")
    expect(body).toContain("EN 10204 type 3.1")
    expect(body).toContain("Delivery to:       Sriperumbudur, Chennai")
    expect(body.trimEnd().endsWith("GSTIN: 33ABCDE1234F1Z5")).toBe(true)
  })

  it("omits empty optional lines", () => {
    const { body } = buildRfq({
      ...input,
      sourceSpec: null,
      targetUnitCost: null,
      mechanical: {},
      annualVolume: 0,
      settings: { ...settings, plant_location: "", gstin: "", contact_phone: "" },
    })
    expect(body).not.toContain("Current spec")
    expect(body).not.toContain("Target price")
    expect(body).not.toContain("Properties")
    expect(body).not.toContain("per year")
    expect(body).not.toContain("GSTIN")
  })
})

describe("mailtoHref", () => {
  it("encodes recipient, subject and body", () => {
    expect(mailtoHref("a@b.example", "Hi & bye", "line1\nline2")).toBe(
      "mailto:a%40b.example?subject=Hi%20%26%20bye&body=line1%0Aline2",
    )
  })
  it("truncates long bodies", () => {
    const href = mailtoHref(null, "s", "x".repeat(5000))
    expect(decodeURIComponent(href.split("body=")[1])).toContain("[Truncated")
    expect(href.length).toBeLessThan(2200)
  })
})
