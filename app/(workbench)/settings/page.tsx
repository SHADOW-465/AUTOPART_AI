import { SettingsForm } from "@/components/seion/settings-form"
import { Card, PageHeader } from "@/components/seion/ui"
import { defaultDatabasePath, getDb } from "@/lib/db/client"
import { getSettings } from "@/lib/repo/settings"

export const dynamic = "force-dynamic"

export default function SettingsPage() {
  const settings = getSettings(getDb())
  const aiEnabled = Boolean(process.env.GROQ_API_KEY)

  return (
    <>
      <PageHeader title="Settings" description="Plant details used on RFQs and proposal packs, and defaults for new BOMs." />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card title="Plant details">
          <SettingsForm settings={settings} />
        </Card>
        <div className="space-y-6">
          <Card title="Data">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs font-semibold text-brand-text-secondary">Database file</dt>
                <dd className="break-all font-mono text-xs">{defaultDatabasePath()}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-brand-text-secondary">Backup</dt>
                <dd className="text-xs text-brand-text-secondary">Copy this file while the app is stopped, or set DATABASE_PATH to a backed-up volume.</dd>
              </div>
            </dl>
          </Card>
          <Card title="AI extraction fallback">
            <p className="text-sm">
              Status: <strong className={aiEnabled ? "text-brand-green" : "text-brand-text-secondary"}>{aiEnabled ? "Enabled" : "Off"}</strong>
            </p>
            <p className="mt-2 text-xs text-brand-text-secondary">
              Only used when a BOM&apos;s header row can&apos;t be recognised. Standards matching, validation, savings and RFQs never use AI. Set
              GROQ_API_KEY in the server environment to enable; the BOM rows are then sent to Groq for extraction.
            </p>
          </Card>
        </div>
      </div>
    </>
  )
}
