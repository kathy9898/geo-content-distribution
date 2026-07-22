/**
 * 半角标点 → 全角标点转换
 * 仅在非代码区域中转换
 */
import type { GzhDesignVariables } from '@/types/gzh';

const HALF_TO_FULL: Record<string, string> = {
  ',': '，',
  ';': '；',
  '!': '！',
  '?': '？',
  ':': '：',
  '(': '（',
  ')': '）',
};

/** 判断字符是否为 CJK */
function isCjk(ch: string): boolean {
  const code = ch.codePointAt(0);
  if (!code) return false;
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||  // CJK Unified
    (code >= 0x3400 && code <= 0x4dbf) ||  // CJK Ext A
    (code >= 0x3000 && code <= 0x303f) ||  // CJK Symbols
    (code >= 0xff00 && code <= 0xffef)     // Fullwidth
  );
}

/** 判断位置是否在 monospace 或代码上下文中 */
function isInCodeContext(html: string, position: number): boolean {
  // 向前查找最近的 style 属性
  const before = html.substring(Math.max(0, position - 500), position);
  if (/font-family[^;]*monospace/i.test(before)) return true;
  if (/white-space\s*:\s*pre/i.test(before)) return true;
  return false;
}

/**
 * 修复半角标点为全角
 * 规则：中文字符后面的半角标点转为全角（代码区域除外）
 */
export function fixPunctuation(html: string): string {
  let result = html;
  let offset = 0;

  // 找到所有 CJK 字符后紧跟半角标点的位置
  for (const [half, full] of Object.entries(HALF_TO_FULL)) {
    const regex = new RegExp(`([一-鿿])\\s*\\${half === '?' || half === '(' || half === ')' || half === ':' ? half : half}`, 'g');
    let match;

    while ((match = regex.exec(result)) !== null) {
      const pos = match.index + match[1].length;
      if (!isInCodeContext(result, pos)) {
        const before = result.substring(0, pos);
        const after = result.substring(pos + match[0].length - match[1].length);
        result = before + full + after;
        // 重置 regex 位置
        regex.lastIndex = pos + full.length;
      }
    }
  }

  // 替换英文直引号为中文弯引号（简化版）
  // 先处理 "..." 包裹中文的情况
  result = result.replace(/"([^"<]+?)"/g, (match, content) => {
    if (hasCjk(content)) {
      return `“${content}”`; // ""
    }
    return match;
  });

  return result;
}

function hasCjk(text: string): boolean {
  return /[一-鿿]/.test(text);
}

/**
 * 主题变量替换：将通用组件中的示例色值替换为目标主题色
 */
export function applyThemeVars(html: string, vars: GzhDesignVariables): string {
  // 通用组件使用红白色系的示例值，映射替换
  const colorMap: Record<string, string> = {
    '#DC2626': vars.primaryColor,
    '#FEF2F2': vars.lightBg,
    '#FEE2E2': vars.labelBg,
    '#991B1B': vars.titleColor,
    '#1C1917': vars.titleColor,
  };

  let result = html;
  for (const [from, to] of Object.entries(colorMap)) {
    if (from !== to) {
      result = result.replaceAll(from, to);
    }
  }

  return result;
}
