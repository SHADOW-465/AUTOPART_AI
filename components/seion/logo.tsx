import { Zap } from "lucide-react"
import { cn } from "@/lib/utils"

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="rounded-lg border border-gray-400 bg-gradient-to-br from-gray-200 to-gray-400 p-1.5 shadow-sm">
        <Zap className="h-5 w-5 fill-brand-blue text-brand-blue" />
      </div>
      <div className="flex flex-col leading-none">
        <span className={cn("text-lg font-bold tracking-tight", inverted ? "text-white" : "text-brand-dark")}>
          SEION
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-blue">AutoPart AI</span>
      </div>
    </div>
  )
}
