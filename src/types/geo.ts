export type Platform = "zhihu" | "toutiao" | "baijiahao" | "csdn" | "cnblogs" | "juejin" | "sohu" | "netease" | "wechat" | "cto51";
export type ContentStatus = "draft" | "geo_optimized" | "variant_generated" | "published";
export type ReviewStatus = "draft" | "reviewing" | "approved" | "scheduled" | "published" | "failed";

export interface ContentInput {
  title: string;
  body: string;
  brandName: string;
  keywords: string[];
  targetAudience: string;
  references: string[];
  callToAction?: string;
}

export interface ContentItem extends ContentInput {
  id: string;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GeoChecklist {
  invertedPyramid: boolean;
  clearHeadingsListsTables: boolean;
  qaFormatForComplexContent: boolean;
  entitiesExplained: boolean;
  dataAndCases: boolean;
  decisionScenarios: boolean;
  traceableSources: boolean;
  problemSolutionValidation: boolean;
}

export interface GeoChecklistItem {
  key: keyof GeoChecklist | string;
  label: string;
  passed: boolean;
  reason: string;
  suggestion: string;
}

export interface GeoChangePreview {
  area: string;
  before: string;
  after: string;
  reason: string;
}

export interface GeoOptimization {
  id: string;
  contentId: string;
  sourceGeoScore?: number;
  geoScore: number;
  qualified: boolean;
  title: string;
  summary: string;
  coreConclusion: string;
  bodyMarkdown: string;
  checklist: GeoChecklist;
  checklistItems?: GeoChecklistItem[];
  changePreview?: GeoChangePreview[];
  entities: {
    brandNames: string[];
    technicalTerms: string[];
    keyPeople: string[];
  };
  qaPairs: Array<{
    question: string;
    answer: string;
  }>;
  decisionScenarios: string[];
  evidence: Array<{
    type: "data" | "case" | "source" | "example";
    content: string;
    source: string;
  }>;
  riskNotes: string[];
  improvementSuggestions: string[];
  model: string;
  promptVersion: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PlatformVariant {
  id: string;
  contentId: string;
  geoOptimizationId?: string;
  platform: Platform;
  title: string;
  summary: string;
  bodyMarkdown: string;
  tags: string[];
  geoFidelityScore: number;
  platformToneScore: number;
  factualConsistencyScore: number;
  marketingRiskScore: number;
  riskNotes: string[];
  reviewStatus: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PublishRecord {
  id: string;
  contentId: string;
  variantId?: string;
  platform: Platform;
  publishUrl: string;
  articleTitle?: string;
  publishedAt: string;
  note?: string;
  syncStatus?: "draft_synced" | "failed" | "manual" | "published";
  syncTaskId?: string;
  syncedAt?: string;
  createdAt: string;
}

export interface PublishRecordWithContent extends PublishRecord {
  articleTitle: string;
}

export type CitationModelKey = "doubao" | "ernie" | "deepseek" | "kimi" | "qwen";

export const citationModelLabels: Record<CitationModelKey, string> = {
  doubao: "豆包",
  ernie: "文心一言",
  deepseek: "DeepSeek",
  kimi: "Kimi",
  qwen: "千问",
};

export interface CitationDeduction {
  issue: string;
  severity: "low" | "medium" | "high";
  suggestion: string;
}

export interface CitationImprovement {
  target: string;
  reason: string;
  rewriteSuggestion: string;
}

export interface CitationModelResult {
  model: CitationModelKey;
  citationScore: number;
  citationProbabilityReason: string;
  deductions: CitationDeduction[];
  top3Improvements: CitationImprovement[];
  likelyQuotedSections: string[];
  riskNotes: string[];
  triggerQueries: string[];
  summary: string;
}

export interface CitationValidationRun {
  id: string;
  contentId: string;
  variantId: string;
  inputSource: "platform_variant";
  models: CitationModelResult[];
  averageScore: number;
  commonDeductions: string[];
  topImprovements: string[];
  finalRecommendation: "pass" | "revise" | "high_risk";
  createdAt: string;
}

export interface ContentDetail {
  content: ContentItem;
  geoOptimization?: GeoOptimization;
  variants: PlatformVariant[];
  publishRecords: PublishRecord[];
}

export const platformLabels: Record<Platform, string> = {
  zhihu: "知乎",
  toutiao: "头条",
  baijiahao: "百家号",
  csdn: "CSDN",
  cnblogs: "博客园",
  juejin: "稀土掘金",
  sohu: "搜狐",
  netease: "网易",
  wechat: "公众号",
  cto51: "51CTO",
};

/** Detect platform from a publish URL */
export function detectPlatformFromUrl(url: string): Platform | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("zhihu.com")) return "zhihu";
    if (host.includes("toutiao.com")) return "toutiao";
    if (host.includes("baijiahao.baidu.com")) return "baijiahao";
    if (host.includes("csdn.net")) return "csdn";
    if (host.includes("cnblogs.com")) return "cnblogs";
    if (host.includes("juejin.cn")) return "juejin";
    if (host.includes("sohu.com")) return "sohu";
    if (host.includes("163.com") || host.includes("netease.com")) return "netease";
    if (host.includes("mp.weixin.qq.com")) return "wechat";
    if (host.includes("51cto.com")) return "cto51";
  } catch {
    // invalid URL, ignore
  }
  return null;
}
