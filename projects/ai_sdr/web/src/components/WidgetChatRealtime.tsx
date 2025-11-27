"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "@/types/chat";
import { RealtimeClient } from "@/lib/realtime";
import { toolDefinitions } from "@/lib/toolDefinitions";

interface WidgetChatProps {
  companyId: string;
}

export default function WidgetChatRealtime({ companyId }: WidgetChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial",
      role: "assistant",
      content: "Hi there! Click the microphone to start a voice conversation with me!",
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeClientRef.current) {
        realtimeClientRef.current.disconnect();
      }
    };
  }, []);

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

      // Get company config for system instructions
      const companyResponse = await fetch(`/api/admin/companies?slug=${companyId}`);
      let instructions = "You are a helpful AI sales assistant.";
      
      if (companyResponse.ok) {
        const companies = await companyResponse.json();
        const company = companies.find((c: any) => c.slug === companyId);
        if (company) {
          // Build system prompt from company config
          const config = {
            ...company,
            ...(typeof company.config === 'object' ? company.config : {}),
          };
          instructions = `You are an AI SDR for ${company.displayName}. ${company.shortDescription || ''}
          
Be conversational and helpful. Ask about their role and needs. Use your tools to search knowledge, show visual content (images, charts, diagrams), show demos, or book meetings when appropriate. Always use visuals to enhance your explanations.`;
        }
      }

      // Initialize Realtime client
      realtimeClientRef.current = new RealtimeClient({
        apiKey,
        model,
        voice: "alloy",
        instructions,
        tools: toolDefinitions,
        onMessage: (message) => {
          console.log("[Realtime] Message:", message.type);
        },
        onError: (err) => {
          console.error("[Realtime] Error:", err);
          setError(err.message);
          setIsRecording(false);
          setIsSpeaking(false);
        },
        onAudioDelta: () => {
          setIsSpeaking(true);
        },
        onTranscript: (text, role) => {
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
              console.log("[Realtime] Adding", result.visuals.length, "visual assets");
              setVisualAssets((prev) => [...prev, ...result.visuals]);
            } else {
              console.warn("[Realtime] No visuals in result:", result);
            }
          }
            
            return result;
          } catch (error) {
            console.error("[Realtime] Tool execution error:", error);
            return { error: "Tool execution exception", details: String(error) };
          }
        },
      });

      await realtimeClientRef.current.connect();
      setIsConnected(true);
      
      console.log("[Realtime] Connected successfully");
    } catch (err) {
      console.error("[Realtime] Initialization error:", err);
      setError(err instanceof Error ? err.message : "Failed to connect");
      setIsConnected(false);
    }
  };

  const startConversation = async () => {
    if (!isConnected) {
      await initializeRealtime();
    }

    if (realtimeClientRef.current) {
      try {
        await realtimeClientRef.current.startRecording();
        setIsRecording(true);
        setError(undefined);
      } catch (err) {
        console.error("[Realtime] Recording error:", err);
        setError("Microphone access denied or not available");
      }
    }
  };

  const stopConversation = () => {
    if (realtimeClientRef.current) {
      realtimeClientRef.current.stopRecording();
      setIsRecording(false);
    }
  };

  const disconnect = () => {
    if (realtimeClientRef.current) {
      realtimeClientRef.current.disconnect();
      realtimeClientRef.current = null;
    }
    setIsConnected(false);
    setIsRecording(false);
    setIsSpeaking(false);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 shadow-lg flex-shrink-0">
        <h1 className="text-xl font-semibold">AI Sales Assistant (Voice)</h1>
        <p className="text-sm text-blue-100">
          {isConnected ? "🟢 Connected - Click mic to talk" : "Click connect to start"}
        </p>
      </div>

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
          <div className="flex justify-center">
            <div className="bg-red-100 text-red-700 rounded-lg px-4 py-2 text-sm">
              <span className="inline-block w-2 h-2 bg-red-600 rounded-full mr-2 animate-pulse"></span>
              Listening...
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

      {/* Fixed Voice Controls at Bottom */}
      <div className="border-t p-4 bg-white flex-shrink-0">
        <div className="flex items-center justify-center space-x-4">
          {!isConnected ? (
            <button
              onClick={initializeRealtime}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg"
            >
              🎤 Connect & Start Voice Chat
            </button>
          ) : (
            <>
              {!isRecording ? (
                <button
                  onClick={startConversation}
                  className="bg-green-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-green-700 transition-colors text-lg"
                >
                  🎤 Start Speaking
                </button>
              ) : (
                <button
                  onClick={stopConversation}
                  className="bg-red-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-red-700 transition-colors text-lg animate-pulse"
                >
                  🔴 Stop Speaking
                </button>
              )}
              
              <button
                onClick={disconnect}
                className="bg-gray-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                Disconnect
              </button>
            </>
          )}
        </div>
        
        <p className="text-center text-sm text-gray-600 mt-3">
          {isConnected 
            ? "Real-time voice conversation powered by OpenAI" 
            : "Connect to start having a natural voice conversation"}
        </p>
      </div>
    </div>
  );
}

