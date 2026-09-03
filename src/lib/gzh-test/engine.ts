export type GzhTestThemeId = "moyu" | "redwhite" | "graphite" | "zen" | "ticket" | "olive";

export interface GzhTestTheme {
  name: string;
  tag: string;
  bg: string;
  light: string;
  main: string;
  dark: string;
  text: string;
  title: string;
  muted: string;
  line: string;
  radius: string;
  font: string;
  underline: string;
  cover: string;
  box: string;
}

export const GZH_TEST_THEMES: Record<GzhTestThemeId, GzhTestTheme> = {
  moyu: {
    name: "摸鱼绿", tag: "MOYU GREEN", bg: "#F3FAF5", light: "#EAF7EF", main: "#21A366", dark: "#10261B", text: "#3f4a42", title: "#172b21", muted: "#5d6f64", line: "#DCEFE3", radius: "14px", font: "-apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,Microsoft YaHei,sans-serif",
    underline: "border-bottom:2px solid rgba(33,163,102,.38);padding-bottom:1px;",
    cover: "border-bottom:1px solid #DCEFE3;",
    box: "background:#F3FAF5;border:1px solid #DCEFE3;border-left:4px solid #21A366;border-radius:12px;",
  },
  redwhite: {
    name: "红白色系", tag: "RED WHITE", bg: "#FFF5F5", light: "#FFF1F2", main: "#D92121", dark: "#7F1D1D", text: "#3f2a2a", title: "#1f1111", muted: "#7a5555", line: "#F3CACA", radius: "10px", font: "-apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,Microsoft YaHei,sans-serif",
    underline: "background:linear-gradient(transparent 62%,rgba(217,33,33,.18) 62%);padding:0 2px;",
    cover: "border-bottom:2px solid #D92121;",
    box: "background:#FFF5F5;border:1px solid #F3CACA;border-left:5px solid #D92121;border-radius:10px;",
  },
  graphite: {
    name: "石墨极简风", tag: "GRAPHITE MINIMAL", bg: "#F7F7F5", light: "#F2F2EF", main: "#2F3437", dark: "#111111", text: "#3D3D3A", title: "#111111", muted: "#74746F", line: "#DADAD5", radius: "4px", font: "-apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,Microsoft YaHei,sans-serif",
    underline: "border-bottom:1px solid #111111;padding-bottom:2px;",
    cover: "border-bottom:1px solid #111111;",
    box: "background:#F7F7F5;border:1px solid #DADAD5;border-radius:4px;",
  },
  zen: {
    name: "留白禅意风", tag: "ZEN SPACE", bg: "#FBFAF6", light: "#F6F3EA", main: "#8A6F48", dark: "#3D3327", text: "#4C463C", title: "#2D271F", muted: "#817765", line: "#E8E0D1", radius: "18px", font: "Georgia,Times New Roman,PingFang SC,Microsoft YaHei,serif",
    underline: "background:linear-gradient(transparent 70%,rgba(138,111,72,.22) 70%);padding:0 2px;",
    cover: "border-bottom:1px solid #E8E0D1;",
    box: "background:#FBFAF6;border:1px solid #E8E0D1;border-radius:18px;",
  },
  ticket: {
    name: "摸鱼票据风", tag: "TICKET STYLE", bg: "#FFFDF4", light: "#FFF7D6", main: "#D99A00", dark: "#4A3310", text: "#4a3b24", title: "#2a1d0a", muted: "#81673f", line: "#F1D99B", radius: "8px", font: "-apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,Microsoft YaHei,sans-serif",
    underline: "background:linear-gradient(transparent 60%,rgba(217,154,0,.22) 60%);padding:0 2px;",
    cover: "border:1px solid #F1D99B;border-radius:8px;padding:20px 16px;background:#FFFDF4;",
    box: "background:#FFFDF4;border:1px dashed #D99A00;border-radius:8px;",
  },
  olive: {
    name: "橄榄手记", tag: "OLIVE NOTES", bg: "#F7F7EF", light: "#EEF1E1", main: "#6B7D3A", dark: "#2F3A1E", text: "#454A38", title: "#242918", muted: "#70785A", line: "#DDE2C8", radius: "16px", font: "-apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,Microsoft YaHei,sans-serif",
    underline: "border-bottom:2px solid rgba(107,125,58,.35);padding-bottom:1px;",
    cover: "border-left:6px solid #6B7D3A;padding-left:16px;",
    box: "background:#F7F7EF;border:1px solid #DDE2C8;border-left:4px solid #6B7D3A;border-radius:16px;",
  },
};

export const GZH_TEST_THEME_OPTIONS: { id: GzhTestThemeId; label: string }[] = [
  { id: "moyu", label: "摸鱼绿｜教程 / 清单 / 工具盘点 / 方法论" },
  { id: "redwhite", label: "红白色系｜深度分析 / 观点 / 力量感话题" },
  { id: "graphite", label: "石墨极简风｜设计 / 科技评论 / 专业观点" },
  { id: "zen", label: "留白禅意风｜禅意 / 极简生活 / 深度随笔" },
  { id: "ticket", label: "摸鱼票据风｜工具对比 / 创意评测 / 票据视觉" },
  { id: "olive", label: "橄榄手记｜内刊手记 / 深度评测 / 案例复盘" },
];

export function isGzhTestThemeId(value: string): value is GzhTestThemeId {
  return value in GZH_TEST_THEMES;
}

function esc(s: string) {
  return String(s || "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m] as string));
}

function leaf(s: string) {
  return '<span leaf="">' + s + "</span>";
}

function inline(md: string, t: GzhTestTheme) {
  let s = esc(md);
  s = s.replace(/`([^`]+)`/g, (_m, a: string) => '<span style="padding:1px 6px;margin:0 2px;background:' + t.light + ';border:1px solid ' + t.line + ';border-radius:6px;color:' + t.dark + ';font-family:Menlo,Consolas,monospace;font-size:13px;">' + leaf(a) + "</span>");
  s = s.replace(/\*\*([^*]+)\*\*/g, (_m, a: string) => '<strong style="color:' + t.dark + ';">' + leaf(a) + "</strong>");
  s = s.replace(/==([^=]+)==/g, (_m, a: string) => '<span style="background:linear-gradient(transparent 64%,rgba(255,214,10,.36) 64%);">' + leaf(a) + "</span>");
  s = s.replace(/\+\+([^+]+)\+\+/g, (_m, a: string) => '<span style="' + t.underline + '">' + leaf(a) + "</span>");
  s = s.replace(/~~([^~]+)~~/g, (_m, a: string) => '<span style="background:linear-gradient(transparent 55%,rgba(255,214,10,.28) 55%);">' + leaf(a) + "</span>");
  if (!/<span|<strong/.test(s)) s = leaf(s);
  return s;
}

function autoMark(text: string, t: GzhTestTheme) {
  if (/[<>*`=+~]/.test(text)) return inline(text, t);
  const raw = text.trim();
  const picks: string[] = [];
  const rules = [
    /AI Agent|Agent|ChatGPT|DeepSeek|Claude|AstraFlow|Sandbox|CDC|Sidecar|VPN|SaaS|IAM|OA|ERP|MES|Runbook|Prompt|API/g,
    /沙箱隔离|权限引擎|权限判定|数据同步|数据不出域|终端零留存|持续验证|受控沙箱|轻量客户端|安全边界|预授权动作库|实时同步|增量流|方法论|核心结论|关键问题|增长策略|内容运营|用户需求|转化路径|案例复盘/g,
    /\d+(?:\.\d+)?(?:MB|GB|秒|毫秒|%|行|个|倍|万|亿)/g,
  ];
  rules.forEach((re) => {
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw)) && picks.length < 2) {
      if (m[0].length >= 2 && !picks.includes(m[0])) picks.push(m[0]);
    }
  });
  let html = esc(raw);
  picks.forEach((kw) => {
    const safe = esc(kw);
    html = html.replace(safe, '<span style="' + t.underline + '">' + leaf(safe) + "</span>");
  });
  if (!picks.length) html = leaf(html);
  return html;
}

function getTag(title: string) {
  if (/问题|痛点|困局/.test(title)) return "PAIN POINTS";
  if (/教程|步骤|操作|指南/.test(title)) return "TUTORIAL";
  if (/清单|工具|盘点/.test(title)) return "LIST";
  if (/架构|技术|系统/.test(title)) return "ARCHITECTURE";
  if (/案例|场景|实战/.test(title)) return "CASE STUDY";
  if (/对比|评测|测评/.test(title)) return "COMPARISON";
  if (/观点|思考|分析/.test(title)) return "THOUGHTS";
  if (/总结|结语|最后|写在最后/.test(title)) return "SUMMARY";
  return "SECTION";
}

function p(text: string, t: GzhTestTheme) {
  return '<p style="margin:0 0 16px;">' + autoMark(text, t) + "</p>";
}

function quote(text: string, t: GzhTestTheme) {
  return '<section style="margin:16px 0 18px;padding:14px 16px;' + t.box + '"><p style="margin:0;color:' + t.text + ';">' + autoMark(text, t) + "</p></section>";
}

function listItem(text: string, t: GzhTestTheme, themeId: GzhTestThemeId) {
  if (themeId === "ticket") {
    return '<section style="margin:0 0 10px;padding:10px 12px;background:' + t.bg + ';border:1px dashed ' + t.line + ';border-radius:' + t.radius + ';"><p style="margin:0;"><span style="color:' + t.main + ';font-weight:700;">' + leaf("CHECK") + '</span><span leaf="">　</span>' + autoMark(text, t) + "</p></section>";
  }
  return '<p style="margin:0 0 12px;"><span style="color:' + t.main + ';font-weight:700;">' + leaf("·") + '</span><span leaf="">　</span>' + autoMark(text, t) + "</p>";
}

function codeBlock(code: string, t: GzhTestTheme) {
  const lines = esc(code).split("\n").map((l) => '<p style="margin:0;line-height:1.6;font-family:Menlo,Consolas,monospace;font-size:12px;color:#E5E7EB;">' + leaf(l || " ") + "</p>").join("");
  return '<section style="margin:18px 0 20px;padding:14px;background:' + t.dark + ';border-radius:' + t.radius + ';box-shadow:0 8px 22px rgba(0,0,0,.12);"><p style="margin:0 0 8px;"><span style="font-size:12px;letter-spacing:2px;color:' + t.main + ';">' + leaf("CODE") + "</span></p>" + lines + "</section>";
}

function imageBlock(alt: string, url: string, t: GzhTestTheme) {
  const cap = alt ? '<p style="margin:8px 0 0;text-align:center;color:' + t.muted + ';font-size:13px;">' + leaf(esc(alt)) + "</p>" : "";
  return '<section style="margin:18px 0;"><img src="' + esc(url) + '" style="max-width:100%;height:auto;display:block;margin:0 auto;border-radius:' + t.radius + ';">' + cap + "</section>";
}

function tableBlock(header: string[], rows: string[][], t: GzhTestTheme) {
  const ths = header.map((c) =>
    '<th style="border:1px solid ' + t.line + ";padding:8px 12px;font-size:14px;font-weight:700;color:" + t.title + ";background:" + t.light + ";text-align:left;\">" + leaf(inline(c, t)) + "</th>"
  ).join("");
  const trs = rows.map((row) => {
    const tds = row.map((c) =>
      '<td style="border:1px solid ' + t.line + ";padding:8px 12px;font-size:14px;color:" + t.text + ";text-align:left;\">" + leaf(inline(c, t)) + "</td>"
    ).join("");
    return "<tr>" + tds + "</tr>";
  }).join("");
  return '<section style="margin:18px 0;overflow-x:auto;"><table style="border-collapse:collapse;width:100%;font-family:' + t.font + ';"><thead><tr>' + ths + "</tr></thead><tbody>" + trs + "</tbody></table></section>";
}

function subTitle(text: string, t: GzhTestTheme, themeId: GzhTestThemeId) {
  if (themeId === "graphite") {
    return '<p style="margin:20px 0 10px;padding-left:10px;border-left:3px solid ' + t.main + ';font-weight:700;color:' + t.title + ';">' + leaf(esc(text)) + "</p>";
  }
  return '<p style="margin:18px 0 10px;"><span style="display:inline-block;padding:3px 11px;background:' + t.light + ';border:1px solid ' + t.line + ';color:' + t.dark + ';border-radius:999px;font-size:13px;">' + leaf(esc(text)) + "</span></p>";
}

function chapter(n: number, title: string, t: GzhTestTheme, themeId: GzhTestThemeId) {
  const num = String(n).padStart(2, "0");
  const tag = getTag(title);
  if (themeId === "redwhite") {
    return '<section style="margin:36px 0 14px;padding:12px 0;border-top:2px solid ' + t.main + ';"><p style="margin:0 0 6px;"><span style="font-size:12px;letter-spacing:2px;color:' + t.main + ';">' + leaf(num + " · " + tag) + '</span></p><h3 style="margin:0;font-size:22px;line-height:1.55;color:' + t.title + ';font-weight:900;">' + leaf(esc(title)) + "</h3></section>";
  }
  if (themeId === "graphite") {
    return '<section style="margin:38px 0 16px;"><p style="margin:0 0 8px;color:' + t.muted + ';font-size:12px;letter-spacing:2px;">' + leaf(num + " / " + tag) + '</p><h3 style="margin:0;font-size:23px;line-height:1.5;color:' + t.title + ';font-weight:800;">' + leaf(esc(title)) + "</h3></section>";
  }
  if (themeId === "zen") {
    return '<section style="margin:44px 0 20px;text-align:center;"><p style="margin:0 0 10px;color:' + t.main + ';font-size:13px;">' + leaf("— " + num + " —") + '</p><h3 style="margin:0;font-size:22px;line-height:1.7;color:' + t.title + ';font-weight:700;">' + leaf(esc(title)) + "</h3></section>";
  }
  if (themeId === "ticket") {
    return '<section style="margin:34px 0 14px;padding:14px;background:' + t.bg + ';border:1px dashed ' + t.main + ';border-radius:' + t.radius + ';"><p style="margin:0 0 6px;color:' + t.main + ';font-size:12px;letter-spacing:2px;">' + leaf("NO." + num + " · " + tag) + '</p><h3 style="margin:0;font-size:21px;line-height:1.55;color:' + t.title + ';font-weight:800;">' + leaf(esc(title)) + "</h3></section>";
  }
  if (themeId === "olive") {
    return '<section style="margin:34px 0 14px;padding-left:14px;border-left:4px solid ' + t.main + ';"><p style="margin:0 0 6px;color:' + t.main + ';font-size:12px;letter-spacing:2px;">' + leaf(num + " · " + tag) + '</p><h3 style="margin:0;font-size:21px;line-height:1.6;color:' + t.title + ';font-weight:800;">' + leaf(esc(title)) + "</h3></section>";
  }
  return '<section style="margin:34px 0 14px;"><p style="margin:0 0 6px;"><span style="font-size:12px;letter-spacing:2px;color:' + t.main + ';">' + leaf(num + " · " + tag) + '</span></p><h3 style="margin:0;font-size:21px;line-height:1.6;color:' + t.title + ';font-weight:800;">' + leaf(esc(title)) + "</h3></section>";
}

function guide(heads: string[], t: GzhTestTheme) {
  if (!heads.length) return "";
  const items = heads.slice(0, 3).map((h, i) => '<p style="margin:0 0 8px;"><span style="color:' + t.main + ';font-weight:700;">' + leaf(String(i + 1).padStart(2, "0")) + '</span><span leaf="">　</span>' + autoMark(h, t) + "</p>").join("");
  return '<section style="margin:18px 0 6px;padding:16px;background:' + t.light + ';border:1px solid ' + t.line + ';border-radius:' + t.radius + ';"><p style="margin:0 0 10px;"><span style="font-size:13px;color:' + t.main + ';letter-spacing:2px;">' + leaf("READING GUIDE · 精选看点") + "</span></p>" + items + "</section>";
}

function cover(title: string, author: string, t: GzhTestTheme) {
  return '<section style="padding:28px 0 18px;' + t.cover + '"><p style="margin:0 0 10px;"><span style="font-size:13px;color:' + t.main + ';letter-spacing:2px;">' + leaf(t.tag + " · GZH DESIGN") + '</span></p><h3 style="margin:0;font-size:26px;line-height:1.5;color:' + t.title + ';font-weight:800;">' + leaf(esc(title)) + "</h3></section>"
    + '<section style="margin:18px 0 8px;padding:16px 16px 14px;' + t.box + '"><p style="margin:0;color:' + t.muted + ';font-size:14px;line-height:1.8;">' + leaf("作者：" + author) + "</p></section>";
}

function sign(author: string, t: GzhTestTheme) {
  return '<section style="margin:26px 0 8px;padding:18px 16px;background:' + t.dark + ';border-radius:' + t.radius + ';"><p style="margin:0 0 10px;color:#F9FAFB;"><span leaf="">我是 </span><strong style="color:' + t.main + ';">' + leaf(esc(author)) + '</strong><span leaf="">，{{一句话简介}}</span></p><p style="margin:0;color:#F9FAFB;"><span leaf="">如果你觉得今天这篇有收获，欢迎</span><strong style="color:' + t.main + ';">' + leaf("点赞、在看、转发") + '</strong><span leaf="">三连，我们下篇见。</span></p></section>';
}

interface Block {
  type: "p" | "h2" | "h3" | "quote" | "li" | "code" | "img" | "hr" | "table";
  text?: string;
  n?: number;
  alt?: string;
  url?: string;
  rows?: string[][];
  header?: string[];
}

function parse(md: string, titleOverride: string) {
  const lines = String(md || "").replace(/\r\n/g, "\n").split("\n");
  let title = titleOverride.trim();
  const blocks: Block[] = [];
  let buf: string[] = [];
  let inCode = false;
  let code: string[] = [];
  const heads: string[] = [];
  let sec = 0;

  function flush() {
    if (buf.length) {
      blocks.push({ type: "p", text: buf.join(" ").trim() });
      buf = [];
    }
  }
  function isTableRow(l: string) {
    const trimmed = l.trim();
    return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.length > 2;
  }
  function parseTableRow(l: string): string[] {
    return l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  }
  function isTableSeparator(l: string) {
    return /^\|[\s:-]+\|/.test(l.trim()) && l.trim().split("|").every((c) => /^[\s:|-]+$/.test(c));
  }
  let tableBuf: string[] = [];
  function flushTable() {
    if (tableBuf.length < 2) {
      tableBuf.forEach((tl) => buf.push(tl.trim()));
      tableBuf = [];
      return;
    }
    const header = parseTableRow(tableBuf[0]);
    const rows = tableBuf.slice(tableBuf[1].trim().match(/^[\s:|-]+$/) ? 2 : 1).map(parseTableRow);
    blocks.push({ type: "table", header, rows });
    tableBuf = [];
  }

  for (const l of lines) {
    if (l.trim().startsWith("```")) {
      if (!inCode) { flush(); inCode = true; code = []; }
      else { blocks.push({ type: "code", text: code.join("\n") }); inCode = false; }
      continue;
    }
    if (inCode) { code.push(l); continue; }
    if (isTableRow(l)) {
      if (!tableBuf.length) flush();
      tableBuf.push(l);
      continue;
    } else if (tableBuf.length) {
      flushTable();
    }
    if (!l.trim()) { flush(); continue; }

    let m: RegExpMatchArray | null;
    if ((m = l.match(/^#\s+(.+)/))) {
      if (!title) title = m[1].trim();
      continue;
    }
    if ((m = l.match(/^##\s+(.+)/))) {
      flush();
      heads.push(m[1].trim());
      blocks.push({ type: "h2", text: m[1].trim(), n: ++sec });
      continue;
    }
    if ((m = l.match(/^###\s+(.+)/))) {
      flush();
      blocks.push({ type: "h3", text: m[1].trim() });
      continue;
    }
    if ((m = l.match(/^>\s*(.+)/))) {
      flush();
      blocks.push({ type: "quote", text: m[1].trim() });
      continue;
    }
    if ((m = l.match(/^!\[(.*?)\]\((.*?)\)/))) {
      flush();
      blocks.push({ type: "img", alt: m[1].trim(), url: m[2].trim() });
      continue;
    }
    if ((m = l.match(/^[-*]\s+(.+)/))) {
      flush();
      blocks.push({ type: "li", text: m[1].trim() });
      continue;
    }
    if ((m = l.match(/^\d+[.)、]\s+(.+)/))) {
      flush();
      blocks.push({ type: "li", text: m[1].trim() });
      continue;
    }
    if (/^-{3,}$/.test(l.trim()) || /^\*{3,}$/.test(l.trim())) {
      flush();
      blocks.push({ type: "hr" });
      continue;
    }
    buf.push(l.trim());
  }
  flush();
  if (tableBuf.length) flushTable();
  return { title: title || "未命名文章", heads, blocks };
}

export interface GzhTestRenderOptions {
  markdown: string;
  themeId: GzhTestThemeId;
  title?: string;
  author?: string;
}

export function renderGzhTestArticle(options: GzhTestRenderOptions): string {
  const t = GZH_TEST_THEMES[options.themeId] || GZH_TEST_THEMES.moyu;
  const data = parse(options.markdown, options.title || "");
  const author = (options.author || "").trim() || "{{作者名}}";

  let html = '<section style="max-width:677px;margin:0 auto;padding:0 12px;color:' + t.text + ';font-size:16px;line-height:1.9;font-family:' + t.font + ';letter-spacing:.2px;">';

  html += cover(data.title, author, t);
  html += guide(data.heads, t);

  data.blocks.forEach((b) => {
    if (b.type === "h2") html += chapter(b.n || 0, b.text || "", t, options.themeId);
    else if (b.type === "h3") html += subTitle(b.text || "", t, options.themeId);
    else if (b.type === "quote") html += quote(b.text || "", t);
    else if (b.type === "li") html += listItem(b.text || "", t, options.themeId);
    else if (b.type === "code") html += codeBlock(b.text || "", t);
    else if (b.type === "img") html += imageBlock(b.alt || "", b.url || "", t);
    else if (b.type === "hr") html += '<section style="margin:28px auto;width:42px;border-top:1px solid ' + t.line + ';"></section>';
    else if (b.type === "table") html += tableBlock(b.header || [], b.rows || [], t);
    else html += p(b.text || "", t);
  });

  html += sign(author, t);
  html += "</section>";

  return html;
}
