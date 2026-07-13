export type EvidenceInput = {
  id: string;
  descripcion: string;
  fuente: string;
};

export type HallazgoInput = {
  id: string;
  titulo: string;
  evidencias: EvidenceInput[];
};

export type VerificationCase = {
  id: string;
  subtitulo: string;
  categoria: string;
  contexto: string;
  que_circula: string;
  hallazgos: HallazgoInput[];
  conclusion_categoria: string;
  titulo_conclusion: string;
  notas_editoriales: string;
  estado?: "borrador" | "listo_para_redactar" | "redactado" | "aprobado";
};

export type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

export type DraftEvidence = {
  evidencia: string;
  fuente: string;
};

export type DraftHallazgo = {
  hallazgo: string;
  evidencias: DraftEvidence[];
};

export type VerificationDraft = {
  subtitulo: string;
  categoria: string;
  explicacion_contexto: string;
  que_circula: string;
  hallazgos_con_evidencias: DraftHallazgo[];
  conclusion_categoria_evidencia: string;
  titular_conclusion: string;
  version_redes: string;
  alertas_editoriales: string[];
  texto_estructurado: string;
  texto_limpio: string;
  html_exportable: string;
};

export type ChatAgentResponse = {
  assistant_message: string;
  updated_case: Partial<VerificationCase>;
  missing_fields: string[];
  readiness: "incompleto" | "casi_listo" | "listo_para_redactar";
  suggested_next_action: string;
};
