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
  intensity: HumanizeIntensity,
) {
  const sourceParagraphs = proseParagraphs(source.bodyMarkdown);
  const polishedParagraphs = proseParagraphs(polished.bodyMarkdown);
  const issues: string[] = [];
  const sourceOpening = sourceParagraphs.slice(0, 2).join("\n");
  const polishedOpening = polishedParagraphs.slice(0, 2).join("\n");
  const sourceEnding = sourceParagraphs.slice(-2).join("\n");
  const polishedEnding = polishedParagraphs.slice(-2).join("\n");

  if (nearlyUnchanged(sourceOpening, polishedOpening)) issues.push("开头基本沿用原稿，没有形成新的切入和画面");
  if (nearlyUnchanged(sourceEnding, polishedEnding)) issues.push("结尾基本沿用原稿，没有回环或余韵");

  const imageryMatches = polished.bodyMarkdown.match(/(?:像(?:是|一|把|个|条|座|扇|块|根|枚|层|张|艘|道)?|仿佛|好比|如同|犹如|宛如|就像)/g) || [];
  const minimumImagery = intensity === "strong" ? 2 : 1;
  if (imageryMatches.length < minimumImagery) {
    issues.push(`全文只有 ${imageryMatches.length} 处明显比喻或意象，当前强度至少需要 ${minimumImagery} 处`);
  }
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
    label: "结尾回环收束",
    passed: endingChanged,
    severity: endingChanged ? "info" : "warning",
    detail: endingChanged ? "结尾已进行可感知的重新表达" : "结尾与平台原版过于接近",
  });

  return checks;
}

export function hasBlockingHumanizeChecks(checks: HumanizeCheck[]) {
  return checks.some((check) => !check.passed && check.severity === "error");
}
