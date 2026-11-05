import { describe, expect, it } from "vitest"
import { AffineDOMMatrix } from "./pdf-env"

describe("AffineDOMMatrix", () => {
  it("starts as identity and accepts 6- and 16-entry inits", () => {
    expect(new AffineDOMMatrix().isIdentity).toBe(true)
    expect(new AffineDOMMatrix([2, 0, 0, 3, 4, 5])).toMatchObject({ a: 2, d: 3, e: 4, f: 5 })
    expect(new AffineDOMMatrix([2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 1, 0, 4, 5, 0, 1])).toMatchObject({ a: 2, d: 3, e: 4, f: 5 })
  })

  it("multiplies like DOMMatrix (argument applied first)", () => {
    const m = new AffineDOMMatrix().translate(10, 0).scale(2)
    expect(m.transformPoint({ x: 1, y: 1 })).toMatchObject({ x: 12, y: 2 })
  })

  it("inverts", () => {
    const m = new AffineDOMMatrix([2, 1, 0, 3, 4, 5])
    const p = m.inverse().transformPoint(m.transformPoint({ x: 7, y: -2 }))
    expect(p.x).toBeCloseTo(7)
    expect(p.y).toBeCloseTo(-2)
    expect(new AffineDOMMatrix([0, 0, 0, 0, 0, 0]).inverse().a).toBeNaN()
  })
})
