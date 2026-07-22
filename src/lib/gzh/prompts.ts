/**
 * gzh-design AI 创意层 — Prompt 构建
 */
import type { GzhThemeId, GzhArticleType } from '@/types/gzh';

const ARTICLE_TYPES: Record<GzhArticleType, string> = {
  'tutorial': '教程/操作指南',
  'listing': '盘点/工具清单',
  'opinion': '观点/深度分析',
  'data-report': '数据复盘/报告',
  'interview': '访谈/人物特稿',
  'essay': '生活/情感随笔',
  'case-study': '案例实战',
};

export function buildArticleTypeDetectionPrompt(markdown: string): string {
  return `你是一个公众号文章分类器。请根据以下 Markdown 文章内容，判断它的文章类型。

文章类型说明：
- tutorial: 教程/操作指南（步骤和命令多）
- listing: 盘点/工具清单（并列条目多）
- opinion: 观点/深度分析（论证推演多）
- data-report: 数据复盘/报告（数字和对比多）
- interview: 访谈/人物特稿（引语和人物叙事多）
- essay: 生活/情感随笔（个人感受和故事多）
- case-study: 案例实战（完整案例展示）

文章内容（前2000字）：
${markdown.slice(0, 2000)}

请返回 JSON 格式。`;
}

export function buildKeywordMarkingPrompt(paragraphs: string[], themeId: GzhThemeId): string {
  return `你是一个公众号排版专家。请为以下每个段落找出 1-3 个最重要的短语，用于橙色下划线标记。

规则：
- 优先标记核心观点、关键数据、专有名词、产品名
- 短语长度 4-15 字
- 整段无要点可不标（phrases 为空数组）
- 不要标记已经被加粗的文字

段落列表：
${paragraphs.map((p, i) => `[${i}] ${p.slice(0, 200)}`).join('\n\n')}

请返回 JSON 格式，marks 数组中每个元素包含 paragraphIndex 和 phrases。`;
}

export function buildCoverTextPrompt(title: string, summary: string, articleType: GzhArticleType, themeId: GzhThemeId): string {
  return `你是一个公众号封面文案专家。请根据文章信息生成封面文案。

文章标题：${title}
文章摘要：${summary.slice(0, 300)}
文章类型：${ARTICLE_TYPES[articleType]}

请生成以下字段：
- topLabel: 封面顶部标签（2-8字英文大写，如 "UCLLOUD DEV"、"TUTORIAL"）
- date: 日期（格式：2026·07）
- mainTitle: 封面主标题（8-15字，提炼文章核心）
- highlightWord: 强调词（2-4字，与主标题搭配，如"正式上线"、"深度解析"）
- subtitle: 副标题说明（15-30字，概括文章价值）
- bottomSummary: 底部摘要（10-20字，一句话总结）
- tags: 标签数组（2-3个，如 ["AI", "开发者"]）

请返回 JSON 格式。`;
}

export function buildChapterLabelPrompt(chapters: string[]): string {
  return `你是一个翻译专家。请为以下中文章节标题生成简短的英文标签（2-4个单词大写，如 "GROWTH CENTER"、"CORE MODULES"）。

章节列表：
${chapters.map((c, i) => `[${i + 1}] ${c}`).join('\n')}

请返回 JSON 格式，labels 数组中每个元素包含 chapterIndex（从1开始）和 englishLabel。`;
}
