import { NextResponse } from "next/server";
import { readCollection, storeFiles } from "@/lib/storage/jsonStore";
import type { ContentItem, PlatformVariant, PublishRecord, PublishRecordWithContent } from "@/types/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [records, contents, variants] = await Promise.all([
    readCollection<PublishRecord>(storeFiles.publishRecords),
    readCollection<ContentItem>(storeFiles.contents),
    readCollection<PlatformVariant>(storeFiles.platformVariants),
  ]);

  const variantTitleMap = new Map(variants.map((v) => [v.id, v.title]));
  const contentTitleMap = new Map(contents.map((c) => [c.id, c.title]));

  const result: PublishRecordWithContent[] = records
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => ({
      ...r,
      // Prefer bookmarklet-captured title, then variant title, then content title, then fallback
      articleTitle: r.articleTitle
        || (r.variantId && variantTitleMap.get(r.variantId))
        || contentTitleMap.get(r.contentId)
        || "已删除的内容",
    }));

  return NextResponse.json(result);
}
