"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { ChatMessage } from "@/types/chat";

// Timeout for image loading (5 seconds)
const IMAGE_LOAD_TIMEOUT = 5000;

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
  const [failedImageUrls, setFailedImageUrls] = useState<string[]>([]);
  const [loadedImageUrls, setLoadedImageUrls] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clear image state when visual assets change (new query = fresh start)
  useEffect(() => {
    setFailedImageUrls([]);
    setLoadedImageUrls(new Set());
  }, [visualAssets.length]);

  // Filter out failed images - only show images that haven't failed
  const validVisualAssets = useMemo(() => {
    const failedSet = new Set(failedImageUrls);
    const filtered = visualAssets.filter(asset => {
      // For images/charts/slides: completely filter out if failed
      if (asset.type === "image" || asset.type === "chart" || asset.type === "slide") {
        if (failedSet.has(asset.url)) {
          console.log(`[WidgetText] Filtering out failed image: ${asset.url}`);
          return false;
        }
      }
      return true;
    });
    console.log(`[WidgetText] Filtered assets: ${filtered.length} out of ${visualAssets.length} (${failedImageUrls.length} failed)`);
    return filtered;
  }, [visualAssets, failedImageUrls]);

  // Periodic check for blank images (runs every 1 second to catch images that load but are blank)
  useEffect(() => {
    if (validVisualAssets.length === 0) return;
    
    // Track which images we've seen
    const seenImages = new Set<string>();
    
    const checkInterval = setInterval(() => {
      // Find all image elements in the visual assets section
      const imageElements = document.querySelectorAll('[data-asset-url] img');
      console.log(`[WidgetText] 🔍 Periodic check: Found ${imageElements.length} image elements`);
      
      imageElements.forEach((imgEl) => {
        const img = imgEl as HTMLImageElement;
        const cardContainer = img.closest('[data-asset-url]') as HTMLElement;
        const assetUrl = cardContainer?.getAttribute('data-asset-url');
        
        if (!assetUrl) return;
        
        // Track that we've seen this image
        seenImages.add(assetUrl);
        
        // Skip if already marked as failed or loaded
        if (failedImageUrls.includes(assetUrl)) {
          return;
        }
        if (loadedImageUrls.has(assetUrl)) {
          return;
        }
        
        // Check if image is blank (has 0 dimensions) or failed to load
        if (img.complete) {
          if (img.naturalWidth === 0 || img.naturalHeight === 0) {
            console.warn(`[WidgetText] 🔍 Periodic check: Found blank image (0 dimensions): ${assetUrl} (${img.naturalWidth}x${img.naturalHeight})`);
            img.dispatchEvent(new Event('error'));
          } else {
            // Image is complete and has dimensions but onLoad didn't fire - mark as loaded
            console.log(`[WidgetText] 🔍 Periodic check: Image loaded but onLoad didn't fire: ${assetUrl} (${img.naturalWidth}x${img.naturalHeight})`);
            img.dispatchEvent(new Event('load'));
          }
        } else {
          // Image not complete - check if it's been loading too long
          const loadStart = (img as any).__loadStartTime || Date.now();
          (img as any).__loadStartTime = loadStart;
          const loadTime = Date.now() - loadStart;
          
          if (loadTime > 2000) { // Reduced to 2 seconds
            console.warn(`[WidgetText] 🔍 Periodic check: Image taking too long (${loadTime}ms): ${assetUrl}`);
            img.dispatchEvent(new Event('error'));
          }
        }
      });
      
      // Check for images that should be there but aren't in the DOM
      validVisualAssets.forEach(asset => {
        if ((asset.type === "image" || asset.type === "chart" || asset.type === "slide") && 
            !seenImages.has(asset.url) && 
            !failedImageUrls.includes(asset.url) && 
            !loadedImageUrls.has(asset.url)) {
          console.warn(`[WidgetText] 🔍 Periodic check: Image not found in DOM: ${asset.url}`);
        }
      });
    }, 1000); // Check every 1 second (more frequent)
    
    return () => clearInterval(checkInterval);
  }, [validVisualAssets, failedImageUrls, loadedImageUrls]);

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
      
      // Handle visual assets - replace with new ones from this response (don't accumulate)
      const newVisualAssets: Array<{
        type: string;
        url: string;
        title: string;
        description?: string;
        thumbnail?: string;
      }> = [];
      
      // Add demo clip if present
      if (data.demoClipUrl) {
        const demoVisual = {
          type: "video",
          url: data.demoClipUrl,
          title: "Product Demo",
          description: "Product demonstration video",
        };
        newVisualAssets.push(demoVisual);
      }
      
      // Add search result visuals
      if (data.visualAssets && Array.isArray(data.visualAssets) && data.visualAssets.length > 0) {
        console.log("[Text Mode] Adding visual assets:", data.visualAssets.length);
        console.log("[Text Mode] Visual assets:", data.visualAssets);
        newVisualAssets.push(...data.visualAssets);
      } else {
        console.log("[Text Mode] No visual assets in response");
      }
      
      // Deduplicate visual assets by URL (safety measure in case duplicates make it through)
      const uniqueVisualAssets = new Map<string, typeof newVisualAssets[0]>();
      newVisualAssets.forEach(asset => {
        if (!uniqueVisualAssets.has(asset.url)) {
          uniqueVisualAssets.set(asset.url, asset);
        }
      });
      const deduplicatedVisualAssets = Array.from(uniqueVisualAssets.values());
      
      if (deduplicatedVisualAssets.length < newVisualAssets.length) {
        console.log(`[Text Mode] Deduplicated ${deduplicatedVisualAssets.length} unique visual assets (removed ${newVisualAssets.length - deduplicatedVisualAssets.length} duplicates)`);
      }
      
      // Replace visual assets (don't accumulate across messages)
      console.log(`[Text Mode] Setting ${deduplicatedVisualAssets.length} visual assets`);
      setVisualAssets(deduplicatedVisualAssets);

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
        {validVisualAssets.length > 0 && (
          <div className="border-t p-4 bg-gray-50">
            <h3 className="font-semibold mb-3 text-gray-900">Visual Content</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto" style={{ gridAutoRows: 'min-content' }}>
            {validVisualAssets.map((asset, index) => {
              // Double-check: don't render if somehow in failed list (shouldn't happen due to filter, but safety check)
              if ((asset.type === "image" || asset.type === "chart" || asset.type === "slide") && failedImageUrls.includes(asset.url)) {
                console.warn(`[WidgetText] WARNING: Asset in validVisualAssets but also in failedImageUrls: ${asset.url}`);
                return null;
              }
              
              return (
              <div 
                key={`${asset.url}-${index}`} 
                className="bg-white rounded-lg shadow-sm overflow-hidden"
                data-asset-url={asset.url}
                data-asset-type={asset.type}
              >
                {/* Images, charts, and slides are all displayed as images */}
                {(asset.type === "image" || asset.type === "chart" || asset.type === "slide") && (
                  <img 
                    src={asset.url} 
                    alt={asset.title}
                    className="w-full h-auto"
                    style={{ display: 'block' }}
                    ref={(img) => {
                      if (img && !loadedImageUrls.has(asset.url) && !failedImageUrls.includes(asset.url)) {
                        // Check if image is already broken (loaded but has 0 dimensions)
                        if (img.complete && (img.naturalWidth === 0 || img.naturalHeight === 0)) {
                          console.warn(`[WidgetText] ⚠️ Image has 0 dimensions (broken): ${asset.url}`);
                          img.dispatchEvent(new Event('error'));
                          return;
                        }
                        
                        // Quick check after a short delay to catch blank images early
                        const quickCheckId = setTimeout(() => {
                          if (!loadedImageUrls.has(asset.url) && img.complete) {
                            if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                              console.warn(`[WidgetText] ⚠️ Quick check: Image is blank (0 dimensions): ${asset.url}`);
                              img.dispatchEvent(new Event('error'));
                            }
                          }
                        }, 1000); // Check after 1 second
                        
                        // Set timeout to mark as failed if not loaded within time limit
                        const timeoutId = setTimeout(() => {
                          if (!loadedImageUrls.has(asset.url)) {
                            // Check if image is still not loaded or is broken
                            if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
                              console.warn(`[WidgetText] ⏱️ Image load timeout or broken: ${asset.url} (complete: ${img.complete}, size: ${img.naturalWidth}x${img.naturalHeight})`);
                              img.dispatchEvent(new Event('error'));
                            }
                          }
                        }, IMAGE_LOAD_TIMEOUT);
                        
                        // Clear timeouts if image loads successfully
                        img.addEventListener('load', () => {
                          clearTimeout(timeoutId);
                          clearTimeout(quickCheckId);
                          // Double-check dimensions on load
                          if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                            console.warn(`[WidgetText] ⚠️ Image loaded but has 0 dimensions: ${asset.url}`);
                            img.dispatchEvent(new Event('error'));
                          }
                        }, { once: true });
                        img.addEventListener('error', () => {
                          clearTimeout(timeoutId);
                          clearTimeout(quickCheckId);
                        }, { once: true });
                      }
                    }}
                    onError={(e) => {
                      console.error(`[WidgetText] ❌ FAILED to load image: ${asset.url}`, e);
                      const target = e.target as HTMLImageElement;
                      
                      // Immediately hide the image
                      target.style.display = 'none';
                      target.style.opacity = '0';
                      target.style.visibility = 'hidden';
                      
                      // Find and hide/remove the entire card container IMMEDIATELY
                      const cardContainer = target.closest('[data-asset-url]') as HTMLElement;
                      if (cardContainer) {
                        console.log(`[WidgetText] 🗑️ Removing card container immediately: ${asset.url}`);
                        // Remove from DOM immediately (no delay)
                        if (cardContainer.parentNode) {
                          cardContainer.remove();
                          console.log(`[WidgetText] 🗑️ Removed from DOM: ${asset.url}`);
                        } else {
                          // Fallback: hide if parent not found
                          cardContainer.style.display = 'none';
                          cardContainer.style.visibility = 'hidden';
                          cardContainer.style.height = '0';
                          cardContainer.style.margin = '0';
                          cardContainer.style.padding = '0';
                          cardContainer.style.overflow = 'hidden';
                        }
                      }
                      
                      // Update state to filter it out on next render
                      setFailedImageUrls(prev => {
                        if (prev.includes(asset.url)) {
                          return prev;
                        }
                        const updated = [...prev, asset.url];
                        console.log(`[WidgetText] ✅ Added to failed list. Total failed: ${updated.length}`);
                        return updated;
                      });
                    }}
                    onLoad={(e) => {
                      const target = e.target as HTMLImageElement;
                      // Check if image actually has valid dimensions
                      if (target.naturalWidth === 0 || target.naturalHeight === 0) {
                        console.warn(`[WidgetText] ⚠️ Image loaded but has 0 dimensions (blank): ${asset.url}`);
                        // Trigger error handler to remove it
                        target.dispatchEvent(new Event('error'));
                        return;
                      }
                      console.log(`[WidgetText] ✅ Successfully loaded: ${asset.type} - ${asset.url} (${target.naturalWidth}x${target.naturalHeight})`);
                      // Ensure image is visible
                      target.style.display = 'block';
                      target.style.opacity = '1';
                      target.style.visibility = 'visible';
                      setLoadedImageUrls(prev => new Set(prev).add(asset.url));
                      setFailedImageUrls(prev => prev.filter(url => url !== asset.url));
                    }}
                  />
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
              </div>
              );
            })}
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

