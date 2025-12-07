"use client"

import { useState } from "react"
import { LucideIcon } from "@/components/lucide-icon"
import { AIModal } from "@/components/ai-modal"
import { callGemini } from "@/lib/gemini"

const MOCK_BOM_PARTS = [
  {
    id: 1,
    name: "Hex Socket Bolt",
    originalSpec: "DIN 912 M6x20 8.8",
    qty: 2500,
    originalCost: 12.5,
    status: "Found",
    category: "Fasteners",
    supplier: "GlobalCorp",
  },
  {
    id: 2,
    name: "Flat Washer",
    originalSpec: "DIN 125 A M6",
    qty: 5000,
    originalCost: 3.2,
    status: "Found",
    category: "Fasteners",
    supplier: "GlobalCorp",
  },
  {
    id: 3,
    name: "Control Arm Bracket",
    originalSpec: "Custom Steel 400MPa",
    qty: 150,
    originalCost: 450.0,
    status: "Review",
    category: "Chassis",
    supplier: "TechSteel",
  },
  {
    id: 4,
    name: "O-Ring Seal",
    originalSpec: "ISO 3601-1 Buna-N",
    qty: 1200,
    originalCost: 8.5,
    status: "Found",
    category: "Rubber",
    supplier: "SealMaster",
  },
  {
    id: 5,
    name: "Hex Nut",
    originalSpec: "DIN 934 M8",
    qty: 3000,
    originalCost: 4.1,
    status: "Found",
    category: "Fasteners",
    supplier: "GlobalCorp",
  },
]

const ALTERNATIVES: Record<
  number,
  Array<{
    rank: number
    spec: string
    vendor: string
    cost: number
    leadTime: string
    stock: number
    rating: number
    type: string
    savings: number
    compliant: boolean
  }>
> = {
  1: [
    {
      rank: 1,
      spec: "IS 1367 M6x20 8.8",
      vendor: "ChennaiFasteners",
      cost: 8.2,
      leadTime: "3 days",
      stock: 5000,
      rating: 5,
      type: "Local Standard",
      savings: 34,
      compliant: true,
    },
    {
      rank: 2,
      spec: "ISO 4762 M6x20 8.8",
      vendor: "MumbaiSteel",
      cost: 9.1,
      leadTime: "5 days",
      stock: 2000,
      rating: 4,
      type: "Equivalent",
      savings: 27,
      compliant: true,
    },
    {
      rank: 3,
      spec: "Custom Cold Forge",
      vendor: "PuneFab",
      cost: 7.5,
      leadTime: "14 days",
      stock: 0,
      rating: 3,
      type: "Manufacture",
      savings: 40,
      compliant: false,
    },
  ],
  2: [
    {
      rank: 1,
      spec: "IS 2016 M6 Punch",
      vendor: "TamilNadu Stamping",
      cost: 1.5,
      leadTime: "2 days",
      stock: 10000,
      rating: 5,
      type: "Local Standard",
      savings: 53,
      compliant: true,
    },
  ],
  3: [
    {
      rank: 1,
      spec: "Laser Cut SS304",
      vendor: "LocalFab Eng",
      cost: 380.0,
      leadTime: "7 days",
      stock: 50,
      rating: 4,
      type: "Mfg Change",
      savings: 15,
      compliant: false,
    },
  ],
  4: [
    {
      rank: 1,
      spec: "IS 5593 O-Ring NBR",
      vendor: "ChennaiRubber",
      cost: 5.8,
      leadTime: "4 days",
      stock: 3000,
      rating: 5,
      type: "Local Standard",
      savings: 32,
      compliant: true,
    },
  ],
  5: [
    {
      rank: 1,
      spec: "IS 1364 M8 Nut",
      vendor: "IndiaFasteners",
      cost: 2.5,
      leadTime: "2 days",
      stock: 8000,
      rating: 5,
      type: "Local Standard",
      savings: 39,
      compliant: true,
    },
  ],
}

export function ResultsView() {
  const [selectedPart, setSelectedPart] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState(0)

  // AI Integration State
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiContent, setAiContent] = useState("")
  const [aiType, setAiType] = useState<"email" | "validation">("email")

  const handleAiTechValidation = async (partName: string, originalSpec: string, altSpec: string) => {
    setAiType("validation")
    setAiModalOpen(true)
    setAiLoading(true)
    const prompt = `Act as an expert automotive metallurgist and standards engineer. Compare these two specifications:

1. Original Part: ${originalSpec} (DIN Standard)
2. Alternative Part: ${altSpec} (Indian Standard)

Provide a technical validation report covering:
- Material composition comparison
- Tensile strength and mechanical properties
- Dimensional interchangeability
- Surface finish requirements
- AIS/BIS compliance status
- Risk assessment for automotive use
- Recommendation (Safe to switch / Requires testing / Not recommended)

Format as clear bullet points. Be specific with technical values.`

    const result = await callGemini(prompt)
    setAiContent(result)
    setAiLoading(false)
  }

  const handleAiDraftEmail = async (partName: string, altSpec: string, vendor: string, cost: number) => {
    setAiType("email")
    setAiModalOpen(true)
    setAiLoading(true)
    const prompt = `Draft a professional procurement email to "${vendor}" for requesting a quote.

Details:
- Part Specification: ${altSpec}
- Quantity Required: 2,500 units
- Target Unit Price: ₹${cost}/unit
- Delivery Location: Chennai, Tamil Nadu
- Required Lead Time: Within 14 days

The email should:
1. Be professional and concise
2. Request pricing, availability, and delivery timeline
3. Ask about bulk discount possibilities
4. Request compliance certificates (AIS/BIS)
5. Mention this is for Tier-2 automotive manufacturing

Sign the email as:
Rajesh Kumar
Operations Manager
[Company Name]
Contact: +91 98XXX XXXXX`

    const result = await callGemini(prompt)
    setAiContent(result)
    setAiLoading(false)
  }

  const selectedPartData = selectedPart ? MOCK_BOM_PARTS.find((p) => p.id === selectedPart) : null

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up relative pb-20">
      <AIModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        content={aiContent}
        loading={aiLoading}
        type={aiType}
      />

      {/* Summary Header */}
      <div className="bg-white p-6 rounded-xl border border-brand-border shadow-bevel flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-brand-text-primary">BOM Analysis: #BOM-2023-094</h1>
            <span className="bg-green-100 text-brand-green text-[10px] font-bold px-2 py-0.5 rounded border border-green-200 uppercase">
              Extracted
            </span>
          </div>
          <p className="text-brand-text-secondary text-sm">
            Found <strong className="text-brand-text-primary">5</strong> parts with{" "}
            <strong className="text-brand-green">5 high-value alternatives</strong>
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-brand-border text-brand-text-primary font-medium text-sm rounded hover:bg-gray-50 transition shadow-sm">
            Export PDF
          </button>
          <button className="px-4 py-2 bg-brand-green hover:bg-green-700 text-white font-medium text-sm rounded shadow-lg shadow-green-900/20 transition flex items-center gap-2">
            <LucideIcon name="checkCircle" size={16} /> Approve All Savings
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-brand-border flex gap-8">
        {["Extracted Parts", "Suggested Alternatives", "Updated BOM", "Export"].map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`pb-3 text-sm font-medium border-b-2 transition ${activeTab === i ? "border-brand-blue text-brand-blue" : "border-transparent text-brand-text-secondary hover:text-brand-text-primary"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Comparison Card (Left 4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {selectedPartData ? (
            <div className="bg-gradient-to-br from-[#8B2C2C] to-[#5C1818] rounded-xl shadow-lg p-6 text-white h-[320px] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <LucideIcon name="alertTriangle" size={100} />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-bold text-red-200 uppercase tracking-wider mb-2">Original Part</p>
                <h3 className="text-xl font-bold mb-4 font-mono leading-tight">{selectedPartData.originalSpec}</h3>

                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                  <div>
                    <p className="text-red-200 text-xs">Material</p>
                    <p className="font-medium">Steel 8.8</p>
                  </div>
                  <div>
                    <p className="text-red-200 text-xs">Supplier</p>
                    <p className="font-medium">{selectedPartData.supplier}</p>
                  </div>
                  <div>
                    <p className="text-red-200 text-xs">Unit Cost</p>
                    <p className="font-medium">₹{selectedPartData.originalCost.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-red-200 text-xs">Total Cost</p>
                    <p className="font-bold text-xl">
                      ₹{(selectedPartData.qty * selectedPartData.originalCost).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-6 inline-flex items-center gap-2 bg-amber-100/10 border border-amber-200/30 rounded px-3 py-1.5 text-amber-200 text-xs font-medium">
                  <LucideIcon name="alertTriangle" size={12} /> Non-Indian Standard
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[320px] bg-gray-100 rounded-xl border border-brand-border flex items-center justify-center text-gray-400 text-sm">
              Select a part to view comparison
            </div>
          )}
        </div>

        {/* Alternatives List (Right 8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {!selectedPart ? (
            // Table View if no selection
            <div className="bg-white rounded-xl border border-brand-border shadow-bevel overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-brand-blue/20 text-brand-text-secondary uppercase text-[11px] font-bold">
                  <tr>
                    <th className="px-6 py-3">Part Name</th>
                    <th className="px-6 py-3">Spec</th>
                    <th className="px-6 py-3 text-right">Cost</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_BOM_PARTS.map((part) => (
                    <tr
                      key={part.id}
                      className="border-b border-brand-border hover:bg-blue-50/50 cursor-pointer transition"
                      onClick={() => setSelectedPart(part.id)}
                    >
                      <td className="px-6 py-3 font-medium text-brand-text-primary">{part.name}</td>
                      <td className="px-6 py-3">
                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{part.originalSpec}</span>
                      </td>
                      <td className="px-6 py-3 text-right text-brand-red font-medium">₹{part.originalCost}</td>
                      <td className="px-6 py-3 text-center">
                        <span
                          className={`inline-block w-2 h-2 rounded-full mr-2 ${part.status === "Found" ? "bg-green-500" : "bg-amber-500"}`}
                        ></span>
                        {part.status === "Found" ? "Alt Found" : "Review"}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button className="text-brand-blue text-xs font-bold hover:underline">Find Alt →</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // Alternatives Cards
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-brand-text-primary">Top Alternatives</h3>
                <button onClick={() => setSelectedPart(null)} className="text-sm text-brand-blue hover:underline">
                  Back to List
                </button>
              </div>

              {ALTERNATIVES[selectedPart] &&
                ALTERNATIVES[selectedPart].map((alt, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg border border-brand-border shadow-sm hover:shadow-bevel-hover transition duration-200 relative overflow-hidden flex flex-col sm:flex-row"
                  >
                    {/* Rank Stripe */}
                    <div
                      className={`w-full sm:w-1.5 h-1 sm:h-auto ${idx === 0 ? "bg-yellow-400" : idx === 1 ? "bg-gray-400" : "bg-orange-400"}`}
                    ></div>

                    <div className="p-5 flex-1 grid grid-cols-1 sm:grid-cols-12 gap-4">
                      {/* Left Info */}
                      <div className="sm:col-span-7">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold text-brand-text-primary font-mono">{alt.spec}</span>
                          {idx === 0 && (
                            <span className="bg-blue-100 text-brand-blue text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-brand-text-secondary mb-3">
                          {alt.vendor} <span className="text-xs text-gray-400">• {alt.type}</span>
                        </p>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {alt.compliant && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-brand-green text-[10px] font-bold rounded border border-green-100">
                              <LucideIcon name="checkCircle" size={10} /> AIS Compliant
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-600 text-[10px] font-bold rounded border border-gray-200">
                            <LucideIcon name="clock" size={10} /> {alt.leadTime}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-600 text-[10px] font-bold rounded border border-gray-200">
                            Stock: {alt.stock.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (selectedPartData) {
                                handleAiTechValidation(selectedPartData.name, selectedPartData.originalSpec, alt.spec)
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded border border-emerald-100 transition"
                          >
                            <LucideIcon name="sparkles" size={12} /> AI Tech Check
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (selectedPartData) {
                                handleAiDraftEmail(selectedPartData.name, alt.spec, alt.vendor, alt.cost)
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-brand-blue text-xs font-bold rounded border border-blue-100 transition"
                          >
                            <LucideIcon name="mail" size={12} /> Draft RFQ
                          </button>
                        </div>
                      </div>

                      {/* Right Pricing */}
                      <div className="sm:col-span-5 flex flex-col items-end justify-center text-right pl-4 sm:border-l border-brand-border">
                        <p className="text-2xl font-bold text-brand-red">₹{alt.cost.toFixed(2)}</p>
                        <p className="text-xs text-brand-text-tertiary mb-2">per unit</p>

                        <div className="mb-4">
                          <span className="text-sm font-bold text-brand-green">Save {alt.savings}%</span>
                          <p className="text-[10px] text-gray-400">vs ₹{selectedPartData?.originalCost} orig.</p>
                        </div>

                        <button className="w-full py-2 bg-brand-blue hover:bg-brand-blueHover text-white text-xs font-bold rounded shadow-sm transition">
                          Select This Part
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
