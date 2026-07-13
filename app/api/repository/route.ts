import { NextResponse } from "next/server";
import { isSupabaseEnabled, listRepositoryCases } from "../../../lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const enabled = isSupabaseEnabled();
    const items = enabled ? await listRepositoryCases(50) : [];
    return NextResponse.json({ ok: true, enabled, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
