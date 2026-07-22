import { NextResponse } from "next/server";
import { generateJson } from "@/lib/ai/anthropic";
import { buildCitationValidationPrompt } from "@/lib/ai/prompts";
import { citationValidationOutputSchema } from "@/lib/ai/schemas";
import { readCollection, storeFiles, writeCollection, createId } from "@/lib/storage/jsonStore";
import type { PlatformVariant, CitationValidationRun, CitationModelResult, CitationModelKey } from "@/types/geo";
import { citationModelLabels } from "@/types/geo";

export const runtime = "nodejs";

const VALID_MODELS: CitationModelKey[] = ["doubao", "ernie", "deepseek", "kimi", "qwen"];

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { variantId, models: requestedModels } = await request.json() as {
      variantId: string;
      models?: CitationModelKey[];
    };

    if (!variantId) {
      return NextResponse.json({ message: "请指定要验证的平台版本" }, { status: 400 });
    }

    const models = (requestedModels?.length ? requestedModels : VALID_MODELS)
      .filter((m) => VALID_MODELS.includes(m));

    if (!models.length) {
      return NextResponse.json({ message: "请至少选择一个验证模型" }, { status: 400 });
    }

    // Find the variant
    const variants = await readCollection<PlatformVariant>(storeFiles.platformVariants);
    const variant = variants.find((v) => v.id === variantId);
    if (!variant) {
      return NextResponse.json({ message: "平台版本不存在" }, { status: 404 });
    }
    if (variant.contentId !== params.id) {
      return NextResponse.json({ message: "版本不属于该内容" }, { status: 400 });
    }

    // Run validation for each model
    const prompt = buildCitationValidationPrompt(variant.title, variant.bodyMarkdown);
    const modelResults: CitationModelResult[] = [];

    for (const modelKey of models) {
      try {
        const result = await generateJson(
          prompt,
          citationValidationOutputSchema,
        );
        modelResults.push({
          model: modelKey,
          ...result.data,
        });
      } catch (err) {
        modelResults.push({
          model: modelKey,
          citationScore: 0,
          citationProbabilityReason: "验证失败：" + (err instanceof Error ? err.message : "未知错误"),
          deductions: [],
          top3Improvements: [],
          likelyQuotedSections: [],
          riskNotes: ["验证过程出错，无法获取结果"],
          triggerQueries: [],
          summary: "验证失败",
        });
      }
    }

    // Compute aggregate
    const validScores = modelResults.filter((r) => r.citationScore > 0).map((r) => r.citationScore);
    const averageScore = validScores.length
      ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10
      : 0;

    // Find common deductions (mentioned by 2+ models)
    const allDeductionIssues = modelResults.flatMap((r) => r.deductions.map((d) => d.issue));
    const issueCounts = new Map<string, number>();
    for (const issue of allDeductionIssues) {
      issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1);
    }
    const commonDeductions = Array.from(issueCounts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([issue, count]) => `${issue}（${count}/${models.length} 个模型提到）`);

    // Collect top improvements
    const topImprovements = modelResults
      .flatMap((r) => r.top3Improvements.map((imp) => `${imp.target}：${imp.reason}`))
      .slice(0, 5);

    // Final recommendation
    let finalRecommendation: "pass" | "revise" | "high_risk";
    if (averageScore >= 8) {
      finalRecommendation = "pass";
    } else if (averageScore >= 6.5) {
      finalRecommendation = "revise";
    } else {
      finalRecommendation = "high_risk";
    }

    const now = new Date().toISOString();
    const run: CitationValidationRun = {
      id: createId("citation"),
      contentId: params.id,
      variantId,
      inputSource: "platform_variant",
      models: modelResults,
      averageScore,
      commonDeductions,
      topImprovements,
      finalRecommendation,
      createdAt: now,
    };

    const runs = await readCollection<CitationValidationRun>(storeFiles.citationValidations);
    await writeCollection(storeFiles.citationValidations, [run, ...runs]);

    return NextResponse.json(run);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "AI 引用验证失败" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const variantId = searchParams.get("variantId");

  const runs = await readCollection<CitationValidationRun>(storeFiles.citationValidations);
  const filtered = runs.filter((r) => {
    if (r.contentId !== params.id) return false;
    if (variantId && r.variantId !== variantId) return false;
    return true;
  });

  return NextResponse.json(filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}
