"use client"
import { LucideIcon } from "@/components/lucide-icon"

interface LandingPageProps {
  onStart: () => void
}

export function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col relative overflow-hidden font-sans">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-6 container mx-auto z-10 max-w-7xl">
        <div className="flex items-center gap-2 text-white">
          <div className="bg-gradient-to-br from-gray-200 to-gray-400 p-1.5 rounded-lg">
            <LucideIcon name="zap" size={20} className="text-brand-blue" />
          </div>
          <span className="font-bold text-xl">SEION</span>
        </div>
        <div className="hidden md:flex gap-8 text-gray-300 text-sm font-medium">
          <a href="#features" className="hover:text-white transition">
            Features
          </a>
          <a href="#compliance" className="hover:text-white transition">
            Compliance
          </a>
          <a href="#pricing" className="hover:text-white transition">
            Pricing
          </a>
        </div>
        <button
          onClick={onStart}
          className="px-5 py-2 rounded-lg bg-brand-blue hover:bg-brand-blueHover text-white font-semibold transition text-sm shadow-lg shadow-blue-900/50"
        >
          Login
        </button>
      </nav>

      {/* Hero */}
      <main className="flex-1 container mx-auto flex flex-col justify-center items-center text-center px-4 relative z-10 mt-10 max-w-5xl">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight animate-fade-in-up tracking-tight">
          Upload Your BOM.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">
            Save ₹1-5L/Month.
          </span>
        </h1>

        <p className="text-gray-300 text-lg md:text-xl max-w-2xl mb-12 animate-fade-in-up animation-delay-100">
          The ultimate AI suggestion engine for Tier-2 suppliers. We find cheaper, compliant Indian Standard
          alternatives in 60 seconds.
        </p>

        {/* 3-Step Visual Flow */}
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-12 mb-12 animate-fade-in-up animation-delay-200">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-blue-300 border border-white/20">
              <LucideIcon name="upload" size={24} />
            </div>
            <span className="text-sm font-medium text-white">1. Upload PDF</span>
          </div>
          <div className="hidden md:block text-white/40">
            <LucideIcon name="chevronRight" />
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-blue-300 border border-white/20">
              <LucideIcon name="zap" size={24} />
            </div>
            <span className="text-sm font-medium text-white">2. AI Analyze</span>
          </div>
          <div className="hidden md:block text-white/40">
            <LucideIcon name="chevronRight" />
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-blue-300 border border-white/20">
              <span className="font-bold text-xl">₹</span>
            </div>
            <span className="text-sm font-medium text-white">3. Save Costs</span>
          </div>
        </div>

        <button
          onClick={onStart}
          className="px-8 py-4 rounded-lg bg-brand-red hover:bg-red-700 text-white font-semibold text-lg shadow-xl shadow-red-900/50 hover:scale-105 transition-transform flex items-center gap-2 animate-fade-in-up animation-delay-300"
        >
          Start Free Trial <LucideIcon name="zap" size={20} />
        </button>

        <p className="mt-8 text-sm text-gray-400 animate-fade-in-up animation-delay-400">
          Trusted by 127+ Tier-2 Suppliers | ₹47L Saved | 98.7% Accuracy
        </p>
      </main>

      {/* Benefits Section */}
      <div id="features" className="bg-brand-surface py-20 px-4 mt-20 relative z-20 w-full">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: "checkCircle",
              title: "98.7% Compliance Rate",
              desc: "ARAI certified, every alternative verified against Indian/global standards.",
              color: "text-brand-green",
            },
            {
              icon: "zap",
              title: "Save 20+ Hours/Month",
              desc: "Automated BOM analysis replaces manual procurement searches.",
              color: "text-brand-blue",
            },
            {
              icon: "trendingUp",
              title: "₹1-5L Savings/Month",
              desc: "Average client cost reduction through optimized part alternatives.",
              color: "text-brand-red",
            },
          ].map((card, i) => (
            <div
              key={i}
              className="bg-white p-8 rounded-xl shadow-bevel border border-brand-border hover:shadow-bevel-hover transition-all duration-300"
            >
              <div className={`mb-4 ${card.color}`}>
                <LucideIcon name={card.icon} size={48} />
              </div>
              <h3 className="text-xl font-bold text-brand-text-primary mb-2">{card.title}</h3>
              <p className="text-brand-text-secondary leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/20 to-brand-dark z-0"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')] opacity-5 pointer-events-none z-0"></div>
    </div>
  )
}
