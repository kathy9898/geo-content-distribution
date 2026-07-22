/**
 * <span leaf=""> 包裹器
 * 确保所有中文文本节点被 span leaf 包裹，防止粘贴到公众号后样式丢失
 */

/** 检测文本是否包含 CJK 字符 */
function hasCjk(text: string): boolean {
  return /[一-鿿぀-ゟ゠-ヿ가-힯]/.test(text);
}

/** 检测文本是否全是空白/装饰性内容 */
function isWhitespace(text: string): boolean {
  return /^\s*$/.test(text) || text === '&nbsp;' || text === ' ';
}

/**
 * 为 HTML 文本节点添加 <span leaf=""> 包裹
 *
 * 策略：在已有内联样式的标签（<span>, <strong>, <p>, <h3>, <figcaption> 等）内
 * 如果文本不在 <span leaf> 中，则包裹
 */
export function wrapSpanLeaf(html: string): string {
  // 已有 span leaf 的不动
  // 对匹配到内联标签内的裸文本进行包裹

  // 匹配模式：<tag style="...">裸中文文本</tag>
  // 但不在 <span leaf> 内
  let result = html;

  // 处理 <p>, <h3>, <h4>, <figcaption>, <li> 等块级标签内的裸文本
  const blockTags = ['p', 'h3', 'h4', 'figcaption', 'li', 'td', 'th'];
  for (const tag of blockTags) {
    // 匹配 <tag ...>内容</tag>，但内容中不包含 <span leaf
    const regex = new RegExp(
      `<(${tag})(\\s[^>]*)?>((?:(?!<span\\s+leaf)[\\s\\S])*?)<\\/${tag}>`,
      'g'
    );

    result = result.replace(regex, (fullMatch, tagName, attrs, content) => {
      if (!hasCjk(content)) return fullMatch;
      // 如果内容已经有 <span leaf，跳过
      if (/<span\s+leaf/.test(content)) return fullMatch;

      // 包裹裸文本
      const wrappedContent = wrapTextContent(content);
      return `<${tagName}${attrs || ''}>${wrappedContent}</${tagName}>`;
    });
  }

  // 处理装饰性空元素（圆点、竖线等）需要 <span leaf><br></span>
  result = result.replace(
    /<span[^>]*style="[^"]*(?:width|height)[^"]*"[^>]*>\s*<\/span>/g,
    (match) => {
      if (!/<span\s+leaf/.test(match)) {
        return match.replace(/<\/span>/, '<span leaf="">&nbsp;</span></span>');
      }
      return match;
    }
  );

  return result;
}

/** 包裹文本内容中的中文文本片段 */
function wrapTextContent(content: string): string {
  // 如果内容全是文本（无 HTML 标签）
  if (!/<[^>]+>/.test(content) && hasCjk(content)) {
    return `<span leaf="">${content}</span>`;
  }

  // 如果内容包含 HTML 标签，逐段处理
  // 匹配裸文本节点（不在任何标签内的文本）
  return content.replace(
    /([^<]+)(?=<|$)/g,
    (match) => {
      const trimmed = match.trim();
      if (trimmed && hasCjk(trimmed) && !trimmed.startsWith('span leaf')) {
        return `<span leaf="">${match}</span>`;
      }
      return match;
    }
  );
}
