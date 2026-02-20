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
      content: "Hi there! Click Start below to begin. Once connected, just speak naturally—I'll respond when you pause.",
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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
    if (reason === "idle") {
      setError("Session ended due to inactivity. Connect again to continue.");
    } else {
      setError(undefined);
    }
  }, [companyId]);

  // Idle timeout: if no user speech for 10s, assume they walked away and disconnect
  // Do NOT disconnect while the AI is speaking (isSpeaking) — wait until they finish
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      if (isSpeaking) return; // AI is talking, don't disconnect
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= IDLE_TIMEOUT_MS) {
        clearInterval(interval);
        disconnect("idle");
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [isConnected, disconnect, isSpeaking]);

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
        throw new Error("Failed to get session credentials");
      }

      const { apiKey, model } = await response.json();

      // Get company config for system instructions and tools
      const companyResponse = await fetch(`/api/admin/companies?slug=${companyId}`);
      let instructions = "You are a helpful AI sales assistant.";
      let tools = toolDefinitions;

      if (companyResponse.ok) {
        const companies = await companyResponse.json();
        const company = companies.find((c: any) => c.slug === companyId);
        if (company) {
          const useVisuals = company.useVisuals ?? false;
          tools = useVisuals ? toolDefinitions : toolDefinitions.filter(
            (t: any) => t.function.name !== "get_demo_clip" && t.function.name !== "show_visual"
          );
          const visualNote = useVisuals
            ? "Use show_visual, get_demo_clip, or create_meeting_link when appropriate. When search_knowledge returns linked visuals, they are shown automatically—do not describe them in your reply."
            : "Visuals are disabled. Answer in text/voice only. Do NOT use get_demo_clip or show_visual. Do not offer to show images, charts, or demos.";
          instructions = `You are an AI SDR for ${company.displayName}. ${company.shortDescription || ''}

Be conversational and helpful. Ask about their role and needs.

CRITICAL: Always use the search_knowledge tool when answering questions about ${company.displayName}, its products, pricing, features, or documentation. Never rely on general knowledge for company-specific questions. Use create_meeting_link when the visitor is ready. When the user says they are done (e.g. "end conversation", "goodbye", "that's all"), call end_conversation immediately—do not give a long verbal farewell.

ANSWER LENGTH: Start short. Your first response to any question must be 2-3 lines max—crisp and to the point. Then ask: "Would you like me to go into more detail?" or "Want more details?" Only provide longer, deeper answers when the user says yes or asks for more. ${visualNote}`;
        }
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
        onError: (err) => {
          console.error("[Realtime] Error:", err);
          setError(err.message);
          setIsRecording(false);
          setIsSpeaking(false);
        },
        onUserAudio: () => {
          lastActivityRef.current = Date.now(); // User is speaking — reset idle timer (transcript arrives later)
        },
        onAudioDelta: () => {
          setIsSpeaking(true);
          lastActivityRef.current = Date.now(); // AI is talking, user is listening — reset idle timer
        },
        onTranscript: (text, role) => {
          if (role === "user") lastActivityRef.current = Date.now();
          if (role === "assistant") lastActivityRef.current = Date.now(); // User is listening, reset idle timer

          const newMessage: ChatMessage = {
            id: `msg_${Date.now()}_${Math.random()}`,
            role: role as "user" | "assistant",
            content: text,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, newMessage]);

          if (role === "assistant") {
            setIsSpeaking(false);
          }
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
      sessionIdRef.current = `realtime_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      lastActivityRef.current = Date.now();
      setIsConnected(true);

      // Auto-start recording so it's always listening—server VAD auto-detects when user stops speaking
      try {
        await realtimeClientRef.current.startRecording();
        setIsRecording(true);
        setError(undefined);
      } catch (micErr) {
        console.error("[Realtime] Microphone error:", micErr);
        setError("Microphone access denied or not available");
      }

      console.log("[Realtime] Connected and listening");
    } catch (err) {
      console.error("[Realtime] Initialization error:", err);
      setError(err instanceof Error ? err.message : "Failed to connect");
      setIsConnected(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-white">
      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 m-4 rounded flex-shrink-0">
          <strong>Error:</strong> {error}
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

      {/* Fixed Voice Controls at Bottom - Avatar + compact Start/Stop */}
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
                className="bg-sky-400 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-sky-500 transition-colors"
              >
                Start
              </button>
            ) : (
              <button
                onClick={() => disconnect()}
                className="bg-red-500 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

