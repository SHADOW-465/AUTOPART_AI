"use client"

import { LucideIcon } from "@/components/lucide-icon"

interface AIModalProps {
  isOpen: boolean
  onClose: () => void
  content: string
  loading: boolean
  type: "email" | "validation"
}

export function AIModal({ isOpen, onClose, content, loading, type }: AIModalProps) {
  if (!isOpen) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/60 backdrop-blur-sm animate-fade-in-up">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div
          className={`p-5 ${type === "email" ? "bg-gradient-to-r from-blue-600 to-indigo-600" : "bg-gradient-to-r from-emerald-600 to-teal-600"} text-white flex justify-between items-center`}
        >
          <div className="flex items-center gap-2">
            <LucideIcon name={type === "email" ? "mail" : "sparkles"} size={20} />
            <h3 className="font-bold">{type === "email" ? "AI Negotiation Copilot" : "AI Technical Validation"}</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 rounded p-1 transition">
            <LucideIcon name="x" size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
          {loading ? (
            <div className="flex flex-col items-center py-8 opacity-70">
              <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-medium text-brand-text-secondary animate-pulse">Consulting Gemini AI...</p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-brand-text-primary whitespace-pre-line leading-relaxed">
              {content}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-brand-border bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded transition"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            disabled={loading}
            className="px-4 py-2 text-sm font-bold text-white bg-brand-blue hover:bg-brand-blueHover rounded shadow-md transition disabled:opacity-50"
          >
            Copy to Clipboard
          </button>
        </div>
      </div>
    </div>
  )
}
