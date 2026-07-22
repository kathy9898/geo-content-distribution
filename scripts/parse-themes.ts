/**
 * gzh-design 主题解析脚本
 * 解析 theme-*.md 文件，生成结构化 JSON 注册表
 *
 * 用法: npx tsx scripts/parse-themes.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import type {
  GzhThemeId, GzhThemeMeta, GzhDesignVariables, GzhComponent,
  GzhThemeRegistry, GzhThemesRegistryData, GzhArticleType, GzhRecipe,
  GzhMarkdownMapping
} from '../src/types/gzh';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(PROJECT_ROOT, 'src', 'data', 'gzh-themes', 'raw');
const OUTPUT = path.join(PROJECT_ROOT, 'src', 'data', 'gzh-themes-registry.json');

// ============================================================
// 工具函数
// ============================================================

function readRaw(filename: string): string {
  return fs.readFileSync(path.join(RAW_DIR, filename), 'utf-8');
}

/** 从 markdown 中提取所有 ```html 代码块 */
function extractHtmlBlocks(md: string): { heading: string; html: string }[] {
  const results: { heading: string; html: string }[] = [];
  const lines = md.split('\n');
  let currentHeading = '';
  let inCodeBlock = false;
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 检测标题行
    if (line.startsWith('## ') || line.startsWith('### ')) {
      currentHeading = line.replace(/^#+\s*/, '').trim();
    }

    // 检测代码块开始
    if (line.trim().startsWith('```html')) {
      inCodeBlock = true;
      codeLines = [];
      continue;
    }

    // 检测代码块结束
    if (inCodeBlock && line.trim() === '```') {
      inCodeBlock = false;
      results.push({
        heading: currentHeading,
        html: codeLines.join('\n')
      });
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
    }
  }

  return results;
}

/** 从 HTML 模板中提取 {{占位符}} */
function extractPlaceholders(html: string): string[] {
  const matches = html.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
}

/** 解析设计变量代码块（key: value 格式） */
function parseDesignVars(md: string): GzhDesignVariables {
  const vars: Record<string, string> = {};
  const lines = md.split('\n');
  let inVarsBlock = false;

  for (const line of lines) {
    if (line.trim() === '```' && inVarsBlock) {
      break;
    }
    if (inVarsBlock) {
      // 匹配 "中文名（英文说明）：      #value" 或 "key：value"
      const match = line.match(/[^\s：]+\s*[：:]\s*(.+)/);
      if (match) {
        const key = line.split(/[：:]/)[0].trim();
        const value = match[1].trim();
        vars[key] = value;
      }
    }
    if (line.includes('设计变量速查表')) {
      // 找到下一个 ``` 代码块开始
      const idx = md.indexOf(line);
      const afterLine = md.substring(idx);
      const codeStart = afterLine.indexOf('```');
      if (codeStart !== -1 && codeStart < 500) {
        inVarsBlock = true;
      }
    }
  }

  // 映射到结构化对象
  return {
    primaryColor: extractHex(vars, /墨色|主色|强调|CTA|深底|primary/) || '#1e1f23',
    titleColor: extractHex(vars, /标题色/) || '#23251d',
    bodyColor: extractHex(vars, /正文色/) || '#4d4f46',
    secondaryText: extractHex(vars, /次要文字|Secondary/) || '#65675e',
    weakText: extractHex(vars, /弱化文字|Weak/) || '#9ea096',
    borderColor: extractHex(vars, /边框|分隔线|Border/) || '#bfc1b7',
    background: extractHex(vars, /米白背景|背景|Background/) || '#fdfdf8',
    lightBg: extractHex(vars, /浅.*背景|浅底|lightBg/) || '#eeefe9',
    labelBg: extractHex(vars, /标签浅底|labelBg/) || '#e5e7e0',
    accentColor: extractHex(vars, /强调橙|橙|accent|Accent|主色.*emerald|主色.*正红|主色.*石墨|主色.*墨绿/) || '#ed7b2f',
    secondaryAccent: extractHex(vars, /陶土|次强调|secondary/) || undefined,
    bodyFontSize: vars['正文字号'] || '14px',
    bodyLineHeight: vars['正文行高'] || '1.9',
    globalLineHeight: vars['全局行高'] || '1.75',
    maxWidth: vars['最大宽度'] || '677px',
    containerPadding: vars['容器内边距'] || '8px',
    sectionMargin: vars['区块间距'] || 'margin-top: 24px',
    borderRadius: vars['圆角'] || '6px',
    fontFamily: vars['字体栈'] || "'IBM Plex Sans',-apple-system,system-ui,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif",
  };
}

function extractHex(vars: Record<string, string>, pattern: RegExp): string | undefined {
  for (const [key, value] of Object.entries(vars)) {
    if (pattern.test(key)) {
      const hexMatch = value.match(/#[0-9a-fA-F]{3,8}/);
      if (hexMatch) return hexMatch[0];
    }
  }
  return undefined;
}

/** 解析 theme-index.md 获取主题元信息 */
function parseThemeIndex(): GzhThemeMeta[] {
  const md = readRaw('theme-index.md');
  const themes: GzhThemeMeta[] = [];
  const lines = md.split('\n');
  let inTable = false;

  for (const line of lines) {
    if (line.includes('|') && line.includes('摸鱼绿')) {
      inTable = true;
    }
    if (inTable && line.startsWith('|')) {
      const cells = line.split('|').map(c => c.trim().replace(/`/g, '')).filter(Boolean);
      if (cells.length >= 5 && cells[0] !== '主题') {
        const name = cells[0];
        const primaryColor = (cells[1].match(/#[0-9a-fA-F]{3,8}/) || [''])[0];
        const usageScenario = cells[2];
        const componentFile = cells[3]; // 已去掉反引号
        const underlineCss = cells[4];

        // 从组件文件名推算 ID（路径可能是 references/theme-xxx.md 或直接 theme-xxx.md）
        const idMatch = componentFile.match(/theme-(.+)\.md/);
        const id = idMatch ? idMatch[1] : '';

        // 实际文件名（只取 basename）
        const basename = componentFile.split('/').pop() || componentFile;

        if (id) {
          themes.push({ id: id as GzhThemeId, name, primaryColor, usageScenario, componentFile: basename, underlineCss });
        }
      }
    }
    if (inTable && !line.startsWith('|')) {
      break;
    }
  }

  return themes;
}

/** 从组件 HTML 的标题行推算语义化 ID */
function headingToId(heading: string): string {
  const cleaned = heading
    .replace(/^组件\s*\d+\s*/, '')
    .replace(/（.*?）/, '')
    .trim();
  // 中文名 → 语义化英文 ID
  const map: Record<string, string> = {
    '全局容器': 'global-container',
    '头图卡': 'hero-card',
    '章节标题': 'section-title',
    '内刊标签条': 'masthead-label',
    '暗色标题条': 'masthead-black-strip',
    '期号徽章条': 'masthead-issue-badge',
    '步骤内联标题': 'step-heading-inline',
    '强调标题': 'highlight-title',
    '前导词标题': 'kicker-title',
    '正文段落': 'richtext-paragraph',
    '行内代码段落': 'inline-code-paragraph',
    '新旧对照段落': 'before-after-paragraph',
    '无序列表': 'bullet-list',
    '编者按': 'editors-note',
    '重点观点卡': 'key-point-card',
    '分割线': 'divider-solid',
    '分割点': 'divider-dots',
    '通栏图片': 'media-full-bleed-image',
    '图片卡': 'image-card',
    '图表占位卡': 'chart-card',
    '对比摘要卡': 'compare-summary',
    '精简对照表': 'compare-table',
    '流程示意图': 'flow-diagram',
    '条目列表卡': 'item-list-card',
    '常见问题列表': 'faq-listing',
    '案例时间线': 'case-timeline',
    '信任墙': 'summary-logo-wall',
    '结尾行动区': 'ending-actions',
    '路线胶囊组': 'roadmap-pills',
    '暗色摘要分栏': 'dark-summary-split',
    '暗色摘要边框': 'dark-summary-outline',
    '摘要横幅条': 'frontpage-summary-strip',
    '作者签名条': 'author-signature',
    '结尾内容块': 'ending-content',
    // 摸鱼绿特有
    '封面卡': 'cover-card',
    '导航目录': 'nav-toc',
    '步骤标签': 'step-label',
    '案例标签': 'case-label',
    '技能标签': 'skill-label',
    '工具标签': 'tool-label',
    '时间线': 'timeline',
    '三栏卡片': 'three-column-card',
    '药丸列表': 'pill-list',
    '数据表格': 'data-table',
    'Prompt 卡': 'prompt-card',
    '命令行卡': 'cmd-card',
    '引用框': 'quote-box',
    '亮点卡': 'oneliner-card',
    // 红白色系特有
    '引言卡': 'intro-card',
    '三栏目录': 'three-column-preview',
    '渐变分割': 'gradient-divider',
    '左竖条金句': 'left-bar-quote',
    '灰边栏提示': 'sidebar-note',
    '居中金句': 'centered-quote',
    '提示/警告条': 'tip-strip',
    '数据卡': 'data-card',
    'END 分割': 'end-divider',
    // 石墨极简风特有
    '大水印章节': 'watermark-section',
    '上下细线引用': 'hairline-quote',
    '内容引用块': 'content-reference',
    '条状提示': 'bar-tip',
    '线框数据卡': 'lineframe-data-card',
    // 禅意风特有
    '居中细线引语': 'centered-serif-quote',
    '留白段落': 'whitespace-paragraph',
    // 票据风特有
    '票据卡': 'ticket-card',
    '竖排边缘': 'vertical-edge',
    '星级评分': 'star-rating',
    '编号徽章': 'number-badge',
    '防水页脚': 'waterproof-footer',
  };

  // 先精确匹配
  for (const [cn, en] of Object.entries(map)) {
    if (cleaned === cn || cleaned.startsWith(cn)) return en;
  }

  // 模糊匹配
  for (const [cn, en] of Object.entries(map)) {
    if (cleaned.includes(cn)) return en;
  }

  // 回退：用拼音/缩写
  return cleaned
    .replace(/[^a-zA-Z0-9一-鿿]/g, '-')
    .toLowerCase()
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** 解析单个主题文件 */
function parseThemeFile(meta: GzhThemeMeta): GzhThemeRegistry {
  const md = readRaw(meta.componentFile);
  const designVars = parseDesignVars(md);
  const htmlBlocks = extractHtmlBlocks(md);

  // 构建组件表
  const components: Record<string, GzhComponent> = {};
  for (const block of htmlBlocks) {
    const id = headingToId(block.heading);
    components[id] = {
      id,
      name: block.heading,
      html: block.html,
      placeholders: extractPlaceholders(block.html),
    };
  }

  // 提取骨架（模板骨架章节的代码块）
  const skeletonBlock = htmlBlocks.find(b => b.heading.includes('模板骨架') || b.heading.includes('骨架'));
  const skeleton = skeletonBlock?.html || '';

  // 解析配方表（文章类型 → 组件组合）
  const recipes = parseRecipes(md);

  // 解析 Markdown 映射表
  const markdownMapping = parseMarkdownMapping(md);

  return {
    meta,
    designVars,
    components,
    skeleton,
    recipes,
    markdownMapping,
  };
}

/** 解析配方表 */
function parseRecipes(md: string): Record<GzhArticleType, GzhRecipe> {
  const recipes: Record<string, GzhRecipe> = {};
  const lines = md.split('\n');
  let inTable = false;

  const typeMap: Record<string, GzhArticleType> = {
    '教程/操作指南': 'tutorial',
    '盘点/工具清单': 'listing',
    '观点/深度分析': 'opinion',
    '数据复盘/报告': 'data-report',
    '访谈/人物特稿': 'interview',
    '生活/情感随笔': 'essay',
    '案例实战': 'case-study',
  };

  for (const line of lines) {
    if (line.includes('文章类型') && line.includes('核心组件')) {
      inTable = true;
      continue;
    }
    if (inTable && line.startsWith('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length >= 2 && cells[0] !== '文章类型') {
        const type = typeMap[cells[0]] || cells[0].toLowerCase().replace(/[/、]/g, '-') as GzhArticleType;
        const coreText = cells[1] || '';
        const accentText = cells[2] || '';
        recipes[type] = {
          coreComponents: coreText.split(/[+、，,]/).map(s => s.trim()).filter(Boolean),
          accentComponents: accentText.split(/[+、，,]/).map(s => s.trim()).filter(Boolean),
        };
      }
    }
    if (inTable && !line.startsWith('|')) {
      break;
    }
  }

  return recipes as Record<GzhArticleType, GzhRecipe>;
}

/** 解析 Markdown → 组件映射表 */
function parseMarkdownMapping(md: string): GzhMarkdownMapping {
  const mapping: GzhMarkdownMapping = {};
  const lines = md.split('\n');
  let inTable = false;

  for (const line of lines) {
    if (line.includes('Markdown') && line.includes('映射')) {
      inTable = true;
      continue;
    }
    if (inTable && line.startsWith('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length >= 2 && !cells[0].includes('Markdown') && !cells[0].includes('---')) {
        const mdElement = cells[0].replace(/`/g, '').trim();
        const componentRef = cells[1].trim();
        if (mdElement && componentRef) {
          mapping[mdElement] = componentRef;
        }
      }
    }
    if (inTable && !line.startsWith('|')) {
      break;
    }
  }

  return mapping;
}

/** 解析通用组件库 */
function parseCommonComponents(): Record<string, GzhComponent> {
  const md = readRaw('common-components.md');
  const htmlBlocks = extractHtmlBlocks(md);
  const components: Record<string, GzhComponent> = {};

  const nameMap: Record<string, string> = {
    '1a': 'code-block-dark',
    '1b': 'code-block-light',
    '1c': 'inline-code',
    '2a': 'image-with-caption',
    '2b': 'gif-with-badge',
    '2c': 'placeholder-material',
    '3a': 'left-bar-subtitle',
    '3b': 'pill-tag-subtitle',
    '3c': 'number-pill-title',
    '3d': 'quote-left-bar',
    '3e': 'tip-left-bar',
  };

  for (const block of htmlBlocks) {
    // 从标题中提取编号
    const numMatch = block.heading.match(/^(\d+[a-z]?)\./);
    if (numMatch) {
      const id = nameMap[numMatch[1]] || `common-${numMatch[1]}`;
      components[id] = {
        id,
        name: block.heading,
        html: block.html,
        placeholders: extractPlaceholders(block.html),
      };
    } else {
      // 用标题生成 ID
      const id = headingToId(block.heading);
      components[id] = {
        id,
        name: block.heading,
        html: block.html,
        placeholders: extractPlaceholders(block.html),
      };
    }
  }

  return components;
}

// ============================================================
// 主流程
// ============================================================

function main() {
  console.log('🔧 解析 gzh-design 主题文件...');

  if (!fs.existsSync(RAW_DIR)) {
    console.error(`❌ 找不到原始文件目录: ${RAW_DIR}`);
    console.error('   请先运行: npx tsx scripts/sync-gzh-themes.ts');
    process.exit(1);
  }

  // 读取版本
  let version = new Date().toISOString().split('T')[0];
  try {
    version = fs.readFileSync(path.join(RAW_DIR, '.version'), 'utf-8').trim();
  } catch { }

  // 解析 theme-index
  const themeMetas = parseThemeIndex();
  console.log(`📋 发现 ${themeMetas.length} 个主题:`);
  for (const m of themeMetas) {
    console.log(`   - ${m.name} (${m.id}) ${m.primaryColor}`);
  }

  // 解析每个主题
  const themes: Record<string, GzhThemeRegistry> = {};
  for (const meta of themeMetas) {
    console.log(`\n⚙️ 解析 ${meta.name}...`);
    const registry = parseThemeFile(meta);
    const compCount = Object.keys(registry.components).length;
    console.log(`   组件: ${compCount} 个`);
    themes[meta.id] = registry;
  }

  // 解析通用组件
  console.log('\n⚙️ 解析通用组件...');
  const commonComponents = parseCommonComponents();
  console.log(`   通用组件: ${Object.keys(commonComponents).length} 个`);

  // 组装注册表
  const data: GzhThemesRegistryData = {
    version,
    themes: themes as any,
    commonComponents,
  };

  // 写入 JSON
  fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2), 'utf-8');
  const sizeKB = Math.round(fs.statSync(OUTPUT).size / 1024);
  console.log(`\n✅ 注册表已生成: ${path.relative(PROJECT_ROOT, OUTPUT)} (${sizeKB} KB)`);
  console.log(`   版本: ${version}`);
}

main();
