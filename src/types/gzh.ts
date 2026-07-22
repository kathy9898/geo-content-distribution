// ============================================================
// gzh-design 公众号排版类型定义
// ============================================================

/** 6 个已注册主题的英文标识 */
export type GzhThemeId =
  | 'moyu-green'
  | 'red-white'
  | 'graphite-minimal'
  | 'zen-whitespace'
  | 'moyu-ticket'
  | 'olive-journal';

/** 主题元信息（来自 theme-index.md） */
export interface GzhThemeMeta {
  id: GzhThemeId;
  name: string;
  primaryColor: string;
  usageScenario: string;
  componentFile: string;
  underlineCss: string;
  previewImage?: string;
}

/** 主题设计变量 */
export interface GzhDesignVariables {
  primaryColor: string;
  titleColor: string;
  bodyColor: string;
  secondaryText: string;
  weakText: string;
  borderColor: string;
  background: string;
  lightBg: string;
  labelBg: string;
  accentColor: string;
  secondaryAccent?: string;
  bodyFontSize: string;
  bodyLineHeight: string;
  globalLineHeight: string;
  maxWidth: string;
  containerPadding: string;
  sectionMargin: string;
  borderRadius: string;
  fontFamily: string;
}

/** 单个组件 HTML 模板 */
export interface GzhComponent {
  /** 语义化 ID，如 "hero-card"、"section-title"、"richtext-paragraph" */
  id: string;
  /** 组件中文名 */
  name: string;
  /** 含 {{占位符}} 的 HTML 模板 */
  html: string;
  /** 占位符列表 */
  placeholders: string[];
}

/** 文章类型 */
export type GzhArticleType =
  | 'tutorial'        // 教程/操作指南
  | 'listing'         // 盘点/工具清单
  | 'opinion'         // 观点/深度分析
  | 'data-report'     // 数据复盘/报告
  | 'interview'       // 访谈/人物特稿
  | 'essay'           // 生活/情感随笔
  | 'case-study';     // 案例实战

/** 文章类型配方 */
export interface GzhRecipe {
  coreComponents: string[];
  accentComponents: string[];
}

/** Markdown 元素 → 组件 ID 映射 */
export interface GzhMarkdownMapping {
  [markdownElement: string]: string;
}

/** 完整主题注册表条目 */
export interface GzhThemeRegistry {
  meta: GzhThemeMeta;
  designVars: GzhDesignVariables;
  components: Record<string, GzhComponent>;
  skeleton: string;
  recipes: Record<GzhArticleType, GzhRecipe>;
  markdownMapping: GzhMarkdownMapping;
}

/** 所有主题的注册表 */
export interface GzhThemesRegistryData {
  version: string;
  themes: Record<GzhThemeId, GzhThemeRegistry>;
  commonComponents: Record<string, GzhComponent>;
}

// ---- 转换结果 ----

/** 合规校验结果 */
export interface GzhValidationResult {
  errors: string[];
  warnings: string[];
  spanLeafCount: number;
  passed: boolean;
}

/** AI 创意层结果 */
export interface GzhAiCreativeResult {
  articleType: GzhArticleType;
  keywordMarks: Record<number, string[]>;  // paragraphIndex → 关键短语列表
  coverText: GzhCoverText;
  chapterLabels: Record<number, string>;   // chapterIndex → 英文标签
}

/** 封面文案 */
export interface GzhCoverText {
  topLabel: string;
  date: string;
  oldTitle?: string;
  mainTitle: string;
  highlightWord: string;
  subtitle: string;
  bottomSummary: string;
  tags: string[];
}

/** 排版最终结果 */
export interface GzhFormatResult {
  html: string;
  validation: GzhValidationResult;
  articleType: GzhArticleType;
  themeUsed: GzhThemeId;
}

// ---- API 请求/响应 ----

export interface GzhFormatRequest {
  contentId?: string;
  sourceType: 'raw' | 'geo' | 'variant';
  variantId?: string;
  themeId: GzhThemeId;
  /** 直接传入 Markdown 正文，无需 contentId */
  markdown?: string;
}

export interface GzhFormatResponse {
  html: string;
  validation: GzhValidationResult;
  articleType: GzhArticleType;
  themeUsed: GzhThemeId;
}

export interface GzhValidateRequest {
  html: string;
}

export interface GzhValidateResponse {
  validation: GzhValidationResult;
}
