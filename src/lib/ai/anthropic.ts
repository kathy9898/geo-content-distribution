import OpenAI from "openai";
import { z } from "zod";

export const DEFAULT_MODEL = "gpt-5.5";

function normalizeBaseUrl(url?: string) {
  if (!url) return undefined;
  const trimmed = url.replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("缺少 OPENAI_API_KEY，请先在 .env.local 中配置 GPT/OpenAI 兼容 API Key。 ");
  }

  return new OpenAI({
    apiKey,
    baseURL: normalizeBaseUrl(process.env.OPENAI_BASE_URL || process.env.AI_BASE_URL),
  });
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("AI 返回内容不是 JSON，无法解析。 ");
  }
  return match[0];
}

export async function generateJson<T>(prompt: string, schema: z.ZodSchema<T>, maxTokens?: number): Promise<{ data: T; model: string }> {
  const model = process.env.OPENAI_MODEL || process.env.ANTHROPIC_MODEL || process.env.AI_MODEL || DEFAULT_MODEL;
  const client = getClient();

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    max_tokens: maxTokens || 16384,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("AI 返回内容为空。 ");
  }

  const json = JSON.parse(extractJson(text));
  return { data: schema.parse(json), model };
}

export async function generateTextStream(prompt: string, maxTokens?: number) {
  const model = process.env.OPENAI_MODEL || process.env.ANTHROPIC_MODEL || process.env.AI_MODEL || DEFAULT_MODEL;
  const client = getClient();

  return client.chat.completions.create({
    model,
    temperature: 0.3,
    max_tokens: maxTokens || 16384,
    stream: true,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });
}
