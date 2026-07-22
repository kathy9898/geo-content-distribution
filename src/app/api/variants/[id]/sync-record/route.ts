import { NextResponse } from "next/server";
import { createId, readCollection, storeFiles, writeCollection } from "@/lib/storage/jsonStore";
import type { PlatformVariant, PublishRecord } from "@/types/geo";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const variants = await readCollection<PlatformVariant>(storeFiles.platformVariants);
    const variant = variants.find((item) => item.id === params.id);

    if (!variant) {
      return NextResponse.json({ message: "平台版本不存在" }, { status: 404 });
    }

    const payload = await request.json() as {
      status?: "draft_synced" | "failed";
      publishUrl?: string;
      syncTaskId?: string;
      note?: string;
    };

    if (!payload.status) {
      return NextResponse.json({ message: "同步状态不能为空" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const record: PublishRecord = {
      id: createId("publish"),
      contentId: variant.contentId,
      variantId: variant.id,
      platform: variant.platform,
      publishUrl: payload.publishUrl?.trim() || "草稿箱同步完成，暂无草稿链接",
      publishedAt: now,
      note: payload.note?.trim() || "Wechatsync 草稿同步",
      syncStatus: payload.status,
      syncTaskId: payload.syncTaskId,
      syncedAt: now,
      createdAt: now,
    };

    const records = await readCollection<PublishRecord>(storeFiles.publishRecords);
    await writeCollection(storeFiles.publishRecords, [record, ...records]);

    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "保存同步记录失败" },
      { status: 500 },
    );
  }
}
