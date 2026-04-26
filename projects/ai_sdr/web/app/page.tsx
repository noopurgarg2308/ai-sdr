"use client";

import Link from "next/link";
import { useState } from "react";
import EmbeddableChatWidget from "@/components/EmbeddableChatWidget";

// Demo widget always uses this company - create it in Admin and ensure it has an API key
const DEMO_COMPANY_SLUG = "premcompany";

export default function MarketingPage() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }
      setStatus("success");
      setFormData({ name: "", email: "", message: "" });
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/90 via-amber-50/25 to-slate-100">
      {/* Nav */}
      <nav className="border-b border-violet-200/40 bg-white/85 backdrop-blur-md sticky top-0 z-50 shadow-sm shadow-violet-950/5">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-xl font-semibold text-violet-950 tracking-tight">AI SDR</span>
          <div className="flex gap-6">
            <Link href="/admin/interest" className="text-sm text-violet-800/80 hover:text-violet-950 font-medium">
              Interest
            </Link>
            <Link href="/admin/companies" className="text-sm text-violet-800/80 hover:text-violet-950 font-medium">
              Admin →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-20 pb-20">
        <p className="text-sm font-medium text-violet-700/90 mb-3 tracking-wide uppercase">Voice + knowledge, on your site</p>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-6">
          Add an AI Agent to your website in seconds
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mb-6">
          No setup. No configuration. No technical expertise. Your AI sales rep that answers questions, qualifies leads, and books meetings—live on your site in a few clicks.
        </p>
        <p className="text-slate-500 max-w-2xl mb-10">
          Try it before you make it visible. No lock-in. Cancel anytime.
        </p>
        <button
          type="button"
          onClick={() => setIsWidgetOpen(true)}
          className="inline-block bg-violet-600 text-white px-6 py-3 rounded-xl font-semibold shadow-md shadow-violet-600/25 hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-600/20 transition-all"
        >
          Ask me anything
        </button>
      </section>

      {/* What it does */}
      <section className="bg-gradient-to-b from-sky-50/90 to-cyan-50/40 border-y border-sky-200/30 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">What it does</h2>
          <p className="text-slate-600 text-sm mb-8 max-w-2xl">One widget for answers, pipeline, and scheduling.</p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="rounded-2xl bg-white/80 p-5 shadow-sm border border-sky-100/80">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-lg mb-4">💬</div>
              <h3 className="font-semibold text-slate-900 mb-2">Answers questions</h3>
              <p className="text-slate-600 text-sm">Crawls your website and PDFs. The AI searches your content and answers visitor questions accurately—no hallucination.</p>
            </div>
            <div className="rounded-2xl bg-white/80 p-5 shadow-sm border border-sky-100/80">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg mb-4">🎯</div>
              <h3 className="font-semibold text-slate-900 mb-2">Qualifies leads</h3>
              <p className="text-slate-600 text-sm">Asks about role and intent. Identifies buying signals. When ready, it offers a demo or meeting with your team.</p>
            </div>
            <div className="rounded-2xl bg-white/80 p-5 shadow-sm border border-sky-100/80">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-lg mb-4">📅</div>
              <h3 className="font-semibold text-slate-900 mb-2">Books meetings</h3>
              <p className="text-slate-600 text-sm">Generates Calendly-style booking links. Logs conversations and leads. Integrates with your CRM.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why us / How it works */}
      <section className="py-16 bg-amber-50/50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Why choose us</h2>
          <p className="text-slate-600 text-sm mb-8 max-w-2xl">Built for GTM teams who want live AI without a project plan.</p>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="flex items-start gap-3 rounded-xl bg-white/70 border border-amber-200/40 p-4 shadow-sm">
              <span className="text-2xl shrink-0">⚡</span>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Instant setup</h3>
                <p className="text-slate-600 text-sm">Live on your website in seconds. No configuration, no technical expertise needed.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-white/70 border border-amber-200/40 p-4 shadow-sm">
              <span className="text-2xl shrink-0">🔓</span>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">No lock-in</h3>
                <p className="text-slate-600 text-sm">Flexible pricing. Try before you pay. Cancel anytime.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-white/70 border border-amber-200/40 p-4 shadow-sm">
              <span className="text-2xl shrink-0">👁️</span>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Try before you go live</h3>
                <p className="text-slate-600 text-sm">Test your agent privately. Make it visible to the public only when you&apos;re ready.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-white/70 border border-amber-200/40 p-4 shadow-sm">
              <span className="text-2xl shrink-0">🎤</span>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Voice and text</h3>
                <p className="text-slate-600 text-sm">Natural voice chat powered by OpenAI Realtime. Or type—your visitors choose.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gradient-to-br from-violet-100/50 to-fuchsia-50/40 border-y border-violet-200/25 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Features</h2>
          <p className="text-slate-600 text-sm mb-8">Everything you need for on-site conversation.</p>
          <ul className="grid md:grid-cols-2 gap-3 text-slate-800">
            <li className="flex items-start gap-3 rounded-lg bg-white/60 border border-violet-100/60 px-4 py-3">
              <span className="text-violet-600 font-semibold mt-0.5">✓</span>
              Answers questions from your docs and website
            </li>
            <li className="flex items-start gap-3 rounded-lg bg-white/60 border border-violet-100/60 px-4 py-3">
              <span className="text-violet-600 font-semibold mt-0.5">✓</span>
              Qualifies leads and identifies buying signals
            </li>
            <li className="flex items-start gap-3 rounded-lg bg-white/60 border border-violet-100/60 px-4 py-3">
              <span className="text-violet-600 font-semibold mt-0.5">✓</span>
              Books meetings when visitors are ready
            </li>
            <li className="flex items-start gap-3 rounded-lg bg-white/60 border border-violet-100/60 px-4 py-3">
              <span className="text-violet-600 font-semibold mt-0.5">✓</span>
              Embeddable widget—drop it on any site
            </li>
          </ul>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-gradient-to-br from-indigo-200/50 via-sky-100/60 to-cyan-100/40 border-t border-indigo-200/30 py-16">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Interested in signing up?</h2>
          <p className="text-slate-600 mb-8">Drop your details and we&apos;ll get back to you.</p>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white/85 border border-sky-200/50 shadow-lg shadow-slate-900/5 p-6 md:p-8">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-300"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-300"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">Message (optional)</label>
              <textarea
                id="message"
                rows={3}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-300 resize-none"
                placeholder="Tell us a bit about your use case..."
              />
            </div>
            {status === "success" && (
              <p className="text-emerald-600 text-sm font-medium">Thanks! We&apos;ll be in touch soon.</p>
            )}
            {status === "error" && (
              <p className="text-red-600 text-sm">Something went wrong. Please try again.</p>
            )}
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full bg-slate-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-slate-900/15"
            >
              {status === "sending" ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </section>

      {/* Floating chat widget - uses premcompany (create in Admin, add API key, crawl content) */}
      <EmbeddableChatWidget companyId={DEMO_COMPANY_SLUG} initialOpen={isWidgetOpen} onOpenChange={setIsWidgetOpen} />

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-8">
        <div className="max-w-5xl mx-auto px-4 flex justify-between items-center text-sm text-slate-400">
          <span className="text-slate-300">AI SDR Platform</span>
          <Link href="/admin/companies" className="text-amber-200/80 hover:text-amber-100 transition-colors">
            Admin
          </Link>
        </div>
      </footer>
    </div>
  );
}
