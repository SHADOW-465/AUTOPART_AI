/**
 * pdf.js expects browser geometry globals. On a full Node install it borrows them from the native
 * `@napi-rs/canvas` package, but serverless bundles (e.g. Vercel) don't ship that binary, and
 * pdf.js then crashes at load time on `new DOMMatrix()`. Text extraction only needs DOMMatrix to
 * exist and do 2D affine maths, so we provide a small pure-JS one. ImageData and Path2D are only
 * used for rendering pages to images, which we never do; inert stubs keep pdf.js quiet.
 */

type MatrixInit = ArrayLike<number> | { a?: number; b?: number; c?: number; d?: number; e?: number; f?: number } | string | undefined

export class AffineDOMMatrix {
  a = 1
  b = 0
  c = 0
  d = 1
  e = 0
  f = 0

  constructor(init?: MatrixInit) {
    if (init == null || typeof init === "string") return
    if (typeof (init as ArrayLike<number>).length === "number") {
      const m = init as ArrayLike<number>
      if (m.length === 6) [this.a, this.b, this.c, this.d, this.e, this.f] = Array.from(m)
      else if (m.length === 16) [this.a, this.b, this.c, this.d, this.e, this.f] = [m[0], m[1], m[4], m[5], m[12], m[13]]
      else throw new TypeError("DOMMatrix init must have 6 or 16 entries")
      return
    }
    const o = init as { a?: number; b?: number; c?: number; d?: number; e?: number; f?: number }
    this.a = o.a ?? 1
    this.b = o.b ?? 0
    this.c = o.c ?? 0
    this.d = o.d ?? 1
    this.e = o.e ?? 0
    this.f = o.f ?? 0
  }

  get m11() { return this.a }
  get m12() { return this.b }
  get m21() { return this.c }
  get m22() { return this.d }
  get m41() { return this.e }
  get m42() { return this.f }
  get is2D() { return true }
  get isIdentity() {
    return this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.e === 0 && this.f === 0
  }

  /** this × other (other applied first), matching DOMMatrix.multiply. */
  multiply(other: MatrixInit): AffineDOMMatrix {
    return new AffineDOMMatrix(this).multiplySelf(other)
  }

  multiplySelf(other: MatrixInit): this {
    const o = other instanceof AffineDOMMatrix ? other : new AffineDOMMatrix(other)
    const { a, b, c, d, e, f } = this
    this.a = a * o.a + c * o.b
    this.b = b * o.a + d * o.b
    this.c = a * o.c + c * o.d
    this.d = b * o.c + d * o.d
    this.e = a * o.e + c * o.f + e
    this.f = b * o.e + d * o.f + f
    return this
  }

  preMultiplySelf(other: MatrixInit): this {
    const result = new AffineDOMMatrix(other).multiplySelf(this)
    Object.assign(this, { a: result.a, b: result.b, c: result.c, d: result.d, e: result.e, f: result.f })
    return this
  }

  translate(tx = 0, ty = 0): AffineDOMMatrix {
    return this.multiply([1, 0, 0, 1, tx, ty])
  }

  translateSelf(tx = 0, ty = 0): this {
    return this.multiplySelf([1, 0, 0, 1, tx, ty])
  }

  scale(sx = 1, sy = sx): AffineDOMMatrix {
    return this.multiply([sx, 0, 0, sy, 0, 0])
  }

  scaleSelf(sx = 1, sy = sx): this {
    return this.multiplySelf([sx, 0, 0, sy, 0, 0])
  }

  invertSelf(): this {
    const det = this.a * this.d - this.b * this.c
    if (!det) {
      Object.assign(this, { a: NaN, b: NaN, c: NaN, d: NaN, e: NaN, f: NaN })
      return this
    }
    const { a, b, c, d, e, f } = this
    this.a = d / det
    this.b = -b / det
    this.c = -c / det
    this.d = a / det
    this.e = (c * f - d * e) / det
    this.f = (b * e - a * f) / det
    return this
  }

  inverse(): AffineDOMMatrix {
    return new AffineDOMMatrix(this).invertSelf()
  }

  transformPoint(point: { x?: number; y?: number } = {}): { x: number; y: number; z: number; w: number } {
    const x = point.x ?? 0
    const y = point.y ?? 0
    return { x: this.a * x + this.c * y + this.e, y: this.b * x + this.d * y + this.f, z: 0, w: 1 }
  }

  toFloat32Array(): Float32Array {
    return new Float32Array([this.a, this.b, 0, 0, this.c, this.d, 0, 0, 0, 0, 1, 0, this.e, this.f, 0, 1])
  }

  toFloat64Array(): Float64Array {
    return new Float64Array([this.a, this.b, 0, 0, this.c, this.d, 0, 0, 0, 0, 1, 0, this.e, this.f, 0, 1])
  }
}

class InertImageData {
  readonly data: Uint8ClampedArray
  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8ClampedArray(Math.max(0, width * height * 4))
  }
}

class InertPath2D {
  addPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  bezierCurveTo() {}
  quadraticCurveTo() {}
  rect() {}
}

/** Installs the globals pdf.js needs for text extraction, only where the runtime lacks them. */
export function installPdfGlobals(): void {
  const g = globalThis as Record<string, unknown>
  if (!g.DOMMatrix) g.DOMMatrix = AffineDOMMatrix
  if (!g.ImageData) g.ImageData = InertImageData
  if (!g.Path2D) g.Path2D = InertPath2D
}
