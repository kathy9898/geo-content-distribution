import type { ContentItem, GeoOptimization, Platform } from "@/types/geo";

export const GEO_PROMPT_VERSION = "geo-v2";
export const PLATFORM_PROMPT_VERSION = "platform-v1";

function formatInput(content: ContentItem) {
  return `标题：${content.title}\n品牌名：${content.brandName || "未填写"}\n核心关键词：${content.keywords.join("、") || "未填写"}\n目标用户：${content.targetAudience || "未填写"}\n参考资料：${content.references.join("\n") || "未填写"}\nCTA：${content.callToAction || "未填写"}\n\n原文：\n${content.body}`;
}

export function buildGeoOptimizationPrompt(content: ContentItem, editableRules?: string) {
  const customRules = editableRules?.trim() || "倒金字塔结构、标题层级、列表/表格、Q&A、品牌与技术实体解释、数据/案例、决策场景、来源可追溯、问题-解决方案-验证闭环。80 分以上合格。";
  return `你是一个 GEO 内容优化专家，目标是将文章优化为更适合 AI 搜索、生成式搜索和问答引擎理解、引用、推荐的内容。\n\n请先评价原文 GEO 分数，再基于以下原文进行 GEO 风格调优，并输出优化后分数。\n\n可编辑业务要求：\n${customRules}\n\n优化要求：\n一、结构层\n1. 核心结论必须放在文章开头，符合倒金字塔结构。\n2. 每个重要段落尽量先给结论，再解释原因。\n3. 使用清晰的标题层级、列表、表格。\n4. 遇到复杂概念时，拆解成 Q&A 问答对格式。\n5. 明确出现并解释品牌名、核心技术词、关键人物。\n6. 段落要短，信息块要清晰，便于 AI 摘取。\n\n二、内容层\n1. 用具体数据、案例支撑核心观点。\n2. 覆盖用户真实决策场景，不只解释"是什么"，还要回答"为什么选、什么时候用、怎么判断、有什么风险"。\n3. 信息来源要可信、可追溯。如果原文没有来源，不要编造来源，而是在 riskNotes 中提示需要补充。\n4. 全文逻辑要完整，形成"问题-解决方案-验证"的闭环。\n5. 不要虚构事实、客户案例、数据来源。
6. 原文中所有图片引用（如 ![xxx](/api/feishu-image/xxx) 格式）必须原样保留在 bodyMarkdown 中，不得删除、替换或修改图片链接。\n\n评分要求：\n- sourceGeoScore 是原文 GEO 分数，评价原文，不得直接等同优化后分数。\n- geoScore 是优化后 GEO 分数。\n- 两个分数均为 0-100，80 分及以上为合格。\n- checklistItems 要用自然语言解释每个检查项为什么通过/不通过，以及如何改进。\n- changePreview 至少 3 项，优先覆盖开头结论、结构层级、Q&A、数据/案例、来源风险、决策场景。\n- 不允许编造数据、客户案例或来源；如果只是补充结构而非补充事实，要在 reason 中说明。\n\n只输出 JSON，不要输出 markdown 代码块。格式：\n{\n  "sourceGeoScore": number,\n  "geoScore": number,\n  "qualified": boolean,\n  "title": string,\n  "summary": string,\n  "coreConclusion": string,\n  "bodyMarkdown": string,\n  "checklist": {\n    "invertedPyramid": boolean,\n    "clearHeadingsListsTables": boolean,\n    "qaFormatForComplexContent": boolean,\n    "entitiesExplained": boolean,\n    "dataAndCases": boolean,\n    "decisionScenarios": boolean,\n    "traceableSources": boolean,\n    "problemSolutionValidation": boolean\n  },\n  "checklistItems": [{ "key": string, "label": string, "passed": boolean, "reason": string, "suggestion": string }],\n  "changePreview": [{ "area": string, "before": string, "after": string, "reason": string }],\n  "entities": {\n    "brandNames": string[],\n    "technicalTerms": string[],\n    "keyPeople": string[]\n  },\n  "qaPairs": [{ "question": string, "answer": string }],\n  "decisionScenarios": string[],\n  "evidence": [{ "type": "data" | "case" | "source" | "example", "content": string, "source": string }],\n  "riskNotes": string[],\n  "improvementSuggestions": string[]\n}\n\n${formatInput(content)}`;
}

const platformInstructions: Record<Platform, string> = {
  zhihu: "知乎风格：观点型、经验分享、问答感、可信度强；开头先给结论，减少广告腔，多解释误区、判断标准和实践建议。",
  toutiao: "头条风格：大众化、资讯感、标题有吸引力但不夸张；开头快速给结论，内容通俗易懂，适合泛人群阅读和转发。",
  baijiahao: "百家号风格：搜索友好、信息密度高、结构清晰；标题和小标题覆盖核心关键词，强调可检索、可引用、可追溯。",
  csdn: "CSDN 风格：技术教程、工程实践、步骤清晰；结构包含背景、问题、方案、实现步骤、常见问题、总结，避免营销表达。",
  cnblogs: "博客园风格：技术博客、工程复盘、问题定位、方案选择；语言朴素，强调实践过程、踩坑经验和可复用结论。",
  juejin: "稀土掘金风格：开发者实践、踩坑复盘、方案选择、技术洞察；语言自然，有实战感，强调可复用经验。",
  sohu: "搜狐风格：资讯稿、品牌稿结合；开头明确事件/结论，段落清晰，表达稳健，减少硬广口吻。",
  netease: "网易风格：新闻资讯和观点评论结合；开头先给判断，正文有背景、分析和结论，表达自然、有阅读感。",
  wechat: "公众号风格：深度长文、故事感强、段落精炼、金句点缀；开头用场景或悬念引入，正文注重阅读节奏和情绪共鸣，结尾有总结或行动引导。",
  cto51: "51CTO 风格：面向 IT 技术人和企业技术决策者，强调技术实践、架构选型、落地步骤、成本效率和踩坑复盘；标题包含核心技术词，正文要有背景、方案、实施路径、风险边界和总结，避免空泛营销。",
};

export function buildPlatformVariantPrompt(
  content: ContentItem,
  geo: GeoOptimization | undefined,
  platform: Platform,
  editableRules?: string,
) {
  const platformRule = editableRules?.trim() || platformInstructions[platform];
  const geoSection = geo
    ? "\nGEO 优化版：\n标题：" + geo.title + "\n摘要：" + geo.summary + "\n核心结论：" + geo.coreConclusion + "\n正文：\n" + geo.bodyMarkdown
    : "";
  const geoPreserveRule = geo
    ? "1. 保留 GEO 优化版文章的核心结论、实体解释、数据案例、Q&A 信息和“问题-解决方案-验证”逻辑。"
    : "1. 从原文中提炼核心结论、实体解释、数据案例，并构建 Q&A 信息和问题-解决方案-验证逻辑。";
  const sourceLabel = geo ? "GEO 标准文章" : "原文";
  return "你是多平台内容改写专家。请将以下" + sourceLabel + "改写成" + platformRule + "\n\n硬性要求：\n" + geoPreserveRule + "\n2. 可以调整语言风格和平台结构，但不能牺牲内容完整性。\n3. 不要编造数据、客户案例、来源；缺少资料时写入 riskNotes。\n4. 输出适合平台发布的标题、摘要、正文 Markdown 和标签。\n5. 评分使用 0-100 分；marketingRiskScore 分数越高代表营销风险越高。\n6. 正文中的所有图片引用（如 ![xxx](/api/feishu-image/xxx) 格式）必须原样保留，不得删除、替换或修改图片链接。\n\n只输出 JSON，不要输出 markdown 代码块。格式：\n{\n  \"title\": string,\n  \"summary\": string,\n  \"bodyMarkdown\": string,\n  \"tags\": string[],\n  \"geoFidelityScore\": number,\n  \"platformToneScore\": number,\n  \"factualConsistencyScore\": number,\n  \"marketingRiskScore\": number,\n  \"riskNotes\": string[]\n}\n\n原始主文信息：\n" + formatInput(content) + geoSection;
}

export function buildCitationValidationPrompt(title: string, bodyMarkdown: string) {
  return "你现在扮演一个 AI 搜索引擎 / AI 爬虫 / AI 回答系统的内容质量评估器。\n\n请阅读以下文章，并判断：如果用户询问相关问题，你是否愿意引用这篇文章作为回答依据？\n\n请从以下维度打分和分析：\n1. 引用概率：1-10 分\n2. 你愿意引用的原因\n3. 扣分项清单\n4. 如果要提升到 9 分，最应该修改哪三处\n5. 哪些段落最可能被 AI 摘取或引用\n6. 哪些内容存在事实风险、营销风险或可信度不足\n7. 这篇文章更容易被哪类问题触发引用\n\n只输出 JSON，不要输出 markdown 代码块。格式：\n{\n  \"citationScore\": number,\n  \"citationProbabilityReason\": string,\n  \"deductions\": [{ \"issue\": string, \"severity\": \"low\" | \"medium\" | \"high\", \"suggestion\": string }],\n  \"top3Improvements\": [{ \"target\": string, \"reason\": string, \"rewriteSuggestion\": string }],\n  \"likelyQuotedSections\": [string],\n  \"riskNotes\": [string],\n  \"triggerQueries\": [string],\n  \"summary\": string\n}\n\n文章如下：\n# " + title + "\n\n" + bodyMarkdown;
}
