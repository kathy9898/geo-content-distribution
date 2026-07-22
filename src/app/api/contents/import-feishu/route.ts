import { NextResponse } from "next/server";
import { importFeishuDoc } from "@/lib/feishu/doc";
import { createId, readCollection, storeFiles, writeCollection } from "@/lib/storage/jsonStore";
import type { ContentItem } from "@/types/geo";

export const runtime = "nodejs";

function normalizeList(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value.split(/[，,\n]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as {
      url: string;
      brandName?: string;
      keywords?: string[] | string;
      targetAudience?: string;
      references?: string[] | string;
      callToAction?: string;
    };

    if (!payload.url?.trim()) {
      return NextResponse.json({ message: "飞书文档链接不能为空" }, { status: 400 });
    }

    const imported = await importFeishuDoc(payload.url);
    const now = new Date().toISOString();
    const references = [payload.url, ...normalizeList(payload.references)];
    const item: ContentItem = {
      id: createId("content"),
      title: imported.title,
      body: imported.body,
      brandName: payload.brandName?.trim() || "",
      keywords: normalizeList(payload.keywords),
      targetAudience: payload.targetAudience?.trim() || "",
      references,
      callToAction: payload.callToAction?.trim() || "",
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };

    const contents = await readCollection<ContentItem>(storeFiles.contents);
    await writeCollection(storeFiles.contents, [item, ...contents]);

    return NextResponse.json({ ...item, sourceType: imported.sourceType, sourceDocumentId: imported.documentId });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "飞书导入失败" },
      { status: 500 },
    );
  }
}
