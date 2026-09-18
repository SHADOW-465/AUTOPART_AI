import { Zap } from "lucide-react"

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="bg-gradient-to-br from-gray-200 to-gray-400 p-1.5 rounded-lg border border-gray-400 shadow-sm">
        <Zap size={20} className="text-brand-blue fill-brand-blue" />
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-bold text-lg text-brand-dark tracking-tight">SEION</span>
        <span className="text-[10px] font-bold text-brand-blue tracking-widest uppercase">AutoPart AI</span>
      </div>
    </div>
  )
}
