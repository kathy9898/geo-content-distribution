/**
 * gzh-design AI 创意层 — Zod schemas
 */
import { z } from 'zod';

export const articleTypeDetectionSchema = z.object({
  articleType: z.enum([
    'tutorial', 'listing', 'opinion', 'data-report', 'interview', 'essay', 'case-study'
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export const keywordMarkingSchema = z.object({
  marks: z.array(z.object({
    paragraphIndex: z.number(),
    phrases: z.array(z.string()).max(3),
  })),
});

export const coverTextSchema = z.object({
  topLabel: z.string(),
  date: z.string().optional(),
  mainTitle: z.string(),
  highlightWord: z.string(),
  subtitle: z.string(),
  bottomSummary: z.string(),
  tags: z.array(z.string()).max(3),
});

export const chapterLabelSchema = z.object({
  labels: z.array(z.object({
    chapterIndex: z.number(),
    englishLabel: z.string(),
  })),
});

export type ArticleTypeDetectionResult = z.infer<typeof articleTypeDetectionSchema>;
export type KeywordMarkingResult = z.infer<typeof keywordMarkingSchema>;
export type CoverTextResult = z.infer<typeof coverTextSchema>;
export type ChapterLabelResult = z.infer<typeof chapterLabelSchema>;
