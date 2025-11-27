"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "@/types/chat";

interface WidgetChatProps {
  companyId: string;
}

export default function WidgetChatText({ companyId }: WidgetChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial",
      role: "assistant",
      content: "Hi there! I'm your AI assistant. What's your role and what brought you here today?",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>();
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`/api/chat/${companyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      
      if (data.sessionId) setSessionId(data.sessionId);
      
      // Add demo clip to visual assets
      if (data.demoClipUrl) {
        const demoVisual = {
          type: "video",
          url: data.demoClipUrl,
          title: "Product Demo",
          description: "Product demonstration video",
        };
        setVisualAssets((prev) => [...prev, demoVisual]);
        setDemoClipUrl(data.demoClipUrl);
      }
      
      if (data.meetingLink) setMeetingLink(data.meetingLink);
      
      if (data.visualAssets && data.visualAssets.length > 0) {
        console.log("[Text Mode] Adding visual assets:", data.visualAssets.length);
        setVisualAssets((prev) => [...prev, ...data.visualAssets]);
      }

      setMessages((prev) => [...prev, data.reply]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 shadow-lg flex-shrink-0">
        <h1 className="text-xl font-semibold">AI Sales Assistant (Text + Visuals)</h1>
        <p className="text-sm text-blue-100">Type your questions and I'll show you visuals</p>
      </div>

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
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
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

      {/* Fixed Input at Bottom */}
      <div className="border-t p-4 bg-white flex-shrink-0">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Text mode - Type questions to see visual content
        </p>
      </div>
    </div>
  );
}

