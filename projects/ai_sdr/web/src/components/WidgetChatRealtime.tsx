"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage } from "@/types/chat";
import { RealtimeClient } from "@/lib/realtime";
import { toolDefinitions } from "@/lib/toolDefinitions";

const IDLE_TIMEOUT_MS = 15 * 1000; // 15 seconds of no activity (user speech, AI response) = walked away

interface WidgetChatProps {
  companyId: string;
}

export default function WidgetChatRealtime({ companyId }: WidgetChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial",
      role: "assistant",
      content: "Hi there! Click Start speaking below to begin. Once connected, just speak naturally—I'll respond when you pause.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string>();
  const [demoClipUrl, setDemoClipUrl] = useState<string>();
  const [meetingLink, setMeetingLink] = useState<string>();
  const [visualAssets, setVisualAssets] = useState<Array<{
    type: string;
    url: string;
    title: string;
    description?: string;
    thumbnail?: string;
  }>>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeClientRef = useRef<RealtimeClient | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);
  const lastActivityRef = useRef<number>(Date.now());
  /** Read inside idle interval — avoids stale isSpeaking and avoids re-creating the interval every toggle */
  const isSpeakingRef = useRef(false);
  /** True after user transcript until first assistant audio or playback finished — avoids idle during slow model latency */
  const awaitingAssistantRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  const disconnect = useCallback((reason?: "idle") => {
    const sid = sessionIdRef.current;
    const msgs = messagesRef.current.filter((m) => m.content.trim());
    if (sid && msgs.length > 0) {
      fetch(`/api/chat/${companyId}/log-conversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sid,
          messages: msgs.map((m) => ({ role: m.role, content: m.content })),
        }),
      }).catch((err) => console.warn("[Realtime] Log conversation failed:", err));
    }

    if (realtimeClientRef.current) {
      realtimeClientRef.current.disconnect();
      realtimeClientRef.current = null;
    }
    sessionIdRef.current = null;
    setIsConnected(false);
    setIsRecording(false);
    setIsSpeaking(false);
    awaitingAssistantRef.current = false;
    if (reason === "idle") {
      setError("Session ended due to inactivity. Connect again to continue.");
    } else {
      setError(undefined);
    }
  }, [companyId]);

  // Idle timeout: 15s after lastActivityRef bump (user spoke, or assistant audio fully finished locally).
  // Block while isSpeakingRef (TTS playing) or awaitingAssistantRef (user spoke, model not yet audible).
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      if (isSpeakingRef.current) return;
      if (awaitingAssistantRef.current) return;
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= IDLE_TIMEOUT_MS) {
        clearInterval(interval);
        disconnect("idle");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected, disconnect]);

  // Cleanup on unmount: log conversation if any, then disconnect
  useEffect(() => {
    return () => {
      const sid = sessionIdRef.current;
      const msgs = messagesRef.current.filter((m) => m.content.trim());
      if (sid && msgs.length > 0) {
        fetch(`/api/chat/${companyId}/log-conversation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sid,
            messages: msgs.map((m) => ({ role: m.role, content: m.content })),
          }),
        }).catch(() => {});
      }
      if (realtimeClientRef.current) {
        realtimeClientRef.current.disconnect();
      }
    };
  }, [companyId]);

  const initializeRealtime = async () => {
    try {
      setError(undefined);
      
      // Get session credentials
      const response = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(
          (errBody as { error?: string }).error || "Failed to get session credentials"
        );
      }

      const { apiKey, model } = await response.json();

      // Company-specific instructions (same buildSystemPrompt as text chat + voice rules)
      const configResponse = await fetch(`/api/widget/${companyId}/config`);
      let instructions =
        "You are a helpful AI sales assistant. For any company-specific question, call search_knowledge first. Never answer from general knowledge when the knowledge base has no match.";
      let tools = toolDefinitions;

      if (configResponse.ok) {
        const {
          instructions: companyInstructions,
          useVisuals,
          chunkCount,
        } = await configResponse.json();
        if (companyInstructions) {
          instructions = companyInstructions;
        }
        tools = useVisuals
          ? toolDefinitions
          : toolDefinitions.filter(
              (t: any) =>
                t.function.name !== "get_demo_clip" && t.function.name !== "show_visual"
            );
        if (typeof chunkCount === "number" && chunkCount === 0) {
          setError(
            "No knowledge base content found for this company. Upload PDFs or crawl a website in Admin, then try again."
          );
        }
      } else {
        const errBody = await configResponse.json().catch(() => ({}));
        const detail =
          (errBody as { error?: string }).error || `HTTP ${configResponse.status}`;
        console.warn("[Realtime] Widget config fetch failed:", detail, companyId);
        setError(
          `Could not load company instructions (${detail}). Answers may use general AI knowledge instead of your site.`
        );
      }

      // Initialize Realtime client
      realtimeClientRef.current = new RealtimeClient({
        apiKey,
        model,
        voice: "alloy",
        instructions,
        tools,
        onMessage: (message) => {
          console.log("[Realtime] Message:", message.type);
        },
        onSessionReady: () => {
          console.log("[Realtime] Session ready — company instructions and tools are active");
        },
        onError: (err) => {
          console.error("[Realtime] Error:", err);
          awaitingAssistantRef.current = false;
          setError(err.message);
          setIsRecording(false);
          setIsSpeaking(false);
        },
        onAudioDelta: () => {
          awaitingAssistantRef.current = false;
          setIsSpeaking(true);
        },
        onAssistantPlaybackFinished: () => {
          awaitingAssistantRef.current = false;
          setIsSpeaking(false);
          lastActivityRef.current = Date.now(); // 15s idle starts after local audio actually finishes
        },
        onTranscript: (text, role) => {
          const trimmed = text?.trim() ?? "";
          if (!trimmed) return;

          if (role === "user") {
            lastActivityRef.current = Date.now();
            awaitingAssistantRef.current = true;
          }

          const newMessage: ChatMessage = {
            id: `msg_${Date.now()}_${Math.random()}`,
            role: role as "user" | "assistant",
            content: trimmed,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, newMessage]);

          // Assistant transcript can arrive before TTS playback finishes — isSpeaking clears in onAssistantPlaybackFinished
        },
        onFunctionCall: async (name, args) => {
          console.log("[Realtime] Function call:", name, args);

          // Handle end_conversation client-side—disconnect after letting result get sent
          if (name === "end_conversation") {
            setTimeout(() => disconnect(), 300);
            return { success: true, message: "Goodbye!" };
          }

          try {
            // Call the appropriate tool via your existing API
            const response = await fetch(`/api/chat/${companyId}/tool`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, args }),
            });
            
            console.log("[Realtime] Tool response status:", response.status);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error("[Realtime] Tool execution failed:", errorText);
              return { error: "Tool execution failed", details: errorText };
            }
            
            const result = await response.json();
            console.log("[Realtime] Tool result:", name, result);
            
          // Handle special results
          if (name === "get_demo_clip" && result && result.url) {
            console.log("[Realtime] Got demo clip:", result.url);
            // Add demo clip to visual assets instead of separate state
            const demoVisual = {
              type: "video",
              url: result.url,
              title: result.title || "Product Demo",
              description: "Product demonstration video",
            };
            setVisualAssets((prev) => [...prev, demoVisual]);
            // Also set demoClipUrl for backward compatibility
            setDemoClipUrl(result.url);
          }
          if (name === "create_meeting_link" && result && result.url) {
            console.log("[Realtime] Setting meeting link:", result.url);
            setMeetingLink(result.url);
          }
          if (name === "show_visual" && result) {
            console.log("[Realtime] Show visual result:", result);
            if (result.visuals && result.visuals.length > 0) {
              setVisualAssets((prev) => [...prev, ...result.visuals]);
            }
          }
          if (name === "search_knowledge" && result?.linkedVisuals?.length) {
            setVisualAssets((prev) => [...prev, ...result.linkedVisuals]);
          }

            return result;
          } catch (error) {
            console.error("[Realtime] Tool execution error:", error);
            return { error: "Tool execution exception", details: String(error) };
          }
        },
      });

      await realtimeClientRef.current.connect();
      // Stop/close during connect() rejects with AbortError — handled below
      if (!realtimeClientRef.current) {
        setIsConnected(false);
        setIsRecording(false);
        return;
      }

      sessionIdRef.current = `realtime_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      lastActivityRef.current = Date.now();
      setIsConnected(true);

      // Auto-start recording so it's always listening—server VAD auto-detects when user stops speaking
      try {
        await realtimeClientRef.current.startRecording();
        // Stop or modal close during startRecording() clears the ref in disconnect() — avoid zombie "listening" UI
        if (!realtimeClientRef.current) {
          setIsConnected(false);
          setIsRecording(false);
          return;
        }
        setIsRecording(true);
      } catch (micErr) {
        console.error("[Realtime] Microphone error:", micErr);
        setError("Microphone access denied or not available");
        setIsRecording(false);
      }

      console.log("[Realtime] Connected and listening");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        realtimeClientRef.current?.disconnect();
        realtimeClientRef.current = null;
        setIsConnected(false);
        setIsRecording(false);
        return;
      }
      console.error("[Realtime] Initialization error:", err);
      setError(err instanceof Error ? err.message : "Failed to connect");
      setIsConnected(false);
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-white">
      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 m-4 rounded flex-shrink-0 flex gap-2 justify-between items-start">
          <p className="text-sm">
            <strong>Error:</strong> {error}
          </p>
          <button
            type="button"
            onClick={() => setError(undefined)}
            className="text-red-800 hover:text-red-950 text-xs font-semibold shrink-0"
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Messages */}
        <div className="p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        
        {/* Status indicators */}
        {isRecording && (
          <div className="flex justify-center flex-col items-center gap-1">
            <div className="bg-green-100 text-green-700 rounded-lg px-4 py-2 text-sm">
              <span className="inline-block w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse"></span>
              Listening... Just speak naturally. I&apos;ll respond when you pause.
            </div>
          </div>
        )}
        
        {isSpeaking && (
          <div className="flex justify-center">
            <div className="bg-blue-100 text-blue-700 rounded-lg px-4 py-2 text-sm">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></span>
              AI is speaking...
            </div>
          </div>
        )}
        
          <div ref={messagesEndRef} />
        </div>

        {/* Demo Clip */}
        {demoClipUrl && (
          <div className="border-t p-4 bg-gray-50">
            <h3 className="font-semibold mb-2">Product Demo</h3>
            <video src={demoClipUrl} controls className="w-full max-w-3xl mx-auto rounded-lg shadow-md" />
          </div>
        )}

        {/* Visual Assets */}
        {visualAssets.length > 0 && (
          <div className="border-t p-4 bg-gray-50">
            <h3 className="font-semibold mb-3 text-gray-900">Visual Content</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto">
            {visualAssets.map((asset, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden">
                {asset.type === "image" && (
                  <div>
                    <img 
                      src={asset.url} 
                      alt={asset.title}
                      className="w-full h-auto"
                    />
                    <div className="p-3">
                      <p className="font-medium text-sm text-gray-900">{asset.title}</p>
                      {asset.description && (
                        <p className="text-xs text-gray-600 mt-1">{asset.description}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {asset.type === "video" && (
                  <div>
                    <video 
                      src={asset.url} 
                      controls 
                      poster={asset.thumbnail}
                      className="w-full"
                    />
                    <div className="p-3">
                      <p className="font-medium text-sm text-gray-900">{asset.title}</p>
                      {asset.description && (
                        <p className="text-xs text-gray-600 mt-1">{asset.description}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {asset.type === "pdf" && (
                  <div className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z"/>
                          <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{asset.title}</p>
                        {asset.description && (
                          <p className="text-xs text-gray-600 mt-1">{asset.description}</p>
                        )}
                      </div>
                    </div>
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 block w-full text-center bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 text-sm"
                    >
                      📄 View PDF
                    </a>
                  </div>
                )}
                
                {asset.type === "chart" && (
                  <div>
                    <img 
                      src={asset.url} 
                      alt={asset.title}
                      className="w-full h-auto"
                    />
                    <div className="p-3 bg-blue-50">
                      <p className="font-medium text-sm text-gray-900">{asset.title}</p>
                      {asset.description && (
                        <p className="text-xs text-gray-600 mt-1">{asset.description}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {asset.type === "slide" && (
                  <div className="p-4">
                    {asset.thumbnail && (
                      <img 
                        src={asset.thumbnail} 
                        alt={asset.title}
                        className="w-full h-auto rounded mb-3"
                      />
                    )}
                    <p className="font-medium text-sm text-gray-900">{asset.title}</p>
                    {asset.description && (
                      <p className="text-xs text-gray-600 mt-1 mb-3">{asset.description}</p>
                    )}
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700 text-sm"
                    >
                      📊 View Slides
                    </a>
                  </div>
                )}

                {asset.type === "gif" && (
                  <div>
                    <img 
                      src={asset.url} 
                      alt={asset.title}
                      className="w-full h-auto"
                    />
                    <div className="p-3">
                      <p className="font-medium text-sm text-gray-900">{asset.title}</p>
                      {asset.description && (
                        <p className="text-xs text-gray-600 mt-1">{asset.description}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              ))}
            </div>
          </div>
        )}

        {/* Meeting CTA */}
        {meetingLink && (
          <div className="border-t p-4 bg-blue-50">
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full max-w-3xl mx-auto bg-blue-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              📅 Book a Meeting with Our Team
            </a>
          </div>
        )}
      </div>

      {/* Fixed Voice Controls at Bottom - Avatar + voice controls */}
      <div className="border-t px-4 py-3 bg-white flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <img
            src="/ai-agent-avatar.png"
            alt="AI Agent"
            className="w-12 h-12 rounded-full object-cover border-2 border-stone-200 flex-shrink-0"
          />
          <div className="flex-1 min-w-0 flex items-center justify-end">
            {!isConnected ? (
              <button
                onClick={initializeRealtime}
                className="bg-black text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-neutral-800 transition-colors"
              >
                Start speaking
              </button>
            ) : (
              <button
                onClick={() => disconnect()}
                className="bg-red-500 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors"
              >
                Stop speaking
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

