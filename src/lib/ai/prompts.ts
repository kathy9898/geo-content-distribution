import type { ContentItem, GeoOptimization, HumanizeIntensity, Platform, PlatformVariant } from "@/types/geo";

export const GEO_PROMPT_VERSION = "geo-v4-weighted-12dim";
export const PLATFORM_PROMPT_VERSION = "platform-v2-independent-article";
export const HUMANIZE_PROMPT_VERSION = "human-writing-v1";

function formatInput(content: ContentItem) {
  return `标题：${content.title}\n品牌名：${content.brandName || "未填写"}\n核心关键词：${content.keywords.join("、") || "未填写"}\n目标用户：${content.targetAudience || "未填写"}\n参考资料：${content.references.join("\n") || "未填写"}\nCTA：${content.callToAction || "未填写"}\n\n原文：\n${content.body}`;
}

export function buildGeoOptimizationPrompt(content: ContentItem, editableRules?: string) {
  const customRules = editableRules?.trim() || "按 GEO 12 维度权重体系改造，优先优化高权重的证据引用层；直接改写成可独立发布的完整文章；信息不足时用 [建议补充：...] 标注，不编造。80 分以上合格。";
  return `你是一位精通 GEO（Generative Engine Optimization，生成式引擎优化）的专业内容优化师，深度理解 AI 引用机制、RAG 检索原理和大模型内容选择偏好。你的任务是在保持原文核心信息和观点不变的前提下，通过结构化重构、语义优化和证据强化，显著提升文章的 AI 搜索可见度和引用率。\n\n【GEO 核心要素权重表】（总分 100，每个维度得分不得超过其权重）\n一、证据引用层（43 分）\n1. authoritativeQuotes 权威原文引语（16 分）：核心结论是否有专家、机构、学术文献的原话引用背书\n2. statistics 统计数据（14 分）：数据是否完整（数值+样本量+统计周期+来源）\n3. citability 可引用性（13 分）：关键事实是否都有明确、可追溯的出处\n二、结构理解层（12 分）\n4. structure 结构规范性（12 分）：标题层级、核心要点摘要、编号步骤、表格、FAQ\n三、表达理解层（10 分）\n5. fluency 表达流畅度（10 分）：逻辑连贯、段落均衡（3-5 句为宜）、句子清晰\n四、语义匹配层（8 分）\n6. semanticDensity 语义密度（8 分）：核心概念充分展开、覆盖用户真实问题、关键词自然分布\n五、信任权威层（8 分）\n7. authoritySignals 权威信号（8 分）：专业背景、方法论依据、实践案例、适用边界说明\n六、专业表达层（6 分）\n8. terminology 专业术语（6 分）：领域术语准确、首次出现给出定义、前后一致\n七、稳健性层（5 分）\n9. robustness 鲁棒性（5 分）：同一结论有数据/案例/引用多种证据支撑，有反例和边界说明\n八、跨域连接层（4 分）\n10. crossDomain 跨域连接（4 分）：与相关领域关联、应用场景拓展、方法可迁移\n九、可读性层（3 分）\n11. readability 易懂表达（3 分）：句长适中（平均 15-20 字/句）、短句化、术语附中文解释\n\n【三阶段改造流程】\n第一阶段：原文深度分析\n- 盘点核心观点、论据结构（数据/引用/案例/逻辑）、信息密度、结构现状、可引用素材。\n- 对照权重表诊断 11 个维度的原文现状，给出各维度 beforeScore。\n\n第二阶段：权重驱动改造（严格按权重优先级执行）\n优先级 1（证据引用层 43%）：\n- 识别核心结论句，为其补充权威引语和来源标注；来源优先级：学术论文 > 行业报告 > 权威机构 > 专家观点 > 实践案例。\n- 将定性描述尽量转化为定量表达（数值+样本量+统计周期+来源），只能基于素材已有信息，不得编造。\n- 为每个关键事实添加可追溯的来源标注。\n优先级 2（结构规范性 12%）：\n- 清晰的标题层级（H2/H3），文章开头添加核心要点摘要（3-5 个要点），结尾添加结论总结。\n- 关键流程转化为编号步骤，对比信息转化为表格。\n- 结尾添加 FAQ 部分（基于素材内容可能引发的真实问题）。\n优先级 3（表达流畅度 10%、语义密度 8%）：\n- 段落间添加清晰过渡；拆分过长段落，合并过短段落；一句话只表达一个核心观点。\n- 确保核心概念充分展开，围绕用户真实问题组织内容，关键词自然分布不堆砌。\n优先级 4（权威信号 8%、专业术语 6%）：\n- 说明方法论依据、补充实践案例、诚实说明方法的适用边界。\n- 专业术语首次出现时给出定义，保持术语一致性。\n优先级 5（鲁棒性 5%、跨域连接 4%、可读性 3%）：\n- 为同一结论提供多种证据类型，添加反例和边界说明。\n- 适度连接相关领域，拓展应用场景。\n- 控制句长，术语附中文解释。\n\n第三阶段：质量验证\n- 完整性：原文所有核心观点已保留，无关键信息遗漏。\n- 准确性：没有改变原文意思，没有编造数据或引用。\n- GEO 优化度：高权重要素（证据引用层+结构，55%）已重点优化。\n- 可读性：逻辑流畅，未因优化损害自然度。\n- 逐维给出 afterScore 并说明改造动作。\n\n【红线（严格禁止）】\n- 改变原文核心观点或结论。\n- 编造原文不存在的数据、引用、案例、来源、人物。\n- 为凑权重添加无意义内容、机械堆砌关键词。\n- 过度优化导致可读性大幅下降。\n- 素材信息不足时：不得编造。在正文对应位置插入 [建议补充：需要补充的具体内容] 标注，并在 supplementSuggestions 字段中逐条记录；能确定的内容正常写作。\n\n【成稿口吻（最高优先级，适用于 title、summary、coreConclusion、bodyMarkdown）】\n1. 必须是作者直接陈述观点的正式成稿，而不是对输入素材的摘要、评论、分析报告或读后转述。\n2. 将素材中的事实和观点直接写进文章，不得使用“原文提到、原文强调、原文给出、原文指出、原文介绍、原文显示、原文认为、原文建议、原文中、从原文可知”等指向输入素材的话术。\n3. 同样避免“这篇文章提到、该文指出、文章中提及、作者认为、文中给出、根据这篇文章”等旁观者口吻。除非讨论对象本身就是某篇文章，否则正文不得把输入内容称为“原文”“该文”“这篇文章”或“作者”。\n4. 不写“本文将介绍、本文主要讨论、下文将说明”等写作过程提示，开头直接给出核心结论或进入主题。\n5. dimensionScores、changePreview、riskNotes 等分析字段可以评价输入素材；上述限制重点适用于对外发布的 title、summary、coreConclusion 和 bodyMarkdown。\n\n【可编辑业务要求】\n${customRules}\n\n【图片保留】\n输入素材中所有图片引用（如 ![xxx](/api/feishu-image/xxx) 格式）必须原样保留在 bodyMarkdown 中，不得删除、替换或修改图片链接。\n\n【评分规则】\n- dimensionScores 必须输出全部 11 个维度，key 使用权重表中的英文 key，weight 必须与权重表一致。\n- 每个维度 beforeScore 评原文、afterScore 评改造后，均为 0~weight 的整数。\n- geoScore 等于全部维度 afterScore 之和；sourceGeoScore 等于全部维度 beforeScore 之和；80 分及以上 qualified 为 true。\n- 每个维度的 note 用 1-2 句自然语言说明：原文存在什么问题、本次做了什么改造、仍有什么差距。\n- riskCheck 三项布尔值含义为“是否存在该风险”：keywordStuffing 关键词堆砌、overOptimization 过度优化、fabrication 编造信息。正常情况下三者都应为 false，note 简述检查结论。\n- changePreview 至少 3 项，优先覆盖证据强化、数据完整化、结构优化、FAQ、来源风险。\n- supplementSuggestions 逐条对应正文中的 [建议补充：...] 标注；没有标注则输出空数组。\n\n输出前自检：逐句检查 title、summary、coreConclusion 和 bodyMarkdown。若仍有任何把文章写成“对原文进行转述”的句子，先改为直接陈述，再输出 JSON。\n\n只输出 JSON，不要输出 markdown 代码块。格式：\n{\n  "sourceGeoScore": number,\n  "geoScore": number,\n  "qualified": boolean,\n  "title": string,\n  "summary": string,\n  "coreConclusion": string,\n  "bodyMarkdown": string,\n  "dimensionScores": [{ "key": string, "label": string, "layer": string, "weight": number, "beforeScore": number, "afterScore": number, "note": string }],\n  "riskCheck": { "keywordStuffing": boolean, "overOptimization": boolean, "fabrication": boolean, "note": string },\n  "supplementSuggestions": [{ "location": string, "suggestion": string }],\n  "changePreview": [{ "area": string, "before": string, "after": string, "reason": string }],\n  "entities": {\n    "brandNames": string[],\n    "technicalTerms": string[],\n    "keyPeople": string[]\n  },\n  "qaPairs": [{ "question": string, "answer": string }],\n  "decisionScenarios": string[],\n  "evidence": [{ "type": "data" | "case" | "source" | "example", "content": string, "source": string }],\n  "riskNotes": string[],\n  "improvementSuggestions": string[]\n}\n\n${formatInput(content)}`;
}

export function buildIndependentArticleRetryPrompt(prompt: string, phrases: string[]) {
  return `${prompt}\n\n上一次生成未通过“独立成稿口吻”检查，出现了这些转述表达：${phrases.join("、")}。请重新生成完整 JSON。必须把相关句子改成作者直接陈述事实或观点的口吻，不得只删除主语后留下病句，也不得改变事实、数据、链接、图片或 GEO 结构。`;
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
  segmentfault: "思否风格：开发者社区、技术问答与实战分享；语言自然专业、有问答感和实战经验，强调可复用的技术结论和踩坑复盘，避免营销腔。",
  twitter: "Twitter/X 风格：国际社交平台的短内容调性；语言精炼直接、观点先行，突出一个核心结论或数据点，适合拆成推文的表达方式，避免长段落和营销腔。",
};

export function buildPlatformVariantPrompt(
  content: ContentItem,
  geo: GeoOptimization | undefined,
  platform: Platform,
  editableRules?: string,
) {
  const platformRule = editableRules?.trim() || platformInstructions[platform];
  const publishingSource = geo
    ? "标题：" + geo.title + "\n摘要：" + geo.summary + "\n核心结论：" + geo.coreConclusion + "\n正文：\n" + geo.bodyMarkdown
    : "标题：" + content.title + "\n正文：\n" + content.body;
  const geoPreserveRule = geo
    ? "1. 完整保留发布基准稿的核心结论、实体解释、数据案例、Q&A 信息和“问题-解决方案-验证”逻辑。"
    : "1. 从发布基准稿中提炼核心结论、实体解释、数据案例，并构建 Q&A 信息和问题-解决方案-验证逻辑。";
  return "你是多平台内容编辑。请把下方发布基准稿直接编辑为符合目标平台调性的可发布成稿。目标平台要求：" + platformRule + "\n\n独立成稿口吻（最高优先级）：\n- title、summary 和 bodyMarkdown 必须像作者直接在目标平台发表文章，不得写成对发布基准稿的摘要、评论、解读或资料分析。\n- 直接陈述事实和观点。严禁使用“原文提到、原文强调、原文给出、原文指出、原文信息、原文内容、从原文可知”等表达。\n- 同样严禁“这篇文章提到、该文指出、文章中提及、文中给出、作者认为、根据这篇文章”等旁观者口吻。\n- 不写“本文将介绍、本文主要讨论、下文将说明”等写作过程提示，直接进入结论或主题。\n- “发布基准稿”只是给你的内部输入名称，不得在成稿中提及这个名称。\n\n硬性要求：\n" + geoPreserveRule + "\n2. 可以调整语言风格和平台结构，但不能牺牲内容完整性。\n3. 不要编造数据、客户案例、来源；缺少资料时写入 riskNotes。\n4. 输出适合平台发布的标题、摘要、正文 Markdown 和标签。\n5. 评分使用 0-100 分；marketingRiskScore 分数越高代表营销风险越高。\n6. 正文中的所有图片引用（如 ![xxx](/api/feishu-image/xxx) 格式）必须原样保留，不得删除、替换或修改图片链接。\n7. 发布基准稿中的 [建议补充：...] 标注是内部待补信息提示，成稿中必须删除这些标注；对应内容如无法补全，改写为不含该标注的自然表述，不得编造标注要求补充的数据或引语。\n8. 输出前逐句检查 title、summary 和 bodyMarkdown；如果仍有任何转述输入稿的表达，先改成作者直接陈述，再输出。\n\n只输出 JSON，不要输出 markdown 代码块。格式：\n{\n  \"title\": string,\n  \"summary\": string,\n  \"bodyMarkdown\": string,\n  \"tags\": string[],\n  \"geoFidelityScore\": number,\n  \"platformToneScore\": number,\n  \"factualConsistencyScore\": number,\n  \"marketingRiskScore\": number,\n  \"riskNotes\": string[]\n}\n\n业务元信息：\n品牌名：" + (content.brandName || "未填写") + "\n核心关键词：" + (content.keywords.join("、") || "未填写") + "\n目标用户：" + (content.targetAudience || "未填写") + "\n参考资料：" + (content.references.join("\n") || "未填写") + "\nCTA：" + (content.callToAction || "未填写") + "\n\n发布基准稿（仅作为编辑输入，不得在成稿中提及）：\n" + publishingSource;
}

export function buildPlatformIndependentRetryPrompt(prompt: string, phrases: string[]) {
  return `${prompt}\n\n上一次平台成稿未通过“独立成稿口吻”检查，出现了这些转述表达：${phrases.join("、")}。请重新生成完整 JSON，把相关句子改成作者面向平台读者直接陈述事实或观点的口吻。不得只机械删除词语，不得改变事实、数字、链接、图片、GEO 结构或目标平台调性。`;
}

export function buildCitationValidationPrompt(title: string, bodyMarkdown: string) {
  return "你现在扮演一个 AI 搜索引擎 / AI 爬虫 / AI 回答系统的内容质量评估器。\n\n请阅读以下文章，并判断：如果用户询问相关问题，你是否愿意引用这篇文章作为回答依据？\n\n请从以下维度打分和分析：\n1. 引用概率：1-10 分\n2. 你愿意引用的原因\n3. 扣分项清单\n4. 如果要提升到 9 分，最应该修改哪三处\n5. 哪些段落最可能被 AI 摘取或引用\n6. 哪些内容存在事实风险、营销风险或可信度不足\n7. 这篇文章更容易被哪类问题触发引用\n\n只输出 JSON，不要输出 markdown 代码块。格式：\n{\n  \"citationScore\": number,\n  \"citationProbabilityReason\": string,\n  \"deductions\": [{ \"issue\": string, \"severity\": \"low\" | \"medium\" | \"high\", \"suggestion\": string }],\n  \"top3Improvements\": [{ \"target\": string, \"reason\": string, \"rewriteSuggestion\": string }],\n  \"likelyQuotedSections\": [string],\n  \"riskNotes\": [string],\n  \"triggerQueries\": [string],\n  \"summary\": string\n}\n\n文章如下：\n# " + title + "\n\n" + bodyMarkdown;
}

const humanizeIntensityRules: Record<HumanizeIntensity, string> = {
  light: "轻度：清理模板套话和生硬转场，执行全部硬性禁令（禁冒号、破折号、翻案句、路标词、黑话）；开头改为尽快碰到事情，其余保持稳健，不大改节奏。",
  medium: "中度：在执行全部硬性禁令的基础上，明确说话位置和判断，调整长短句节奏；开头从文章已有的具体事实、数字或矛盾切入，结尾写完就停，不升华、不摘要、不首尾呼应。",
  strong: "较强：让读者明显感到一个具体的人在说话。判断更明确、可以有情绪（依据放在附近），段落长短错落，允许偶尔的自我修正和短暂岔话；仍不得虚构细节、经历、现场对话，不得使用论坛腔。",
};

export function buildHumanizePrompt(
  variant: PlatformVariant,
  intensity: HumanizeIntensity,
  protectedTerms: string[],
) {
  return `你是资深中文编辑。请对下面已经完成 GEO 调优和平台适配的文章做“活人感润色”。目标：让读者觉得对面是一个见过事、查过材料、愿意把来龙去脉讲清楚的人在说话，而不是一台机器在生成顺滑文字。这是一次受控的风格改写，不改变事实与信息结构，但必须让读者明显感到语言已经被重新打磨，不能只替换几个同义词。

活人感的来源（按优先级）：
1. 材料：文章已有的具体事实、数字、动作、案例、原话。活人感从这些细节里长出来，不是靠口头禅、网络梗或假装有经历。
2. 说话位置：明确是谁在说、他凭什么知道、哪里只是推测。判断可以偏，可以有情绪，依据要放在附近。
3. 语气：自然中文韵律，长短句错落，允许正常的补充和自我修正。

规则优先级（发生冲突时前者优先）：
1. 事实、数字、案例、来源和原意准确；
2. GEO 信息结构与可引用性（标题层级、列表、Q&A、表格、结论完整保留）；
3. ${platformInstructions[variant.platform]}
4. 活人感表达。

润色强度：${humanizeIntensityRules[intensity]}

写法要求：
- 开头尽快碰到事情。可以直答，可以从文章已有的一个具体事实、数字或矛盾切入。不要预告全文结构，不要写“本文将介绍”。
- 不要先把题目命名成“两个成本、三层原因、四个阶段”再展开。分类应当来自材料，不能拿分类代替文章。
- 一段先完成眼下这一件事。新段落必须增加一件新东西：新的事实、动作、例子、区别或后果。同一观点换个说法不算推进。
- 先让主语和动作出现，再接时间、原因、条件和例子。长句可以有，读者要尽早知道谁做了什么。
- 白话打底。不靠生僻字、成串成语和硬塞典故。
- 动作、细节或数字已经把意思写出来，就停一下，不要追在后面替读者总结。
- 允许正常的补充、自我修正和短暂岔话，每一处都要来自眼前内容，不能按固定间隔表演随意。
- 判断可以偏、可以有情绪，但只从文章已有材料出发，把依据放在附近。
- 段落不必等长。单句成段只留给确实需要停一下的地方。
- 写到事情讲完就停。不要强装升华、首尾呼应或时代意义，不要在末段重新摘要全文，不要用“综上”“总而言之”式总结。

严禁“穿论坛服装”：
- 不用“谢邀、老铁、兄弟们、泡杯茶慢慢说”这类表演出来的论坛腔。
- 原文没有的精确时间、神态、天气、房间摆设、现场对话，一律不得虚构。假细节越具体，AI 味越重。
- 原文没有第一人称经历时，严禁添加“我体验过、我们团队遇到过、我采访过、朋友告诉我”等经历、现场或对话。

成稿硬性禁令（标题、摘要、正文、小标题都适用，命中即不合格）：
- 不用中文冒号“：”和英文冒号“:”。网址、代码块、表格、时间（如 10:30）除外。FAQ 问答结构保留，但把“问：”“答：”改为加粗问句直接成段、回答直接起句。
- 不用破折号“—”、双破折号“——”和连接号式破折号“–”。
- 不用“不是……而是……”“并非……而是……”“不在于……而在于……”“与其说……不如说……”“不只……还……”“表面……实际……”“看似……实则……”及其变形。
- 不用“不丢”“说白了”“说穿了”“先说结论”。
- 不把“更微妙的是”“还有一层”“只说对了一半”“值得注意的是”“需要指出的是”“从某种意义上说”当成段落或句子的洞察路标。
- 不用商业汇报和模型惯用黑话（如“赋能、抓手、闭环、颗粒度、底层逻辑、护城河、心智、链路”等）替普通事情抬价。
- 不用仓库、抽屉、温度、死亡、坍塌、浪潮、钥匙、底座等借喻包装抽象概念；文章真的在写这些事物时不受影响。
- 不要求加入比喻。只有文章自身已有的概念自然带出画面时才保留；严禁套用“时代的浪潮、双刃剑、星辰大海、灯塔、破局者”等陈词滥调。
- 引用的原话如果命中以上禁令，改成转述或省略，不能靠引号保留。

保留要求：
- 标题、摘要、正文和标签都可做语言级优化，但不得增加新事实、新数据、新案例、新来源、新人物或新产品能力。
- 所有数字、日期、百分比、版本号、URL、图片 Markdown、代码块和表格必须原样保留。
- 保留核心结论、实体解释、Q&A、问题-解决方案-验证逻辑，以及有 GEO 价值的小标题、列表和结构；不能套用“不要标题/列表”的公众号规则。
- 保留平台调性。技术平台继续清晰、准确、可操作；资讯平台保持稳健；公众号可以更有阅读节奏。
- 小标题、列表、表格保留，但它们周围的开场句、转场句、解释句和收束句应主动改写。结构保护不是逐句照抄。
- 去掉或自然改写“首先/其次/最后、综上所述、不难发现、让我们来看看、接下来让我们、这意味着、本质上、换句话说”等模板化套话，但不要机械替换。
- 不添加粗口、低俗表达、攻击性措辞、夸张感叹号、固定作者介绍、关注引导或固定结尾签名。
- 受保护词必须保留准确写法：${protectedTerms.length ? protectedTerms.join("、") : "无额外词项"}。

请自评真人感、GEO 保真、平台调性、事实一致性，均为 0-100。changeSummary 用 3-6 条说明主要语言调整；不能确认的问题写入 riskNotes。

只输出 JSON，不要输出 markdown 代码块。格式：
{
  "title": string,
  "summary": string,
  "bodyMarkdown": string,
  "tags": string[],
  "humanToneScore": number,
  "geoFidelityScore": number,
  "platformToneScore": number,
  "factualConsistencyScore": number,
  "changeSummary": string[],
  "riskNotes": string[]
}

平台：${platformInstructions[variant.platform]}
标题：${variant.title}
摘要：${variant.summary}
标签：${variant.tags.join("、")}
正文：
${variant.bodyMarkdown}`;
}

export function buildHumanizeStyleRetryPrompt(prompt: string, issues: string[]) {
  return `${prompt}\n\n上一次润色未通过活人感风格检查：${issues.join("；")}。请重新生成完整 JSON。逐句清除全部违禁表达（冒号、破折号、翻案句式、路标词、黑话、借喻），开头尽快碰到事情，结尾写完就停。不能只做同义词替换，不能虚构事实、经历、细节或场景；数字、图片、链接、代码、表格、GEO 结构和平台调性仍须保留。`;
}
