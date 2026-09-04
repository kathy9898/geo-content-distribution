import { marked } from "marked";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { Platform, PlatformVariant } from "@/types/geo";

const articleSyncCssUrl = "https://cdn.jsdelivr.net/gh/wechatsync/article-syncjs@latest/dist/styles.css";
const articleSyncJsUrl = "https://cdn.jsdelivr.net/gh/wechatsync/article-syncjs@latest/dist/main.js";
const wechatSyncThemeStyleId = "geo-wechatsync-modal-theme";

const wechatSyncPlatformKeys: Record<Platform, string> = {
  zhihu: "zhihu",
  toutiao: "toutiao",
  baijiahao: "baijiahao",
  csdn: "csdn",
  cnblogs: "cnblogs",
  juejin: "juejin",
  sohu: "sohu",
  netease: "netease",
  wechat: "wechat",
  cto51: "51cto",
  segmentfault: "segmentfault",
  twitter: "twitter",
};

export const platformDraftUrls: Record<Platform, string> = {
  zhihu: "https://www.zhihu.com/creator",
  toutiao: "https://mp.toutiao.com/profile_v4/graphic/publish",
  baijiahao: "https://baijiahao.baidu.com/builder/rc/edit",
  csdn: "https://editor.csdn.net/md/",
  cnblogs: "https://i.cnblogs.com/posts/edit",
  juejin: "https://juejin.cn/editor/drafts/new",
  sohu: "https://mp.sohu.com/mpfe/v3/main/news/add",
  netease: "https://mp.163.com/wemedia/write/article",
  wechat: "https://mp.weixin.qq.com/",
  cto51: "https://blog.51cto.com/",
  segmentfault: "https://segmentfault.com/write",
  twitter: "https://x.com/compose/post",
};

type WechatSyncResult = {
  taskId?: string;
  url?: string;
  draftUrl?: string;
  message?: string;
};

type WechatSyncWindow = Window & {
  syncPost?: (article: Record<string, unknown>) => Promise<WechatSyncResult> | WechatSyncResult;
  __articleSyncJsLoading?: Promise<void>;
};

function loadStyleOnce(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function injectWechatSyncModalTheme() {
  if (document.getElementById(wechatSyncThemeStyleId)) return;

  const style = document.createElement("style");
  style.id = wechatSyncThemeStyleId;
  style.textContent = `
    #synciconapp .el-dialog__wrapper {
      background: rgba(15, 23, 42, 0.34) !important;
      backdrop-filter: blur(8px);
    }

    #synciconapp .dialogClass .el-dialog {
      width: min(720px, calc(100vw - 40px)) !important;
      margin-top: 8vh !important;
      border-radius: 22px !important;
      overflow: hidden !important;
      background: #ffffff !important;
      box-shadow: 0 28px 80px rgba(15, 23, 42, 0.24), 0 8px 24px rgba(15, 23, 42, 0.12) !important;
    }

    #synciconapp .dialogClass .el-dialog__header {
      position: relative;
      padding: 28px 32px 20px !important;
      border-bottom: 0 !important;
      background: linear-gradient(135deg, #f8fbff 0%, #eef6ff 48%, #fff7ed 100%) !important;
    }

    #synciconapp .dialogClass .el-dialog__header::after {
      content: "选择账号后，将文章同步为平台草稿";
      display: block;
      margin-top: 8px;
      color: #64748b;
      font-size: 14px;
      font-weight: 400;
      line-height: 1.5;
    }

    #synciconapp .dialogClass .el-dialog__title {
      color: #0f172a !important;
      font-size: 24px !important;
      font-weight: 800 !important;
      line-height: 1.25 !important;
      letter-spacing: 0 !important;
    }

    #synciconapp .dialogClass .el-dialog__headerbtn {
      top: 24px !important;
      right: 26px !important;
      width: 34px !important;
      height: 34px !important;
      border-radius: 999px !important;
      background: rgba(255, 255, 255, 0.78) !important;
      box-shadow: 0 1px 6px rgba(15, 23, 42, 0.08) !important;
    }

    #synciconapp .dialogClass .el-dialog__headerbtn .el-dialog__close {
      color: #475569 !important;
      font-weight: 700 !important;
    }

    #synciconapp .dialogClass .el-dialog__body {
      padding: 24px 32px 8px !important;
      color: #1f2937 !important;
      background: #ffffff !important;
    }

    #synciconapp .syncpost-block {
      display: grid !important;
      grid-template-columns: 96px minmax(0, 1fr) !important;
      gap: 18px !important;
      align-items: center !important;
      padding: 18px !important;
      margin-bottom: 22px !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 18px !important;
      background: #f8fafc !important;
    }

    #synciconapp .syncpost-block .el-aside {
      width: 96px !important;
      height: 96px !important;
      border-radius: 18px !important;
      overflow: hidden !important;
      background: linear-gradient(135deg, #0ea5e9, #2563eb) !important;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28) !important;
    }

    #synciconapp .syncpost-block .el-aside::before {
      content: "文";
      display: flex;
      width: 100%;
      height: 100%;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 38px;
      font-weight: 800;
    }

    #synciconapp .syncpost-block .el-aside img {
      display: none !important;
    }

    #synciconapp .syncpost-block .el-main {
      min-width: 0 !important;
      padding: 0 !important;
    }

    #synciconapp .syncpost-block h5 {
      color: #0f172a !important;
      font-size: 17px !important;
      line-height: 1.55 !important;
      font-weight: 750 !important;
      display: -webkit-box !important;
      -webkit-line-clamp: 2 !important;
      -webkit-box-orient: vertical !important;
      overflow: hidden !important;
      margin: 0 0 8px !important;
    }

    #synciconapp .syncpost-block p {
      color: #64748b !important;
      font-size: 13px !important;
      line-height: 1.7 !important;
      margin: 0 !important;
      display: -webkit-box !important;
      -webkit-line-clamp: 2 !important;
      -webkit-box-orient: vertical !important;
      overflow: hidden !important;
    }

    #synciconapp .dialogClass h6 {
      margin: 0 0 12px !important;
      color: #334155 !important;
      font-size: 13px !important;
      font-weight: 700 !important;
    }

    #synciconapp .all-pubaccounts {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 12px !important;
      max-height: 300px !important;
      overflow: auto !important;
      padding: 2px 4px 4px 2px !important;
    }

    #synciconapp .account-item {
      margin: 0 !important;
      line-height: 1.4 !important;
      padding: 0 !important;
      font-size: 14px !important;
    }

    #synciconapp .account-item .el-checkbox {
      display: flex !important;
      align-items: center !important;
      width: 100% !important;
      min-height: 52px !important;
      margin: 0 !important;
      padding: 12px 14px !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 14px !important;
      background: #ffffff !important;
      color: #334155 !important;
      transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease !important;
    }

    #synciconapp .account-item .el-checkbox:hover,
    #synciconapp .account-item .el-checkbox.is-checked {
      border-color: #3b82f6 !important;
      background: #f8fbff !important;
      box-shadow: 0 8px 18px rgba(37, 99, 235, 0.10) !important;
    }

    #synciconapp .account-item .el-checkbox__label {
      display: flex !important;
      align-items: center !important;
      min-width: 0 !important;
      color: inherit !important;
      line-height: 1.35 !important;
      padding-left: 10px !important;
    }

    #synciconapp .account-item img.icon {
      flex: 0 0 auto !important;
      width: 22px !important;
      height: 22px !important;
      margin-right: 8px !important;
      border-radius: 6px !important;
      vertical-align: middle !important;
    }

    #synciconapp .dialogClass .el-dialog__footer {
      padding: 18px 32px 28px !important;
      border-top: 0 !important;
      background: #ffffff !important;
    }

    #synciconapp .dialogClass .dialog-footer {
      display: flex !important;
      justify-content: flex-end !important;
      gap: 10px !important;
    }

    #synciconapp .dialogClass .el-button--primary {
      min-width: 104px !important;
      height: 40px !important;
      padding: 0 22px !important;
      border: 0 !important;
      border-radius: 999px !important;
      background: linear-gradient(135deg, #2563eb, #0ea5e9) !important;
      box-shadow: 0 10px 20px rgba(37, 99, 235, 0.22) !important;
      font-size: 14px !important;
      font-weight: 700 !important;
    }

    @media (max-width: 640px) {
      #synciconapp .dialogClass .el-dialog {
        width: calc(100vw - 24px) !important;
        margin-top: 4vh !important;
        border-radius: 18px !important;
      }

      #synciconapp .dialogClass .el-dialog__header,
      #synciconapp .dialogClass .el-dialog__body,
      #synciconapp .dialogClass .el-dialog__footer {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }

      #synciconapp .syncpost-block {
        grid-template-columns: 72px minmax(0, 1fr) !important;
      }

      #synciconapp .syncpost-block .el-aside {
        width: 72px !important;
        height: 72px !important;
      }

      #synciconapp .all-pubaccounts {
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function loadScriptOnce(src: string) {
  const win = window as WechatSyncWindow;
  if (win.__articleSyncJsLoading) return win.__articleSyncJsLoading;

  win.__articleSyncJsLoading = new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("article-syncjs 加载失败"));
    document.body.appendChild(script);
  });

  return win.__articleSyncJsLoading;
}

export async function ensureWechatSyncBridge() {
  if (typeof window === "undefined") return false;
  loadStyleOnce(articleSyncCssUrl);
  injectWechatSyncModalTheme();
  if (hasWechatSyncBridge()) return true;

  await loadScriptOnce(articleSyncJsUrl);
  return hasWechatSyncBridge();
}

export function hasWechatSyncBridge() {
  if (typeof window === "undefined") return false;
  return typeof (window as WechatSyncWindow).syncPost === "function";
}

export async function buildWechatSyncArticle(variant: PlatformVariant) {
  let html = marked.parse(variant.bodyMarkdown) as string;

  if (variant.platform === "netease") {
    // 网易号适配器会把 table 转纯文本，因此网易专用：表格渲染成图片后再上传。
    html = await convertTablesToImages(html);
  }
  // 所有平台统一：浏览器端下载图片转 data URI，失败的移除 img 标签避免适配器报错。
  html = await inlineImagesSafe(html);

  return {
    title: variant.title,
    desc: variant.summary,
    summary: variant.summary,
    content: html,
    html: html,
    markdown: variant.bodyMarkdown,
    tags: variant.tags,
    draft: true,
    openDraft: true,
  };
}

/** 将飞书图片相对路径转为绝对 URL，让适配器 processImages 下载并上传 */
function resolveImageUrls(html: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  let result = html.replace(
    /feishu-image:\/\/([\w]+)/g,
    `${origin}/api/feishu-image/$1`
  );
  result = result.replace(
    /src="\/api\/feishu-image\/([^"]+)"/g,
    `src="${origin}/api/feishu-image/$1"`
  );
  return result;
}

/** 图片最大宽度（px），超过等比缩放 */
const MAX_IMAGE_WIDTH = 800;
/** JPEG 压缩质量 */
const JPEG_QUALITY = 0.75;

/** 下载飞书图片后压缩为 data URI，随后由 Wechatsync 上传为目标平台图片 URL */
async function inlineFeishuImages(html: string): Promise<string> {
  const normalized = html.replace(/feishu-image:\/\/([\w]+)/g, "/api/feishu-image/$1");
  const regex = /src="\/api\/feishu-image\/([^"]+)"/g;
  const matches = Array.from(normalized.matchAll(regex));
  if (!matches.length) return normalized;

  const replacements = await Promise.all(
    matches.map(async (match) => {
      const token = match[1];
      try {
        const res = await fetch(`/api/feishu-image/${token}`);
        if (!res.ok) return { original: match[0], replacement: match[0] };
        const blob = await res.blob();
        const compressed = await compressImage(blob, MAX_IMAGE_WIDTH, JPEG_QUALITY);
        return { original: match[0], replacement: `src="${compressed}"` };
      } catch {
        return { original: match[0], replacement: match[0] };
      }
    }),
  );

  let result = normalized;
  for (const { original, replacement } of replacements) {
    result = result.replace(original, replacement);
  }
  return result;
}

/** 下载所有图片（含飞书图片和外部 URL）并压缩为 data URI，避免适配器在后台下载外部图片失败 */
async function inlineAllImages(html: string): Promise<string> {
  const normalized = html.replace(/feishu-image:\/\/([\w]+)/g, "/api/feishu-image/$1");
  // 匹配所有 img 标签的 src（跳过已经是 data: 的）
  const regex = /src="(?!data:)([^"]+)"/g;
  const matches = Array.from(normalized.matchAll(regex));
  if (!matches.length) return normalized;

  const seen = new Set<string>();
  const replacements = await Promise.all(
    matches.map(async (match) => {
      const url = match[1];
      if (seen.has(url)) return { original: match[0], replacement: match[0] };
      seen.add(url);
      try {
        // 飞书图片用专用接口；外部图片用代理接口绕过 CORS
        const fetchUrl = url.startsWith("/api/feishu-image/")
          ? url
          : `/api/image-proxy?url=${encodeURIComponent(url)}`;
        const res = await fetch(fetchUrl);
        if (!res.ok) return { original: match[0], replacement: match[0] };
        const blob = await res.blob();
        if (!blob.type.startsWith("image/")) return { original: match[0], replacement: match[0] };
        const compressed = await compressImage(blob, MAX_IMAGE_WIDTH, JPEG_QUALITY);
        return { original: match[0], replacement: `src="${compressed}"` };
      } catch {
        return { original: match[0], replacement: match[0] };
      }
    }),
  );

  let result = normalized;
  for (const { original, replacement } of replacements) {
    if (original !== replacement) {
      result = result.split(original).join(replacement);
    }
  }
  return result;
}

/** 百家号专用：把所有图片改写成公开可访问的站内代理 URL，避免 data URI 被判异常 */
async function rewriteAllImagesToProxyUrls(html: string): Promise<string> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const normalized = html.replace(/feishu-image:\/\/([\w]+)/g, "/api/feishu-image/$1");
  return normalized.replace(/src="(?!data:)([^"]+)"/g, (_match, url: string) => {
    const absoluteUrl = url.startsWith("http://") || url.startsWith("https://")
      ? url
      : url.startsWith("/")
        ? `${origin}${url}`
        : `${origin}/${url}`;
    return `src="${origin}/api/image-proxy?url=${encodeURIComponent(absoluteUrl)}"`;
  });
}

/** 百家号专用：浏览器端下载图片转 data URI，失败的移除 img 标签避免适配器报错 */
async function inlineImagesSafe(html: string): Promise<string> {
  const normalized = html.replace(/feishu-image:\/\/([\w]+)/g, "/api/feishu-image/$1");
  const regex = /<img[^>]*\ssrc="(?!data:)([^"]+)"[^>]*>/gi;
  const matches = Array.from(normalized.matchAll(regex));
  if (!matches.length) return normalized;

  const seen = new Set<string>();
  const replacements = await Promise.all(
    matches.map(async (match) => {
      const fullMatch = match[0];
      const url = match[1];
      if (seen.has(url)) return { original: fullMatch, replacement: "" };
      seen.add(url);
      try {
        const fetchUrl = url.startsWith("/api/feishu-image/")
          ? url
          : `/api/image-proxy?url=${encodeURIComponent(url)}`;
        const res = await fetch(fetchUrl);
        if (!res.ok) return { original: fullMatch, replacement: "" };
        const blob = await res.blob();
        if (!blob.type.startsWith("image/")) return { original: fullMatch, replacement: "" };
        const compressed = await compressImage(blob, MAX_IMAGE_WIDTH, JPEG_QUALITY);
        return { original: fullMatch, replacement: fullMatch.replace(/src="[^"]*"/, `src="${compressed}"`) };
      } catch {
        return { original: fullMatch, replacement: "" };
      }
    }),
  );

  let result = normalized;
  for (const { original, replacement } of replacements) {
    if (original !== replacement) {
      result = result.replace(original, replacement);
    }
  }
  return result;
}

/** 用 Canvas 压缩图片：超过 maxWidth 等比缩放，输出 JPEG data URI */
function compressImage(blob: Blob, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(blob);
  });
}

/** 网易专用：将 HTML table 渲染成 PNG 图片，避免网易适配器把表格转纯文本 */
async function convertTablesToImages(html: string): Promise<string> {
  const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi;
  const tables = html.match(tableRegex) || [];
  if (!tables.length) return html;

  const replacements = await Promise.all(
    tables.map(async (tableHtml, index) => {
      try {
        const image = await tableToPng(tableHtml);
        return {
          original: tableHtml,
          replacement: `<p><img src="${image}" alt="表格 ${index + 1}" /></p>`,
        };
      } catch {
        return { original: tableHtml, replacement: tableHtml };
      }
    }),
  );

  let result = html;
  for (const { original, replacement } of replacements) {
    result = result.replace(original, replacement);
  }
  return result;
}

function tableToPng(tableHtml: string): Promise<string> {
  const rows = parseTable(tableHtml);
  if (!rows.length) return Promise.resolve("");

  const maxCols = Math.max(...rows.map((row) => row.length));
  const cellPaddingX = 18;
  const cellPaddingY = 12;
  const fontSize = 26;
  const lineHeight = 36;
  const minColWidth = 180;
  const maxColWidth = 300;
  const tableWidth = Math.min(1200, Math.max(640, maxCols * minColWidth));
  const colWidth = Math.min(maxColWidth, Math.floor(tableWidth / maxCols));

  const wrappedRows = rows.map((row) =>
    Array.from({ length: maxCols }, (_, colIndex) => wrapText(stripHtml(row[colIndex] || ""), 10))
  );
  const rowHeights = wrappedRows.map((row) =>
    Math.max(...row.map((lines) => Math.max(1, lines.length))) * lineHeight + cellPaddingY * 2
  );
  const width = colWidth * maxCols;
  const height = rowHeights.reduce((sum, item) => sum + item, 0);

  let y = 0;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
  ];

  wrappedRows.forEach((row, rowIndex) => {
    const rowHeight = rowHeights[rowIndex];
    let x = 0;
    row.forEach((lines, colIndex) => {
      const isHeader = rowIndex === 0;
      parts.push(`<rect x="${x}" y="${y}" width="${colWidth}" height="${rowHeight}" fill="${isHeader ? "#f6f8fa" : "#ffffff"}" stroke="#d9d9d9" stroke-width="1"/>`);
      lines.forEach((line, lineIndex) => {
        parts.push(`<text x="${x + cellPaddingX}" y="${y + cellPaddingY + fontSize + lineIndex * lineHeight}" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="${fontSize}" font-weight="${isHeader ? 700 : 400}" fill="#222222">${escapeXml(line)}</text>`);
      });
      x += colWidth;
    });
    y += rowHeight;
  });

  parts.push("</svg>");
  const svg = parts.join("");
  return svgToPng(svg, width, height);
}

function parseTable(tableHtml: string): string[][] {
  const rows: string[][] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const row: string[] = [];
    const cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      row.push(cellMatch[1]);
    }
    if (row.length) rows.push(row);
  }
  return rows;
}

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

function wrapText(text: string, maxChars: number): string[] {
  const normalized = text || " ";
  const lines: string[] = [];
  for (const paragraph of normalized.split(/\n+/)) {
    if (!paragraph) continue;
    for (let i = 0; i < paragraph.length; i += maxChars) {
      lines.push(paragraph.slice(i, i + maxChars));
    }
  }
  return lines.length ? lines : [" "];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function svgToPng(svg: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("表格转图片失败"));
    };
    img.src = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  });
}

export async function buildNeteaseDocxBlob(variant: PlatformVariant) {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: variant.title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 240 },
    }),
  ];

  if (variant.summary) {
    children.push(new Paragraph({
      children: [new TextRun({ text: variant.summary, color: "555555" })],
      spacing: { after: 240 },
    }));
  }

  children.push(...await markdownToDocxChildren(variant.bodyMarkdown));

  if (variant.tags.length) {
    children.push(new Paragraph({
      children: [new TextRun({ text: `标签：${variant.tags.join("、")}`, color: "666666" })],
      spacing: { before: 240 },
    }));
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  });

  return Packer.toBlob(doc);
}

async function markdownToDocxChildren(markdown: string): Promise<(Paragraph | Table)[]> {
  const tokens = marked.lexer(markdown) as any[];
  const children: (Paragraph | Table)[] = [];

  for (const token of tokens) {
    if (token.type === "heading") {
      children.push(new Paragraph({
        text: tokenText(token),
        heading: token.depth === 1 ? HeadingLevel.HEADING_1 : token.depth === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
      }));
      continue;
    }

    if (token.type === "paragraph") {
      const imageTokens = (token.tokens || []).filter((item: any) => item.type === "image");
      const text = stripMarkdownImages(tokenText(token));
      if (text.trim()) children.push(new Paragraph({ text, spacing: { after: 160 } }));
      for (const imageToken of imageTokens) {
        const imageParagraph = await imageTokenToParagraph(imageToken.href, imageToken.text || "");
        if (imageParagraph) children.push(imageParagraph);
      }
      continue;
    }

    if (token.type === "image") {
      const imageParagraph = await imageTokenToParagraph(token.href, token.text || "");
      if (imageParagraph) children.push(imageParagraph);
      continue;
    }

    if (token.type === "table") {
      children.push(markedTableToDocxTable(token));
      continue;
    }

    if (token.type === "list") {
      for (const item of token.items || []) {
        children.push(new Paragraph({
          text: tokenText(item),
          bullet: token.ordered ? undefined : { level: 0 },
          spacing: { after: 80 },
        }));
      }
      continue;
    }

    if (token.type === "blockquote") {
      children.push(new Paragraph({
        children: [new TextRun({ text: tokenText(token), italics: true, color: "666666" })],
        spacing: { before: 120, after: 120 },
      }));
      continue;
    }

    if (token.type === "code") {
      children.push(new Paragraph({
        children: [new TextRun({ text: token.text || "", font: "Consolas" })],
        spacing: { before: 120, after: 120 },
      }));
      continue;
    }

    if (token.type === "hr") {
      children.push(new Paragraph({ text: "", thematicBreak: true }));
      continue;
    }
  }

  return children;
}

function markedTableToDocxTable(token: any) {
  const rows = [token.header || [], ...(token.rows || [])];
  const maxCols = Math.max(1, ...rows.map((row: any[]) => row.length));
  const cellWidth = Math.floor(100 / maxCols);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((row: any[], rowIndex: number) => new TableRow({
      children: Array.from({ length: maxCols }, (_, index) => {
        const text = tokenText(row[index] || "");
        return new TableCell({
          width: { size: cellWidth, type: WidthType.PERCENTAGE },
          shading: rowIndex === 0 ? { fill: "F6F8FA" } : undefined,
          margins: { top: 120, bottom: 120, left: 160, right: 160 },
          borders: tableCellBorders(),
          children: [new Paragraph({
            children: [new TextRun({ text, bold: rowIndex === 0 })],
          })],
        });
      }),
    })),
  });
}

function tableCellBorders() {
  return {
    top: { style: BorderStyle.SINGLE, size: 1, color: "D9D9D9" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "D9D9D9" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "D9D9D9" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "D9D9D9" },
  };
}

async function imageTokenToParagraph(src: string, alt: string) {
  const data = await imageToDocxData(src);
  if (!data) return null;
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new ImageRun({
      type: "jpg",
      data: data.data,
      transformation: { width: data.width, height: data.height },
      altText: { title: alt || "图片", description: alt || "图片", name: alt || "图片" },
    })],
    spacing: { before: 160, after: 160 },
  });
}

async function imageToDocxData(src: string): Promise<{ data: Uint8Array; width: number; height: number } | null> {
  try {
    const normalizedSrc = src.replace(/feishu-image:\/\/([\w]+)/g, "/api/feishu-image/$1");
    const res = await fetch(normalizedSrc);
    if (!res.ok) return null;
    const blob = await res.blob();
    const compressed = await compressImageToDataUrl(blob, 640, 0.82);
    const bytes = dataUrlToUint8Array(compressed.dataUrl);
    return { data: bytes, width: compressed.width, height: compressed.height };
  } catch {
    return null;
  }
}

function compressImageToDataUrl(blob: Blob, maxWidth: number, quality: number): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve({ dataUrl: canvas.toDataURL("image/jpeg", quality), width, height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("图片处理失败"));
    };
    img.src = URL.createObjectURL(blob);
  });
}

function dataUrlToUint8Array(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function tokenText(token: any): string {
  if (!token) return "";
  if (typeof token === "string") return stripHtml(token);
  if (typeof token.text === "string") return stripHtml(token.text);
  if (Array.isArray(token.tokens)) return token.tokens.map(tokenText).join("");
  return "";
}

function stripMarkdownImages(text: string) {
  return text.replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim();
}

export async function buildNeteaseDocHtml(variant: PlatformVariant) {
  const bodyHtml = await inlineFeishuImages(marked.parse(variant.bodyMarkdown) as string);
  const tags = variant.tags.length ? `<p class="tags">标签：${variant.tags.join("、")}</p>` : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeXml(variant.title)}</title>
  <style>
    body { font-family: "Microsoft YaHei", Arial, sans-serif; line-height: 1.75; color: #222; font-size: 16px; }
    h1 { font-size: 26px; line-height: 1.4; margin: 0 0 18px; }
    h2 { font-size: 22px; margin: 28px 0 12px; }
    h3 { font-size: 18px; margin: 22px 0 10px; }
    p { margin: 12px 0; }
    img { max-width: 100%; height: auto; display: block; margin: 16px auto; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #d9d9d9; padding: 8px 12px; text-align: left; vertical-align: top; }
    th { background: #f6f8fa; font-weight: 700; }
    blockquote { margin: 16px 0; padding: 8px 16px; border-left: 4px solid #d9d9d9; color: #666; }
    code { font-family: Consolas, monospace; background: #f5f5f5; padding: 2px 4px; }
    pre { background: #f5f5f5; padding: 12px; overflow: auto; }
    .summary { color: #555; background: #f7f8fa; padding: 12px 16px; border-radius: 6px; }
    .tags { color: #666; }
  </style>
</head>
<body>
  <h1>${escapeXml(variant.title)}</h1>
  ${variant.summary ? `<p class="summary">${escapeXml(variant.summary)}</p>` : ""}
  ${bodyHtml}
  ${tags}
</body>
</html>`;
}

export function buildManualPublishText(variant: PlatformVariant) {
  const article = {
    title: variant.title,
    desc: variant.summary,
    summary: variant.summary,
    content: marked.parse(variant.bodyMarkdown) as string,
    html: marked.parse(variant.bodyMarkdown) as string,
    markdown: variant.bodyMarkdown,
    tags: variant.tags,
    draft: true,
    openDraft: true,
  };
  return `# ${variant.title}\n\n${variant.summary}\n\n${variant.bodyMarkdown}\n\n标签：${variant.tags.join("、")}\n\nWechatsync JSON：\n${JSON.stringify(article, null, 2)}`;
}

export async function syncVariantToDraft(variant: PlatformVariant) {
  const ready = await ensureWechatSyncBridge();
  if (!ready) {
    throw new Error("article-syncjs 未加载成功，已为你准备手动发布内容。");
  }

  const article = await buildWechatSyncArticle(variant);

  const result = await (window as WechatSyncWindow).syncPost!(article);
  return {
    taskId: result?.taskId,
    url: result?.draftUrl || result?.url,
    message: result?.message,
  };
}
