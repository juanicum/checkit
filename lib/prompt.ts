import type { ChatMessage, VerificationCase } from "./types";

export const VERIFICATION_STRUCTURE = `
Estructura obligatoria de la ficha editorial de ChecKit / ChequeaBolivia:
1. Subtítulo: responde a la pregunta "¿Por qué estamos verificando?". Debe explicar en una frase o párrafo breve la relevancia pública del caso.
2. Explicación del contexto: responde a la pregunta "¿Qué está pasando o qué pasó para que esté circulando esta verificación?". Debe ubicar el caso en su momento, discusión pública o antecedentes necesarios.
3. Qué circula: describe el contenido difundido: qué dice, en qué formato aparece, en qué plataforma circula y, cuando sea posible, quién lo publicó o compartió.
4. Hallazgos con evidencia: responde a "¿Qué estoy verificando?". Puede haber de 1 a N hallazgos. Cada hallazgo puede tener de 1 a N evidencias. Cada evidencia debe tener una sola fuente asociada, que puede ser un enlace, documento, entrevista o fuente identificada.
5. Conclusión con categoría y evidencia: cierra indicando la categoría asignada y resume la evidencia principal que sostiene esa decisión.
6. Titular con conclusión: se redacta al final, después de revisar contexto, circulación, hallazgos y conclusión. Debe presentar el resultado principal de forma clara, directa y coherente con la categoría.

La sección "Qué verificamos" ya no debe usarse como campo independiente. La delimitación de lo verificado debe resolverse dentro de los hallazgos.
No incluyas una sección independiente de "Fuentes consultadas". Las fuentes deben aparecer asociadas a cada evidencia.
`;

export const EDITORIAL_RULES = `
Reglas editoriales obligatorias:
- No inventes datos, fuentes, enlaces, fechas, cargos, declaraciones ni cifras.
- Usa únicamente la información entregada por el usuario y, si están disponibles, ejemplos editoriales aprobados.
- No cambies la categoría definida por el equipo humano.
- Si falta evidencia o fuente para un hallazgo, adviértelo en alertas_editoriales o missing_fields; no completes con suposiciones.
- Cada evidencia debe tener una sola fuente asociada. Si una evidencia usa dos fuentes, sepárala en dos evidencias.
- Usa lenguaje claro, sobrio, breve y no acusatorio.
- Evita párrafos largos y tecnicismos innecesarios.
- No digas que la IA verificó. La verificación la hace el equipo humano; la IA redacta un borrador.
- Cuando una fuente no tenga enlace, menciona solo la fuente disponible sin inventar URL.
- El texto estructurado debe usar números y títulos de la ficha.
- La redacción limpia no debe incluir números ni títulos de ficha; debe leerse como una nota lista para edición final.
`;

export const GENERATION_SYSTEM_PROMPT = `
Eres un asistente editorial interno de ChecKit, una herramienta de ChequeaBolivia. Tu tarea es convertir insumos ya verificados por un equipo humano en un borrador de verificación completo, breve, claro, basado en evidencia y editable.

${VERIFICATION_STRUCTURE}

${EDITORIAL_RULES}

Devuelve únicamente JSON válido con esta forma exacta:
{
  "subtitulo": "string",
  "categoria": "string",
  "explicacion_contexto": "string",
  "que_circula": "string",
  "hallazgos_con_evidencias": [
    {
      "hallazgo": "string",
      "evidencias": [
        { "evidencia": "string", "fuente": "string" }
      ]
    }
  ],
  "conclusion_categoria_evidencia": "string",
  "titular_conclusion": "string",
  "version_redes": "string",
  "alertas_editoriales": ["string"],
  "texto_estructurado": "string",
  "texto_limpio": "string",
  "html_exportable": "string"
}

El campo texto_estructurado debe estar listo para copiar y pegar, con estos encabezados exactos:
1. Subtítulo
2. Explicación del contexto
3. Qué circula
4. Hallazgos con evidencia
5. Conclusión con categoría y evidencia
6. Titular con conclusión

El campo texto_limpio debe ser una redacción continua, sin números ni títulos de ficha. Puede iniciar con el titular como primera línea si mejora la edición, pero no debe incluir etiquetas como "Titular", "Contexto" o "Hallazgos".

El campo html_exportable debe ser HTML simple y válido basado en texto_limpio, con etiquetas <article>, <h1>, <p>, <ul> y <li> cuando sea útil. No incluyas scripts ni estilos externos.
`;

export const CHAT_SYSTEM_PROMPT = `
Eres un agente editorial de ChecKit / ChequeaBolivia. Tu tarea es conversar con el usuario para ordenar una verificación en una ficha estructurada. No redactes una nota completa salvo que el usuario lo pida explícitamente. Primero ayuda a completar los campos necesarios.

${VERIFICATION_STRUCTURE}

${EDITORIAL_RULES}

Tu comportamiento:
1. Lee el mensaje del usuario y la ficha actual.
2. Extrae datos útiles y actualiza la ficha.
3. Si el usuario menciona varios hallazgos o evidencias, ordénalos en la estructura hallazgos > evidencias > fuente.
4. Identifica los campos faltantes.
5. Haz una pregunta concreta y breve para conseguir la información más importante que falta.
6. Si la ficha ya tiene datos suficientes, indica que está lista para generar el borrador.

Devuelve únicamente JSON válido con esta forma exacta:
{
  "assistant_message": "mensaje breve y útil para el usuario",
  "updated_case": {
    "subtitulo": "string",
    "categoria": "string",
    "contexto": "string",
    "que_circula": "string",
    "hallazgos": [
      {
        "id": "string",
        "titulo": "string",
        "evidencias": [
          { "id": "string", "descripcion": "string", "fuente": "string" }
        ]
      }
    ],
    "conclusion_categoria": "string",
    "titulo_conclusion": "string",
    "notas_editoriales": "string"
  },
  "missing_fields": ["string"],
  "readiness": "incompleto | casi_listo | listo_para_redactar",
  "suggested_next_action": "string"
}

Si no estás seguro de un dato, no lo pongas como definitivo; pídelo al usuario en assistant_message.
`;

function serializeHallazgos(input: VerificationCase) {
  if (!input.hallazgos?.length) return "No especificado";

  return input.hallazgos
    .map((hallazgo, hallazgoIndex) => {
      const evidencias = hallazgo.evidencias?.length
        ? hallazgo.evidencias
            .map((evidencia, evidenciaIndex) => {
              return `  Evidencia ${evidenciaIndex + 1}: ${evidencia.descripcion || "Sin descripción"}\n  Fuente: ${evidencia.fuente || "Sin fuente"}`;
            })
            .join("\n")
        : "  Sin evidencias registradas";

      return `Hallazgo ${hallazgoIndex + 1}: ${hallazgo.titulo || "Sin título"}\n${evidencias}`;
    })
    .join("\n\n");
}

export function buildGenerationPrompt(input: VerificationCase, styleExamples: string[] = []) {
  const examplesBlock = styleExamples.length
    ? `\nEJEMPLOS EDITORIALES APROBADOS PARA REFERENCIA DE ESTILO, NO PARA COPIAR DATOS:\n${styleExamples
        .map((example, index) => `Ejemplo ${index + 1}:\n${example}`)
        .join("\n\n")}`
    : "\nNo hay ejemplos editoriales aprobados disponibles para este caso.";

  return `
Redacta una verificación con la estructura definida por ChequeaBolivia.

FICHA DEL CASO:
ID: ${input.id}
Categoría/veredicto definido por el equipo: ${input.categoria || "No especificado"}

1. SUBTÍTULO / ¿POR QUÉ ESTAMOS VERIFICANDO?:
${input.subtitulo || "No especificado"}

2. EXPLICACIÓN DEL CONTEXTO / ¿QUÉ ESTÁ PASANDO O QUÉ PASÓ?:
${input.contexto || "No especificado"}

3. QUÉ CIRCULA:
${input.que_circula || "No especificado"}

4. HALLAZGOS CON EVIDENCIAS Y FUENTES:
${serializeHallazgos(input)}

5. CONCLUSIÓN DEL EQUIPO:
${input.conclusion_categoria || "No especificado"}

6. TITULAR CON CONCLUSIÓN PROPUESTO O EXISTENTE:
${input.titulo_conclusion || "No especificado. Redáctalo tú a partir de la evidencia y la categoría."}

NOTAS EDITORIALES:
${input.notas_editoriales || "Sin notas adicionales"}

${examplesBlock}
`;
}

export function buildChatPrompt(caseData: VerificationCase, messages: ChatMessage[]) {
  const conversation = messages.map((message) => `${message.role === "user" ? "Usuario" : "Agente"}: ${message.content}`).join("\n");

  return `
FICHA ACTUAL DEL CASO:
${JSON.stringify(caseData, null, 2)}

CONVERSACIÓN:
${conversation}

Analiza el último mensaje del usuario y devuelve la ficha actualizada. Conserva los datos existentes si el usuario no los contradice o no aporta una versión mejor. Si creas ids para hallazgos o evidencias, usa textos simples como "h1", "e1", "h2", "e2".
`;
}

export function buildStructuredText(draft: {
  subtitulo?: string;
  explicacion_contexto?: string;
  que_circula?: string;
  hallazgos_con_evidencias?: Array<{ hallazgo?: string; evidencias?: Array<{ evidencia?: string; fuente?: string }> }>;
  conclusion_categoria_evidencia?: string;
  titular_conclusion?: string;
}) {
  const hallazgos = draft.hallazgos_con_evidencias?.length
    ? draft.hallazgos_con_evidencias
        .map((item, index) => {
          const evidencias = item.evidencias?.length
            ? item.evidencias.map((evidencia, eIndex) => `   - Evidencia ${eIndex + 1}: ${evidencia.evidencia || ""}\n     Fuente: ${evidencia.fuente || ""}`).join("\n")
            : "   - Sin evidencias registradas.";
          return `Hallazgo ${index + 1}: ${item.hallazgo || ""}\n${evidencias}`;
        })
        .join("\n\n")
    : "No se registraron hallazgos estructurados.";

  return `1. Subtítulo\n${draft.subtitulo || ""}\n\n2. Explicación del contexto\n${draft.explicacion_contexto || ""}\n\n3. Qué circula\n${draft.que_circula || ""}\n\n4. Hallazgos con evidencia\n${hallazgos}\n\n5. Conclusión con categoría y evidencia\n${draft.conclusion_categoria_evidencia || ""}\n\n6. Titular con conclusión\n${draft.titular_conclusion || ""}`;
}

export function buildCleanText(draft: {
  titular_conclusion?: string;
  subtitulo?: string;
  explicacion_contexto?: string;
  que_circula?: string;
  hallazgos_con_evidencias?: Array<{ hallazgo?: string; evidencias?: Array<{ evidencia?: string; fuente?: string }> }>;
  conclusion_categoria_evidencia?: string;
}) {
  const hallazgos = draft.hallazgos_con_evidencias?.length
    ? draft.hallazgos_con_evidencias
        .map((item) => {
          const evidencias = item.evidencias?.length
            ? item.evidencias.map((evidencia) => `${evidencia.evidencia || ""} Fuente: ${evidencia.fuente || ""}`.trim()).join(" ")
            : "";
          return `${item.hallazgo || ""} ${evidencias}`.trim();
        })
        .filter(Boolean)
        .join("\n\n")
    : "";

  return [
    draft.titular_conclusion,
    draft.subtitulo,
    draft.explicacion_contexto,
    draft.que_circula,
    hallazgos,
    draft.conclusion_categoria_evidencia
  ]
    .filter((part) => part && part.trim())
    .join("\n\n");
}

export function buildHtmlExport(draft: { titular_conclusion?: string; texto_limpio?: string }) {
  const escapeHtml = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");

  const title = escapeHtml(draft.titular_conclusion || "Verificación ChequeaBolivia");
  const paragraphs = (draft.texto_limpio || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => (index === 0 && paragraph === draft.titular_conclusion ? "" : `<p>${escapeHtml(paragraph)}</p>`))
    .filter(Boolean)
    .join("\n");

  return `<article>\n  <h1>${title}</h1>\n  ${paragraphs}\n</article>`;
}
