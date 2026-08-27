import { NextResponse } from "next/server";
import { readCollection, storeFiles, writeCollection } from "@/lib/storage/jsonStore";
import { getContentDetail, updateContent } from "@/lib/storage/contentRepository";
import type { GeoChangePreview, GeoChecklistItem, GeoOptimization } from "@/types/geo";
import type { PlatformVariant } from "@/types/geo";

export const runtime = "nodejs";

type GeoPatchPayload = Partial<Pick<
  GeoOptimization,
  "title" | "summary" | "coreConclusion" | "bodyMarkdown" | "geoScore" | "sourceGeoScore" | "qualified" | "riskNotes" | "improvementSuggestions"
>> & {
  checklistItems?: GeoChecklistItem[];
  changePreview?: GeoChangePreview[];
};

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const payload = await request.json() as GeoPatchPayload;
  const items = await readCollection<GeoOptimization>(storeFiles.geoOptimizations);
  const index = items.findIndex((item) => item.id === params.id);

  if (index < 0) {
    return NextResponse.json({ message: "GEO 调优结果不存在" }, { status: 404 });
  }

  items[index] = {
    ...items[index],
    title: payload.title ?? items[index].title,
    summary: payload.summary ?? items[index].summary,
    coreConclusion: payload.coreConclusion ?? items[index].coreConclusion,
    bodyMarkdown: payload.bodyMarkdown ?? items[index].bodyMarkdown,
    geoScore: typeof payload.geoScore === "number" ? payload.geoScore : items[index].geoScore,
    sourceGeoScore: typeof payload.sourceGeoScore === "number" ? payload.sourceGeoScore : items[index].sourceGeoScore,
    qualified: typeof payload.qualified === "boolean" ? payload.qualified : items[index].qualified,
    riskNotes: Array.isArray(payload.riskNotes) ? payload.riskNotes : items[index].riskNotes,
    improvementSuggestions: Array.isArray(payload.improvementSuggestions) ? payload.improvementSuggestions : items[index].improvementSuggestions,
    checklistItems: Array.isArray(payload.checklistItems) ? payload.checklistItems : items[index].checklistItems,
    changePreview: Array.isArray(payload.changePreview) ? payload.changePreview : items[index].changePreview,
    updatedAt: new Date().toISOString(),
  };

  await writeCollection(storeFiles.geoOptimizations, items);
  return NextResponse.json(items[index]);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const geos = await readCollection<GeoOptimization>(storeFiles.geoOptimizations);
    const target = geos.find((item) => item.id === params.id);

    if (!target) {
      return NextResponse.json({ message: "GEO 调优结果不存在" }, { status: 404 });
    }

    // 删除 GEO 调优结果
    await writeCollection(storeFiles.geoOptimizations, geos.filter((item) => item.id !== params.id));

    // 级联删除基于该 GEO 优化的平台版本
    const variants = await readCollection<PlatformVariant>(storeFiles.platformVariants);
    await writeCollection(storeFiles.platformVariants, variants.filter((v) => v.geoOptimizationId !== params.id));

    // 重置内容状态为草稿
    const detail = await getContentDetail(target.contentId);
    if (detail) {
      await updateContent({ ...detail.content, status: "draft", updatedAt: new Date().toISOString() });
    }

    return NextResponse.json({ message: "已删除 GEO 调优结果及关联的平台版本" });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "删除失败" },
      { status: 500 },
    );
  }
}
