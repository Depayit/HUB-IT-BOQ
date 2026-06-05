import Link from "next/link";
import { ProjectForm } from "@/components/boq/project-form";

export default function NewProjectPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link href="/projects" className="text-sm text-blue-600 hover:underline">
        ← กลับ Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">สร้างโปรเจกต์ใหม่</h1>
      <p className="mt-1 text-sm text-neutral-600">Project Setup — ฟิลด์ตามตาราง projects</p>
      <div className="mt-8">
        <ProjectForm mode="create" />
      </div>
    </main>
  );
}
