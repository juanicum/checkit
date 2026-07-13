import { NextResponse } from "next/server";
import { insertDraft, upsertCase } from "../../../lib/supabase";
import type { VerificationCase, VerificationDraft } from "../../../lib/types";

export const runtime = "nodejs";

type SaveDraftRequest = {
  caseData: VerificationCase;
  draft: Partial<VerificationDraft>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SaveDraftRequest;

    if (!body.caseData?.id) {
      return NextResponse.json({ error: "Falta el ID del caso." }, { status: 400 });
    }

    if (!body.draft?.texto_limpio?.trim() && !body.draft?.texto_estructurado?.trim()) {
      return NextResponse.json({ error: "No hay borrador para guardar." }, { status: 400 });
    }

    await upsertCase({ ...body.caseData, estado: "redactado" });
    const result = await insertDraft(body.caseData.id, body.draft as VerificationDraft);

    return NextResponse.json({ ok: true, saved: !("skipped" in (result as object)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
