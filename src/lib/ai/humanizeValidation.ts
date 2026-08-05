import type { HumanizeCheck, VariantTextSnapshot } from "@/types/geo";
import type { HumanizeIntensity } from "@/types/geo";

function uniqueMatches(text: string, pattern: RegExp) {
  return Array.from(new Set(Array.from(text.matchAll(pattern), (match) => match[0])));
}

function countMatches(text: string, pattern: RegExp) {
  return Array.from(text.matchAll(pattern)).length;
}

function proseParagraphs(markdown: string) {
  return markdown
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph
      && !/^#{1,6}\s/.test(paragraph)
      && !/^!\[[^\]]*\]\([^)]+\)$/.test(paragraph)
      && !/^```/.test(paragraph));
}

function normalizedStyleText(text: string) {
  return text.replace(/[\s，。！？、；：,.!?;:'"“”‘’（）()《》「」【】\[\]#*_`~-]/g, "");
}

/** 活人感写作硬性禁令：命中即不合格 */
const bannedPatterns: { label: string; pattern: RegExp }[] = [
  { label: "翻案句式", pattern: /(?:不是|并非)[^。！？；\n]{0,40}?而是|不在于[^。！？；\n]{0,40}?而在于|与其说[^。！？；\n]{0,40}?不如说|不只[^。！？；\n]{0,40}?还|表面[^。！？；\n]{0,40}?实际|看似[^。！？；\n]{0,40}?实则/g },
  { label: "套话", pattern: /不丢|说白了|说穿了|先说结论/g },
  { label: "洞察路标", pattern: /更微妙的是|还有一层|只说对了一半|值得注意的是|需要指出的是|从某种意义上说/g },
  { label: "商业黑话", pattern: /赋能|抓手|闭环|颗粒度|底层逻辑|护城河|心智|链路/g },
];

/** 借喻包装抽象概念的常见意象（语境相关，仅提示） */
const metaphorWarningPattern = /仓库|抽屉|底座|浪潮|钥匙|坍塌/g;

/** 移除禁令检测的豁免内容：代码、URL、图片、时间、表格行 */
function stripExemptContent(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, "\n")
    .replace(/`[^`\n]*`/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/https?:\/\/[^\s)\]}>"']+/g, "")
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, "")
    .split("\n")
    .filter((line) => !/^\s*\|/.test(line))
    .join("\n");
}

export function bannedStyleHits(text: string) {
  const stripped = stripExemptContent(text);
  const hits: string[] = [];
  const colonHits = stripped.match(/[：:]/g);
  if (colonHits) hits.push(`冒号×${colonHits.length}`);
  const dashHits = uniqueMatches(stripped, /——|—|–/g);
  if (dashHits.length) hits.push(`破折号（${dashHits.join("")}）`);
  for (const { label, pattern } of bannedPatterns) {
    const matches = uniqueMatches(stripped, pattern);
    if (matches.length) hits.push(`${label}（${matches.slice(0, 5).join("、")}）`);
  }
  return hits;
}

export function metaphorWarningHits(text: string) {
  return uniqueMatches(stripExemptContent(text), metaphorWarningPattern);
}

function nearlyUnchanged(source: string, polished: string) {
  const left = normalizedStyleText(source);
  const right = normalizedStyleText(polished);
  if (!left || !right) return false;
  if (left === right) return true;
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length > right.length ? left : right;
  return shorter.length >= 18 && longer.includes(shorter) && shorter.length / longer.length > 0.88;
}

export function humanizeStyleIssues(
  source: VariantTextSnapshot,
  polished: VariantTextSnapshot,
  _intensity: HumanizeIntensity,
) {
  const sourceParagraphs = proseParagraphs(source.bodyMarkdown);
  const polishedParagraphs = proseParagraphs(polished.bodyMarkdown);
  const issues: string[] = [];
  const sourceOpening = sourceParagraphs.slice(0, 2).join("\n");
  const polishedOpening = polishedParagraphs.slice(0, 2).join("\n");
  const sourceEnding = sourceParagraphs.slice(-2).join("\n");
  const polishedEnding = polishedParagraphs.slice(-2).join("\n");

  if (nearlyUnchanged(sourceOpening, polishedOpening)) issues.push("开头基本沿用原稿，没有形成新的切入和画面");
  if (nearlyUnchanged(sourceEnding, polishedEnding)) issues.push("结尾基本沿用原稿，没有自然收束");

  const bannedHits = bannedStyleHits(polished.bodyMarkdown);
  if (bannedHits.length) issues.push(`出现违禁表达：${bannedHits.join("、")}`);
  return issues;
}

function preservationCheck(
  key: string,
  label: string,
  sourceItems: string[],
  polishedText: string,
): HumanizeCheck {
  const missing = sourceItems.filter((item) => !polishedText.includes(item));
  return {
    key,
    label,
    passed: missing.length === 0,
    severity: missing.length ? "error" : "info",
    detail: missing.length ? `缺失或被改写：${missing.slice(0, 8).join("、")}` : `已保留 ${sourceItems.length} 项`,
  };
}

export function validateHumanizedVariant(
  source: VariantTextSnapshot,
  polished: VariantTextSnapshot,
  protectedTerms: string[],
): HumanizeCheck[] {
  const sourceText = `${source.title}\n${source.summary}\n${source.bodyMarkdown}`;
  const polishedText = `${polished.title}\n${polished.summary}\n${polished.bodyMarkdown}`;
  const sourceImages = uniqueMatches(source.bodyMarkdown, /!\[[^\]]*\]\([^)]+\)/g);
  const sourceUrls = uniqueMatches(sourceText, /https?:\/\/[^\s)\]}>"']+/g);
  const sourceNumbers = uniqueMatches(sourceText, /(?:v?\d+(?:\.\d+){1,3}|\d+(?:\.\d+)?%?)/gi);
  const sourceCodeBlocks = uniqueMatches(source.bodyMarkdown, /```[\s\S]*?```/g);
  const checks = [
    preservationCheck("images", "图片引用", sourceImages, polished.bodyMarkdown),
    preservationCheck("urls", "链接", sourceUrls, polishedText),
    preservationCheck("numbers", "数字与版本", sourceNumbers, polishedText),
    preservationCheck("code", "代码块", sourceCodeBlocks, polished.bodyMarkdown),
    preservationCheck("terms", "品牌与关键词", protectedTerms.filter((term) => sourceText.includes(term)), polishedText),
  ];

  const sourceHeadings = countMatches(source.bodyMarkdown, /^#{1,6}\s+/gm);
  const polishedHeadings = countMatches(polished.bodyMarkdown, /^#{1,6}\s+/gm);
  const headingPassed = sourceHeadings === 0 || polishedHeadings >= Math.ceil(sourceHeadings * 0.75);
  checks.push({
    key: "headings",
    label: "标题结构",
    passed: headingPassed,
    severity: headingPassed ? "info" : "warning",
    detail: `润色前 ${sourceHeadings} 个，润色后 ${polishedHeadings} 个`,
  });

  const sourceQuestions = countMatches(source.bodyMarkdown, /[？?]/g);
  const polishedQuestions = countMatches(polished.bodyMarkdown, /[？?]/g);
  const qaPassed = sourceQuestions === 0 || polishedQuestions >= Math.ceil(sourceQuestions * 0.75);
  checks.push({
    key: "qa",
    label: "问答信息",
    passed: qaPassed,
    severity: qaPassed ? "info" : "warning",
    detail: `润色前 ${sourceQuestions} 个问句，润色后 ${polishedQuestions} 个`,
  });

  const inventedExperiencePattern = /(?:我|我们)(?:最近|曾经|此前|亲自|实际|团队)?(?:体验过|使用过|试过|采访过|遇到过|踩过|调研过|测试过|发现过)/g;
  const sourceExperiences = uniqueMatches(sourceText, inventedExperiencePattern);
  const polishedExperiences = uniqueMatches(polishedText, inventedExperiencePattern);
  const addedExperiences = polishedExperiences.filter((item) => !sourceExperiences.includes(item));
  checks.push({
    key: "experience",
    label: "第一人称经历",
    passed: addedExperiences.length === 0,
    severity: addedExperiences.length ? "error" : "info",
    detail: addedExperiences.length ? `疑似新增经历：${addedExperiences.join("、")}` : "未发现新增的第一人称经历",
  });

  const sourceParagraphs = proseParagraphs(source.bodyMarkdown);
  const polishedParagraphs = proseParagraphs(polished.bodyMarkdown);
  const openingChanged = !nearlyUnchanged(sourceParagraphs.slice(0, 2).join("\n"), polishedParagraphs.slice(0, 2).join("\n"));
  const endingChanged = !nearlyUnchanged(sourceParagraphs.slice(-2).join("\n"), polishedParagraphs.slice(-2).join("\n"));
  checks.push({
    key: "opening-style",
    label: "开头风格改造",
    passed: openingChanged,
    severity: openingChanged ? "info" : "warning",
    detail: openingChanged ? "开头已进行可感知的重新表达" : "开头与平台原版过于接近",
  });
  checks.push({
    key: "ending-style",
    label: "结尾风格改造",
    passed: endingChanged,
    severity: endingChanged ? "info" : "warning",
    detail: endingChanged ? "结尾已进行可感知的重新表达" : "结尾与平台原版过于接近",
  });

  const metaphorHits = metaphorWarningHits(polished.bodyMarkdown);
  checks.push({
    key: "metaphor-packaging",
    label: "借喻包装",
    passed: metaphorHits.length === 0,
    severity: metaphorHits.length ? "warning" : "info",
    detail: metaphorHits.length ? `疑似借喻包装抽象概念：${metaphorHits.join("、")}，请人工确认` : "未发现可疑借喻包装",
  });

  return checks;
}

export function hasBlockingHumanizeChecks(checks: HumanizeCheck[]) {
  return checks.some((check) => !check.passed && check.severity === "error");
}
