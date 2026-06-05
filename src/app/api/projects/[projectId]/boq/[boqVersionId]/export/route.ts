import { NextResponse } from "next/server";
import { exportService } from "@/lib/services/export.service";
import { exportRequestSchema } from "@/lib/validations/export";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string; boqVersionId: string }> },
) {
  const { projectId, boqVersionId } = await context.params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "xlsx";

  const parsed = exportRequestSchema.safeParse({
    project_id: projectId,
    boq_version_id: boqVersionId,
    format,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const file =
      parsed.data.format === "pdf"
        ? await exportService.exportToPdf(projectId, boqVersionId)
        : await exportService.exportToExcel(projectId, boqVersionId);

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
