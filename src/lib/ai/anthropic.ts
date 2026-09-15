import OpenAI from "openai";
import { z } from "zod";

export const DEFAULT_MODEL = "deepseek-v4.1-flash";

// 总时长上限：兜底保护。流式返回时只要数据持续在流动就不会触发。
const DEFAULT_TOTAL_TIMEOUT_MS = 600_000;
// 停滞上限：连续这么久没有收到任何新 token 才判定失败（长文流式生成不会误杀）。
const DEFAULT_STALL_TIMEOUT_MS = 90_000;
// 输出 token 上限。deepseek 等推理模型的思考过程也计入输出，长文建议调大。
const DEFAULT_MAX_TOKENS = 16384;

function readNumberEnv(name: string, fallback: number) {
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
    timeout: readNumberEnv("AI_TOTAL_TIMEOUT_MS", DEFAULT_TOTAL_TIMEOUT_MS),
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

type ChatChunk = {
  choices?: Array<{
    delta?: { content?: string | null };
    finish_reason?: string | null;
  }>;
  usage?: {
    completion_tokens?: number;
    prompt_tokens?: number;
    total_tokens?: number;
  } | null;
};

export async function generateJson<T>(prompt: string, schema: z.ZodSchema<T>, maxTokens?: number): Promise<{ data: T; model: string }> {
  const model = process.env.OPENAI_MODEL || process.env.ANTHROPIC_MODEL || process.env.AI_MODEL || DEFAULT_MODEL;
  const client = getClient();
  const totalTimeoutMs = readNumberEnv("AI_TOTAL_TIMEOUT_MS", DEFAULT_TOTAL_TIMEOUT_MS);
  const stallTimeoutMs = readNumberEnv("AI_STALL_TIMEOUT_MS", DEFAULT_STALL_TIMEOUT_MS);
  const maxTokensLimit = Math.floor(maxTokens || readNumberEnv("AI_MAX_TOKENS", DEFAULT_MAX_TOKENS));
  // 推理模型的思考 token 会计入输出上限，默认关闭思考以避免长文 JSON 被截断；AI_ENABLE_THINKING=1 可恢复。
  const enableThinking = process.env.AI_ENABLE_THINKING === "1";

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

  const createStream = async (extra: Record<string, unknown> = {}): Promise<AsyncIterable<ChatChunk>> => {
    const params = {
      model,
      temperature: 0.3,
      max_tokens: maxTokensLimit,
      stream: true,
      messages: [{ role: "user", content: prompt }],
      ...extra,
    };
    const response = await client.chat.completions.create(
      params as unknown as Parameters<typeof client.chat.completions.create>[0],
      { signal: controller.signal },
    );
    return response as unknown as AsyncIterable<ChatChunk>;
  };

  let content = "";
  let finishReason: string | null = null;
  let usage: ChatChunk["usage"] = null;
  try {
    let stream: AsyncIterable<ChatChunk>;
    if (enableThinking) {
      stream = await createStream();
    } else {
      try {
        stream = await createStream({ thinking: { type: "disabled" } });
      } catch (error) {
        // 不同模型/中转对扩展参数支持不一，遇到 400 时自动回退为普通请求。
        if ((error as { status?: number }).status === 400) {
          console.error(`[ai] 模型 ${model} 不支持 thinking 参数，已自动回退为普通请求。`);
          stream = await createStream();
        } else {
          throw error;
        }
      }
    }

    for await (const chunk of stream) {
      const choice = chunk.choices?.[0];
      if (choice?.delta?.content) {
        content += choice.delta.content;
        touchStall();
      }
      if (choice?.finish_reason) finishReason = choice.finish_reason;
      if (chunk.usage) usage = chunk.usage;
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

  if (finishReason === "length") {
    console.error(
      `[ai] 输出被截断：max_tokens=${maxTokensLimit}, content_len=${content.length}, finish_reason=length, usage=${JSON.stringify(usage)}, model=${model}`,
    );
    throw new Error(`AI 输出被截断（达到 ${maxTokensLimit} token 上限），JSON 不完整。请调大 AI_MAX_TOKENS 或缩短文章后重试。`);
  }

  const text = content.trim();
  if (!text) {
    throw new Error("AI 返回内容为空。 ");
  }

  let json: unknown;
  try {
    json = JSON.parse(extractJson(text));
  } catch (error) {
    const position = Number(/position (\d+)/.exec(error instanceof Error ? error.message : "")?.[1] ?? 0);
    const snippet = position > 0 ? text.slice(Math.max(0, position - 120), position + 120) : text.slice(-240);
    console.error(
      `[ai] JSON 解析失败：content_len=${text.length}, finish_reason=${finishReason}, usage=${JSON.stringify(usage)}, position=${position}, model=${model}, 附近内容=${JSON.stringify(snippet)}`,
    );
    throw new Error("AI 返回内容不是合法 JSON，无法解析。请重试一次；若反复出现，请在服务端日志中查看 [ai] 详情。");
  }
  return { data: schema.parse(json), model };
}

export async function generateTextStream(prompt: string, maxTokens?: number) {
  const model = process.env.OPENAI_MODEL || process.env.ANTHROPIC_MODEL || process.env.AI_MODEL || DEFAULT_MODEL;
  const client = getClient();

  return client.chat.completions.create({
    model,
    temperature: 0.3,
    max_tokens: maxTokens || Math.floor(readNumberEnv("AI_MAX_TOKENS", DEFAULT_MAX_TOKENS)),
    stream: true,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });
}
