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
  useVisuals?: boolean;
  useTavusVideo?: boolean;
  tavusReplicaId?: string | null;
  tavusPersonaId?: string | null;
  billingTier?: string | null;
  openaiApiKey?: string | null;
  openaiApiKeyConfigured?: boolean;
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

  // Website source form state
  const [showWebsiteForm, setShowWebsiteForm] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [websiteFormData, setWebsiteFormData] = useState({
    url: "",
    title: "",
    description: "",
    maxPages: "50",
    maxDepth: "3",
    includeImages: true,
  });
  const [isCreatingWebsite, setIsCreatingWebsite] = useState(false);
  const [websiteSources, setWebsiteSources] = useState<Array<{
    id: string;
    url: string;
    title: string;
    processingStatus?: string;
    companyId: string;
    processedAt?: string;
    metadata?: any;
  }>>([]);
  const [refreshingStatus, setRefreshingStatus] = useState<Set<string>>(new Set());
  const [expandedTavus, setExpandedTavus] = useState<Set<string>>(new Set());
  const [savingVisuals, setSavingVisuals] = useState<Set<string>>(new Set());
  const [tavusForm, setTavusForm] = useState<Record<string, { useTavusVideo: boolean; tavusReplicaId: string; tavusPersonaId: string }>>({});
  const [savingTavus, setSavingTavus] = useState<Set<string>>(new Set());
  const [expandedBYOK, setExpandedBYOK] = useState<Set<string>>(new Set());
  const [byokForm, setByokForm] = useState<Record<string, { billingTier: string; openaiApiKey: string }>>({});
  const [savingBYOK, setSavingBYOK] = useState<Set<string>>(new Set());

  // Client admin user form
  const [clientAdminForm, setClientAdminForm] = useState({
    companyId: "",
    email: "",
    password: "",
  });
  const [isCreatingClientAdmin, setIsCreatingClientAdmin] = useState(false);

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
    fetchWebsiteSources();
    
    // Auto-refresh website sources status every 5 seconds
    const interval = setInterval(() => {
      fetchWebsiteSources();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchWebsiteSources = async () => {
    try {
      // Fetch all website sources for all companies
      const response = await fetch("/api/admin/media/upload?type=website");
      if (response.ok) {
        const data = await response.json();
        const sources = data.sources || [];
        
        // Fetch detailed status for each source
        const sourcesWithStatus = await Promise.all(
          sources.map(async (source: any) => {
            try {
              const statusResponse = await fetch(
                `/api/admin/companies/${source.companyId}/websites/${source.id}/crawl`
              );
              if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                return {
                  ...source,
                  processingStatus: statusData.processingStatus || source.processingStatus,
                  processedAt: statusData.processedAt || source.processedAt,
                  metadata: statusData.metadata || {},
                };
              }
            } catch (err) {
              // If status fetch fails, use basic info
            }
            return source;
          })
        );
        
        setWebsiteSources(sourcesWithStatus);
      }
    } catch (err) {
      console.error("Failed to fetch website sources:", err);
      // Silently fail - website sources are optional
    }
  };

  const refreshSourceStatus = async (companyId: string, sourceId: string) => {
    setRefreshingStatus(prev => new Set(prev).add(sourceId));
    try {
      const response = await fetch(
        `/api/admin/companies/${companyId}/websites/${sourceId}/crawl`
      );
      if (response.ok) {
        const statusData = await response.json();
        setWebsiteSources(prev => prev.map(s => 
          s.id === sourceId 
            ? { ...s, processingStatus: statusData.processingStatus, processedAt: statusData.processedAt, metadata: statusData.metadata || {} }
            : s
        ));
      }
    } catch (err) {
      console.error("Failed to refresh status:", err);
    } finally {
      setRefreshingStatus(prev => {
        const next = new Set(prev);
        next.delete(sourceId);
        return next;
      });
    }
  };

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

  const handleCreateWebsiteSource = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompanyId || !websiteFormData.url) {
      setError("Please select a company and enter a website URL");
      return;
    }

    setIsCreatingWebsite(true);
    setError(undefined);
    setSuccess(undefined);

    try {
      // Create website source
      const createResponse = await fetch("/api/admin/media/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          type: "website",
          url: websiteFormData.url,
          title: websiteFormData.title || `Website: ${new URL(websiteFormData.url).hostname}`,
          description: websiteFormData.description,
          metadata: {
            maxPages: parseInt(websiteFormData.maxPages) || 50,
            maxDepth: parseInt(websiteFormData.maxDepth) || 3,
            includeImages: websiteFormData.includeImages,
          },
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || "Failed to create website source");
      }

      const sourceData = await createResponse.json();
      const sourceId = sourceData.id || sourceData.asset?.id;

      // Trigger crawl
      const crawlResponse = await fetch(
        `/api/admin/companies/${selectedCompanyId}/websites/${sourceId}/crawl`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            maxPages: parseInt(websiteFormData.maxPages) || 50,
            maxDepth: parseInt(websiteFormData.maxDepth) || 3,
            includeImages: websiteFormData.includeImages,
          }),
        }
      );

      if (!crawlResponse.ok) {
        throw new Error("Website source created but crawl failed to start");
      }

      setSuccess(`Website source created and crawl queued! Job ID: ${(await crawlResponse.json()).jobId}`);
      setWebsiteFormData({
        url: "",
        title: "",
        description: "",
        maxPages: "50",
        maxDepth: "3",
        includeImages: true,
      });
      setShowWebsiteForm(false);
      fetchWebsiteSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create website source");
    } finally {
      setIsCreatingWebsite(false);
    }
  };

  const handleSaveVisuals = async (companyId: string, useVisuals: boolean) => {
    setSavingVisuals((prev) => new Set(prev).add(companyId));
    try {
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useVisuals }),
      });
      if (!response.ok) throw new Error("Failed to save");
      setSuccess("Visuals settings saved");
      fetchCompanies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingVisuals((prev) => {
        const next = new Set(prev);
        next.delete(companyId);
        return next;
      });
    }
  };

  const handleSaveTavus = async (companyId: string) => {
    const form = tavusForm[companyId];
    if (!form) return;
    setSavingTavus((prev) => new Set(prev).add(companyId));
    try {
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          useTavusVideo: form.useTavusVideo,
          tavusReplicaId: form.tavusReplicaId.trim() || null,
          tavusPersonaId: form.tavusPersonaId.trim() || null,
        }),
      });
      if (!response.ok) throw new Error("Failed to save");
      setSuccess("Tavus settings saved");
      fetchCompanies();
      setExpandedTavus((prev) => {
        const next = new Set(prev);
        next.delete(companyId);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save Tavus settings");
    } finally {
      setSavingTavus((prev) => {
        const next = new Set(prev);
        next.delete(companyId);
        return next;
      });
    }
  };

  const toggleBYOKForm = (company: Company) => {
    setExpandedBYOK((prev) => {
      const next = new Set(prev);
      if (next.has(company.id)) {
        next.delete(company.id);
      } else {
        next.add(company.id);
        setByokForm((f) => ({
          ...f,
          [company.id]: {
            billingTier: company.billingTier || "",
            openaiApiKey: "", // Never pre-fill actual key
          },
        }));
      }
      return next;
    });
  };

  const handleSaveBYOK = async (companyId: string) => {
    const form = byokForm[companyId];
    if (!form) return;
    setSavingBYOK((prev) => new Set(prev).add(companyId));
    try {
      const body: Record<string, string | null> = {
        billingTier: form.billingTier || null,
      };
      if (form.openaiApiKey.trim()) {
        body.openaiApiKey = form.openaiApiKey.trim();
      }
      const response = await fetch(`/api/admin/companies/${companyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Failed to save");
      setSuccess("BYOK settings saved");
      fetchCompanies();
      setExpandedBYOK((prev) => {
        const next = new Set(prev);
        next.delete(companyId);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save BYOK settings");
    } finally {
      setSavingBYOK((prev) => {
        const next = new Set(prev);
        next.delete(companyId);
        return next;
      });
    }
  };

  const toggleTavusForm = (company: Company) => {
    setExpandedTavus((prev) => {
      const next = new Set(prev);
      if (next.has(company.id)) {
        next.delete(company.id);
      } else {
        next.add(company.id);
        setTavusForm((f) => ({
          ...f,
          [company.id]: {
            useTavusVideo: company.useTavusVideo ?? false,
            tavusReplicaId: company.tavusReplicaId ?? "",
            tavusPersonaId: company.tavusPersonaId ?? "",
          },
        }));
      }
      return next;
    });
  };

  const handleTriggerCrawl = async (companyId: string, sourceId: string) => {
    try {
      const response = await fetch(
        `/api/admin/companies/${companyId}/websites/${sourceId}/crawl`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            forceReindex: false,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to trigger crawl");
      
      const data = await response.json();
      setSuccess(`Crawl queued! Job ID: ${data.jobId}`);
      fetchWebsiteSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger crawl");
    }
  };

  const handleCreateClientAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientAdminForm.companyId || !clientAdminForm.email || !clientAdminForm.password) {
      setError("Company, email, and password are required");
      return;
    }
    setIsCreatingClientAdmin(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      const response = await fetch("/api/admin/client-admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: clientAdminForm.companyId,
          email: clientAdminForm.email.trim(),
          password: clientAdminForm.password.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create user");
      }
      setSuccess(`Client admin user ${data.user.email} created for ${data.user.companyDisplayName}. Login at ${data.loginUrl}`);
      setClientAdminForm({ companyId: clientAdminForm.companyId, email: "", password: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setIsCreatingClientAdmin(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Company Management</h1>

        {(error || success) && (
          <div className={`mb-6 p-3 rounded ${
            error ? "bg-red-100 border border-red-300 text-red-800" :
            "bg-green-100 border border-green-300 text-green-800"
          }`}>
            {error || success}
          </div>
        )}

        {/* Create Client Admin User */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create Client Admin User</h2>
          <p className="text-sm text-gray-600 mb-4">
            Create a user who can log in to the client admin portal for a specific company.
          </p>
          <form onSubmit={handleCreateClientAdmin} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
              <select
                required
                value={clientAdminForm.companyId}
                onChange={(e) => setClientAdminForm({ ...clientAdminForm, companyId: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a company...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName} ({c.slug})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (username) *</label>
              <input
                type="email"
                required
                value={clientAdminForm.email}
                onChange={(e) => setClientAdminForm({ ...clientAdminForm, email: e.target.value })}
                placeholder="user@example.com"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                type="password"
                required
                value={clientAdminForm.password}
                onChange={(e) => setClientAdminForm({ ...clientAdminForm, password: e.target.value })}
                placeholder="Temporary password"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Share this with the user securely. They can log in at /client-admin/login.</p>
            </div>
            <button
              type="submit"
              disabled={isCreatingClientAdmin || companies.length === 0}
              className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isCreatingClientAdmin ? "Creating..." : "Create Client Admin User"}
            </button>
          </form>
        </div>

        {/* Website Source Management */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Website Source Management</h2>
            <button
              onClick={() => {
                setShowWebsiteForm(!showWebsiteForm);
                if (!showWebsiteForm && companies.length > 0) {
                  setSelectedCompanyId(companies[0].id);
                }
              }}
              className="bg-purple-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-purple-700"
            >
              {showWebsiteForm ? "Cancel" : "+ Add Website Source"}
            </button>
          </div>

          {(error || success) && (
            <div className={`mb-4 p-3 rounded ${
              error ? "bg-red-100 border border-red-300 text-red-800" :
              "bg-green-100 border border-green-300 text-green-800"
            }`}>
              {error || success}
            </div>
          )}

          {showWebsiteForm && (
            <form onSubmit={handleCreateWebsiteSource} className="space-y-4 border-t pt-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company *
                </label>
                <select
                  required
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select a company...</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.displayName} ({company.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website URL *
                </label>
                <input
                  type="url"
                  required
                  value={websiteFormData.url}
                  onChange={(e) => setWebsiteFormData({ ...websiteFormData, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title (optional)
                  </label>
                  <input
                    type="text"
                    value={websiteFormData.title}
                    onChange={(e) => setWebsiteFormData({ ...websiteFormData, title: e.target.value })}
                    placeholder="Auto-filled from URL if empty"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={websiteFormData.description}
                    onChange={(e) => setWebsiteFormData({ ...websiteFormData, description: e.target.value })}
                    placeholder="Brief description"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Pages
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={websiteFormData.maxPages}
                    onChange={(e) => setWebsiteFormData({ ...websiteFormData, maxPages: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Depth
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={websiteFormData.maxDepth}
                    onChange={(e) => setWebsiteFormData({ ...websiteFormData, maxDepth: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={websiteFormData.includeImages}
                      onChange={(e) => setWebsiteFormData({ ...websiteFormData, includeImages: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Include Images</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingWebsite || !selectedCompanyId}
                className="bg-purple-600 text-white px-6 py-2 rounded font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isCreatingWebsite ? "Creating..." : "Create & Start Crawl"}
              </button>
            </form>
          )}

          {/* Existing Website Sources */}
          {websiteSources.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Existing Website Sources</h3>
                <button
                  onClick={fetchWebsiteSources}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  🔄 Refresh All
                </button>
              </div>
              <div className="space-y-2">
                {websiteSources.map((source) => {
                  const company = companies.find(c => c.id === source.companyId);
                  const isRefreshing = refreshingStatus.has(source.id);
                  const metadata = source.metadata || {};
                  
                  return (
                    <div key={source.id} className="p-3 bg-gray-50 rounded border">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{source.title}</div>
                          <div className="text-xs text-gray-600 mt-1">{source.url}</div>
                          {company && (
                            <div className="text-xs text-gray-500 mt-1">Company: {company.displayName}</div>
                          )}
                          
                          {/* Status Section */}
                          <div className="mt-2 space-y-1">
                            {source.processingStatus && (
                              <div className="text-xs">
                                Status: <span className={`font-medium ${
                                  source.processingStatus === "completed" ? "text-green-600" :
                                  source.processingStatus === "processing" ? "text-blue-600" :
                                  source.processingStatus === "failed" ? "text-red-600" :
                                  "text-gray-600"
                                }`}>
                                  {source.processingStatus}
                                  {source.processingStatus === "processing" && " ⏳"}
                                  {source.processingStatus === "completed" && " ✅"}
                                  {source.processingStatus === "failed" && " ❌"}
                                </span>
                              </div>
                            )}
                            
                            {/* Show crawl results if completed */}
                            {source.processingStatus === "completed" && metadata && (
                              <div className="text-xs text-gray-600 space-y-0.5">
                                {metadata.pagesProcessed !== undefined && (
                                  <div>📄 Pages: {metadata.pagesProcessed}</div>
                                )}
                                {metadata.imagesCollected !== undefined && (
                                  <div>🖼️ Images: {metadata.imagesCollected}</div>
                                )}
                                {metadata.documentsCreated !== undefined && (
                                  <div>📝 Documents: {metadata.documentsCreated}</div>
                                )}
                                {metadata.lastCrawledAt && (
                                  <div className="text-gray-500">
                                    Last crawled: {new Date(metadata.lastCrawledAt).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {source.processingStatus === "processing" && (
                              <div className="text-xs text-blue-600 italic">
                                Crawling in progress... (auto-refreshing every 5s)
                              </div>
                            )}
                            
                            {source.processedAt && source.processingStatus === "completed" && (
                              <div className="text-xs text-gray-500">
                                Completed: {new Date(source.processedAt).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          {source.companyId && company && (
                            <>
                              <a
                                href={`/widget/${company.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-green-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-green-700"
                                title="Open SDR Widget"
                              >
                                💬 Chat
                              </a>
                              <button
                                onClick={() => refreshSourceStatus(source.companyId, source.id)}
                                disabled={isRefreshing}
                                className="bg-gray-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                title="Refresh status"
                              >
                                {isRefreshing ? "..." : "🔄"}
                              </button>
                              <button
                                onClick={() => handleTriggerCrawl(source.companyId, source.id)}
                                className="bg-purple-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-purple-700"
                              >
                                Re-crawl
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

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

                  {/* Tier 1 BYOK - Bring Your Own Key */}
                  <div className="mt-4 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => toggleBYOKForm(company)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      {expandedBYOK.has(company.id) ? "▼" : "▶"} Tier 1 BYOK (Bring Your Own Key)
                      {company.billingTier === "byok" && company.openaiApiKeyConfigured && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Configured</span>
                      )}
                    </button>
                    {expandedBYOK.has(company.id) && byokForm[company.id] && (
                      <div className="mt-3 p-4 bg-blue-50 rounded border border-blue-200 space-y-3">
                        <p className="text-xs text-gray-600">
                          When set to BYOK, the client provides their own OpenAI API key. The AI SDR will not work until the key is configured.
                        </p>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Billing Tier</label>
                          <select
                            value={byokForm[company.id].billingTier}
                            onChange={(e) =>
                              setByokForm((f) => ({
                                ...f,
                                [company.id]: { ...f[company.id], billingTier: e.target.value },
                              }))
                            }
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Platform key (default)</option>
                            <option value="byok">BYOK (Bring Your Own Key)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">OpenAI API Key</label>
                          <input
                            type="password"
                            value={byokForm[company.id].openaiApiKey}
                            onChange={(e) =>
                              setByokForm((f) => ({
                                ...f,
                                [company.id]: { ...f[company.id], openaiApiKey: e.target.value },
                              }))
                            }
                            placeholder={company.openaiApiKeyConfigured ? "•••••••• (leave blank to keep existing)" : "sk-..."}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {company.openaiApiKeyConfigured && (
                            <p className="text-xs text-gray-500 mt-1">Current: {company.openaiApiKey}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSaveBYOK(company.id)}
                          disabled={savingBYOK.has(company.id)}
                          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {savingBYOK.has(company.id) ? "Saving..." : "Save BYOK Settings"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Visuals (images, demos, videos) - OFF by default for MVP */}
                  <div className="mt-4 border-t pt-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Show images, demos & videos</span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {company.useVisuals ? "Enabled" : "OFF (MVP default) — text/voice only"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={company.useVisuals ?? false}
                            onChange={(e) => handleSaveVisuals(company.id, e.target.checked)}
                            disabled={savingVisuals.has(company.id)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">Enable</span>
                        </label>
                        {savingVisuals.has(company.id) && <span className="text-xs text-gray-500">Saving...</span>}
                      </div>
                    </div>
                  </div>

                  {/* Tavus (Video Avatar) - Optional per company */}
                  <div className="mt-4 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => toggleTavusForm(company)}
                      className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1"
                    >
                      {expandedTavus.has(company.id) ? "▼" : "▶"} Tavus Video Avatar
                      {company.useTavusVideo && company.tavusReplicaId && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Enabled</span>
                      )}
                    </button>
                    {expandedTavus.has(company.id) && tavusForm[company.id] && (
                      <div className="mt-3 p-4 bg-purple-50 rounded border border-purple-200 space-y-3">
                        <p className="text-xs text-gray-600">
                          Enable video avatar mode for this company. Requires Tavus replica ID. Leave disabled for MVP (text + voice only).
                        </p>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={tavusForm[company.id].useTavusVideo}
                            onChange={(e) =>
                              setTavusForm((f) => ({
                                ...f,
                                [company.id]: { ...f[company.id], useTavusVideo: e.target.checked },
                              }))
                            }
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm font-medium">Enable Tavus Video Avatar</span>
                        </label>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Tavus Replica ID *</label>
                          <input
                            type="text"
                            value={tavusForm[company.id].tavusReplicaId}
                            onChange={(e) =>
                              setTavusForm((f) => ({
                                ...f,
                                [company.id]: { ...f[company.id], tavusReplicaId: e.target.value },
                              }))
                            }
                            placeholder="Required when video enabled"
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Tavus Persona ID (optional)</label>
                          <input
                            type="text"
                            value={tavusForm[company.id].tavusPersonaId}
                            onChange={(e) =>
                              setTavusForm((f) => ({
                                ...f,
                                [company.id]: { ...f[company.id], tavusPersonaId: e.target.value },
                              }))
                            }
                            placeholder="Leave empty to auto-create"
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSaveTavus(company.id)}
                          disabled={savingTavus.has(company.id)}
                          className="bg-purple-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {savingTavus.has(company.id) ? "Saving..." : "Save Tavus Settings"}
                        </button>
                      </div>
                    )}
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

