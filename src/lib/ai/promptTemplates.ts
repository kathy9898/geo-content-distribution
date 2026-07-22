import type { Platform } from "@/types/geo";
import { readCollection, storeFiles, writeCollection } from "@/lib/storage/jsonStore";

export type PromptTemplateKey = "geo" | Platform;

export interface PromptTemplate {
  key: PromptTemplateKey;
  label: string;
  content: string;
  updatedAt?: string;
}

export const defaultPromptTemplates: PromptTemplate[] = [
  {
    key: "geo",
    label: "GEO 风格调优模板",
    content: "倒金字塔结构、标题层级、列表/表格、Q&A、品牌与技术实体解释、数据/案例、决策场景、来源可追溯、问题-解决方案-验证闭环。80 分以上合格。",
  },
  {
    key: "zhihu",
    label: "知乎平台改写模板",
    content: "知乎风格：观点型、经验分享、问答感、可信度强；开头先给结论，减少广告腔，多解释误区、判断标准和实践建议。",
  },
  {
    key: "toutiao",
    label: "头条平台改写模板",
    content: "头条风格：大众化、资讯感、标题有吸引力但不夸张；开头快速给结论，内容通俗易懂，适合泛人群阅读和转发。",
  },
  {
    key: "baijiahao",
    label: "百家号平台改写模板",
    content: "百家号风格：搜索友好、信息密度高、结构清晰；标题和小标题覆盖核心关键词，强调可检索、可引用、可追溯。",
  },
  {
    key: "csdn",
    label: "CSDN 平台改写模板",
    content: "CSDN 风格：技术教程、工程实践、步骤清晰；结构包含背景、问题、方案、实现步骤、常见问题、总结，避免营销表达。",
  },
  {
    key: "cnblogs",
    label: "博客园平台改写模板",
    content: "博客园风格：技术博客、工程复盘、问题定位、方案选择；语言朴素，强调实践过程、踩坑经验和可复用结论。",
  },
  {
    key: "juejin",
    label: "稀土掘金平台改写模板",
    content: "稀土掘金风格：开发者实践、踩坑复盘、方案选择、技术洞察；语言自然，有实战感，强调可复用经验。",
  },
  {
    key: "sohu",
    label: "搜狐平台改写模板",
    content: "搜狐风格：资讯稿、品牌稿结合；开头明确事件/结论，段落清晰，表达稳健，减少硬广口吻。",
  },
  {
    key: "netease",
    label: "网易平台改写模板",
    content: "网易风格：新闻资讯和观点评论结合；开头先给判断，正文有背景、分析和结论，表达自然、有阅读感。",
  },
  {
    key: "cto51",
    label: "51CTO 平台改写模板",
    content: "51CTO 风格：面向 IT 技术人和企业技术决策者，强调技术实践、架构选型、落地步骤、成本效率和踩坑复盘；标题包含核心技术词，正文要有背景、方案、实施路径、风险边界和总结，避免空泛营销。",
  },
];

export async function getPromptTemplates() {
  const saved = await readCollection<PromptTemplate>(storeFiles.promptTemplates);
  return defaultPromptTemplates.map((template) => saved.find((item) => item.key === template.key) || template);
}

export async function getPromptTemplate(key: PromptTemplateKey) {
  const templates = await getPromptTemplates();
  return templates.find((item) => item.key === key) || defaultPromptTemplates.find((item) => item.key === key)!;
}

export async function savePromptTemplate(key: PromptTemplateKey, content: string) {
  const templates = await getPromptTemplates();
  const index = templates.findIndex((item) => item.key === key);
  if (index < 0) throw new Error("Prompt 模板不存在");
  templates[index] = { ...templates[index], content, updatedAt: new Date().toISOString() };
  await writeCollection(storeFiles.promptTemplates, templates);
  return templates[index];
}
