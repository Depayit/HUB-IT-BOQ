import Link from "next/link";

export function AppNav() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-neutral-900">
          HUB IT BOQ
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/projects" className="text-neutral-600 hover:text-neutral-900">
            โปรเจกต์
          </Link>
        </nav>
      </div>
    </header>
  );
}
