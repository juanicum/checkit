type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

export function tryParseJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("La IA no devolvió un JSON válido.");
    return JSON.parse(match[0]) as T;
  }
}

export async function callOpenAIJson<T>({
  systemPrompt,
  userPrompt,
  temperature = 0.2
}: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  if (!apiKey) {
    throw new Error("Falta configurar OPENAI_API_KEY en Vercel o en .env.local.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    })
  });

  const data = (await response.json()) as OpenAIChatResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || "Error al llamar a la API de OpenAI.");
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("La IA no devolvió contenido.");
  }

  return tryParseJson<T>(content);
}
