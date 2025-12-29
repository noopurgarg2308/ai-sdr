"use client";

import { useState, useEffect } from "react";

interface Company {
  id: string;
  slug: string;
  displayName: string;
  shortDescription: string;
  websiteUrl?: string;
  ownerEmail?: string;
  createdAt: string;
  _count?: {
    demoClips: number;
  };
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  // Form state
  const [formData, setFormData] = useState({
    slug: "",
    displayName: "",
    shortDescription: "",
    websiteUrl: "",
    productSummary: "",
    ownerEmail: "",
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await fetch("/api/admin/companies");
      if (!response.ok) throw new Error("Failed to fetch companies");
      const data = await response.json();
      setCompanies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load companies");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(undefined);
    setSuccess(undefined);

    try {
      const response = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create company");
      }

      setSuccess("Company created successfully!");
      setFormData({
        slug: "",
        displayName: "",
        shortDescription: "",
        websiteUrl: "",
        productSummary: "",
        ownerEmail: "",
      });
      fetchCompanies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create company");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEmbedCode = (slug: string) => {
    const domain = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";
    return `<iframe src="${domain}/widget/${slug}" width="100%" height="600" frameborder="0"></iframe>`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Company Management</h1>

        {/* Create Company Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Company</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug * <span className="text-gray-500">(URL-friendly identifier)</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="hypersonix"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Hypersonix"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Short Description *
              </label>
              <input
                type="text"
                required
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                placeholder="AI-powered pricing optimization platform"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner Email
                </label>
                <input
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  placeholder="owner@example.com"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Summary
              </label>
              <textarea
                value={formData.productSummary}
                onChange={(e) => setFormData({ ...formData, productSummary: e.target.value })}
                placeholder="Brief description of the product for the AI assistant..."
                rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating..." : "Create Company"}
            </button>
          </form>
        </div>

        {/* Companies List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Existing Companies</h2>
          </div>

          {isLoading ? (
            <div className="p-6 text-center text-gray-500">Loading companies...</div>
          ) : companies.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No companies yet. Create one above!</div>
          ) : (
            <div className="divide-y">
              {companies.map((company) => (
                <div key={company.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{company.displayName}</h3>
                      <p className="text-sm text-gray-600">{company.shortDescription}</p>
                      <div className="mt-2 flex gap-4 text-sm text-gray-500">
                        <span>Slug: <code className="bg-gray-100 px-2 py-0.5 rounded">{company.slug}</code></span>
                        {company.websiteUrl && (
                          <a
                            href={company.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            🔗 Website
                          </a>
                        )}
                        {company._count && (
                          <span>{company._count.demoClips} demo clip(s)</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex gap-2">
                      <a
                        href={`/admin/companies/${company.id}/media`}
                        className="inline-block bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-blue-700"
                      >
                        📁 Media
                      </a>
                      <a
                        href={`/widget/${company.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-green-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-green-700"
                      >
                        Open Widget
                      </a>
                    </div>
                  </div>

                  {/* Embed Code */}
                  <div className="mt-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Embed Code:
                    </label>
                    <div className="bg-gray-100 p-3 rounded border border-gray-200">
                      <code className="text-xs text-gray-800 break-all">
                        {getEmbedCode(company.slug)}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(getEmbedCode(company.slug));
                          alert("Embed code copied to clipboard!");
                        }}
                        className="ml-3 text-xs text-blue-600 hover:underline"
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

