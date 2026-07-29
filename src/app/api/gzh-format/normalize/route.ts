import { NextRequest } from "next/server";
import { generateTextStream } from "@/lib/ai/anthropic";

export const runtime = "nodejs";
export const maxDuration = 120;

function buildPrompt(rawText: string) {
  return `你是一名微信公众号资深编辑。请把用户给的原始文章整理成结构清晰的标准 Markdown，供下游排版引擎渲染。

【输出格式硬约束】
1. 只输出 Markdown 正文，不要输出任何解释性文字、前后缀、客套话，不要用 \`\`\`markdown 代码围栏包裹全文。
2. 结构必须包含：一个 \`# 标题\`（文章主标题，只此一个一级标题）；标题后紧跟一个 \`> 引言金句\`（从原文提炼或润色出的一句导读，1-2 句话）；若干 \`## 章节标题\`（按原文逻辑划分，3-8 个）；章节内可用 \`### 小标题\`。
3. 正文中每个段落必须挑出 1-2 个核心词或短语（4-15 字，优先核心观点、结论、关键数据、专有名词），用 \`++词语++\` 标记；整段无要点可不标。
4. 挑出全文 1-3 句最有传播力的金句，用 \`==金句==\` 高亮标记。
5. 保留原文的图片 \`![说明](url)\`、代码块、行内代码、有序/无序列表，不得丢失实质内容，不要自行增删事实。
6. 正文标点一律使用中文全角（，。！？：；""''（）——），代码块、行内代码、URL、英文专名内部保持原样。
7. 不要出现"原文提到""原文强调"这类引用口吻，直接以文章自身的口吻输出成品。

【原始文章】
${rawText}`;
}

export async function POST(request: NextRequest) {
  let rawText = "";
  try {
    const body = await request.json();
    rawText = String(body?.text || "").trim();
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  if (!rawText) {
    return Response.json({ error: "正文不能为空" }, { status: 400 });
  }
  if (rawText.length > 60000) {
    return Response.json({ error: "正文过长（超过 6 万字符），请分段处理" }, { status: 400 });
  }

  try {
    const stream = await generateTextStream(buildPrompt(rawText));

    const readable = new ReadableStream<string>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || "";
            if (delta) controller.enqueue(delta);
          }
        } catch (err) {
          controller.error(err);
          return;
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 归一化失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
