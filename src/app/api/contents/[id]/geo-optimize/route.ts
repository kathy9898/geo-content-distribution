import { NextResponse } from "next/server";
import { generateJson } from "@/lib/ai/anthropic";
import { buildGeoOptimizationPrompt, GEO_PROMPT_VERSION } from "@/lib/ai/prompts";
import { getPromptTemplate } from "@/lib/ai/promptTemplates";
import { geoOptimizationOutputSchema } from "@/lib/ai/schemas";
import { getContentDetail, updateContent } from "@/lib/storage/contentRepository";
import { createId, readCollection, storeFiles, writeCollection } from "@/lib/storage/jsonStore";
import type { GeoOptimization } from "@/types/geo";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const detail = await getContentDetail(params.id);
    if (!detail) {
      return NextResponse.json({ message: "内容不存在" }, { status: 404 });
    }

    const template = await getPromptTemplate("geo");
    const result = await generateJson(
      buildGeoOptimizationPrompt(detail.content, template.content),
      geoOptimizationOutputSchema,
    );

    const now = new Date().toISOString();
    const geo: GeoOptimization = {
      id: createId("geo"),
      contentId: detail.content.id,
      ...result.data,
      model: result.model,
      promptVersion: GEO_PROMPT_VERSION,
      createdAt: now,
    };

    const geoItems = await readCollection<GeoOptimization>(storeFiles.geoOptimizations);
    await writeCollection(storeFiles.geoOptimizations, [geo, ...geoItems]);
    await updateContent({ ...detail.content, status: "geo_optimized", updatedAt: now });

    return NextResponse.json(geo);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "GEO 调优失败" },
      { status: 500 },
    );
  }
}
