"use client";

import { useState, useEffect } from "react";

export default function ClientAdminEmbedPage() {
  const [company, setCompany] = useState<{ slug: string } | null>(null);

  useEffect(() => {
    fetch("/api/client-admin/company")
      .then((r) => r.json())
      .then((d) => setCompany(d));
  }, []);

  if (!company) return <div className="text-gray-500">Loading...</div>;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const embedCode = `<iframe src="${baseUrl}/widget/${company.slug}" width="100%" height="600" frameborder="0"></iframe>`;

  function copyToClipboard() {
    navigator.clipboard.writeText(embedCode);
    alert("Copied to clipboard!");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Embed Code</h1>
      <p className="text-gray-600">
        Add this iframe to your website to embed the AI SDR widget.
      </p>

      <div className="p-6 bg-white rounded-lg border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">iframe (voice)</label>
        <pre className="p-4 bg-gray-100 rounded text-sm overflow-x-auto">{embedCode}</pre>
        <button
          onClick={copyToClipboard}
          className="mt-3 px-4 py-2 bg-gray-200 text-gray-800 rounded font-medium hover:bg-gray-300"
        >
          Copy
        </button>
      </div>

      <div className="p-6 bg-white rounded-lg border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">Text widget (no voice)</label>
        <pre className="p-4 bg-gray-100 rounded text-sm overflow-x-auto">{`<iframe src="${baseUrl}/widget-text/${company.slug}" width="100%" height="600" frameborder="0"></iframe>`}</pre>
      </div>

      <div className="p-4 bg-blue-50 rounded border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Direct links:</strong><br />
          Voice: <a href={`${baseUrl}/widget/${company.slug}`} target="_blank" rel="noopener noreferrer" className="underline">{baseUrl}/widget/{company.slug}</a><br />
          Text: <a href={`${baseUrl}/widget-text/${company.slug}`} target="_blank" rel="noopener noreferrer" className="underline">{baseUrl}/widget-text/{company.slug}</a>
        </p>
      </div>
    </div>
  );
}
