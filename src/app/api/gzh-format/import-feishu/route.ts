/**
 * POST /api/gzh-format/import-feishu
 * 排版专用飞书导入 —— 只返回 Markdown，不创建 ContentItem
 */
import { NextResponse } from "next/server";
import { importFeishuDoc } from "@/lib/feishu/doc";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { url?: string };

    if (!payload.url?.trim()) {
      return NextResponse.json({ error: "飞书文档链接不能为空" }, { status: 400 });
    }

    const imported = await importFeishuDoc(payload.url);

    return NextResponse.json({
      title: imported.title,
      markdown: imported.body,
      sourceType: imported.sourceType,
      documentId: imported.documentId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "飞书导入失败" },
      { status: 500 },
    );
  }
}
