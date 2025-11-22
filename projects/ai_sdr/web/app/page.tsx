import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI SDR Platform
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Multi-tenant AI Sales Development Representative platform with chat widgets, 
            demo automation, and CRM integration.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                🏢 Company Management
              </h2>
              <p className="text-gray-600 mb-4">
                Create and manage company tenants, configure AI assistants, and get embed codes.
              </p>
              <Link
                href="/admin/companies"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Go to Admin
              </Link>
            </div>

            <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                💬 Chat Widget Demo
              </h2>
              <p className="text-gray-600 mb-4">
                View a sample chat widget. Create a company first to see it in action.
              </p>
              <div className="text-sm text-gray-500">
                <code className="bg-gray-100 px-2 py-1 rounded">
                  /widget/[company-slug]
                </code>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🚀 Getting Started
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Set up your database and run migrations</li>
              <li>Go to Company Management to create your first company</li>
              <li>Configure the AI assistant with product info</li>
              <li>Get the embed code and add it to your website</li>
              <li>Monitor leads and conversations in your CRM</li>
            </ol>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Features:
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
              <div>✓ Multi-tenant</div>
              <div>✓ OpenAI Integration</div>
              <div>✓ Demo Clips</div>
              <div>✓ Meeting Booking</div>
              <div>✓ CRM Integration</div>
              <div>✓ RAG Support</div>
              <div>✓ Lead Qualification</div>
              <div>✓ Embeddable Widget</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
