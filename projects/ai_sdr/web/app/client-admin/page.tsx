"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ClientAdminDashboardPage() {
  const [company, setCompany] = useState<{
    displayName: string;
    slug: string;
    openaiApiKeyConfigured: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client-admin/company")
      .then((r) => r.json())
      .then((d) => {
        setCompany(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (!company) return <div className="text-red-600">Failed to load</div>;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {company.displayName}</h1>
        <p className="text-gray-600 mt-1">Manage your AI SDR configuration.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/client-admin/api-keys"
          className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow transition"
        >
          <h2 className="font-semibold text-gray-900">API Keys</h2>
          <p className="text-sm text-gray-600 mt-1">
            {company.openaiApiKeyConfigured ? "✓ Configured" : "Add your OpenAI API key"}
          </p>
        </Link>
        <Link
          href="/client-admin/content"
          className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow transition"
        >
          <h2 className="font-semibold text-gray-900">Content</h2>
          <p className="text-sm text-gray-600 mt-1">
            Website URLs, PDFs, product summary
          </p>
        </Link>
        <Link
          href="/client-admin/embed"
          className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow transition"
        >
          <h2 className="font-semibold text-gray-900">Embed Code</h2>
          <p className="text-sm text-gray-600 mt-1">
            Get your widget embed code
          </p>
        </Link>
      </div>

      <div className="p-4 bg-blue-50 rounded border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Quick links:</strong>{" "}
          <a href={`${baseUrl}/widget/${company.slug}`} target="_blank" rel="noopener noreferrer" className="underline">
            Voice widget
          </a>
          {" · "}
          <a href={`${baseUrl}/widget-text/${company.slug}`} target="_blank" rel="noopener noreferrer" className="underline">
            Text widget
          </a>
        </p>
      </div>
    </div>
  );
}
