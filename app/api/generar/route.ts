import { NextResponse } from "next/server";
import { buildCleanText, buildGenerationPrompt, buildHtmlExport, buildStructuredText, GENERATION_SYSTEM_PROMPT } from "../../../lib/prompt";
import { callOpenAIJson } from "../../../lib/openai";
import { getStyleExamples, insertDraft, upsertCase } from "../../../lib/supabase";
import type { VerificationCase, VerificationDraft } from "../../../lib/types";

export const runtime = "nodejs";

function hasMinimumFields(input: Partial<VerificationCase>) {
  const hasHallazgoWithEvidence = Boolean(
    input.hallazgos?.some((hallazgo) =>
      hallazgo.titulo?.trim() && hallazgo.evidencias?.some((evidencia) => evidencia.descripcion?.trim() && evidencia.fuente?.trim())
    )
  );

  return Boolean(
    input.subtitulo?.trim() &&
      input.categoria?.trim() &&
      input.contexto?.trim() &&
      input.que_circula?.trim() &&
      hasHallazgoWithEvidence &&
      input.conclusion_categoria?.trim()
  );
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as VerificationCase;

    if (!input.id) {
      return NextResponse.json({ error: "Falta el ID del caso." }, { status: 400 });
    }

    if (!hasMinimumFields(input)) {
      return NextResponse.json(
        {
          error:
            "Faltan campos obligatorios: subtítulo, categoría, contexto, qué circula, al menos un hallazgo con una evidencia y una fuente, y conclusión. El titular puede generarlo la IA si aún no está definido."
        },
        { status: 400 }
      );
    }

    const styleExamples = await getStyleExamples(input.categoria, 3);

    const draft = await callOpenAIJson<VerificationDraft>({
      systemPrompt: GENERATION_SYSTEM_PROMPT,
      userPrompt: buildGenerationPrompt(input, styleExamples),
      temperature: 0.2
    });

    const normalizedDraft: VerificationDraft = {
      ...draft,
      categoria: input.categoria,
      titular_conclusion: draft.titular_conclusion?.trim() || input.titulo_conclusion || "",
      texto_estructurado: draft.texto_estructurado?.trim() || buildStructuredText(draft),
      texto_limpio: draft.texto_limpio?.trim() || buildCleanText(draft),
      html_exportable: draft.html_exportable?.trim() || buildHtmlExport({ ...draft, texto_limpio: draft.texto_limpio || buildCleanText(draft) }),
      alertas_editoriales: draft.alertas_editoriales || []
    };

    await upsertCase({ ...input, titulo_conclusion: input.titulo_conclusion || normalizedDraft.titular_conclusion, estado: "redactado" });
    await insertDraft(input.id, normalizedDraft);

    return NextResponse.json({ draft: normalizedDraft, used_style_examples: styleExamples.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
