import OpenAI from "openai";
import { z } from "zod";

export const DEFAULT_MODEL = "deepseek-v4.1-flash";

// 总时长上限：兜底保护。流式返回时只要数据持续在流动就不会触发。
const DEFAULT_TOTAL_TIMEOUT_MS = 600_000;
// 停滞上限：连续这么久没有收到任何新 token 才判定失败（长文流式生成不会误杀）。
const DEFAULT_STALL_TIMEOUT_MS = 90_000;

function readTimeoutEnv(name: string, fallback: number) {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

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
    // 超时与中断完全交给下面的 AbortController 管理，避免 SDK 自动重试悄悄吃掉时间预算。
    maxRetries: 0,
    timeout: readTimeoutEnv("AI_TOTAL_TIMEOUT_MS", DEFAULT_TOTAL_TIMEOUT_MS),
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
  const totalTimeoutMs = readTimeoutEnv("AI_TOTAL_TIMEOUT_MS", DEFAULT_TOTAL_TIMEOUT_MS);
  const stallTimeoutMs = readTimeoutEnv("AI_STALL_TIMEOUT_MS", DEFAULT_STALL_TIMEOUT_MS);

  const controller = new AbortController();
  let abortReason: "stall" | "total" | null = null;
  let stallTimer: ReturnType<typeof setTimeout> | undefined;
  const totalTimer = setTimeout(() => {
    abortReason = "total";
    controller.abort();
  }, totalTimeoutMs);

  // 每收到一段新内容就重置停滞计时器：流还活着就不算超时。
  const touchStall = () => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      abortReason = "stall";
      controller.abort();
    }, stallTimeoutMs);
  };
  const stopTimers = () => {
    if (stallTimer) clearTimeout(stallTimer);
    clearTimeout(totalTimer);
  };
  touchStall();

  const buildAbortError = () => {
    const timedOut = abortReason === "total" ? totalTimeoutMs : stallTimeoutMs;
    const reason = abortReason === "total" ? "总时长超限" : "长时间无返回";
    const seconds = Math.round(timedOut / 1000);
    console.error(`[ai] generateJson 中止：${reason}（${seconds} 秒），model=${model}`);
    return new Error(`AI 生成超时（${reason}，${seconds} 秒），文章较长时请拆分或稍后重试。`);
  };

  let content = "";
  try {
    const stream = await client.chat.completions.create(
      {
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
      },
      { signal: controller.signal },
    );

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        content += delta;
        touchStall();
      }
    }
  } catch (error) {
    if (controller.signal.aborted) {
      throw buildAbortError();
    }
    console.error("[ai] generateJson 请求失败：", error instanceof Error ? error.message : error);
    throw error;
  } finally {
    stopTimers();
  }

  // OpenAI SDK 在中止时可能直接结束流而不抛错，这里兜底判断一次。
  if (controller.signal.aborted) {
    throw buildAbortError();
  }

  const text = content.trim();
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
