const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "anthropic/claude-sonnet-4-6";

export interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function chatCompletion(
  messages: OpenRouterMessage[],
  options: { model?: string; max_tokens?: number } = {}
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY no configurada");

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002",
      "X-Title": "AdsHouse Alcanza",
    },
    body: JSON.stringify({
      model: options.model ?? DEFAULT_MODEL,
      max_tokens: options.max_tokens ?? 2048,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
