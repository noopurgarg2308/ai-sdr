"use client";

import { useState, useEffect } from "react";

export default function ClientAdminContentPage() {
  const [company, setCompany] = useState<{
    productSummary: string;
    shortDescription: string;
    displayName: string;
  } | null>(null);
  const [productSummary, setProductSummary] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteTitle, setWebsiteTitle] = useState("");
  const [websites, setWebsites] = useState<Array<{ id: string; url: string; title: string; processingStatus?: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [addingWebsite, setAddingWebsite] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    fetch("/api/client-admin/company")
      .then((r) => r.json())
      .then((d) => {
        setCompany(d);
        setProductSummary(d.productSummary ?? "");
        setShortDescription(d.shortDescription ?? "");
      });
    fetch("/api/client-admin/website")
      .then((r) => r.json())
      .then((d) => setWebsites(d.sources || []));
  }, []);

  async function handleSaveSummaries(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/client-admin/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSummary,
          shortDescription,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setMessage({ type: "success", text: "Saved." });
    } catch {
      setMessage({ type: "error", text: "Failed to save" });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddWebsite(e: React.FormEvent) {
    e.preventDefault();
    if (!websiteUrl.trim()) return;
    setAddingWebsite(true);
    setMessage(null);
    try {
      const res = await fetch("/api/client-admin/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: websiteUrl.trim(),
          title: websiteTitle.trim() || undefined,
          maxPages: 50,
          maxDepth: 3,
        }),
      });
      if (!res.ok) throw new Error("Add failed");
      const data = await res.json();
      setWebsites((prev) => [...prev, { id: data.id, url: websiteUrl, title: websiteTitle || websiteUrl, processingStatus: "processing" }]);
      setWebsiteUrl("");
      setWebsiteTitle("");
      setMessage({ type: "success", text: "Website added. Crawl started." });
    } catch {
      setMessage({ type: "error", text: "Failed to add website" });
    } finally {
      setAddingWebsite(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile || !uploadTitle.trim()) return;
    setUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      form.append("title", uploadTitle);
      const res = await fetch("/api/client-admin/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      setMessage({ type: "success", text: "PDF uploaded. Processing started." });
      setUploadTitle("");
      setUploadFile(null);
    } catch {
      setMessage({ type: "error", text: "Upload failed" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Content</h1>

      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      <section className="p-6 bg-white rounded-lg border border-gray-200">
        <h2 className="font-semibold text-gray-900 mb-4">Product & Company Summary</h2>
        <p className="text-sm text-gray-600 mb-4">
          The AI SDR uses this to answer questions. Be detailed.
        </p>
        <form onSubmit={handleSaveSummaries} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Summary</label>
            <textarea
              value={productSummary}
              onChange={(e) => setProductSummary(e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your product, features, pricing..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Short Description (one line)</label>
            <input
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. AI-powered pricing optimization"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </form>
      </section>

      <section className="p-6 bg-white rounded-lg border border-gray-200">
        <h2 className="font-semibold text-gray-900 mb-4">Website to Crawl</h2>
        <p className="text-sm text-gray-600 mb-4">
          Add a URL to crawl. The AI will search this content.
        </p>
        <form onSubmit={handleAddWebsite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website URL *</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
            <input
              type="text"
              value={websiteTitle}
              onChange={(e) => setWebsiteTitle(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="My Website"
            />
          </div>
          <button
            type="submit"
            disabled={addingWebsite}
            className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {addingWebsite ? "Adding..." : "Add & Crawl"}
          </button>
        </form>
        {websites.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Websites:</p>
            <ul className="space-y-1 text-sm text-gray-600">
              {websites.map((w) => (
                <li key={w.id}>{w.url} — {w.processingStatus || "completed"}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="p-6 bg-white rounded-lg border border-gray-200">
        <h2 className="font-semibold text-gray-900 mb-4">Upload PDF</h2>
        <p className="text-sm text-gray-600 mb-4">
          Upload PDFs for the AI to search.
        </p>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Product Brochure"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PDF File *</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={uploading || !uploadFile || !uploadTitle.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
      </section>
    </div>
  );
}
