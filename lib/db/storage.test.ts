import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { listAlternativesForBom } from "@/lib/repo/alternatives"
import { listBoms } from "@/lib/repo/boms"
import { listRfqs } from "@/lib/repo/rfqs"
import { getSettings } from "@/lib/repo/settings"
import { loadWorkspace } from "@/lib/boms/workspace"
import { openDatabase, resolveStorage, transaction } from "./client"
import { DEMO_COMPANY, seedDemoData } from "./demo"

describe("resolveStorage", () => {
  it("uses ./data locally", () => {
    expect(resolveStorage({}, "/srv/app")).toEqual({ path: path.join("/srv/app", "data", "seion.db"), ephemeral: false, demoData: false })
  })
  it("uses the temp dir with demo data on serverless hosts", () => {
    expect(resolveStorage({ VERCEL: "1" }, "/var/task")).toEqual({
      path: path.join(os.tmpdir(), "seion", "seion.db"),
      ephemeral: true,
      demoData: true,
    })
  })
  it("honours DATABASE_PATH and SEION_DEMO_DATA", () => {
    expect(resolveStorage({ VERCEL: "1", DATABASE_PATH: "/mnt/db/x.db", SEION_DEMO_DATA: "1" }, "/var/task")).toEqual({
      path: "/mnt/db/x.db",
      ephemeral: false,
      demoData: true,
    })
    expect(resolveStorage({ VERCEL: "1", SEION_DEMO_DATA: "0" }).demoData).toBe(false)
  })
})

describe("transaction", () => {
  it("joins nested calls and rolls back the whole unit on error", () => {
    const db = openDatabase(":memory:", { seed: false })
    db.exec("CREATE TABLE t (v INTEGER)")
    expect(() =>
      transaction(db, () => {
        db.exec("INSERT INTO t VALUES (1)")
        transaction(db, () => db.exec("INSERT INTO t VALUES (2)"))
        throw new Error("boom")
      }),
    ).toThrow("boom")
    expect((db.prepare("SELECT COUNT(*) AS n FROM t").get() as { n: number }).n).toBe(0)
    transaction(db, () => transaction(db, () => db.exec("INSERT INTO t VALUES (3)")))
    expect((db.prepare("SELECT COUNT(*) AS n FROM t").get() as { n: number }).n).toBe(1)
  })
})

describe("seedDemoData", () => {
  it("loads two BOMs with decisions in every state, RFQs and savings history", () => {
    const db = openDatabase(":memory:")
    const now = new Date("2026-11-05T12:00:00Z")
    const { bomIds } = seedDemoData(db, now)

    expect(getSettings(db).company_name).toBe(DEMO_COMPANY)
    expect(listBoms(db).map((b) => b.title).sort()).toEqual(["Demo – brake caliper bracket kit", "Demo – compact SUV underbody kit"])

    const accepted = bomIds.flatMap((id) => listAlternativesForBom(db, id)).filter((a) => a.status === "ACCEPTED")
    expect(accepted.map((a) => a.customer_status).sort()).toEqual(
      ["APPROVED", "APPROVED", "APPROVED", "NOT_SUBMITTED", "NOT_SUBMITTED", "SUBMITTED", "SUBMITTED"].sort(),
    )
    expect(listRfqs(db).map((r) => r.status).sort()).toEqual(["DRAFT", "QUOTED", "SENT"])

    const { totals, decisions } = loadWorkspace(db)
    expect(totals.approved).toBe(3)
    expect(totals.approvedAnnual).toBeGreaterThan(0)
    expect(new Set(decisions.map((d) => d.decided_at?.slice(0, 7))).size).toBeGreaterThanOrEqual(3)
  })

  it("does not overwrite plant settings and can be loaded twice", () => {
    const db = openDatabase(":memory:")
    db.prepare("UPDATE settings SET value = 'Real Plant Ltd' WHERE key = 'company_name'").run()
    seedDemoData(db)
    seedDemoData(db)
    expect(getSettings(db).company_name).toBe("Real Plant Ltd")
    expect(listBoms(db)).toHaveLength(4)
  })
})
