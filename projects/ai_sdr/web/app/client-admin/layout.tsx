"use client";

import { SessionProvider } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export default function ClientAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <ClientAdminShell>{children}</ClientAdminShell>
    </SessionProvider>
  );
}

function ClientAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/client-admin/login") return <>{children}</>;

  const nav = [
    { href: "/client-admin", label: "Dashboard" },
    { href: "/client-admin/api-keys", label: "API Keys" },
    { href: "/client-admin/content", label: "Content" },
    { href: "/client-admin/embed", label: "Embed Code" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg font-semibold text-gray-900">Client Admin</h1>
          <div className="flex items-center gap-4">
            <nav className="flex gap-4">
              {nav.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`text-sm font-medium ${
                    pathname === href ? "text-blue-600" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <button
              onClick={() => signOut({ callbackUrl: "/client-admin/login" })}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
