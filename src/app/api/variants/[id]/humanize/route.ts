import { NextResponse } from "next/server";
import { generateJson } from "@/lib/ai/anthropic";
import { hasBlockingHumanizeChecks, humanizeStyleIssues, validateHumanizedVariant } from "@/lib/ai/humanizeValidation";
import { buildHumanizePrompt, buildHumanizeStyleRetryPrompt, HUMANIZE_PROMPT_VERSION } from "@/lib/ai/prompts";
import { humanizeOutputSchema } from "@/lib/ai/schemas";
import { readCollection, storeFiles, writeCollection } from "@/lib/storage/jsonStore";
import type { ContentItem, HumanizeIntensity, PlatformVariant, VariantTextSnapshot } from "@/types/geo";

export const runtime = "nodejs";

const intensities: HumanizeIntensity[] = ["light", "medium", "strong"];

function snapshot(variant: PlatformVariant): VariantTextSnapshot {
  return {
    title: variant.title,
    summary: variant.summary,
    bodyMarkdown: variant.bodyMarkdown,
    tags: variant.tags,
  };
}

function protectedTerms(content: ContentItem | undefined) {
  return Array.from(new Set([
    content?.brandName,
    ...(content?.keywords || []),
  ].filter((item): item is string => Boolean(item?.trim()))));
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { intensity = "medium" } = await request.json() as { intensity?: HumanizeIntensity };
    if (!intensities.includes(intensity)) {
      return NextResponse.json({ message: "不支持的润色强度" }, { status: 400 });
    }

    const [variants, contents] = await Promise.all([
      readCollection<PlatformVariant>(storeFiles.platformVariants),
      readCollection<ContentItem>(storeFiles.contents),
    ]);
    const index = variants.findIndex((item) => item.id === params.id);
    if (index < 0) {
      return NextResponse.json({ message: "平台版本不存在" }, { status: 404 });
    }

    const variant = variants[index];
    const source = variant.humanize?.source || snapshot(variant);
    const terms = protectedTerms(contents.find((item) => item.id === variant.contentId));
    const sourceVariant = { ...variant, ...source };
    const prompt = buildHumanizePrompt(sourceVariant, intensity, terms);
    let result = await generateJson(
      prompt,
      humanizeOutputSchema,
    );
    let polished: VariantTextSnapshot = {
      title: result.data.title,
      summary: result.data.summary,
      bodyMarkdown: result.data.bodyMarkdown,
      tags: result.data.tags,
    };
    const styleIssues = humanizeStyleIssues(source, polished, intensity);
    if (styleIssues.length) {
      result = await generateJson(
        buildHumanizeStyleRetryPrompt(prompt, styleIssues),
        humanizeOutputSchema,
      );
      polished = {
        title: result.data.title,
        summary: result.data.summary,
        bodyMarkdown: result.data.bodyMarkdown,
        tags: result.data.tags,
      };
    }
    const checks = validateHumanizedVariant(source, polished, terms);
    const remainingStyleIssues = humanizeStyleIssues(source, polished, intensity);
    checks.push({
      key: "khazix-style",
      label: "卡兹克风格强度",
      passed: remainingStyleIssues.length === 0,
      severity: remainingStyleIssues.length ? "warning" : "info",
      detail: remainingStyleIssues.length ? remainingStyleIssues.join("；") : "开头、结尾与意象表达达到当前强度要求",
    });
    const now = new Date().toISOString();

    variants[index] = {
      ...variant,
      ...source,
      humanize: {
        status: "generated",
        profile: "khazix-lite",
        intensity,
        source,
        polished,
        humanToneScore: result.data.humanToneScore,
        geoFidelityScore: result.data.geoFidelityScore,
        platformToneScore: result.data.platformToneScore,
        factualConsistencyScore: result.data.factualConsistencyScore,
        changeSummary: result.data.changeSummary,
        riskNotes: result.data.riskNotes,
        checks,
        model: result.model,
        promptVersion: HUMANIZE_PROMPT_VERSION,
        generatedAt: now,
      },
      updatedAt: now,
    };
    await writeCollection(storeFiles.platformVariants, variants);
    return NextResponse.json(variants[index]);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "真人感润色失败" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { action } = await request.json() as { action?: "apply" | "restore" };
  if (action !== "apply" && action !== "restore") {
    return NextResponse.json({ message: "不支持的操作" }, { status: 400 });
  }

  const variants = await readCollection<PlatformVariant>(storeFiles.platformVariants);
  const index = variants.findIndex((item) => item.id === params.id);
  if (index < 0) {
    return NextResponse.json({ message: "平台版本不存在" }, { status: 404 });
  }

  const variant = variants[index];
  if (!variant.humanize) {
    return NextResponse.json({ message: "请先生成真人感润色稿" }, { status: 400 });
  }
  if (action === "apply" && hasBlockingHumanizeChecks(variant.humanize.checks)) {
    return NextResponse.json({ message: "润色稿存在事实或内容保护项错误，不能应用" }, { status: 409 });
  }

  const selected = action === "apply" ? variant.humanize.polished : variant.humanize.source;
  const now = new Date().toISOString();
  variants[index] = {
    ...variant,
    ...selected,
    humanize: {
      ...variant.humanize,
      status: action === "apply" ? "applied" : "generated",
      appliedAt: action === "apply" ? now : undefined,
    },
    updatedAt: now,
  };
  await writeCollection(storeFiles.platformVariants, variants);
  return NextResponse.json(variants[index]);
}
