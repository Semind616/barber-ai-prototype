/** По умолчанию Polza.ai; для прямого OpenAI задайте OPENAI_API_BASE_URL=https://api.openai.com/v1 */
function chatCompletionsUrl(): string {
  const base =
    process.env.OPENAI_API_BASE_URL?.trim().replace(/\/$/, "") ||
    "https://polza.ai/api/v1";
  return `${base}/chat/completions`;
}

type ChatMessage =
  | { role: "system"; content: string }
  | {
      role: "user";
      content: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
    };

export async function requestBarberPromptFromGpt(params: {
  apiKey: string;
  imageBase64: string;
  mimeType: string;
  systemPrompt: string;
  userCaption?: string;
}): Promise<string> {
  const { apiKey, imageBase64, mimeType, systemPrompt, userCaption } = params;
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        {
          type: "text",
          text:
            userCaption?.trim() ||
            "Сгенерируй промпт для image-to-image по этому фото.",
        },
        { type: "image_url", image_url: { url: dataUrl } },
      ],
    },
  ];

  const res = await fetch(chatCompletionsUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || "gpt-5.4",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  const json = (await res.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!res.ok) {
    const msg = json.error?.message || res.statusText;
    throw new Error(`Vision LLM: ${msg}`);
  }

  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Vision LLM: пустой ответ модели");
  }
  return text;
}
