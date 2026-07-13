import type { ChatMessage, VerificationCase, VerificationDraft } from "./types";

type SupabaseError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, serviceKey, enabled: Boolean(url && serviceKey) };
}

export function isSupabaseEnabled() {
  return getSupabaseConfig().enabled;
}

async function supabaseFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, serviceKey, enabled } = getSupabaseConfig();

  if (!enabled || !url || !serviceKey) {
    throw new Error("Supabase no está configurado. Agrega SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para guardar en base de datos.");
  }

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = data as SupabaseError;
    throw new Error(error.message || "Error al guardar o leer datos en Supabase.");
  }

  return data as T;
}

export async function upsertCase(caseData: VerificationCase) {
  if (!isSupabaseEnabled()) return { skipped: true };

  const payload = {
    id: caseData.id,
    subtitulo: caseData.subtitulo,
    categoria: caseData.categoria,
    contexto: caseData.contexto,
    que_circula: caseData.que_circula,
    hallazgos_json: caseData.hallazgos || [],
    conclusion_categoria: caseData.conclusion_categoria,
    titulo_conclusion: caseData.titulo_conclusion,
    notas_editoriales: caseData.notas_editoriales,
    estado: caseData.estado || "borrador",
    updated_at: new Date().toISOString()
  };

  return supabaseFetch("verification_cases?on_conflict=id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(payload)
  });
}

export async function insertChatMessages(caseId: string, messages: ChatMessage[]) {
  if (!isSupabaseEnabled() || !messages.length) return { skipped: true };

  return supabaseFetch("chat_messages", {
    method: "POST",
    body: JSON.stringify(
      messages.map((message) => ({
        case_id: caseId,
        role: message.role,
        content: message.content
      }))
    )
  });
}

export async function insertDraft(caseId: string, draft: VerificationDraft) {
  if (!isSupabaseEnabled()) return { skipped: true };

  return supabaseFetch("drafts", {
    method: "POST",
    body: JSON.stringify({
      case_id: caseId,
      draft_json: draft,
      texto_estructurado: draft.texto_estructurado || null,
      texto_limpio: draft.texto_limpio || null,
      html_exportable: draft.html_exportable || null,
      alertas_editoriales: draft.alertas_editoriales || []
    })
  });
}

export async function insertApprovedVersion({
  caseId,
  finalText,
  finalHtml,
  category,
  title,
  notes
}: {
  caseId: string;
  finalText: string;
  finalHtml?: string;
  category: string;
  title: string;
  notes?: string;
}) {
  if (!isSupabaseEnabled()) return { skipped: true };

  const approved = await supabaseFetch("approved_versions", {
    method: "POST",
    body: JSON.stringify({
      case_id: caseId,
      final_text: finalText,
      final_html: finalHtml || null,
      approved_by: "editor",
      notes: notes || null
    })
  });

  await supabaseFetch("style_examples", {
    method: "POST",
    body: JSON.stringify({
      case_id: caseId,
      title,
      category,
      final_text: finalText,
      notes: notes || null,
      approved: true
    })
  });

  return approved;
}

export async function getStyleExamples(category?: string, limit = 3) {
  if (!isSupabaseEnabled()) return [];

  const encodedCategory = category ? encodeURIComponent(category) : "";
  const categoryFilter = encodedCategory ? `&category=eq.${encodedCategory}` : "";
  const rows = await supabaseFetch<Array<{ final_text: string }>>(
    `style_examples?approved=eq.true${categoryFilter}&select=final_text&order=created_at.desc&limit=${limit}`,
    { method: "GET" }
  );

  return rows.map((row) => row.final_text).filter(Boolean);
}
