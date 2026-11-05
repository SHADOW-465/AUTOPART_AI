import { Zap } from "lucide-react"
import { cn } from "@/lib/utils"

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="rounded-lg bg-brand-blue p-1.5">
        <Zap className="h-5 w-5 fill-white text-white" />
      </div>
      <div className="flex flex-col leading-none">
        <span className={cn("text-lg font-bold tracking-tight", inverted ? "text-white" : "text-brand-dark")}>
          SEION
        </span>
        <span className={cn("text-[10px] font-bold uppercase tracking-widest", inverted ? "text-blue-300" : "text-brand-blue")}>
          AutoPart AI
        </span>
      </div>
    </div>
  )
}
