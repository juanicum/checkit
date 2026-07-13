import { NextResponse } from "next/server";
import { upsertCase } from "../../../lib/supabase";
import type { VerificationCase } from "../../../lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const caseData = (await request.json()) as VerificationCase;

    if (!caseData.id) {
      return NextResponse.json({ error: "Falta el ID del caso." }, { status: 400 });
    }

    const result = await upsertCase(caseData);
    return NextResponse.json({ ok: true, saved: !("skipped" in (result as object)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
