"use client";

import { useState, useRef, useEffect } from "react";
import Daily from "@daily-co/daily-js";
import type { ChatMessage } from "@/types/chat";

interface WidgetChatTavusProps {
  companyId: string;
}

export default function WidgetChatTavus({ companyId }: WidgetChatTavusProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial",
      role: "assistant",
      content: "Hi there! I'm your AI sales assistant. Click 'Start Video Chat' to begin!",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [videoUrl, setVideoUrl] = useState<string>();
  const [sessionId, setSessionId] = useState<string>();
  
  const videoRef = useRef<HTMLDivElement>(null); // Daily.co needs a container div, not video element
  const dailyRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dailyRef.current) {
        dailyRef.current.destroy();
      }
    };
  }, []);

  const startCVISession = async () => {
    try {
      setIsLoading(true);
      setError(undefined);

      // Get session credentials
      const response = await fetch("/api/tavus/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create Tavus session");
      }

      const { sessionId: sid, websocketUrl } = await response.json();
      setSessionId(sid);

      console.log("[Tavus] Connecting to Daily.co room:", websocketUrl);

      // Extract room name from Daily.co URL
      // URL format: https://tavus.daily.co/room-name
      const roomUrl = websocketUrl;
      const roomName = roomUrl.split("/").pop() || "";

      // Create Daily.co iframe
      const daily = Daily.createFrame(videoRef.current!, {
        showLeaveButton: false,
        showFullscreenButton: false,
        iframeStyle: {
          position: "absolute",
          width: "100%",
          height: "100%",
          border: "0",
        },
      });

      dailyRef.current = daily;

      // Set up Daily.co event handlers
      daily.on("joined-meeting", () => {
        console.log("[Tavus] Joined Daily.co meeting");
        setIsConnected(true);
        setIsLoading(false);
      });

      daily.on("left-meeting", () => {
        console.log("[Tavus] Left Daily.co meeting");
        setIsConnected(false);
        setVideoUrl(undefined);
      });

      daily.on("error", (error: any) => {
        console.error("[Tavus] Daily.co error:", error);
        setError("Connection error. Please try again.");
        setIsConnected(false);
        setIsLoading(false);
      });

      // Listen for custom events from Tavus (if they send them via Daily.co)
      // Tavus may send events through Daily.co's custom event system
      daily.on("custom-event", (event: any) => {
        console.log("[Tavus] Custom event:", event);
        if (event && event.data) {
          handleTavusMessage(event.data);
        }
      });

      // Listen for app messages (Tavus might use this for transcripts/function calls)
      daily.on("app-message", (event: any) => {
        console.log("[Tavus] App message:", event);
        if (event && event.data) {
          handleTavusMessage(event.data);
        }
      });

      // Listen for participant events (Tavus avatar might send messages this way)
      daily.on("participant-joined", (event: any) => {
        console.log("[Tavus] Participant joined:", event);
      });

      daily.on("participant-left", (event: any) => {
        console.log("[Tavus] Participant left:", event);
      });

      // Join the room
      await daily.join({ url: roomUrl });
    } catch (error: any) {
      console.error("[Tavus] Session error:", error);
      setError(error.message || "Failed to start video chat");
      setIsLoading(false);
    }
  };

  const handleTavusMessage = (message: any) => {
    console.log("[Tavus] Message:", message.type);

    switch (message.type) {
      case "video_frame":
      case "video.delta":
        // Handle video frame
        if (message.data || message.delta) {
          // Tavus sends video frames - you'll need to handle based on their format
          // This is a placeholder - adjust based on actual Tavus API
          const frameData = message.data || message.delta;
          if (frameData && videoRef.current) {
            // Convert base64 or blob to video stream
            // Implementation depends on Tavus video format
          }
        }
        break;

      case "transcript":
      case "conversation.item.input_audio_transcription.completed":
        // Handle user transcript
        if (message.text || message.transcript) {
          const text = message.text || message.transcript;
          addMessage({
            id: `msg_${Date.now()}`,
            role: "user",
            content: text,
            createdAt: new Date().toISOString(),
          });
        }
        break;

      case "response":
      case "conversation.item.output_audio_transcription.completed":
        // Handle assistant response
        if (message.text || message.transcript) {
          const text = message.text || message.transcript;
          addMessage({
            id: `msg_${Date.now()}`,
            role: "assistant",
            content: text,
            createdAt: new Date().toISOString(),
          });
        }
        break;

      case "function_call":
      case "conversation.item.function_call":
        // Handle function calls
        if (message.function_call) {
          handleFunctionCall(message.function_call);
        }
        break;

      case "error":
        setError(message.error || "An error occurred");
        break;
    }
  };

  const handleFunctionCall = async (functionCall: any) => {
    // Execute function call via your API
    // Note: Tavus handles function calls via HTTP callbacks (callbackUrl)
    // The result is automatically sent back to Tavus via the callback endpoint
    try {
      console.log("[Tavus] Function call received:", functionCall);
      
      const response = await fetch(`/api/chat/${companyId}/tool`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: functionCall.name,
          arguments: functionCall.arguments || functionCall.args || {},
        }),
      });

      const result = await response.json();
      console.log("[Tavus] Function call result:", result);

      // Note: Function call results are sent back to Tavus via the callback endpoint
      // (/api/tavus/callback) which Tavus calls automatically
      // No need to send via WebSocket here
      
      return result;
    } catch (error) {
      console.error("[Tavus] Function call error:", error);
      throw error;
    }
  };

  const addMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const disconnect = () => {
    if (dailyRef.current) {
      dailyRef.current.leave();
    }
    setIsConnected(false);
    setVideoUrl(undefined);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Video Chat Assistant</h2>
          {isConnected && (
            <button
              onClick={disconnect}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 overflow-hidden">
        {/* Video Section */}
        <div className="flex-1 bg-black rounded-lg overflow-hidden relative">
          <div
            ref={videoRef}
            className="w-full h-full"
            style={{ minHeight: "400px" }}
          />
          {!isConnected && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-white pointer-events-none">
              <div className="text-center">
                <div className="text-6xl mb-4">👤</div>
                <p>Click "Start Video Chat" to begin</p>
              </div>
            </div>
          )}
        </div>

        {/* Chat Section */}
        <div className="flex-1 bg-white rounded-lg shadow-sm flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            {!isConnected ? (
              <button
                onClick={startCVISession}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? "Connecting..." : "Start Video Chat"}
              </button>
            ) : (
              <div className="text-center text-gray-500 text-sm">
                Speak naturally - the AI will respond in real-time
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-t border-red-200 p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}

