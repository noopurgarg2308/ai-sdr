"use client";

import { useState, useEffect } from "react";
import WidgetChatRealtime from "./WidgetChatRealtime";
import WidgetChatText from "./WidgetChatText";
import WidgetChat from "./WidgetChat";
import WidgetChatTavus from "./WidgetChatTavus";

interface WidgetChatUnifiedProps {
  companyId: string;
}

type ChatMode = "realtime" | "text" | "tts" | "tavus";

export default function WidgetChatUnified({ companyId }: WidgetChatUnifiedProps) {
  const [mode, setMode] = useState<ChatMode>("text"); // Default to text mode
  const [hasTavus, setHasTavus] = useState(false);

  // Check if company has Tavus enabled
  useEffect(() => {
    const checkTavus = async () => {
      try {
        const response = await fetch(`/api/admin/companies?slug=${companyId}`);
        if (response.ok) {
          const companies = await response.json();
          const company = companies.find((c: any) => c.slug === companyId);
          if (company?.useTavusVideo && company?.tavusReplicaId) {
            setHasTavus(true);
          }
        }
      } catch (error) {
        console.error("Error checking Tavus:", error);
      }
    };
    checkTavus();
  }, [companyId]);

  return (
    <div className="h-screen flex flex-col">
      {/* Mode Selector */}
      <div className="bg-white border-b border-gray-200 p-3 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-gray-600 mb-2 font-medium">Choose Interaction Mode:</p>
          <div className={`grid gap-2 ${hasTavus ? "grid-cols-4" : "grid-cols-3"}`}>
            <button
              onClick={() => setMode("realtime")}
              className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                mode === "realtime"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <div className="text-center">
                <div className="text-lg mb-1">🎤</div>
                <div className="text-sm">Realtime Voice</div>
                <div className="text-xs opacity-75">Speech-to-Speech</div>
              </div>
            </button>

            <button
              onClick={() => setMode("text")}
              className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                mode === "text"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <div className="text-center">
                <div className="text-lg mb-1">⌨️</div>
                <div className="text-sm">Text Only</div>
                <div className="text-xs opacity-75">Type & Read</div>
              </div>
            </button>

            <button
              onClick={() => setMode("tts")}
              className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                mode === "tts"
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <div className="text-center">
                <div className="text-lg mb-1">🔊</div>
                <div className="text-sm">Text-to-Speech</div>
                <div className="text-xs opacity-75">Type & Listen</div>
              </div>
            </button>

            {hasTavus && (
              <button
                onClick={() => setMode("tavus")}
                className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                  mode === "tavus"
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <div className="text-center">
                  <div className="text-lg mb-1">🎥</div>
                  <div className="text-sm">Video Avatar</div>
                  <div className="text-xs opacity-75">Tavus CVI</div>
                </div>
              </button>
            )}
          </div>

          {/* Mode Info */}
          <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-gray-700">
            {mode === "realtime" && (
              <>
                <strong>Realtime Voice:</strong> Natural speech-to-speech conversation with ~300ms latency. 
                Requires microphone access. Premium feature (~$0.30/min).
              </>
            )}
            {mode === "text" && (
              <>
                <strong>Text Only:</strong> Type your questions and read responses. 
                Works everywhere, no microphone needed. Most cost-effective.
              </>
            )}
            {mode === "tts" && (
              <>
                <strong>Text-to-Speech:</strong> Type your questions and hear AI responses. 
                Combines typing convenience with voice output. Free (browser TTS).
              </>
            )}
            {mode === "tavus" && (
              <>
                <strong>Tavus Video Avatar:</strong> Real-time video conversation with a lifelike digital human. 
                Most engaging experience with human-like presence. Requires Tavus setup.
              </>
            )}
          </div>
        </div>
      </div>

      {/* Render Selected Mode */}
      <div className="flex-1 overflow-hidden">
        {mode === "realtime" && <WidgetChatRealtime companyId={companyId} />}
        {mode === "text" && <WidgetChatText companyId={companyId} />}
        {mode === "tts" && <WidgetChat companyId={companyId} />}
        {mode === "tavus" && hasTavus && <WidgetChatTavus companyId={companyId} />}
      </div>
    </div>
  );
}

