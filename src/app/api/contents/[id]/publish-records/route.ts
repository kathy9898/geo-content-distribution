import { NextResponse } from "next/server";
import { getContentDetail } from "@/lib/storage/contentRepository";
import { createId, readCollection, storeFiles, writeCollection } from "@/lib/storage/jsonStore";
import type { Platform, PublishRecord } from "@/types/geo";
import { detectPlatformFromUrl } from "@/types/geo";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const detail = await getContentDetail(params.id);
  if (!detail) {
    return NextResponse.json({ message: "内容不存在" }, { status: 404 });
  }

  const payload = await request.json() as {
    variantId?: string;
    platform?: Platform;
    publishUrl: string;
    publishedAt?: string;
    note?: string;
  };

  if (!payload.publishUrl?.trim()) {
    return NextResponse.json({ message: "发布链接不能为空" }, { status: 400 });
  }

  // Auto-detect platform from URL if not explicitly provided
  const detectedPlatform = payload.platform || detectPlatformFromUrl(payload.publishUrl.trim()) || "zhihu";

  const now = new Date().toISOString();
  const record: PublishRecord = {
    id: createId("publish"),
    contentId: detail.content.id,
    variantId: payload.variantId,
    platform: detectedPlatform,
    publishUrl: payload.publishUrl.trim(),
    publishedAt: payload.publishedAt || now,
    note: payload.note?.trim() || "",
    createdAt: now,
  };

  const records = await readCollection<PublishRecord>(storeFiles.publishRecords);
  await writeCollection(storeFiles.publishRecords, [record, ...records]);
  return NextResponse.json(record);
}
