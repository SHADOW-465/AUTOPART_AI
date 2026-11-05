import { SettingsForm } from "@/components/seion/settings-form"
import { Card, PageHeader } from "@/components/seion/ui"
import { LoadDemoButton } from "@/components/seion/load-demo-button"
import { getDb, getStorageInfo } from "@/lib/db/app"
import { getSettings } from "@/lib/repo/settings"

export const dynamic = "force-dynamic"

export default function SettingsPage() {
  const settings = getSettings(getDb())
  const storage = getStorageInfo()
  const aiEnabled = Boolean(process.env.GROQ_API_KEY)

  return (
    <>
      <PageHeader title="Settings" description="Plant details used on RFQs and proposal packs, and defaults for new BOMs." />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card title="Plant details">
          <SettingsForm settings={settings} />
        </Card>
        <div className="space-y-6">
          <Card title="Data storage">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs font-semibold text-brand-text-secondary">Database file</dt>
                <dd className="break-all font-mono text-xs">{storage.path}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-brand-text-secondary">Persistence</dt>
                <dd className="text-xs">
                  {storage.ephemeral ? (
                    <span className="text-amber-800">
                      Temporary. This host has a read-only filesystem (e.g. Vercel), so data lives in /tmp and resets when the server instance
                      restarts. For real use, run on a server or container with a persistent disk, or set DATABASE_PATH to one.
                    </span>
                  ) : (
                    <span className="text-brand-text-secondary">Persistent. Back up by copying this file while the app is stopped.</span>
                  )}
                </dd>
              </div>
            </dl>
          </Card>
          <Card title="Demo data">
            <p className="text-xs text-brand-text-secondary">
              Adds two demo BOMs with accepted, submitted and approved swaps, RFQs in each state and three months of savings history, for testing
              and walkthroughs. {storage.demoData ? "Loaded automatically on this instance. " : ""}Your own BOMs are not touched; delete the demo BOMs
              any time.
            </p>
            <div className="mt-3">
              <LoadDemoButton />
            </div>
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
