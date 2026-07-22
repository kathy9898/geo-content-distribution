/**
 * gzh-design AI 创意层 — 编排模块
 * 调用 LLM 完成文章类型检测、关键词标记、封面文案、章节标签
 */
import { generateJson } from '@/lib/ai/anthropic';
import type { GzhThemeId, GzhArticleType, GzhAiCreativeResult, GzhCoverText } from '@/types/gzh';
import {
  articleTypeDetectionSchema, keywordMarkingSchema,
  coverTextSchema, chapterLabelSchema
} from './schemas';
import {
  buildArticleTypeDetectionPrompt, buildKeywordMarkingPrompt,
  buildCoverTextPrompt, buildChapterLabelPrompt
} from './prompts';

/** 检测文章类型 */
export async function detectArticleType(markdown: string): Promise<GzhArticleType> {
  try {
    const { data } = await generateJson(
      buildArticleTypeDetectionPrompt(markdown),
      articleTypeDetectionSchema,
      2048
    );
    return data.articleType;
  } catch {
    // AI 调用失败时回退到启发式
    return 'listing';
  }
}

/** 生成关键词下划线标记 */
export async function generateKeywordMarks(
  paragraphs: string[],
  themeId: GzhThemeId
): Promise<Record<number, string[]>> {
  if (paragraphs.length === 0) return {};

  // 分批处理（每批最多10段）
  const batchSize = 10;
  const marks: Record<number, string[]> = {};

  for (let i = 0; i < paragraphs.length; i += batchSize) {
    const batch = paragraphs.slice(i, i + batchSize);
    try {
      const { data } = await generateJson(
        buildKeywordMarkingPrompt(batch, themeId),
        keywordMarkingSchema,
        4096
      );
      for (const mark of data.marks) {
        marks[i + mark.paragraphIndex] = mark.phrases;
      }
    } catch {
      // 批次失败时跳过
    }
  }

  return marks;
}

/** 生成封面文案 */
export async function generateCoverText(
  title: string,
  summary: string,
  articleType: GzhArticleType,
  themeId: GzhThemeId
): Promise<GzhCoverText> {
  try {
    const { data } = await generateJson(
      buildCoverTextPrompt(title, summary, articleType, themeId),
      coverTextSchema,
      2048
    );
    return {
      topLabel: data.topLabel,
      date: data.date || new Date().toISOString().split('T')[0].replace(/-/g, '·').slice(2),
      mainTitle: data.mainTitle,
      highlightWord: data.highlightWord,
      subtitle: data.subtitle,
      bottomSummary: data.bottomSummary,
      tags: data.tags,
    };
  } catch {
    // 回退到默认封面文案
    return {
      topLabel: 'ARTICLE',
      date: new Date().toISOString().split('T')[0].replace(/-/g, '·').slice(2),
      mainTitle: title,
      highlightWord: '深度解析',
      subtitle: summary.slice(0, 50),
      bottomSummary: title,
      tags: ['AI'],
    };
  }
}

/** 生成章节英文标签 */
export async function generateChapterLabels(chapters: string[]): Promise<Record<number, string>> {
  if (chapters.length === 0) return {};

  try {
    const { data } = await generateJson(
      buildChapterLabelPrompt(chapters),
      chapterLabelSchema,
      2048
    );
    const labels: Record<number, string> = {};
    for (const item of data.labels) {
      labels[item.chapterIndex] = item.englishLabel;
    }
    return labels;
  } catch {
    return {};
  }
}

/** 完整的 AI 创意层调用 */
export async function runAiCreative(
  markdown: string,
  themeId: GzhThemeId
): Promise<GzhAiCreativeResult> {
  // 并行调用独立的 AI 任务
  const [articleType, coverText, chapterLabels] = await Promise.all([
    detectArticleType(markdown),
    generateCoverText(
      extractTitle(markdown),
      extractSummary(markdown),
      'listing', // 先用默认值，articleType 还没出结果
      themeId
    ),
    generateChapterLabels(extractChapters(markdown)),
  ]);

  // 关键词标记依赖文章内容，需要提取段落后调用
  const paragraphs = extractParagraphs(markdown);
  const keywordMarks = await generateKeywordMarks(paragraphs, themeId);

  return {
    articleType,
    keywordMarks,
    coverText,
    chapterLabels,
  };
}

// 辅助函数

function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1] : markdown.split('\n')[0].slice(0, 50);
}

function extractSummary(markdown: string): string {
  const lines = markdown.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  return lines.slice(0, 3).join(' ').slice(0, 300);
}

function extractChapters(markdown: string): string[] {
  const matches = markdown.match(/^##\s+.+$/gm);
  return (matches || []).map(m => m.replace(/^##\s*/, '').trim());
}

function extractParagraphs(markdown: string): string[] {
  return markdown.split('\n\n').filter(
    p => p.trim() && !p.startsWith('#') && !p.startsWith('```') && !p.startsWith('>') && !p.startsWith('---')
  );
}
