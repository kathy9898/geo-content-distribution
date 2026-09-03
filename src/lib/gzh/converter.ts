/**
 * gzh-design 核心转换器
 * 将 Markdown 转换为主题化的公众号 HTML
 */
import { marked } from 'marked';
import type {
  GzhThemeId, GzhThemeRegistry, GzhArticleType, GzhFormatResult,
  GzhAiCreativeResult, GzhCoverText
} from '@/types/gzh';
import { getTheme, getCommonComponents } from './themes-registry';
import { applyThemeVars } from './punctuation';
import { wrapSpanLeaf } from './span-leaf-wrapping';
import { fixPunctuation } from './punctuation';
import { validateGzhHtml } from './validator';

// ============================================================
// 工具函数
// ============================================================

/** 替换组件模板中的占位符 */
function fillTemplate(template: string, values: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result.replace(/\{\{[^}]+\}\}/g, '');
}

function withPlaceholderAliases(values: Record<string, string>): Record<string, string> {
  const aliases: Record<string, string[]> = {
    '内刊标签': ['顶部标签', 'topLabel'],
    '旧标题占位': ['划线旧认知', '旧认知'],
    '主标题': ['主标题行1', '主标题行2', '封面主标题'],
    '强调词': ['绿色高亮词', '高亮词'],
    '副标题说明': ['副标题关键词', '副标题'],
    '底部摘要': ['底部左侧文字', '底部文字'],
    '编号': ['01', '序号'],
    '标题': ['中文标题', '小节标题', '章节名'],
    '副标题': ['ENGLISH · 英文副标题', '英文副标题'],
    '正文内容': ['内容'],
    '重点观点': ['高亮内容', '观点', '引用内容，可嵌入绿色加粗等内联样式'],
    '补充说明': ['描述内容', '说明'],
    '文末互动引导': ['CTA文案', '行动文案'],
  };

  const expanded = { ...values };
  for (const [key, aliasList] of Object.entries(aliases)) {
    if (!(key in values)) continue;
    for (const alias of aliasList) {
      if (!(alias in expanded)) expanded[alias] = values[key];
    }
  }
  return expanded;
}

function fillComponentTemplate(template: string, values: Record<string, string>): string {
  return fillTemplate(template, withPlaceholderAliases(values));
}

function splitParagraphForTemplate(text: string, marks: string[] = []) {
  const keywordMarks = Array.isArray(marks) ? marks : [];
  const phrase = keywordMarks.find((item) => item && text.includes(item));

  if (!phrase) {
    return {
      前半句: text,
      需要强调的关键短语: '',
      后半句: '',
    };
  }

  const index = text.indexOf(phrase);
  return {
    前半句: text.slice(0, index),
    需要强调的关键短语: phrase,
    后半句: text.slice(index + phrase.length),
  };
}

/** 转义 HTML 特殊字符 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// 组件 ID 别名映射（各主题组件命名不统一，统一转换器用英文 ID 查找）
// ============================================================

const COMPONENT_ALIASES: Record<string, Record<string, string[]>> = {
  'moyu-green': {
    'hero-card': ['封面-cover-breaking'],
    'editors-note': ['9a-quote-box'],
    'kicker-title': ['9c-subtitle-highlight'],
    'image-card': ['12a-image'],
    'media-full-bleed-image': ['12a-image'],
    'divider-solid': ['9d-center-divider'],
    'bullet-list': ['11a-pill-list'],
    'item-list-card': ['11e-tool-card'],
    'key-point-card': ['9b-oneliner-card'],
    'dark-summary-outline': ['9d-center-divider'],
    'ending-actions': ['13a-footer-cta'],
  },
  'red-white': {
    'hero-card': ['intro-card'],
    'editors-note': ['left-bar-quote'],
    'kicker-title': ['b-副标题'],
    'image-card': ['图片组件'],
    'media-full-bleed-image': ['图片组件'],
    'bullet-list': ['11b-pill-list', '11a-ordered-list'],
    'item-list-card': ['10b-tool-card'],
    'key-point-card': ['9a-红色提示卡'],
    'dark-summary-outline': ['9b-警告提示'],
    'ending-actions': ['尾部签名标签组'],
  },
  'graphite-minimal': {
    'hero-card': ['intro-card'],
    'editors-note': ['8a-石墨深色左竖线引用'],
    'kicker-title': ['b-副标题'],
    'image-card': ['图片组件'],
    'media-full-bleed-image': ['图片组件'],
    'bullet-list': ['11b-pill-list', '11a-ordered-list'],
    'item-list-card': ['10c-tool-card'],
    'key-point-card': ['9a-石墨深色提示卡'],
    'dark-summary-outline': ['9b-浅色提示卡'],
    'ending-actions': ['尾部签名标签组'],
  },
  'zen-whitespace': {
    'hero-card': ['intro-card'],
    'editors-note': ['8a-超长尺寸引用块'],
    'kicker-title': ['加粗结论段', '7b-茶墨店前导标签'],
    'image-card': ['图片组件'],
    'media-full-bleed-image': ['图片组件'],
    'bullet-list': ['要点列表版', '有序列表'],
    'item-list-card': ['茶墨色列表'],
    'key-point-card': ['茶墨色提示'],
    'dark-summary-outline': ['提示块'],
    'ending-actions': ['尾部签名标签组'],
  },
  'moyu-ticket': {
    'hero-card': ['票据封面-ticket-cover'],
    'editors-note': ['重点观点卡片-key-point-card'],
    'kicker-title': ['小标题-subtitle'],
    'image-card': ['图片组件-image-ticket'],
    'media-full-bleed-image': ['图片组件-image-ticket'],
    'bullet-list': ['重点特性列表-numbered-feature-list'],
    'item-list-card': ['重点特性列表-numbered-feature-list'],
    'key-point-card': ['重点观点卡片-key-point-card'],
    'dark-summary-outline': ['结论卡片-conclusion-card'],
    'ending-actions': ['页脚行动-footer-cta'],
  },
};

/** 安全地获取组件 HTML，先按 ID 查找，找不到则按别名映射查找 */
function getComponentHtml(theme: GzhThemeRegistry, componentId: string): string | null {
  // 1. 直接查找
  if (theme.components[componentId]?.html) {
    return theme.components[componentId].html;
  }
  // 2. 按主题别名映射查找
  const themeId = theme.meta.id;
  const aliases = COMPONENT_ALIASES[themeId]?.[componentId];
  if (aliases) {
    for (const alias of aliases) {
      if (theme.components[alias]?.html) {
        return theme.components[alias].html;
      }
    }
  }
  return null;
}

/** 安全地获取通用组件 HTML（已替换为主题色） */
function getCommonHtml(componentId: string, theme: GzhThemeRegistry): string | null {
  const common = getCommonComponents();
  const comp = common[componentId];
  if (!comp) return null;
  return applyThemeVars(comp.html, theme.designVars);
}

/** 生成带下划线标记的段落 HTML */
function renderParagraphWithMarks(
  text: string,
  underlineCss: string,
  marks: string[] = []
): string {
  let result = text;

  // 应用关键词下划线
  for (const phrase of marks) {
    if (phrase && result.includes(phrase)) {
      result = result.replace(
        phrase,
        `<span style="${underlineCss}"><span leaf="">${phrase}</span></span>`
      );
    }
  }

  return result;
}

/** 推断文章类型（简易启发式） */
function detectArticleType(tokens: any[]): GzhArticleType {
  let headingCount = 0;
  let listCount = 0;
  let codeCount = 0;
  let quoteCount = 0;

  for (const token of tokens) {
    if (token.type === 'heading' && token.depth <= 3) headingCount++;
    if (token.type === 'list') listCount++;
    if (token.type === 'code') codeCount++;
    if (token.type === 'blockquote') quoteCount++;
  }

  // 教程：代码多、步骤多
  if (codeCount >= 2 && listCount >= 2) return 'tutorial';
  // 盘点：列表多、标题多
  if (listCount >= 3 && headingCount >= 3) return 'listing';
  // 观点：引用多
  if (quoteCount >= 2) return 'opinion';
  // 默认
  return 'listing';
}

// ============================================================
// 主转换函数
// ============================================================

export interface ConvertOptions {
  markdown: string;
  themeId: GzhThemeId;
  aiResult?: GzhAiCreativeResult;
}

export function convertMarkdownToGzh(options: ConvertOptions): GzhFormatResult {
  const { markdown, themeId } = options;
  const aiResult = options.aiResult || {
    articleType: 'listing' as GzhArticleType,
    keywordMarks: {},
    coverText: {} as GzhCoverText,
    chapterLabels: {},
  };

  const theme = getTheme(themeId);
  const vars = theme.designVars;
  const articleType = aiResult.articleType;

  // 解析 Markdown
  const tokens = marked.lexer(markdown);

  // 检测文章类型
  const detectedType = articleType || detectArticleType(tokens);

  // 收集结构信息
  const headings: { depth: number; text: string }[] = [];
  let chapterIndex = 0;

  for (const token of tokens) {
    if (token.type === 'heading' && token.depth === 2) {
      headings.push({ depth: token.depth, text: token.raw.replace(/^##\s*/, '').trim() });
    }
  }

  // 开始构建 HTML
  const htmlParts: string[] = [];

  // 1. 全局容器开始
  htmlParts.push(`<section style="max-width:${vars.maxWidth};margin:0 auto;padding:${vars.containerPadding};box-sizing:border-box;background:${vars.background};color:${vars.bodyColor};font-family:${vars.fontFamily};line-height:${vars.globalLineHeight};">`);

  // 2. 头图卡
  const heroHtml = getComponentHtml(theme, 'hero-card');
  if (heroHtml) {
    const cover = aiResult.coverText || {};
    const title = extractTitle(tokens);
    htmlParts.push(fillComponentTemplate(heroHtml, {
      '内刊标签': cover.topLabel || 'UCLLOUD DEV',
      '日期': cover.date || new Date().toISOString().split('T')[0].replace(/-/g, '·').slice(2),
      '旧标题占位': '',  // 将在模板中删除此行
      '主标题': cover.mainTitle || title,
      '强调词': cover.highlightWord || '全新上线',
      '副标题说明': cover.subtitle || extractFirstParagraph(tokens),
      '底部摘要': cover.bottomSummary || title,
      '标签1': (cover.tags && cover.tags[0]) || 'AI',
      '标签2': (cover.tags && cover.tags[1]) || '开发者',
    }).replace(/<p[^>]*>\s*\{\{旧标题占位\}\}\s*<\/p>/, ''));  // 删除空旧标题行
  }

  // 3. 编者按（如果文章开头有引用）
  const firstBlockquote = tokens.find(t => t.type === 'blockquote');
  if (firstBlockquote && 'text' in firstBlockquote) {
    const editorsNoteHtml = getComponentHtml(theme, 'editors-note');
    if (editorsNoteHtml) {
      htmlParts.push(fillComponentTemplate(editorsNoteHtml, {
        '批注标签': "EDITOR'S NOTE",
        '批注小字': '编者按',
        '编者按正文': (firstBlockquote as any).text || '',
      }));
    }
  }

  // 4. 章节内容
  chapterIndex = 0;
  let inChapter = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // ## 章节标题
    if (token.type === 'heading' && token.depth === 2) {
      chapterIndex++;
      const sectionTitleHtml = getComponentHtml(theme, 'section-title');
      if (sectionTitleHtml) {
        const titleText = token.raw.replace(/^##\s*/, '').replace(/\s*[_*`]/g, '').trim();
        const enLabel = (aiResult.chapterLabels && aiResult.chapterLabels[chapterIndex]) || generateEnglishLabel(titleText);
        htmlParts.push(fillComponentTemplate(sectionTitleHtml, {
          '编号': String(chapterIndex).padStart(2, '0'),
          '标题': titleText,
          '副标题': enLabel,
        }));
      }
      inChapter = true;
      continue;
    }

    // ### 子章节标题
    if (token.type === 'heading' && token.depth === 3) {
      const titleText = token.raw.replace(/^###\s*/, '').replace(/\s*[_*`]/g, '').trim();
      // 优先用前导词标题
      const kickerHtml = getComponentHtml(theme, 'kicker-title');
      if (kickerHtml) {
        const label = generateModuleLabel(titleText);
        htmlParts.push(fillComponentTemplate(kickerHtml, {
          'Kicker标签': label,
          '标题': titleText.replace(/^[📁🛠🤖🔌💡📢🌱🎁🚀]+\s*/, ''),
          '进度': '',
        }));
      }
      continue;
    }

    // 段落
    if (token.type === 'paragraph') {
      const paraHtml = getComponentHtml(theme, 'richtext-paragraph');
      if (paraHtml) {
        const text = processInlineMarkdown(token.raw, vars, theme.meta.underlineCss, aiResult.keywordMarks, i);
        const splitValues = splitParagraphForTemplate(text, aiResult.keywordMarks?.[i]);
        htmlParts.push(fillComponentTemplate(paraHtml, {
          '正文内容': text,
          '前半句': splitValues.前半句,
          '需要强调的关键短语': splitValues.需要强调的关键短语,
          '后半句': splitValues.后半句,
        }));
      }
      continue;
    }

    // 图片
    if (token.type === 'image' || (token.type === 'paragraph' && isImageOnly(token))) {
      const imgToken = token.type === 'image' ? token : (token as any).tokens?.find((t: any) => t.type === 'image');
      if (imgToken) {
        const imageHtml = getComponentHtml(theme, 'image-card') || getCommonHtml('image-with-caption', theme);
        if (imageHtml) {
          const src = (imgToken as any).href || (imgToken as any).src || '';
          const alt = (imgToken as any).text || (imgToken as any).alt || '';
          if (alt) {
            htmlParts.push(fillComponentTemplate(imageHtml, {
              '图片URL': normalizeImageUrl(src),
              '图片说明': alt,
            }));
          } else {
            // 无说明文字，用通栏图片
            const fullBleedHtml = getComponentHtml(theme, 'media-full-bleed-image');
            if (fullBleedHtml) {
              htmlParts.push(fillComponentTemplate(fullBleedHtml, {
                '图片URL': normalizeImageUrl(src),
              }));
            } else {
              const withoutCaption = fillComponentTemplate(imageHtml, {
                '图片URL': normalizeImageUrl(src),
                '图片说明': '',
              }).replace(/<figcaption[^>]*>[\s\S]*?<\/figcaption>/, '');
              htmlParts.push(withoutCaption);
            }
          }
        }
      }
      continue;
    }

    // 代码块
    if (token.type === 'code') {
      const codeHtml = getCommonHtml('code-block-dark', theme);
      if (codeHtml) {
        const lang = (token as any).lang || '';
        const code = (token as any).text || '';
        const lines = code.split('\n').map((line: string) =>
          `<p style="margin:0;font-family:'SF Mono',Consolas,Monaco,monospace;font-size:13px;line-height:1.6;color:#E2E8F0;"><span leaf="">${escapeHtml(line) || '&nbsp;'}</span></p>`
        ).join('');
        htmlParts.push(fillComponentTemplate(codeHtml, {
          // 模板中的内容区域用代码行替换
        }).replace(/<section style="padding:11px 14px;">[\s\S]*?<\/section>/,
          `<section style="padding:11px 14px;">${lines}</section>`
        ).replace(/<span leaf="">python<\/span>/, `<span leaf="">${lang || 'code'}</span>`));
      }
      continue;
    }

    // 列表
    if (token.type === 'list') {
      const listHtml = getComponentHtml(theme, 'bullet-list') || getComponentHtml(theme, 'item-list-card');
      if (listHtml && token.type === 'list') {
        const items = (token as any).items || [];
        if (listHtml.includes('条目标题')) {
          // 条目列表卡（标题+说明两层）
          for (const item of items) {
            const text = (item as any).text || '';
            htmlParts.push(fillComponentTemplate(listHtml, {
              '条目标题': text.replace(/\*\*/g, '').split(/[。；;]/)[0],
              '条目说明': text,
            }));
          }
        } else {
          // 简单无序列表
          const listItems = items.map((item: any) => {
            const text = processInlineMarkdown(item.raw || item.text || '', vars, theme.meta.underlineCss, aiResult.keywordMarks, i);
            return `<li style="margin-bottom:8px;font-size:15px;color:${vars.bodyColor};list-style-type:disc;"><section><span leaf="">${text}</span></section></li>`;
          }).join('');
          htmlParts.push(`<section style="margin-top:24px;"><section style="font-family:${vars.fontFamily};"><ul style="margin:0;padding-left:22px;line-height:1.8;list-style-position:outside;">${listItems}</ul></section></section>`);
        }
      }
      continue;
    }

    // 引用块
    if (token.type === 'blockquote' && i > 0) {
      // 非首个引用块用重点观点卡或编者按
      const keyPointHtml = getComponentHtml(theme, 'key-point-card');
      if (keyPointHtml && 'text' in token) {
        htmlParts.push(fillComponentTemplate(keyPointHtml, {
          '重点观点': (token as any).text || '',
          '补充说明': '',
       }));
     }
     continue;
   }

    // 表格
    if (token.type === 'table') {
      const tableToken = token as any;
      const header = (tableToken.header || []).map((cell: any) => cell.text || '').map((c: string) => processInlineMarkdown(c, vars, theme.meta.underlineCss, aiResult.keywordMarks, i));
      const rows = (tableToken.rows || []).map((row: any[]) =>
        row.map((cell: any) => processInlineMarkdown(cell.text || '', vars, theme.meta.underlineCss, aiResult.keywordMarks, i))
      );
      const headerCells = header.map((cell: string) =>
        `<th style="border:1px solid ${vars.borderColor};padding:8px 12px;font-size:14px;font-weight:600;color:${vars.titleColor};background:${vars.lightBg};text-align:left;"><span leaf="">${cell}</span></th>`
      ).join('');
      const bodyRows = rows.map((row: string[]) => {
        const cells = row.map((cell: string) =>
          `<td style="border:1px solid ${vars.borderColor};padding:8px 12px;font-size:14px;color:${vars.bodyColor};text-align:left;"><span leaf="">${cell}</span></td>`
        ).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      htmlParts.push(
        `<section style="margin-top:16px;margin-bottom:16px;overflow-x:auto;">` +
        `<table style="border-collapse:collapse;width:100%;font-family:${vars.fontFamily};"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>` +
        `</section>`
      );
      continue;
    }

    // 分割线
    if (token.type === 'hr') {
      const dividerHtml = getComponentHtml(theme, 'divider-solid');
      if (dividerHtml) {
        htmlParts.push(dividerHtml);
      } else {
        htmlParts.push(`<section style="margin-top:24px;"><hr style="border:none;height:2px;background:${vars.borderColor};margin:0;"></section>`);
      }
      continue;
    }
  }

  // 5. 结尾收束
  const darkSummaryHtml = getComponentHtml(theme, 'dark-summary-outline');
  if (darkSummaryHtml) {
    htmlParts.push(fillComponentTemplate(darkSummaryHtml, {
      'CLOSING标签': 'CLOSING',
      '结尾金句': extractClosingStatement(tokens),
    }));
  }

  // 6. 固定签名段落
  const signatureParaHtml = getComponentHtml(theme, 'richtext-paragraph');
  if (signatureParaHtml) {
    const signatureText = `我是 {{作者名}}，{{一句话简介}}。如果你觉得今天这篇有收获，欢迎<strong style="color:${vars.titleColor};"><span leaf="">点赞、在看、转发</span></strong>三连，我们下篇见！`;
    const signatureSplit = splitParagraphForTemplate(signatureText, []);
    htmlParts.push(fillComponentTemplate(signatureParaHtml, {
      '正文内容': signatureText,
      '前半句': signatureSplit.前半句,
      '需要强调的关键短语': signatureSplit.需要强调的关键短语,
      '后半句': signatureSplit.后半句,
    }));
  }

  // 7. 结尾行动区
  const endingHtml = getComponentHtml(theme, 'ending-actions');
  if (endingHtml) {
    htmlParts.push(fillComponentTemplate(endingHtml, {
      '文末互动引导': '如果你觉得今天这篇有收获，欢迎点赞·在看·收藏三连，我们下篇见',
    }));
  }

  // 8. 关闭全局容器
  htmlParts.push('</section>');

  // 9. 隐藏标记
  htmlParts.push(`<p style="display:none;"><mp-style-type data-value="3"></mp-style-type></p>`);

  // 后处理
  let finalHtml = htmlParts.join('\n');
  finalHtml = fixPunctuation(finalHtml);
  finalHtml = wrapSpanLeaf(finalHtml);

  // 校验
  const validation = validateGzhHtml(finalHtml);

  return {
    html: finalHtml,
    validation,
    articleType: detectedType,
    themeUsed: themeId,
  };
}

// ============================================================
// 辅助函数
// ============================================================

function extractTitle(tokens: any[]): string {
  for (const t of tokens) {
    if (t.type === 'heading' && t.depth === 1) {
      return t.raw.replace(/^#\s*/, '').trim();
    }
  }
  // 回退到第一个 h2
  for (const t of tokens) {
    if (t.type === 'heading' && t.depth === 2) {
      return t.raw.replace(/^##\s*/, '').replace(/\s*[_*`]/g, '').trim();
    }
  }
  return '文章标题';
}

function extractFirstParagraph(tokens: any[]): string {
  for (const t of tokens) {
    if (t.type === 'paragraph') {
      return (t as any).text || t.raw || '';
    }
  }
  return '';
}

function extractClosingStatement(tokens: any[]): string {
  // 取最后一段有意义的内容作为结尾金句
  const paragraphs = tokens.filter(t => t.type === 'paragraph');
  if (paragraphs.length > 0) {
    const last = paragraphs[paragraphs.length - 1];
    const text = (last as any).text || '';
    // 取第一句
    return text.split(/[。！？]/)[0] + '。';
  }
  return '感谢阅读，期待你的关注！';
}

function isImageOnly(token: any): boolean {
  if (token.type !== 'paragraph') return false;
  const tokens = (token as any).tokens;
  if (!tokens || tokens.length === 0) return false;
  return tokens.every((t: any) => t.type === 'image' || t.type === 'space');
}

function normalizeImageUrl(src: string): string {
  // 飞书图片代理
  if (src.startsWith('feishu-image://')) {
    const token = src.replace('feishu-image://', '');
    return `/api/feishu-image/${token}`;
  }
  return src;
}

function applyInlineMarkers(text: string, vars: any, underlineCss: string): string {
  let result = text;

  // ==高亮==
  result = result.replace(/==([^=]+)==/g, (_, content) => {
    return `<span style="background:${vars.lightBg};padding:0 4px;border-radius:3px;"><span leaf="">${content}</span></span>`;
  });

  // <u>下划线</u>
  result = result.replace(/<u>([\s\S]+?)<\/u>/g, (_, content) => {
    return `<span style="${underlineCss}"><span leaf="">${content}</span></span>`;
  });

  // ++下划线++
  result = result.replace(/\+\+([^+]+)\+\+/g, (_, content) => {
    return `<span style="${underlineCss}"><span leaf="">${content}</span></span>`;
  });

  // ~~删除线~~
  result = result.replace(/~~([^~]+)~~/g, (_, content) => {
    return `<span style="text-decoration:line-through;color:${vars.secondaryText};"><span leaf="">${content}</span></span>`;
  });

  return result;
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/==([^=]+)==/g, '$1')
    .replace(/\+\+([^+]+)\+\+/g, '$1')
    .replace(/<u>([\s\S]+?)<\/u>/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/[<>]/g, '')
    .trim();
}

function pickAutoKeywordMarks(text: string): string[] {
  const plain = stripInlineMarkdown(text);
  if (plain.length < 8) return [];

  const explicit = Array.from(plain.matchAll(/[「“]([^」”]{4,15})[」”]/g))
    .map(match => match[1].trim())
    .filter(Boolean);

  const chunks = plain
    .split(/[，。！？：；、\n]/)
    .map(item => item.trim())
    .filter(item => item.length >= 6);

  const candidates = [...explicit];
  for (const chunk of chunks) {
    const terms = chunk.match(/[A-Za-z0-9][A-Za-z0-9 ._+-]{2,18}|[一-鿿A-Za-z0-9]{4,15}/g) || [];
    for (const term of terms) {
      const normalized = term.trim();
      if (normalized.length >= 4 && normalized.length <= 15) candidates.push(normalized);
    }
    if (chunk.length >= 4 && chunk.length <= 15) candidates.push(chunk);
  }

  const seen = new Set<string>();
  return candidates
    .filter(item => {
      if (seen.has(item)) return false;
      if (/^(但是|所以|因此|因为|如果|我们|这个|这些|一个|可以|通过)$/.test(item)) return false;
      seen.add(item);
      return true;
    })
    .slice(0, 2);
}

/** 处理行内 Markdown（加粗、代码、链接等） */
function processInlineMarkdown(
  raw: string,
  vars: any,
  underlineCss: string,
  keywordMarks: Record<number, string[]>,
  tokenIndex: number
): string {
  let text = raw
    .replace(/^##\s*/, '')  // 去掉标题标记
    .replace(/^###\s*/, '')
    .replace(/^\*\s*/, '')  // 去掉列表标记
    .replace(/^-\s*/, '')
    .replace(/^>\s*/, '');  // 去掉引用标记

  text = applyInlineMarkers(text, vars, underlineCss);

  // **加粗** → 强调加粗
  text = text.replace(/\*\*([^*]+)\*\*/g, (_, content) => {
    return `<strong style="color:${vars.titleColor};"><span leaf="">${content}</span></strong>`;
  });

  // `行内代码` → 行内代码标签
  text = text.replace(/`([^`]+)`/g, (_, content) => {
    return `<span style="background:${vars.lightBg};color:${vars.titleColor};padding:2px 6px;border-radius:4px;font-family:ui-monospace,Menlo,Monaco,Consolas,monospace;font-size:13px;border:1px solid #b6b7af;"><span leaf="">${content}</span></span>`;
  });

  // [链接](url) → 纯文本（公众号不支持外链）
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 应用关键词下划线。AI 没返回时，按 gzh-design skill 规则逐段确定性挑 1-2 个关键词。
  const marks = keywordMarks[tokenIndex]?.length ? keywordMarks[tokenIndex] : pickAutoKeywordMarks(raw);
  for (const phrase of marks) {
    if (phrase && text.includes(phrase) && !text.includes(`>${phrase}</span></span>`)) {
      text = text.replace(
        phrase,
        `<span style="${underlineCss}"><span leaf="">${phrase}</span></span>`
      );
    }
  }

  return text;
}

/** 从中文标题生成英文标签 */
function generateEnglishLabel(title: string): string {
  const map: Record<string, string> = {
    '欢迎礼': 'WELCOME',
    '成长中心': 'GROWTH CENTER',
    '核心模块': 'CORE MODULES',
    '项目': 'PROJECTS',
    '技能': 'SKILLS',
    '模型': 'MODELS',
    '应用': 'SPACES',
    '动态': 'FEEDS',
    '即将上线': 'COMING SOON',
    '更多功能': 'MORE COMING',
    '总结': 'SUMMARY',
    '结语': 'EPILOGUE',
    '开始': 'GETTING STARTED',
    '安装': 'INSTALLATION',
    '配置': 'CONFIGURATION',
    '使用': 'USAGE',
    '示例': 'EXAMPLES',
    '实战': 'PRACTICE',
    '对比': 'COMPARISON',
    '原理': 'PRINCIPLES',
  };

  for (const [cn, en] of Object.entries(map)) {
    if (title.includes(cn)) return en;
  }

  return title.replace(/[^\w]/g, '').toUpperCase().slice(0, 15) || 'SECTION';
}

/** 从中文标题生成模块标签 */
function generateModuleLabel(title: string): string {
  const map: Record<string, string> = {
    '项目': 'MODULE 01',
    '技能': 'MODULE 02',
    '模型': 'MODULE 03',
    'MCP': 'MODULE 04',
    '应用': 'MODULE 05',
    '动态': 'MODULE 06',
    '成长': 'GROWTH',
    '欢迎': 'WELCOME',
    '积分': 'CREDITS',
    '签到': 'CHECK-IN',
  };

  for (const [cn, en] of Object.entries(map)) {
    if (title.includes(cn)) return en;
  }

  return 'SECTION';
}
