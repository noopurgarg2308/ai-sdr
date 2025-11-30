"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface FrameAnalysis {
  timestamp: number;
  description: string;
  frameUrl?: string;
}

interface MediaAsset {
  id: string;
  type: string;
  url: string;
  title: string;
  description?: string;
  category?: string;
  processingStatus?: string;
  transcript?: string;
  frameAnalysis?: FrameAnalysis[];
  extractedText?: string;
  processedAt?: string;
  createdAt: string;
  documents?: Array<{ id: string; title: string }>;
}

export default function CompanyMediaPage() {
  const params = useParams();
  const companyId = params.id as string;

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>();
  const [error, setError] = useState<string>();
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("product");
  const [autoProcess, setAutoProcess] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchAssets();
  }, [companyId]);

  const fetchAssets = async () => {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/media`);
      if (!response.ok) throw new Error("Failed to fetch media assets");
      
      const data = await response.json();
      setAssets(data.assets || []);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assets");
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      
      // Auto-fill title from filename if empty
      if (!title) {
        const filename = e.target.files[0].name.replace(/\.[^/.]+$/, "");
        setTitle(filename.replace(/[-_]/g, " "));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError("Please select a file");
      return;
    }

    setIsUploading(true);
    setError(undefined);
    setUploadProgress("Uploading file...");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("companyId", companyId);
      formData.append("title", title);
      if (description) formData.append("description", description);
      if (category) formData.append("category", category);
      formData.append("autoProcess", autoProcess.toString());

      const response = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();

      if (data.jobId && autoProcess) {
        setUploadProgress("Processing content (OCR/transcription)...");
        
        // Poll job status
        await pollJobStatus(data.jobId);
      }

      setUploadProgress(undefined);
      alert("Upload successful!");
      
      // Reset form
      setTitle("");
      setDescription("");
      setSelectedFile(null);
      (document.getElementById("file-input") as HTMLInputElement).value = "";
      
      fetchAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploadProgress(undefined);
    } finally {
      setIsUploading(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`/api/admin/media/jobs/${jobId}`);
        if (response.ok) {
          const job = await response.json();
          
          if (job.status === "completed") {
            console.log("Processing completed!");
            return;
          } else if (job.status === "failed") {
            throw new Error(job.error || "Processing failed");
          }
          
          // Update progress
          setUploadProgress(`Processing... ${job.progress || 0}%`);
        }
      } catch (err) {
        console.error("Error polling job:", err);
      }

      await new Promise((resolve) => setTimeout(resolve, 5000)); // Poll every 5s
      attempts++;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Media Library</h1>
          <p className="text-gray-600 mt-2">
            Upload images and videos with automatic OCR and transcription
          </p>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Upload Media</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded">
              {error}
            </div>
          )}

          {uploadProgress && (
            <div className="mb-4 p-3 bg-blue-100 border border-blue-300 text-blue-800 rounded">
              {uploadProgress}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File * (Images or Videos)
              </label>
              <input
                id="file-input"
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Dashboard Screenshot"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="product">Product</option>
                  <option value="feature">Feature</option>
                  <option value="pricing">Pricing</option>
                  <option value="demo">Demo</option>
                  <option value="comparison">Comparison</option>
                  <option value="architecture">Architecture</option>
                  <option value="case-study">Case Study</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the content..."
                rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto-process"
                checked={autoProcess}
                onChange={(e) => setAutoProcess(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="auto-process" className="text-sm text-gray-700">
                <strong>Auto-process</strong> - Extract text via OCR/transcription (recommended)
              </label>
            </div>

            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isUploading ? "Uploading..." : "Upload & Process"}
            </button>
          </form>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-blue-900 mb-2">How It Works:</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✅ <strong>Images</strong>: GPT-4 Vision extracts text, UI elements, and descriptions</li>
            <li>✅ <strong>Videos</strong>: Whisper transcribes audio + Vision analyzes key frames</li>
            <li>✅ <strong>Auto-indexed</strong>: Content becomes searchable in chat via RAG</li>
            <li>✅ <strong>Smart display</strong>: AI shows visuals when answering questions</li>
            <li>⏱️ <strong>Processing time</strong>: Images ~5-10s, Videos ~30-60s per minute</li>
          </ul>
        </div>

        {/* Media Library */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Uploaded Media</h2>
          {isLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : assets.length === 0 ? (
            <p className="text-gray-500">No media uploaded yet. Upload your first image or video above!</p>
          ) : (
            <div className="space-y-4">
              {assets.map((asset) => (
                <div key={asset.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{asset.title}</h3>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {asset.type}
                        </span>
                        {asset.processingStatus && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            asset.processingStatus === "completed" ? "bg-green-100 text-green-800" :
                            asset.processingStatus === "processing" ? "bg-yellow-100 text-yellow-800" :
                            asset.processingStatus === "failed" ? "bg-red-100 text-red-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {asset.processingStatus}
                          </span>
                        )}
                      </div>
                      {asset.description && (
                        <p className="text-sm text-gray-600 mb-2">{asset.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Uploaded: {new Date(asset.createdAt).toLocaleString()}</span>
                        {asset.processedAt && (
                          <span>Processed: {new Date(asset.processedAt).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedAsset(expandedAsset === asset.id ? null : asset.id)}
                      className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      {expandedAsset === asset.id ? "Hide Details" : "Show Details"}
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {expandedAsset === asset.id && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {/* Video Preview */}
                      {asset.type === "video" && (
                        <div>
                          <video
                            src={asset.url}
                            controls
                            className="w-full max-w-2xl rounded-lg"
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      )}

                      {/* Image Preview */}
                      {asset.type === "image" && (
                        <div>
                          <img
                            src={asset.url}
                            alt={asset.title}
                            className="max-w-2xl rounded-lg border"
                          />
                        </div>
                      )}

                      {/* Transcript */}
                      {asset.transcript && (
                        <div>
                          <h4 className="font-semibold mb-2">📝 Transcript</h4>
                          <div className="bg-gray-50 rounded p-3 max-h-60 overflow-y-auto">
                            <p className="text-sm whitespace-pre-wrap">{asset.transcript}</p>
                          </div>
                        </div>
                      )}

                      {/* Frame Analysis */}
                      {asset.frameAnalysis && asset.frameAnalysis.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">🖼️ Frame Analysis ({asset.frameAnalysis.length} frames)</h4>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {asset.frameAnalysis.map((frame, idx) => (
                              <div key={idx} className="bg-gray-50 rounded p-3 border">
                                <div className="flex items-start gap-3">
                                  {frame.frameUrl && (
                                    <img
                                      src={frame.frameUrl}
                                      alt={`Frame at ${formatTimestamp(frame.timestamp)}`}
                                      className="w-32 h-20 object-cover rounded border"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                      }}
                                    />
                                  )}
                                  <div className="flex-1">
                                    <div className="text-xs text-gray-500 mb-1">
                                      {formatTimestamp(frame.timestamp)}
                                    </div>
                                    <p className="text-sm">{frame.description}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Extracted Text (for images) */}
                      {asset.type === "image" && asset.extractedText && (
                        <div>
                          <h4 className="font-semibold mb-2">📄 Extracted Text</h4>
                          <div className="bg-gray-50 rounded p-3 max-h-60 overflow-y-auto">
                            <p className="text-sm whitespace-pre-wrap">{asset.extractedText}</p>
                          </div>
                        </div>
                      )}

                      {/* Linked Documents */}
                      {asset.documents && asset.documents.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">📚 Linked RAG Documents</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {asset.documents.map((doc) => (
                              <li key={doc.id} className="text-sm text-gray-600">{doc.title}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* No processing results */}
                      {!asset.transcript && !asset.frameAnalysis && !asset.extractedText && (
                        <div className="text-sm text-gray-500 italic">
                          {asset.processingStatus === "processing" 
                            ? "Processing in progress..." 
                            : asset.processingStatus === "failed"
                            ? "Processing failed. Check logs for details."
                            : "No processing results yet. Enable auto-process when uploading."}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

