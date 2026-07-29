import { NextResponse } from "next/server";
import { generateJson } from "@/lib/ai/anthropic";
import { buildGeoOptimizationPrompt, buildIndependentArticleRetryPrompt, GEO_PROMPT_VERSION } from "@/lib/ai/prompts";
import { getPromptTemplate } from "@/lib/ai/promptTemplates";
import { geoOptimizationOutputSchema } from "@/lib/ai/schemas";
import { findSourceNarrationPhrases } from "@/lib/ai/geoStyleValidation";
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
    const prompt = buildGeoOptimizationPrompt(detail.content, template.content);
    let result = await generateJson(
      prompt,
      geoOptimizationOutputSchema,
    );
    const narrationPhrases = findSourceNarrationPhrases(result.data);
    if (narrationPhrases.length) {
      result = await generateJson(
        buildIndependentArticleRetryPrompt(prompt, narrationPhrases),
        geoOptimizationOutputSchema,
      );
      const retryNarrationPhrases = findSourceNarrationPhrases(result.data);
      if (retryNarrationPhrases.length) {
        throw new Error(`生成结果仍包含转述原文的话术：${retryNarrationPhrases.join("、")}，请重新执行 GEO 调优。`);
      }
    }

    if (result.data.dimensionScores.length) {
      let sourceTotal = 0;
      let optimizedTotal = 0;
      for (const dimension of result.data.dimensionScores) {
        dimension.weight = Math.max(0, Math.min(100, Math.round(dimension.weight)));
        dimension.beforeScore = Math.max(0, Math.min(dimension.weight, Math.round(dimension.beforeScore)));
        dimension.afterScore = Math.max(0, Math.min(dimension.weight, Math.round(dimension.afterScore)));
        sourceTotal += dimension.beforeScore;
        optimizedTotal += dimension.afterScore;
      }
      result.data.sourceGeoScore = sourceTotal;
      result.data.geoScore = optimizedTotal;
      result.data.qualified = optimizedTotal >= 80;
    }

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
