"use client";

import { useState, useEffect } from "react";

export default function ClientAdminApiKeysPage() {
  const [apiKey, setApiKey] = useState("");
  const [billingTier, setBillingTier] = useState("");
  const [configured, setConfigured] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<{ model: string; status: string; message?: string }[] | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/client-admin/company")
      .then((r) => r.json())
      .then((d) => {
        setBillingTier(d.billingTier || "");
        setConfigured(d.openaiApiKeyConfigured || false);
      });
  }, []);

  async function handleTest() {
    if (!apiKey.trim()) {
      setMessage({ type: "error", text: "Enter an API key first" });
      return;
    }
    setTesting(true);
    setTestResults(null);
    setMessage(null);
    try {
      const res = await fetch("/api/client-admin/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json();
      setTestResults(data.results || []);
      if (data.valid) {
        setMessage({ type: "success", text: "All models accessible!" });
      } else {
        setMessage({ type: "error", text: "Some models failed. Check the results above." });
      }
    } catch {
      setMessage({ type: "error", text: "Test failed" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
      <p className="text-gray-600">
        Billing tier and OpenAI API key (BYOK) are managed by your administrator. You can test a key here before asking them to configure it.
      </p>

      <div className="p-6 bg-white rounded-lg border border-gray-200 space-y-4">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
          <strong>Current status:</strong>{" "}
          {billingTier === "byok" ? "BYOK (Bring Your Own Key)" : "Platform key"}
          {configured && " • API key is configured"}
          {!configured && billingTier === "byok" && " • API key not set — contact your administrator"}
        </div>
        <p className="text-sm text-gray-600">
          To change your API key or billing tier, contact your administrator. They will update it from the Company Management admin.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Test an API key (optional)</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-... (not saved)"
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Use this to verify a key works before asking your admin to set it.</p>
        </div>

        <button
          onClick={handleTest}
          disabled={testing || !apiKey.trim()}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? "Testing..." : "Test key"}
        </button>

        {message && (
          <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
            {message.text}
          </p>
        )}

        {testResults && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <p className="text-sm font-medium text-gray-700 mb-2">Model test results:</p>
            <ul className="space-y-1 text-sm">
              {testResults.map((r) => (
                <li key={r.model} className={r.status === "ok" ? "text-green-600" : "text-red-600"}>
                  {r.model}: {r.status === "ok" ? "✓ OK" : r.message || "Failed"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
