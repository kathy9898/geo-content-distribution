import { NextResponse } from "next/server";
import type { ContentInput, ContentItem } from "@/types/geo";
import { createId, readCollection, storeFiles, writeCollection } from "@/lib/storage/jsonStore";

export const runtime = "nodejs";

function normalizeList(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value.split(/[，,\n]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

export async function GET() {
  const [contents, variants] = await Promise.all([
    readCollection<ContentItem>(storeFiles.contents),
    readCollection<{ contentId: string }>(storeFiles.platformVariants),
  ]);
  const variantCounts = new Map<string, number>();
  for (const v of variants) {
    variantCounts.set(v.contentId, (variantCounts.get(v.contentId) || 0) + 1);
  }
  const result = contents
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((item) => ({ ...item, variantCount: variantCounts.get(item.id) || 0 }));
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const payload = await request.json() as ContentInput;
  if (!payload.title?.trim() || !payload.body?.trim()) {
    return NextResponse.json({ message: "标题和正文不能为空" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const item: ContentItem = {
    id: createId("content"),
    title: payload.title.trim(),
    body: payload.body.trim(),
    brandName: payload.brandName?.trim() || "",
    keywords: normalizeList(payload.keywords),
    targetAudience: payload.targetAudience?.trim() || "",
    references: normalizeList(payload.references),
    callToAction: payload.callToAction?.trim() || "",
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };

  const contents = await readCollection<ContentItem>(storeFiles.contents);
  await writeCollection(storeFiles.contents, [item, ...contents]);

  return NextResponse.json(item);
}
