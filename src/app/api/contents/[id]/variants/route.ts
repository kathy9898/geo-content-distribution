import { NextResponse } from "next/server";
import { generateJson } from "@/lib/ai/anthropic";
import { buildPlatformVariantPrompt } from "@/lib/ai/prompts";
import { getPromptTemplate } from "@/lib/ai/promptTemplates";
import { platformVariantOutputSchema } from "@/lib/ai/schemas";
import { getContentDetail, updateContent } from "@/lib/storage/contentRepository";
import { createId, readCollection, storeFiles, writeCollection } from "@/lib/storage/jsonStore";
import type { Platform, PlatformVariant } from "@/types/geo";

export const runtime = "nodejs";

const platforms: Platform[] = ["zhihu", "toutiao", "baijiahao", "csdn", "cnblogs", "juejin", "sohu", "netease", "wechat", "cto51"];

/**
 * 从源文章中提取按章节分组的图片引用。
 * 返回一个数组，每个元素是 { heading, images }：
 *   heading — 图片之前最近的 ## 标题文本（小写），没有标题则为 ""
 *   images  — 该标题下所有 ![alt](/api/feishu-image/token) 字符串
 */
function extractSourceImagesBySection(body: string) {
  const lines = body.split("\n");
  const sections: { heading: string; images: string[] }[] = [];
  let currentHeading = "";

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,4}\s+(.+)/);
    if (headingMatch) {
      currentHeading = headingMatch[1].trim().toLowerCase();
      continue;
    }
    const imgMatch = line.match(/!\[[^\]]*\]\(\/api\/feishu-image\/[^)]+\)/);
    if (imgMatch) {
      let section = sections.find((s) => s.heading === currentHeading);
      if (!section) {
        section = { heading: currentHeading, images: [] };
        sections.push(section);
      }
      section.images.push(imgMatch[0]);
    }
  }
  return sections;
}

/**
 * 将源文章中按章节分组的图片恢复到 AI 生成的变体正文中。
 *
 * 策略：
 * 1. 先修复 AI 可能改写的飞书内部 URL → /api/feishu-image/{token}
 * 2. 统计变体中已有的图片数量；如果已经齐全则跳过
 * 3. 对源文章中每个章节的图片，在变体正文中找最接近的标题位置插入
 * 4. 已存在于变体中的图片不会重复插入
 */
function restoreMissingImages(variantBody: string, sourceBody: string): string {
  // 1. 修复 AI 改写的飞书内部 URL
  let body = variantBody.replace(
    /!\[([^\]]*)\]\(https?:\/\/[^\s)\]]*feishu\.cn[^\s)\]]*?\/([A-Za-z0-9]{20,})[^\s)\]]*\)/g,
    (_match, alt: string, token: string) => `![${alt}](/api/feishu-image/${token})`,
  );

  // 2. 收集变体中已有的图片 token（避免重复插入）
  const existingTokens = new Set(
    Array.from(body.matchAll(/\/api\/feishu-image\/([A-Za-z0-9]+)/g)).map((m) => m[1]),
  );

  const sourceSections = extractSourceImagesBySection(sourceBody);

  // 3. 如果变体已经有足够的图片，不需要恢复
  const totalSourceImages = sourceSections.reduce((sum, s) => sum + s.images.length, 0);
  if (existingTokens.size >= totalSourceImages) return body;

  // 4. 按章节在变体中找最佳插入位置
  const bodyLines = body.split("\n");

  for (const section of sourceSections) {
    const missingImages = section.images.filter((img) => {
      const tokenMatch = img.match(/\/api\/feishu-image\/([A-Za-z0-9]+)/);
      return tokenMatch && !existingTokens.has(tokenMatch[1]);
    });
    if (!missingImages.length) continue;

    // 在变体中查找最匹配的标题行
    let insertIndex = -1;
    if (section.heading) {
      // 模糊匹配：标题文本有部分重叠即可
      const headingKeywords = section.heading
        .replace(/[：:，,、。！？？!?.\-—–()（）\[\]【】]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 2);

      for (let i = 0; i < bodyLines.length; i++) {
        const lineLower = bodyLines[i].toLowerCase();
        if (/^#{1,4}\s+/.test(bodyLines[i])) {
          const matched = headingKeywords.some((kw) => lineLower.includes(kw));
          if (matched) {
            insertIndex = i + 1;
            break;
          }
        }
      }
    }

    // 如果没找到匹配标题，找下一个标题前的空行位置（追加到当前内容末尾区域）
    if (insertIndex === -1) {
      insertIndex = bodyLines.length;
    }

    // 在插入位置向后找到第一个空行或下一个标题，在它之前插入
    while (insertIndex < bodyLines.length && bodyLines[insertIndex].trim() !== "" && !/^#{1,4}\s+/.test(bodyLines[insertIndex])) {
      insertIndex++;
    }

    // 插入图片
    const imageBlock = ["", ...missingImages, ""].join("\n");
    bodyLines.splice(insertIndex, 0, imageBlock);

    // 更新已有 token 集合
    for (const img of missingImages) {
      const tokenMatch = img.match(/\/api\/feishu-image\/([A-Za-z0-9]+)/);
      if (tokenMatch) existingTokens.add(tokenMatch[1]);
    }
  }

  return bodyLines.join("\n");
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { platform } = await request.json() as { platform: Platform };
    if (!platforms.includes(platform)) {
      return NextResponse.json({ message: "不支持的平台" }, { status: 400 });
    }

    const detail = await getContentDetail(params.id);
    if (!detail) {
      return NextResponse.json({ message: "内容不存在" }, { status: 404 });
    }

    const template = await getPromptTemplate(platform);
    const result = await generateJson(
      buildPlatformVariantPrompt(detail.content, detail.geoOptimization, platform, template.content),
      platformVariantOutputSchema,
    );

    // AI 生成后恢复源文章中的图片引用：
    // 1. 修复 AI 改写的飞书内部 URL → /api/feishu-image/{token}
    // 2. 将源文章中 AI 遗漏的图片按章节位置插回变体正文
    const sourceBody = detail.geoOptimization?.bodyMarkdown || detail.content.body;
    if (result.data.bodyMarkdown && sourceBody) {
      result.data.bodyMarkdown = restoreMissingImages(result.data.bodyMarkdown, sourceBody);
    }

    const now = new Date().toISOString();
    const variant: PlatformVariant = {
      id: createId("variant"),
      contentId: detail.content.id,
      geoOptimizationId: detail.geoOptimization?.id,
      platform,
      ...result.data,
      reviewStatus: "draft",
      createdAt: now,
      updatedAt: now,
    };

    const variants = await readCollection<PlatformVariant>(storeFiles.platformVariants);
    await writeCollection(storeFiles.platformVariants, [variant, ...variants]);
    await updateContent({ ...detail.content, status: "variant_generated", updatedAt: now });

    return NextResponse.json(variant);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "平台版本生成失败" },
      { status: 500 },
    );
  }
}
