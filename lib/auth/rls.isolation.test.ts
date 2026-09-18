import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, describe, expect, it } from "vitest"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

describe.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)(
  "RLS tenant isolation",
  () => {
    const suffix = crypto.randomUUID().slice(0, 8)
    const emailA = `rls-a-${suffix}@example.com`
    const emailB = `rls-b-${suffix}@example.com`
    const password = `TestPass-${suffix}!9`

    let admin: SupabaseClient
    let tenantAId: string | undefined
    let tenantBId: string | undefined
    let userAId: string | undefined
    let userBId: string | undefined
    let bomId: string | undefined

    afterAll(async () => {
      if (!admin) return
      if (bomId) await admin.from("boms").delete().eq("id", bomId)
      if (userAId) {
        await admin.from("profiles").delete().eq("id", userAId)
        await admin.auth.admin.deleteUser(userAId)
      }
      if (userBId) {
        await admin.from("profiles").delete().eq("id", userBId)
        await admin.auth.admin.deleteUser(userBId)
      }
      if (tenantAId) await admin.from("tenants").delete().eq("id", tenantAId)
      if (tenantBId) await admin.from("tenants").delete().eq("id", tenantBId)
    })

    it("hides tenant A BOMs from authenticated tenant B", async () => {
      expect(url).toBeTruthy()
      expect(serviceRoleKey).toBeTruthy()
      expect(anonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY required to run RLS isolation").toBeTruthy()

      admin = createClient(url!, serviceRoleKey!, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { data: tenantA, error: tenantAError } = await admin
        .from("tenants")
        .insert({
          name: `RLS Tenant A ${suffix}`,
          tier_level: "TIER_2",
        })
        .select("id")
        .single()
      expect(tenantAError).toBeNull()
      tenantAId = tenantA!.id

      const { data: tenantB, error: tenantBError } = await admin
        .from("tenants")
        .insert({
          name: `RLS Tenant B ${suffix}`,
          tier_level: "TIER_2",
        })
        .select("id")
        .single()
      expect(tenantBError).toBeNull()
      tenantBId = tenantB!.id

      const { data: createdA, error: createAError } = await admin.auth.admin.createUser({
        email: emailA,
        password,
        email_confirm: true,
      })
      expect(createAError).toBeNull()
      userAId = createdA.user!.id

      const { data: createdB, error: createBError } = await admin.auth.admin.createUser({
        email: emailB,
        password,
        email_confirm: true,
      })
      expect(createBError).toBeNull()
      userBId = createdB.user!.id

      const { error: profileAError } = await admin.from("profiles").insert({
        id: userAId,
        tenant_id: tenantAId,
        full_name: "RLS User A",
        role: "plant_admin",
      })
      expect(profileAError).toBeNull()

      const { error: profileBError } = await admin.from("profiles").insert({
        id: userBId,
        tenant_id: tenantBId,
        full_name: "RLS User B",
        role: "plant_admin",
      })
      expect(profileBError).toBeNull()

      const { data: bom, error: bomError } = await admin
        .from("boms")
        .insert({
          tenant_id: tenantAId,
          bom_code: `RLS-${suffix}`,
          title: "RLS isolation BOM",
          created_by: userAId,
        })
        .select("id")
        .single()
      expect(bomError).toBeNull()
      bomId = bom!.id

      const asB = createClient(url!, anonKey!, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { error: signInError } = await asB.auth.signInWithPassword({
        email: emailB,
        password,
      })
      expect(signInError).toBeNull()

      const { data: rows, error: selectError } = await asB.from("boms").select("id")
      expect(selectError).toBeNull()
      expect(rows).toEqual([])

      await asB.auth.signOut()
    })
  },
)
