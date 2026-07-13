"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import type {
  ChatAgentResponse,
  ChatMessage,
  EvidenceInput,
  HallazgoInput,
  VerificationCase,
  VerificationDraft
} from "../lib/types";

const categories = [
  "Falso",
  "Verdadero",
  "Engañoso",
  "Fuera de contexto",
  "Alterado",
  "Insuficiente evidencia",
  "Impreciso",
  "Sátira"
];

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createEvidence(): EvidenceInput {
  return { id: makeId("e"), descripcion: "", fuente: "" };
}

function createHallazgo(): HallazgoInput {
  return { id: makeId("h"), titulo: "", evidencias: [createEvidence()] };
}

function normalizeHallazgos(hallazgos?: HallazgoInput[]): HallazgoInput[] {
  if (!hallazgos?.length) return [createHallazgo()];

  return hallazgos.map((hallazgo, hallazgoIndex) => ({
    id: hallazgo.id || makeId(`h${hallazgoIndex + 1}`),
    titulo: hallazgo.titulo || "",
    evidencias: hallazgo.evidencias?.length
      ? hallazgo.evidencias.map((evidencia, evidenciaIndex) => ({
          id: evidencia.id || makeId(`e${hallazgoIndex + 1}-${evidenciaIndex + 1}`),
          descripcion: evidencia.descripcion || "",
          fuente: evidencia.fuente || ""
        }))
      : [createEvidence()]
  }));
}

function createEmptyCase(): VerificationCase {
  return {
    id: makeId("case"),
    subtitulo: "",
    categoria: "Falso",
    contexto: "",
    que_circula: "",
    hallazgos: [createHallazgo()],
    conclusion_categoria: "",
    titulo_conclusion: "",
    notas_editoriales: "",
    estado: "borrador"
  };
}

const initialAssistantMessage: ChatMessage = {
  role: "assistant",
  content:
    "Cuéntame el caso en lenguaje natural. Yo iré completando la ficha editorial, ordenando los hallazgos con sus evidencias y pidiendo solo los datos que falten."
};

function FieldStatus({ complete }: { complete: boolean }) {
  return <span className={complete ? "status ok" : "status missing"}>{complete ? "Completo" : "Falta"}</span>;
}

function asList(items?: string[]) {
  if (!items?.length) return <p className="muted">Sin alertas.</p>;
  return (
    <ul>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function hasStructuredHallazgos(hallazgos: HallazgoInput[]) {
  return hallazgos.some((hallazgo) =>
    hallazgo.titulo.trim() && hallazgo.evidencias.some((evidencia) => evidencia.descripcion.trim() && evidencia.fuente.trim())
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function htmlFromCleanText(cleanText: string, fallbackTitle: string) {
  const paragraphs = cleanText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const first = paragraphs[0] || fallbackTitle || "Verificación ChequeaBolivia";
  const rest = paragraphs.slice(1).map((paragraph) => `  <p>${escapeHtml(paragraph)}</p>`).join("\n");

  return `<article>\n  <h1>${escapeHtml(first)}</h1>\n${rest}\n</article>`;
}

export default function Home() {
  const [caseData, setCaseData] = useState<VerificationCase>(() => createEmptyCase());
  const [messages, setMessages] = useState<ChatMessage[]>([initialAssistantMessage]);
  const [chatInput, setChatInput] = useState("");
  const [draft, setDraft] = useState<VerificationDraft | null>(null);
  const [structuredText, setStructuredText] = useState("");
  const [cleanText, setCleanText] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingDraftSave, setLoadingDraftSave] = useState(false);
  const [loadingApprove, setLoadingApprove] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [readiness, setReadiness] = useState<ChatAgentResponse["readiness"]>("incompleto");
  const [usedExamples, setUsedExamples] = useState<number | null>(null);

  const completionScore = useMemo(() => {
    const checks = [
      caseData.subtitulo.trim().length > 0,
      caseData.categoria.trim().length > 0,
      caseData.contexto.trim().length > 0,
      caseData.que_circula.trim().length > 0,
      hasStructuredHallazgos(caseData.hallazgos),
      caseData.conclusion_categoria.trim().length > 0,
      caseData.titulo_conclusion.trim().length > 0
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }, [caseData]);

  function updateField(field: keyof VerificationCase, value: string) {
    setCaseData((current) => ({ ...current, [field]: value }));
  }

  function updateHallazgo(hallazgoId: string, value: string) {
    setCaseData((current) => ({
      ...current,
      hallazgos: current.hallazgos.map((hallazgo) => (hallazgo.id === hallazgoId ? { ...hallazgo, titulo: value } : hallazgo))
    }));
  }

  function addHallazgo() {
    setCaseData((current) => ({ ...current, hallazgos: [...current.hallazgos, createHallazgo()] }));
  }

  function removeHallazgo(hallazgoId: string) {
    setCaseData((current) => ({
      ...current,
      hallazgos: current.hallazgos.length > 1 ? current.hallazgos.filter((hallazgo) => hallazgo.id !== hallazgoId) : current.hallazgos
    }));
  }

  function addEvidence(hallazgoId: string) {
    setCaseData((current) => ({
      ...current,
      hallazgos: current.hallazgos.map((hallazgo) =>
        hallazgo.id === hallazgoId ? { ...hallazgo, evidencias: [...hallazgo.evidencias, createEvidence()] } : hallazgo
      )
    }));
  }

  function updateEvidence(hallazgoId: string, evidenceId: string, field: keyof EvidenceInput, value: string) {
    setCaseData((current) => ({
      ...current,
      hallazgos: current.hallazgos.map((hallazgo) =>
        hallazgo.id === hallazgoId
          ? {
              ...hallazgo,
              evidencias: hallazgo.evidencias.map((evidencia) =>
                evidencia.id === evidenceId ? { ...evidencia, [field]: value } : evidencia
              )
            }
          : hallazgo
      )
    }));
  }

  function removeEvidence(hallazgoId: string, evidenceId: string) {
    setCaseData((current) => ({
      ...current,
      hallazgos: current.hallazgos.map((hallazgo) =>
        hallazgo.id === hallazgoId
          ? {
              ...hallazgo,
              evidencias: hallazgo.evidencias.length > 1 ? hallazgo.evidencias.filter((evidencia) => evidencia.id !== evidenceId) : hallazgo.evidencias
            }
          : hallazgo
      )
    }));
  }

  function newCase() {
    setCaseData(createEmptyCase());
    setMessages([initialAssistantMessage]);
    setDraft(null);
    setStructuredText("");
    setCleanText("");
    setMissingFields([]);
    setReadiness("incompleto");
    setUsedExamples(null);
    setError("");
    setNotice("Nuevo caso iniciado.");
  }

  async function sendChatMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = chatInput.trim();
    if (!content) return;

    setLoadingChat(true);
    setError("");
    setNotice("");

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setChatInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseData, messages: nextMessages })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo procesar el mensaje.");

      setCaseData({ ...data.updated_case, hallazgos: normalizeHallazgos(data.updated_case.hallazgos) });
      setMissingFields(data.missing_fields || []);
      setReadiness(data.readiness || "incompleto");
      setMessages((current) => [...current, { role: "assistant", content: data.assistant_message }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoadingChat(false);
    }
  }

  async function saveCase() {
    setLoadingSave(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(caseData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar la ficha.");
      setNotice(data.saved ? "Ficha guardada en la base de datos." : "Ficha actualizada en pantalla. Supabase aún no está configurado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoadingSave(false);
    }
  }

  async function generateDraft() {
    setLoadingDraft(true);
    setError("");
    setNotice("");
    setDraft(null);
    setStructuredText("");
    setCleanText("");

    try {
      const response = await fetch("/api/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(caseData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo generar el borrador.");

      setDraft(data.draft);
      setStructuredText(data.draft.texto_estructurado || "");
      setCleanText(data.draft.texto_limpio || "");
      setUsedExamples(data.used_style_examples ?? 0);
      setNotice("Borrador generado. Revisa la versión estructurada y la redacción limpia antes de guardar o aprobar.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoadingDraft(false);
    }
  }

  async function saveEditedDraft() {
    setLoadingDraftSave(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseData,
          draft: {
            ...(draft || {}),
            texto_estructurado: structuredText,
            texto_limpio: cleanText,
            html_exportable: htmlFromCleanText(cleanText, caseData.titulo_conclusion || draft?.titular_conclusion || "")
          }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el borrador.");
      setNotice(data.saved ? "Borrador editado guardado en la base de datos." : "Borrador editado listo en pantalla. Configura Supabase para guardarlo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoadingDraftSave(false);
    }
  }

  async function approveFinalText() {
    setLoadingApprove(true);
    setError("");
    setNotice("");

    try {
      const finalHtml = htmlFromCleanText(cleanText, caseData.titulo_conclusion || draft?.titular_conclusion || "");
      const response = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseData, finalText: cleanText, finalHtml, notes: caseData.notas_editoriales })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo aprobar la versión final.");
      setCaseData((current) => ({ ...current, estado: "aprobado" }));
      setNotice(
        data.saved
          ? "Versión final aprobada y guardada. Desde ahora podrá usarse como ejemplo editorial."
          : "Versión marcada como aprobada en pantalla. Configura Supabase para guardarla como ejemplo."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoadingApprove(false);
    }
  }

  async function copyText(value: string, message: string) {
    await navigator.clipboard.writeText(value);
    setNotice(message);
  }

  function exportHtml() {
    const html = htmlFromCleanText(cleanText, caseData.titulo_conclusion || draft?.titular_conclusion || "Verificación ChequeaBolivia");
    const fullHtml = `<!doctype html>\n<html lang="es">\n<head>\n  <meta charset="utf-8" />\n  <title>${escapeHtml(caseData.titulo_conclusion || draft?.titular_conclusion || "Verificación ChequeaBolivia")}</title>\n</head>\n<body>\n${html}\n</body>\n</html>`;
    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `checkit-verificacion-${caseData.id}.html`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("HTML exportado desde la redacción limpia editada.");
  }

  return (
    <main>
      <section className="header">
        <div className="brand-row">
          <Image src="/checkit-logo.png" alt="ChecKit" width={245} height={137} priority className="logo" />
          <div>
            <div className="kicker">ChequeaBolivia · redactor IA interno</div>
            <h1>ChecKit</h1>
            <p className="subtitle">
              Conversa con el agente, completa la ficha estructurada y genera dos borradores: uno con números y títulos editoriales, y otro limpio para edición final y exportación HTML.
            </p>
          </div>
        </div>
        <div className="top-actions">
          <button type="button" onClick={newCase}>Nuevo caso</button>
          <button type="button" onClick={saveCase} disabled={loadingSave}>{loadingSave ? "Guardando..." : "Guardar ficha"}</button>
          <button type="button" className="primary small" onClick={generateDraft} disabled={loadingDraft}>
            {loadingDraft ? "Generando..." : "Generar borrador"}
          </button>
        </div>
      </section>

      {error ? <div className="error">{error}</div> : null}
      {notice ? <div className="notice">{notice}</div> : null}

      <section className="workspace">
        <aside className="card chat-card">
          <div className="card-title-row">
            <h2>Chat con el agente</h2>
            <span className={`readiness ${readiness}`}>{readiness.replaceAll("_", " ")}</span>
          </div>

          <div className="chat-box">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`message ${message.role}`}>
                <strong>{message.role === "user" ? "Tú" : "Agente"}</strong>
                <p>{message.content}</p>
              </div>
            ))}
            {loadingChat ? (
              <div className="message assistant">
                <strong>Agente</strong>
                <p>Analizando la información...</p>
              </div>
            ) : null}
          </div>

          <form onSubmit={sendChatMessage} className="chat-form">
            <textarea
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Ej. Circula en TikTok un video que afirma que... El primer hallazgo es... La evidencia es... La fuente es..."
            />
            <button className="primary" type="submit" disabled={loadingChat || !chatInput.trim()}>
              {loadingChat ? "Enviando..." : "Enviar al agente"}
            </button>
          </form>

          <div className="output-block compact">
            <h3>Campos pendientes</h3>
            {missingFields.length ? asList(missingFields) : <p className="muted">El agente aún no ha marcado campos pendientes o la ficha está completa.</p>}
          </div>
        </aside>

        <section className="card form-card">
          <div className="card-title-row">
            <h2>Ficha estructurada</h2>
            <span className="score">{completionScore}% completo</span>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="categoria">Categoría *</label>
              <select id="categoria" value={caseData.categoria} onChange={(event) => updateField("categoria", event.target.value)}>
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="estado">Estado</label>
              <input id="estado" value={caseData.estado || "borrador"} onChange={(event) => updateField("estado", event.target.value)} />
            </div>

            <div className="form-group full">
              <label htmlFor="subtitulo">1. Subtítulo *</label>
              <p className="helper">Pregunta guía: ¿Por qué estamos verificando?</p>
              <textarea
                id="subtitulo"
                value={caseData.subtitulo}
                onChange={(event) => updateField("subtitulo", event.target.value)}
                placeholder="Explica por qué este contenido merece ser verificado y cuál es su relevancia pública."
              />
              <FieldStatus complete={caseData.subtitulo.trim().length > 0} />
            </div>

            <div className="form-group full">
              <label htmlFor="contexto">2. Explicación del contexto *</label>
              <p className="helper">Pregunta guía: ¿Qué está pasando o qué pasó para que esté circulando esta verificación?</p>
              <textarea
                id="contexto"
                value={caseData.contexto}
                onChange={(event) => updateField("contexto", event.target.value)}
                placeholder="Antecedentes, discusión pública, fecha, actores o elementos necesarios para ubicar el caso."
              />
              <FieldStatus complete={caseData.contexto.trim().length > 0} />
            </div>

            <div className="form-group full">
              <label htmlFor="que_circula">3. Qué circula *</label>
              <textarea
                id="que_circula"
                value={caseData.que_circula}
                onChange={(event) => updateField("que_circula", event.target.value)}
                placeholder="Qué dice el contenido, formato, plataforma y quién lo publicó o compartió si se sabe."
              />
              <FieldStatus complete={caseData.que_circula.trim().length > 0} />
            </div>

            <div className="form-group full">
              <div className="section-row">
                <div>
                  <label>4. Hallazgos con evidencia *</label>
                  <p className="helper">Pregunta guía: ¿Qué estoy verificando? Puedes agregar de 1 a N hallazgos. Cada hallazgo puede tener de 1 a N evidencias, y cada evidencia debe tener una sola fuente o enlace.</p>
                </div>
                <FieldStatus complete={hasStructuredHallazgos(caseData.hallazgos)} />
              </div>

              <div className="hallazgos-list">
                {caseData.hallazgos.map((hallazgo, hallazgoIndex) => (
                  <div className="hallazgo-card" key={hallazgo.id}>
                    <div className="card-title-row compact-row">
                      <h3>Hallazgo {hallazgoIndex + 1}</h3>
                      <button type="button" onClick={() => removeHallazgo(hallazgo.id)} disabled={caseData.hallazgos.length === 1}>Eliminar hallazgo</button>
                    </div>
                    <textarea
                      value={hallazgo.titulo}
                      onChange={(event) => updateHallazgo(hallazgo.id, event.target.value)}
                      placeholder="Describe el hallazgo o el aspecto específico que se está verificando."
                    />

                    <div className="evidencias-list">
                      {hallazgo.evidencias.map((evidencia, evidenciaIndex) => (
                        <div className="evidencia-card" key={evidencia.id}>
                          <div className="card-title-row compact-row">
                            <strong>Evidencia {evidenciaIndex + 1}</strong>
                            <button type="button" onClick={() => removeEvidence(hallazgo.id, evidencia.id)} disabled={hallazgo.evidencias.length === 1}>Eliminar evidencia</button>
                          </div>
                          <textarea
                            value={evidencia.descripcion}
                            onChange={(event) => updateEvidence(hallazgo.id, evidencia.id, "descripcion", event.target.value)}
                            placeholder="Describe la evidencia que sostiene este hallazgo."
                          />
                          <input
                            value={evidencia.fuente}
                            onChange={(event) => updateEvidence(hallazgo.id, evidencia.id, "fuente", event.target.value)}
                            placeholder="Fuente única de esta evidencia: enlace, documento, entrevista o publicación original."
                          />
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => addEvidence(hallazgo.id)}>+ Agregar evidencia a este hallazgo</button>
                  </div>
                ))}
              </div>
              <button type="button" className="secondary-action" onClick={addHallazgo}>+ Agregar otro hallazgo</button>
            </div>

            <div className="form-group full">
              <label htmlFor="conclusion_categoria">5. Conclusión con categoría y evidencia *</label>
              <textarea
                id="conclusion_categoria"
                value={caseData.conclusion_categoria}
                onChange={(event) => updateField("conclusion_categoria", event.target.value)}
                placeholder="Explica por qué corresponde la categoría asignada y cuál es la evidencia principal."
              />
              <FieldStatus complete={caseData.conclusion_categoria.trim().length > 0} />
            </div>

            <div className="form-group full">
              <label htmlFor="titulo_conclusion">6. Titular con conclusión</label>
              <p className="helper">Se ubica al final de la ficha para redactarlo con la conclusión ya clara.</p>
              <input
                id="titulo_conclusion"
                value={caseData.titulo_conclusion}
                onChange={(event) => updateField("titulo_conclusion", event.target.value)}
                placeholder="Ej. Es engañoso que..."
              />
              <FieldStatus complete={caseData.titulo_conclusion.trim().length > 0} />
            </div>

            <div className="form-group full">
              <label htmlFor="notas_editoriales">Notas editoriales</label>
              <textarea
                id="notas_editoriales"
                value={caseData.notas_editoriales}
                onChange={(event) => updateField("notas_editoriales", event.target.value)}
                placeholder="Tono, extensión, advertencias legales, público objetivo, cuidado con nombres propios, etc."
              />
            </div>
          </div>
        </section>
      </section>

      <section className="card draft-card">
        <div className="card-title-row">
          <h2>Borrador generado</h2>
          {usedExamples !== null ? <span className="score">Ejemplos usados: {usedExamples}</span> : null}
        </div>

        {!draft ? (
          <p className="subtitle">Cuando la ficha esté completa, presiona “Generar borrador”. Aquí aparecerán las dos versiones editables.</p>
        ) : (
          <>
            <div className="draft-grid two-columns">
              <div className="form-group">
                <label htmlFor="structuredText">1. Borrador con números y títulos de la ficha</label>
                <textarea
                  id="structuredText"
                  className="large"
                  value={structuredText}
                  onChange={(event) => setStructuredText(event.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="cleanText">2. Redacción limpia editable</label>
                <textarea
                  id="cleanText"
                  className="large"
                  value={cleanText}
                  onChange={(event) => setCleanText(event.target.value)}
                />
              </div>
            </div>

            <div className="draft-grid">
              <div className="output-block">
                <h3>Versión corta para redes</h3>
                <p>{draft.version_redes}</p>
              </div>

              <div className="output-block">
                <h3>Alertas editoriales</h3>
                {asList(draft.alertas_editoriales)}
              </div>
            </div>

            <div className="top-actions">
              <button type="button" onClick={() => copyText(structuredText, "Borrador estructurado copiado al portapapeles.")}>Copiar estructurado</button>
              <button type="button" onClick={() => copyText(cleanText, "Redacción limpia copiada al portapapeles.")}>Copiar limpio</button>
              <button type="button" onClick={() => { setStructuredText(draft.texto_estructurado); setCleanText(draft.texto_limpio); }}>Restaurar borrador generado</button>
              <button type="button" onClick={saveEditedDraft} disabled={loadingDraftSave}>{loadingDraftSave ? "Guardando..." : "Guardar borrador editado"}</button>
              <button type="button" onClick={exportHtml}>Exportar HTML</button>
              <button type="button" className="primary small" onClick={approveFinalText} disabled={loadingApprove || !cleanText.trim()}>
                {loadingApprove ? "Guardando aprobación..." : "Aprobar versión final"}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
