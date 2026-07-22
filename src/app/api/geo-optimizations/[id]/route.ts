import { NextResponse } from "next/server";
import { readCollection, storeFiles, writeCollection } from "@/lib/storage/jsonStore";
import type { GeoChangePreview, GeoChecklistItem, GeoOptimization } from "@/types/geo";

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
