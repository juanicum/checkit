import { NextResponse } from "next/server";
import { insertApprovedVersion, upsertCase } from "../../../lib/supabase";
import type { VerificationCase } from "../../../lib/types";

export const runtime = "nodejs";

type ApproveRequest = {
  caseData: VerificationCase;
  finalText: string;
  finalHtml?: string;
  notes?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ApproveRequest;

    if (!body.caseData?.id) {
      return NextResponse.json({ error: "Falta el ID del caso." }, { status: 400 });
    }

    if (!body.finalText?.trim()) {
      return NextResponse.json({ error: "No hay texto final para aprobar." }, { status: 400 });
    }

    await upsertCase({ ...body.caseData, estado: "aprobado" });
    const result = await insertApprovedVersion({
      caseId: body.caseData.id,
      finalText: body.finalText,
      finalHtml: body.finalHtml,
      category: body.caseData.categoria,
      title: body.caseData.titulo_conclusion,
      notes: body.notes
    });

    return NextResponse.json({ ok: true, saved: !("skipped" in (result as object)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
