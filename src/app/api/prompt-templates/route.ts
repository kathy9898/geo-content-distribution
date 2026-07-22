import { NextResponse } from "next/server";
import { getPromptTemplates, savePromptTemplate, type PromptTemplateKey } from "@/lib/ai/promptTemplates";

export const runtime = "nodejs";

const validKeys: PromptTemplateKey[] = ["geo", "zhihu", "toutiao", "baijiahao", "csdn", "cnblogs", "juejin", "sohu", "netease", "wechat", "cto51"];

export async function GET() {
  try {
    const templates = await getPromptTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "获取 Prompt 模板失败" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { key, content } = await request.json() as { key?: PromptTemplateKey; content?: string };

    if (!key || !validKeys.includes(key)) {
      return NextResponse.json({ message: "Prompt 模板不存在" }, { status: 400 });
    }
    if (!content?.trim()) {
      return NextResponse.json({ message: "Prompt 模板内容不能为空" }, { status: 400 });
    }

    const template = await savePromptTemplate(key, content.trim());
    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "保存 Prompt 模板失败" },
      { status: 500 },
    );
  }
}
