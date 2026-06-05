import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold">HUB IT BOQ</h1>
      <p className="mt-2 text-neutral-600">BOQ Cost Intelligence System V1.6</p>
      <Link
        href="/projects"
        className="mt-6 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
      >
        ไปที่โปรเจกต์
      </Link>
    </main>
  );
}
