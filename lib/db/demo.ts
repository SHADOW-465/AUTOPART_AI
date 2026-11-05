import { importCsvText } from "@/lib/boms/import"
import { acceptAlternative, listAlternativesForItem, setCustomerStatus } from "@/lib/repo/alternatives"
import { logEvent } from "@/lib/repo/audit"
import { listItems } from "@/lib/repo/boms"
import { getSettings, saveSettings } from "@/lib/repo/settings"
import { run } from "@/lib/repo/sql"
import { listSuppliers } from "@/lib/repo/suppliers"
import { changeRfqStatus, createRfqForAlternative, recordQuote } from "@/lib/rfq/service"
import { DEMO_BRAKE_BOM_CSV, SAMPLE_BOM_CSV } from "@/lib/samples"
import { transaction, type Db } from "./client"

export const DEMO_COMPANY = "Demo Auto Components Pvt Ltd"

function daysAgo(days: number, now: Date): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString()
}

/**
 * Loads two demo BOMs with a realistic spread of states: approved, submitted and pending swaps,
 * an RFQ in each status, and decisions spread over three months so the savings charts have shape.
 * Built through the real import / decision / RFQ code paths. Returns the new BOM ids.
 */
export function seedDemoData(db: Db, now: Date = new Date()): { bomIds: string[] } {
  return transaction(db, () => {
    if (!getSettings(db).company_name) {
      saveSettings(db, {
        company_name: DEMO_COMPANY,
        plant_location: "Sriperumbudur, Chennai",
        contact_name: "Demo Buyer",
        contact_email: "purchase@demo-auto.example",
        contact_phone: "+91 44 0000 0000",
        default_annual_volume: 25000,
      })
    }

    const underbody = importCsvText(db, {
      filename: "demo-underbody-kit.csv",
      csv: SAMPLE_BOM_CSV,
      title: "Demo – compact SUV underbody kit",
      customer_name: "Demo OEM A",
      vehicle_platform: "SUV-X",
      annual_volume: 25000,
    })
    const brake = importCsvText(db, {
      filename: "demo-brake-kit.csv",
      csv: DEMO_BRAKE_BOM_CSV,
      title: "Demo – brake caliper bracket kit",
      customer_name: "Demo OEM B",
      vehicle_platform: "Hatch-2",
      annual_volume: 40000,
    })

    const supplierId = (name: string) => listSuppliers(db).find((s) => s.name === name)?.id ?? null
    const lineAlts = (bomId: string, partNumber: string) => {
      const item = listItems(db, bomId).find((i) => i.part_number === partNumber)
      if (!item) throw new Error(`demo line ${partNumber} missing`)
      return listAlternativesForItem(db, item.id)
    }
    const backdate = (altId: string, decidedDays: number, customerDays?: number) => {
      run(db, "UPDATE part_alternatives SET decided_at = ? WHERE id = ?", daysAgo(decidedDays, now), altId)
      if (customerDays != null) run(db, "UPDATE part_alternatives SET customer_updated_at = ? WHERE id = ?", daysAgo(customerDays, now), altId)
    }
    const decide = (
      bomId: string,
      partNumber: string,
      customer: { status: "NOT_SUBMITTED" | "SUBMITTED" | "APPROVED"; ref?: string },
      days: { decided: number; customer?: number },
    ) => {
      const [best] = lineAlts(bomId, partNumber)
      acceptAlternative(db, best.id)
      if (customer.status !== "NOT_SUBMITTED") {
        setCustomerStatus(db, best.id, { customer_status: customer.status, customer_ref: customer.ref ?? null, customer_notes: null })
      }
      backdate(best.id, days.decided, days.customer)
    }

    // Underbody kit: two approved, one submitted, one pending; sheet steel priced via a quoted RFQ.
    decide(underbody, "FA-1001", { status: "APPROVED", ref: "PPAP-DEMO-001" }, { decided: 75, customer: 52 })
    decide(underbody, "FA-1007", { status: "APPROVED", ref: "PPAP-DEMO-002" }, { decided: 48, customer: 21 })
    decide(underbody, "FA-1004", { status: "SUBMITTED", ref: "ECN-DEMO-014" }, { decided: 18, customer: 9 })
    decide(underbody, "FA-1005", { status: "NOT_SUBMITTED" }, { decided: 4 })

    const sheet = lineAlts(underbody, "ST-2001")[0]
    const tnStamping = supplierId("TN Stamping (seed)")
    if (tnStamping) {
      const rfq = createRfqForAlternative(db, sheet.id, tnStamping)
      changeRfqStatus(db, rfq.id, "SENT")
      recordQuote(db, rfq.id, { unit_cost: 66, lead_time_days: 12, valid_until: null, notes: "Demo quote: CR4 coils, ex-works Chennai" })
      const quoted = lineAlts(underbody, "ST-2001").find((a) => a.supplier_id === tnStamping)
      if (quoted) {
        acceptAlternative(db, quoted.id)
        setCustomerStatus(db, quoted.id, { customer_status: "SUBMITTED", customer_ref: "ECN-DEMO-019", customer_notes: null })
        backdate(quoted.id, 10, 6)
      }
    }

    const mumbai = supplierId("MumbaiSteel (seed)")
    if (mumbai) {
      const rfq = createRfqForAlternative(db, lineAlts(underbody, "ST-2003")[0].id, mumbai)
      changeRfqStatus(db, rfq.id, "SENT")
    }

    // Brake kit: one approved, one pending, a draft RFQ for the forging.
    decide(brake, "BC-5002", { status: "APPROVED", ref: "PPAP-DEMO-003" }, { decided: 40, customer: 14 })
    decide(brake, "BC-5003", { status: "NOT_SUBMITTED" }, { decided: 2 })
    const manesar = supplierId("Manesar Forge (seed)")
    const forging = lineAlts(brake, "BC-5005")[0]
    if (manesar && forging) createRfqForAlternative(db, forging.id, manesar)

    run(db, "UPDATE boms SET created_at = ? WHERE id = ?", daysAgo(80, now), underbody)
    run(db, "UPDATE boms SET created_at = ? WHERE id = ?", daysAgo(45, now), brake)
    for (const bomId of [underbody, brake]) {
      logEvent(db, { bom_id: bomId, entity_type: "bom", entity_id: bomId, action: "demo.loaded", summary: "Demo data loaded for testing." })
    }
    return { bomIds: [underbody, brake] }
  })
}
