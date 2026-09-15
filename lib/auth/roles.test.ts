import { describe, expect, it } from "vitest"
import { canAccept, canDraftRfq, canInvite, canUpload, canValidate, type Role } from "./roles"

const roles: Role[] = ["plant_admin", "procurement_engineer", "quality_manager"]

describe("role matrix", () => {
  it("invite", () => {
    expect(roles.map(canInvite)).toEqual([true, false, false])
  })
  it("upload", () => {
    expect(roles.map(canUpload)).toEqual([true, true, false])
  })
  it("accept", () => {
    expect(roles.map(canAccept)).toEqual([true, true, false])
  })
  it("validate", () => {
    expect(roles.map(canValidate)).toEqual([true, true, true])
  })
  it("rfq", () => {
    expect(roles.map(canDraftRfq)).toEqual([true, true, false])
  })
})
