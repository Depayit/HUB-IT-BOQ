import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "HUB IT BOQ",
  description: "BOQ Cost Intelligence System",
};

function SiteHeader() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-neutral-900">
          HUB IT BOQ
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link
            href="/projects"
            className="text-neutral-600 hover:text-neutral-900"
          >
            โปรเจกต์
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
