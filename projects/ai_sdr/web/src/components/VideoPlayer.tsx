"use client";

import { useRef, useEffect } from "react";

interface VideoPlayerProps {
  src: string;
  title: string;
  description?: string;
  poster?: string;
  startTime?: number; // seconds
  timestamps?: Array<{
    time: number;
    label: string;
  }>;
}

export default function VideoPlayer({
  src,
  title,
  description,
  poster,
  startTime,
  timestamps,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && startTime) {
      // Set video to start at specific timestamp
      videoRef.current.currentTime = startTime;
    }
  }, [startTime]);

  const jumpToTime = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };

  return (
    <div>
      <video
        ref={videoRef}
        src={src}
        controls
        poster={poster}
        className="w-full rounded-lg shadow-md"
      />
      <div className="p-3">
        <p className="font-medium text-sm text-gray-900">{title}</p>
        {description && (
          <p className="text-xs text-gray-600 mt-1">{description}</p>
        )}
        
        {timestamps && timestamps.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs font-medium text-gray-700">Jump to:</p>
            <div className="flex flex-wrap gap-2">
              {timestamps.map((ts, index) => (
                <button
                  key={index}
                  onClick={() => jumpToTime(ts.time)}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  {formatTime(ts.time)} - {ts.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

