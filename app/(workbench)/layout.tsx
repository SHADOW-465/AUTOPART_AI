import { AppShell } from "@/components/seion/app-shell"
import { getDb } from "@/lib/db/client"
import { countOpenRfqs } from "@/lib/repo/rfqs"
import { getSettings } from "@/lib/repo/settings"

export const dynamic = "force-dynamic"

export default function WorkbenchLayout({ children }: { children: React.ReactNode }) {
  const db = getDb()
  const settings = getSettings(db)
  return (
    <AppShell companyName={settings.company_name} plantLocation={settings.plant_location} openRfqs={countOpenRfqs(db)}>
      {children}
    </AppShell>
  )
}
