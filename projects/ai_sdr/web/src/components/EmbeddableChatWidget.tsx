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

  useEffect(() => {
    setIsOpen(initialOpen);
  }, [initialOpen]);

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
            <div className="flex-shrink-0 flex justify-between items-center px-4 py-3 bg-stone-900 text-white">
              <span className="font-semibold text-sm">Try AI SDR Demo</span>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md hover:bg-stone-700 transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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

      {/* Floating chat bubble */}
      <button
        onClick={() => setOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[9998] w-14 h-14 rounded-full bg-stone-900 text-white shadow-lg hover:bg-stone-800 transition-all hover:scale-105 flex items-center justify-center"
        aria-label={isOpen ? "Close chat" : "Try AI SDR demo"}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </>
  );
}
