type PublishableArticle = {
  title: string;
  summary: string;
  bodyMarkdown: string;
  coreConclusion?: string;
};

const sourceNarrationPatterns = [
  /原文(?:中)?(?:提到|提及|强调|给出|指出|介绍|显示|表明|认为|建议|说明|描述|列出|展示|讨论)/g,
  /(?:从|根据)原文(?:中)?(?:可知|可以看出|来看|的说法)/g,
  /(?:这篇文章|该文|文章中|文中)(?:提到|提及|强调|给出|指出|介绍|显示|表明|认为|建议|说明|描述|列出|展示|讨论)/g,
  /根据(?:这篇文章|该文|文章内容)/g,
  /作者(?:提到|提及|强调|给出|指出|介绍|认为|建议|说明)/g,
  /原文(?:的)?信息/g,
  /原文内容/g,
  /本文(?:将|主要|旨在)(?:介绍|讨论|分析|说明|探讨|阐述)?/g,
  /下文将(?:介绍|讨论|分析|说明|探讨|阐述)/g,
];

export function findSourceNarrationPhrases(result: PublishableArticle) {
  const publishableText = [result.title, result.summary, result.coreConclusion || "", result.bodyMarkdown].join("\n");
  return Array.from(new Set(sourceNarrationPatterns.flatMap((pattern) => publishableText.match(pattern) || [])));
}

const narrationReplacements: Array<[RegExp, string]> = [
  [/原文(?:中)?(?:提到|提及|强调|给出|指出|介绍|显示|表明|认为|建议|说明|描述|列出|展示|讨论)/g, ""],
  [/(?:从|根据)原文(?:中)?(?:可知|可以看出|来看|的说法)/g, "由此"],
  [/(?:这篇文章|该文|文章中|文中)(?:提到|提及|强调|给出|指出|介绍|显示|表明|认为|建议|说明|描述|列出|展示|讨论)/g, ""],
  [/根据(?:这篇文章|该文|文章内容)/g, ""],
  [/作者(?:提到|提及|强调|给出|指出|介绍|认为|建议|说明)/g, ""],
  [/原文(?:的)?信息/g, "相关信息"],
  [/原文内容/g, "相关内容"],
  [/本文(?:将|主要|旨在)(?:介绍|讨论|分析|说明|探讨|阐述)?/g, ""],
  [/下文将(?:介绍|讨论|分析|说明|探讨|阐述)/g, ""],
];

function cleanText(value: string) {
  return narrationReplacements.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value,
  ).replace(/^[，。；、\s]+/, "").replace(/[，、]\s*[，。；]/g, "。").replace(/\s{2,}/g, " ").trim();
}

export function removeSourceNarrationPhrases<T extends PublishableArticle>(result: T): T {
  return {
    ...result,
    title: cleanText(result.title),
    summary: cleanText(result.summary),
    coreConclusion: result.coreConclusion ? cleanText(result.coreConclusion) : result.coreConclusion,
    bodyMarkdown: cleanText(result.bodyMarkdown),
  };
}
