import { UploadDropzone } from "@/components/seion/upload-dropzone"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Monthly savings" value="₹0" />
        <KpiCard label="BOMs processed" value="0" />
        <KpiCard label="Acceptance rate" value="0%" />
        <KpiCard label="Hours saved" value="0 hrs" />
      </div>
      <UploadDropzone />
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-brand-border bg-white p-6 shadow-bevel">
      <p className="text-sm text-brand-text-secondary">{label}</p>
      <p className="mt-2 text-2xl font-bold text-brand-text-primary">{value}</p>
    </div>
  )
}
