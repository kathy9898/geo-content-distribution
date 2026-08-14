export type Platform = "zhihu" | "toutiao" | "baijiahao" | "csdn" | "cnblogs" | "juejin" | "sohu" | "netease" | "wechat" | "cto51" | "segmentfault" | "twitter";
export type ContentStatus = "draft" | "geo_optimized" | "variant_generated" | "published";
export type ReviewStatus = "draft" | "reviewing" | "approved" | "scheduled" | "published" | "failed";
export type HumanizeIntensity = "light" | "medium" | "strong";

export interface VariantTextSnapshot {
  title: string;
  summary: string;
  bodyMarkdown: string;
  tags: string[];
}

export interface HumanizeCheck {
  key: string;
  label: string;
  passed: boolean;
  severity: "info" | "warning" | "error";
  detail: string;
}

export interface VariantHumanizeResult {
  status: "generated" | "applied";
  profile: "khazix-lite" | "human-writing-v1";
  intensity: HumanizeIntensity;
  source: VariantTextSnapshot;
  polished: VariantTextSnapshot;
  humanToneScore: number;
  geoFidelityScore: number;
  platformToneScore: number;
  factualConsistencyScore: number;
  changeSummary: string[];
  riskNotes: string[];
  checks: HumanizeCheck[];
  model: string;
  promptVersion: string;
  generatedAt: string;
  appliedAt?: string;
}

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

export interface GeoDimensionScore {
  key: string;
  label: string;
  layer: string;
  weight: number;
  beforeScore: number;
  afterScore: number;
  note: string;
}

export interface GeoRiskCheck {
  keywordStuffing: boolean;
  overOptimization: boolean;
  fabrication: boolean;
  note: string;
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
  checklist?: GeoChecklist;
  checklistItems?: GeoChecklistItem[];
  dimensionScores?: GeoDimensionScore[];
  riskCheck?: GeoRiskCheck;
  supplementSuggestions?: Array<{
    location: string;
    suggestion: string;
  }>;
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
  humanize?: VariantHumanizeResult;
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
  baiduIndexed?: boolean;
  baiduCheckedAt?: string;
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
  segmentfault: "思否",
  toutiao: "头条",
  baijiahao: "百家号",
  csdn: "CSDN",
  cnblogs: "博客园",
  juejin: "稀土掘金",
  sohu: "搜狐",
  netease: "网易",
  wechat: "公众号",
  cto51: "51CTO",
  twitter: "Twitter",
};

/** Detect platform from a publish URL */
export function detectPlatformFromUrl(url: string): Platform | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("zhihu.com")) return "zhihu";
    if (host.includes("segmentfault.com")) return "segmentfault";
    if (host.includes("toutiao.com")) return "toutiao";
    if (host.includes("baijiahao.baidu.com")) return "baijiahao";
    if (host.includes("csdn.net")) return "csdn";
    if (host.includes("cnblogs.com")) return "cnblogs";
    if (host.includes("juejin.cn")) return "juejin";
    if (host.includes("sohu.com")) return "sohu";
    if (host.includes("163.com") || host.includes("netease.com")) return "netease";
    if (host.includes("mp.weixin.qq.com")) return "wechat";
    if (host.includes("51cto.com")) return "cto51";
    if (/(^|\.)x\.com$/.test(host) || /(^|\.)twitter\.com$/.test(host)) return "twitter";
  } catch {
    // invalid URL, ignore
  }
  return null;
}
