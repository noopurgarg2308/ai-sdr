"use client";

import Link from "next/link";
import { useState } from "react";
import EmbeddableChatWidget from "@/components/EmbeddableChatWidget";

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
    <div className="min-h-screen bg-stone-50">
      {/* Nav */}
      <nav className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-xl font-semibold text-stone-900">AI SDR</span>
          <div className="flex gap-6">
            <Link href="/admin/interest" className="text-sm text-stone-600 hover:text-stone-900 font-medium">
              Interest
            </Link>
            <Link href="/admin/companies" className="text-sm text-stone-600 hover:text-stone-900 font-medium">
              Admin →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-20 pb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-stone-900 tracking-tight mb-6">
          Add an AI Agent to your website in seconds
        </h1>
        <p className="text-xl text-stone-600 max-w-2xl mb-6">
          No setup. No configuration. No technical expertise. Your AI sales rep that answers questions, qualifies leads, and books meetings—live on your site in a few clicks.
        </p>
        <p className="text-stone-600 max-w-2xl mb-10">
          Try it before you make it visible. No lock-in. Cancel anytime.
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href="#contact"
            className="inline-block bg-stone-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-stone-800 transition-colors"
          >
            Get in touch
          </a>
          <button
            onClick={() => setIsWidgetOpen(true)}
            className="inline-block border border-stone-300 text-stone-700 px-6 py-3 rounded-lg font-semibold hover:bg-stone-100 transition-colors"
          >
            Try the demo
          </button>
        </div>
      </section>

      {/* What it does */}
      <section className="bg-white border-y border-stone-200 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-stone-900 mb-10">What it does</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-lg mb-4">💬</div>
              <h3 className="font-semibold text-stone-900 mb-2">Answers questions</h3>
              <p className="text-stone-600 text-sm">Crawls your website and PDFs. The AI searches your content and answers visitor questions accurately—no hallucination.</p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg mb-4">🎯</div>
              <h3 className="font-semibold text-stone-900 mb-2">Qualifies leads</h3>
              <p className="text-stone-600 text-sm">Asks about role and intent. Identifies buying signals. When ready, it offers a demo or meeting with your team.</p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-lg mb-4">📅</div>
              <h3 className="font-semibold text-stone-900 mb-2">Books meetings</h3>
              <p className="text-stone-600 text-sm">Generates Calendly-style booking links. Logs conversations and leads. Integrates with your CRM.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why us / How it works */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-stone-900 mb-10">Why choose us</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <h3 className="font-semibold text-stone-900 mb-1">Instant setup</h3>
                <p className="text-stone-600 text-sm">Live on your website in seconds. No configuration, no technical expertise needed.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔓</span>
              <div>
                <h3 className="font-semibold text-stone-900 mb-1">No lock-in</h3>
                <p className="text-stone-600 text-sm">Flexible pricing. Try before you pay. Cancel anytime.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">👁️</span>
              <div>
                <h3 className="font-semibold text-stone-900 mb-1">Try before you go live</h3>
                <p className="text-stone-600 text-sm">Test your agent privately. Make it visible to the public only when you&apos;re ready.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎤</span>
              <div>
                <h3 className="font-semibold text-stone-900 mb-1">Voice and text</h3>
                <p className="text-stone-600 text-sm">Natural voice chat powered by OpenAI Realtime. Or type—your visitors choose.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-y border-stone-200 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-stone-900 mb-10">Features</h2>
          <ul className="grid md:grid-cols-2 gap-4 text-stone-700">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              Answers questions from your docs and website
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              Qualifies leads and identifies buying signals
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              Books meetings when visitors are ready
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">✓</span>
              Embeddable widget—drop it on any site
            </li>
          </ul>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-stone-100 border-t border-stone-200 py-16">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Interested in signing up?</h2>
          <p className="text-stone-600 mb-8">Drop your details and we&apos;ll get back to you.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1">Name *</label>
              <input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">Email *</label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-stone-700 mb-1">Message (optional)</label>
              <textarea
                id="message"
                rows={3}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent resize-none"
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
              className="w-full bg-stone-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "sending" ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </section>

      {/* Floating chat widget */}
      <EmbeddableChatWidget companyId="hypersonix" initialOpen={isWidgetOpen} onOpenChange={setIsWidgetOpen} />

      {/* Footer */}
      <footer className="border-t border-stone-200 py-8">
        <div className="max-w-5xl mx-auto px-4 flex justify-between items-center text-sm text-stone-500">
          <span>AI SDR Platform</span>
          <Link href="/admin/companies" className="text-stone-500 hover:text-stone-700">
            Admin
          </Link>
        </div>
      </footer>
    </div>
  );
}
