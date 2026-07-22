/**
 * gzh-design 合规校验器（TypeScript 移植版）
 * 移植自 validate_gzh_html.py，检查微信公众号平台限制
 */
import type { GzhValidationResult } from '@/types/gzh';

/** 14 条禁止规则 */
const FORBIDDEN_PATTERNS: { pattern: RegExp; message: string }[] = [
  { pattern: /<style[\s>]/i, message: '禁止 <style> 标签（会被公众号剥离）' },
  { pattern: /<script[\s>]/i, message: '禁止 <script> 标签（会被公众号剥离）' },
  { pattern: /<div[\s>]/i, message: '禁止 <div> 标签（使用 <section> 代替）' },
  { pattern: /<link[\s>]/i, message: '禁止 <link> 标签（外部 CSS 会被剥离）' },
  { pattern: /\bclass\s*=/i, message: '禁止 class 属性（会被剥离）' },
  { pattern: /\bid\s*=/i, message: '禁止 id 属性（会被剥离）' },
  { pattern: /position\s*:\s*(fixed|absolute|sticky)/i, message: '禁止 position:fixed/absolute/sticky' },
  { pattern: /float\s*:/i, message: '禁止 float' },
  { pattern: /@media/i, message: '禁止 @media 查询' },
  { pattern: /@keyframes/i, message: '禁止 @keyframes 动画' },
  { pattern: /@import/i, message: '禁止 @import' },
  { pattern: /display\s*:\s*grid/i, message: '禁止 display:grid（使用 flex）' },
  { pattern: /var\s*\(--/i, message: '禁止 CSS 变量 var(--x)' },
  { pattern: /url\s*\([^)]*\.(woff2?|ttf|otf|eot)/i, message: '禁止外部字体 URL' },
];

/** 检测 CJK 字符 */
function hasCjk(text: string): boolean {
  return /[一-鿿぀-ゟ゠-ヿ가-힯]/.test(text);
}

/** 统计 <span leaf=""> 包裹数 */
function countSpanLeaf(html: string): number {
  const matches = html.match(/<span\s+leaf\s*=\s*["'][^"']*[""]/g);
  return matches ? matches.length : 0;
}

/** 检查半角标点（在 CJK 上下文中） */
function checkHalfWidthPunctuation(html: string): string[] {
  const warnings: string[] = [];
  // 简化检查：在非代码区域中查找中文后的半角标点
  // 排除 font-family:monospace 和 white-space:pre 区域
  const codeBlockRegex = /<section[^>]*font-family[^>]*monospace[^>]*>[\s\S]*?<\/section>/gi;
  const cleanHtml = html.replace(codeBlockRegex, '');

  // 中文后面的半角逗号、分号等
  const halfWidthAfterCjk = /[一-鿿]\s*([,;!?])/g;
  let match;
  let count = 0;
  while ((match = halfWidthAfterCjk.exec(cleanHtml)) !== null && count < 5) {
    const char = match[1];
    const fullWidth: Record<string, string> = { ',': '，', ';': '；', '!': '！', '?': '？' };
    warnings.push(`半角标点 "${char}" 应为全角 "${fullWidth[char]}"`);
    count++;
  }

  // 直引号检查
  const straightQuotes = /[一-鿿]"|"[^\s<]/g;
  let qMatch;
  count = 0;
  while ((qMatch = straightQuotes.exec(cleanHtml)) !== null && count < 3) {
    warnings.push('英文直引号 " 应为中文弯引号 ""');
    count++;
  }

  return warnings;
}

/**
 * 校验公众号 HTML 合规性
 */
export function validateGzhHtml(html: string): GzhValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Layer A: 禁止规则检查
  for (const { pattern, message } of FORBIDDEN_PATTERNS) {
    if (pattern.test(html)) {
      errors.push(message);
    }
  }

  // Layer B: span-leaf 包裹检查
  const spanLeafCount = countSpanLeaf(html);
  const hasCjkContent = hasCjk(html);

  if (hasCjkContent && spanLeafCount === 0) {
    errors.push('有中文内容但没有 <span leaf=""> 包裹，粘贴后样式会丢失');
  }

  // Layer B2: 半角标点检查
  if (hasCjkContent) {
    const punctWarnings = checkHalfWidthPunctuation(html);
    warnings.push(...punctWarnings);
  }

  return {
    errors,
    warnings,
    spanLeafCount,
    passed: errors.length === 0,
  };
}
