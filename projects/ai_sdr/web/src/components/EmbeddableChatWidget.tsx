"use client";

import { useState, useEffect } from "react";
import WidgetChatUnified from "./WidgetChatUnified";

interface EmbeddableChatWidgetProps {
  companyId: string;
  initialOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function EmbeddableChatWidget({ companyId, initialOpen = false, onOpenChange }: EmbeddableChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    setIsOpen(initialOpen);
  }, [initialOpen]);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await fetch("/api/admin/companies");
        if (res.ok) {
          const companies = await res.json();
          const company = companies.find((c: { slug: string }) => c.slug === companyId);
          setCompanyName(company?.displayName ?? null);
        }
      } catch {
        // ignore
      }
    };
    fetchCompany();
  }, [companyId]);

  const setOpen = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  return (
    <>
      {/* Centered modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop - click to close */}
          <div
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Centered panel */}
          <div
            className="relative z-10 w-full max-w-lg h-[min(600px,calc(100vh-2rem))] rounded-xl shadow-2xl border border-stone-200 bg-white flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 flex items-center px-4 py-3 bg-sky-400 text-white">
              <div className="w-7 flex-shrink-0" aria-hidden />
              <span className="font-semibold text-sm flex-1 text-center">{companyName ? `${companyName} AI Agent` : "AI Agent"}</span>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-md hover:bg-sky-500 transition-colors text-white"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <WidgetChatUnified companyId={companyId} defaultMode="realtime" embedded />
            </div>
          </div>
        </div>
      )}

      {/* Floating chat bubble - anime-style avatar */}
      <button
        onClick={() => setOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[9998] w-28 h-28 rounded-full overflow-hidden border-2 border-white shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center bg-stone-100 ring-2 ring-stone-200/50"
        aria-label={isOpen ? "Close chat" : companyName ? `Talk to ${companyName} AI Agent` : "Try AI SDR demo"}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-stone-600">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        ) : (
          <img
            src="/ai-agent-avatar.png"
            alt="AI SDR Agent"
            className="w-full h-full object-cover"
          />
        )}
      </button>
    </>
  );
}
