"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Interest {
  id: string;
  name: string;
  email: string;
  message: string | null;
  createdAt: string;
}

export default function AdminInterestPage() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/interest")
      .then((r) => r.json())
      .then((data) => {
        setInterests(data.interests || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-stone-900">Sign-up Interest</h1>
          <Link
            href="/admin/companies"
            className="text-sm text-stone-600 hover:text-stone-900 font-medium"
          >
            ← Back to Admin
          </Link>
        </div>

        <p className="text-stone-600 mb-6 text-sm">
          Visitors who submitted the contact form on the marketing site.
        </p>

        {loading ? (
          <p className="text-stone-500">Loading...</p>
        ) : interests.length === 0 ? (
          <p className="text-stone-500">No submissions yet.</p>
        ) : (
          <div className="space-y-4">
            {interests.map((i) => (
              <div
                key={i.id}
                className="bg-white border border-stone-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-stone-900">{i.name}</p>
                    <a
                      href={`mailto:${i.email}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {i.email}
                    </a>
                  </div>
                  <span className="text-xs text-stone-400">
                    {new Date(i.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {i.message && (
                  <p className="mt-2 text-stone-600 text-sm">{i.message}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
