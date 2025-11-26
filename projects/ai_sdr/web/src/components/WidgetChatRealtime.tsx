"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "@/types/chat";
import { RealtimeClient } from "@/lib/realtime";
import { getCompanyConfigBySlug } from "@/lib/companies";
import { buildSystemPrompt } from "@/lib/systemPrompt";

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
          
Be conversational and helpful. Ask about their role and needs. Offer to search knowledge, show demos, or book meetings when appropriate.`;
        }
      }

      // Initialize Realtime client
      realtimeClientRef.current = new RealtimeClient({
        apiKey,
        model,
        voice: "alloy",
        instructions,
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
          
          // Call the appropriate tool via your existing API
          const response = await fetch(`/api/chat/${companyId}/tool`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, args }),
          });
          
          if (!response.ok) {
            return { error: "Tool execution failed" };
          }
          
          const result = await response.json();
          
          // Handle special results
          if (name === "get_demo_clip" && result.url) {
            setDemoClipUrl(result.url);
          }
          if (name === "create_meeting_link" && result.url) {
            setMeetingLink(result.url);
          }
          
          return result;
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
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 shadow-lg">
        <h1 className="text-xl font-semibold">AI Sales Assistant (Voice)</h1>
        <p className="text-sm text-blue-100">
          {isConnected ? "🟢 Connected - Click mic to talk" : "Click connect to start"}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 m-4 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
          <video src={demoClipUrl} controls className="w-full rounded-lg shadow-md" />
        </div>
      )}

      {/* Meeting CTA */}
      {meetingLink && (
        <div className="border-t p-4 bg-blue-50">
          <a
            href={meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            📅 Book a Meeting with Our Team
          </a>
        </div>
      )}

      {/* Voice Controls */}
      <div className="border-t p-4 bg-white">
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

