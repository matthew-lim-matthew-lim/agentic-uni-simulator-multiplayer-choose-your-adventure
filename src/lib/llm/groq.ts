import Groq from "groq-sdk";
import { LlmSceneSchema, type LlmScene } from "@/lib/game/types";

const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

let cachedClient: Groq | null = null;

export function getGroq(): Groq {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not set. Add it to .env.local or Cursor Cloud Agent secrets."
    );
  }
  cachedClient = new Groq({ apiKey });
  return cachedClient;
}

export function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY);
}

/**
 * Single-shot structured generation. Asks Groq for JSON, parses, validates with
 * Zod, retries once on parse failure with a corrective nudge.
 */
export async function generateScene(args: {
  system: string;
  user: string;
  signal?: AbortSignal;
}): Promise<LlmScene> {
  const client = getGroq();
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: args.system },
    { role: "user", content: args.user },
  ];

  const attempt = async (): Promise<LlmScene> => {
    const completion = await client.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages,
        response_format: { type: "json_object" },
        temperature: 0.85,
        max_tokens: 900,
      },
      { signal: args.signal }
    );

    const raw = completion.choices[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new ParseError("Groq returned non-JSON content", raw);
    }
    const result = LlmSceneSchema.safeParse(parsed);
    if (!result.success) {
      throw new ParseError(
        "Groq JSON failed schema validation: " + result.error.message,
        raw
      );
    }
    return result.data;
  };

  try {
    return await attempt();
  } catch (err) {
    if (!(err instanceof ParseError)) throw err;
    messages.push({
      role: "assistant",
      content: err.raw,
    });
    messages.push({
      role: "user",
      content:
        "Your previous response could not be parsed (" +
        err.message +
        "). Re-emit ONE valid JSON object that matches the schema EXACTLY. No prose, no markdown.",
    });
    return attempt();
  }
}

class ParseError extends Error {
  constructor(message: string, public raw: string) {
    super(message);
    this.name = "ParseError";
  }
}
