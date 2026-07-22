import { feishuGet } from "./client";

interface FeishuWikiNode {
  node: {
    token: string;
    obj_token: string;
    obj_type: string;
    title?: string;
  };
}

interface FeishuDocxBlockList {
  has_more: boolean;
  page_token?: string;
  items: FeishuBlock[];
}

interface FeishuTextElement {
  text_run?: { content?: string };
  equation?: { content?: string };
  inline_file?: { token?: string };
  mention_user?: { user_id?: string };
  mention_doc?: { title?: string; url?: string };
  reminder?: { create_user_id?: string };
}

interface FeishuBlock {
  block_id: string;
  block_type: number;
  parent_id?: string;
  children?: string[];
  text?: { elements?: FeishuTextElement[]; style?: unknown };
  heading1?: { elements?: FeishuTextElement[] };
  heading2?: { elements?: FeishuTextElement[] };
  heading3?: { elements?: FeishuTextElement[] };
  heading4?: { elements?: FeishuTextElement[] };
  heading5?: { elements?: FeishuTextElement[] };
  heading6?: { elements?: FeishuTextElement[] };
  bullet?: { elements?: FeishuTextElement[] };
  ordered?: { elements?: FeishuTextElement[] };
  todo?: { elements?: FeishuTextElement[] };
  quote?: { elements?: FeishuTextElement[] };
  code?: { elements?: FeishuTextElement[]; style?: { language?: number } };
  image?: { token?: string };
  table?: { cells?: string[] };
  table_cell?: { elements?: FeishuTextElement[] };
}

const BLOCK_TYPE = {
  page: 1,
  text: 2,
  heading1: 3,
  heading2: 4,
  heading3: 5,
  heading4: 6,
  heading5: 7,
  heading6: 8,
  bullet: 12,
  ordered: 13,
  code: 14,
  quote: 15,
  todo: 17,
  image: 27,
  table: 31,
  tableCell: 32,
};

export function parseFeishuDocToken(input: string) {
  const trimmed = input.trim();
  const wikiMatch = trimmed.match(/\/wiki\/([A-Za-z0-9]+)/);
  if (wikiMatch?.[1]) return { type: "wiki" as const, token: wikiMatch[1] };
  const docMatch = trimmed.match(/\/(docx|doc)\/([A-Za-z0-9]+)/);
  if (docMatch?.[2]) return { type: docMatch[1] as "docx" | "doc", token: docMatch[2] };
  if (/^[A-Za-z0-9]+$/.test(trimmed)) return { type: "docx" as const, token: trimmed };
  throw new Error("无法从飞书链接中解析文档 token，请确认链接格式类似 https://xxx.feishu.cn/docx/xxxx 或 https://xxx.feishu.cn/wiki/xxxx");
}

function plainText(elements?: FeishuTextElement[]) {
  return (elements || [])
    .map((element) => {
      if (element.text_run?.content) return element.text_run.content;
      if (element.equation?.content) return element.equation.content;
      if (element.mention_doc?.title) return element.mention_doc.url ? `[${element.mention_doc.title}](${element.mention_doc.url})` : element.mention_doc.title;
      if (element.mention_user?.user_id) return `@${element.mention_user.user_id}`;
      if (element.inline_file?.token) return `[附件:${element.inline_file.token}]`;
      return "";
    })
    .join("")
    .trim();
}

function blockText(block: FeishuBlock) {
  return plainText(
    block.text?.elements ||
    block.heading1?.elements ||
    block.heading2?.elements ||
    block.heading3?.elements ||
    block.heading4?.elements ||
    block.heading5?.elements ||
    block.heading6?.elements ||
    block.bullet?.elements ||
    block.ordered?.elements ||
    block.todo?.elements ||
    block.quote?.elements ||
    block.code?.elements ||
    block.table_cell?.elements,
  );
}

async function listDocBlocks(documentId: string) {
  const blocks: FeishuBlock[] = [];
  let pageToken: string | undefined;

  do {
    const data = await feishuGet<FeishuDocxBlockList>(
      `/open-apis/docx/v1/documents/${documentId}/blocks`,
      { page_size: 500, page_token: pageToken },
    );
    blocks.push(...(data.items || []));
    pageToken = data.has_more ? data.page_token : undefined;
  } while (pageToken);

  return blocks;
}

function blocksToMarkdown(blocks: FeishuBlock[]) {
  const byId = new Map(blocks.map((block) => [block.block_id, block]));
  const childIds = new Set(blocks.flatMap((block) => block.children || []));
  const roots = blocks.filter((block) => !childIds.has(block.block_id));
  const lines: string[] = [];
  const titleCandidates: string[] = [];

  function render(block: FeishuBlock, depth = 0) {
    const text = blockText(block);
    switch (block.block_type) {
      case BLOCK_TYPE.page:
        if (text) titleCandidates.push(text);
        break;
      case BLOCK_TYPE.heading1:
        if (text) { lines.push(`# ${text}`); titleCandidates.push(text); }
        break;
      case BLOCK_TYPE.heading2:
        if (text) lines.push(`## ${text}`);
        break;
      case BLOCK_TYPE.heading3:
        if (text) lines.push(`### ${text}`);
        break;
      case BLOCK_TYPE.heading4:
        if (text) lines.push(`#### ${text}`);
        break;
      case BLOCK_TYPE.heading5:
        if (text) lines.push(`##### ${text}`);
        break;
      case BLOCK_TYPE.heading6:
        if (text) lines.push(`###### ${text}`);
        break;
      case BLOCK_TYPE.bullet:
        if (text) lines.push(`${"  ".repeat(depth)}- ${text}`);
        break;
      case BLOCK_TYPE.ordered:
        if (text) lines.push(`${"  ".repeat(depth)}1. ${text}`);
        break;
      case BLOCK_TYPE.todo:
        if (text) lines.push(`${"  ".repeat(depth)}- [ ] ${text}`);
        break;
      case BLOCK_TYPE.quote:
        if (text) lines.push(`> ${text}`);
        break;
      case BLOCK_TYPE.code:
        if (text) lines.push(`\`\`\`\n${text}\n\`\`\``);
        break;
      case BLOCK_TYPE.image:
        if (block.image?.token) lines.push(`![飞书图片:${block.image.token}](/api/feishu-image/${block.image.token})`);
        break;
      case BLOCK_TYPE.table:
        if (block.children?.length) lines.push("\n<!-- 飞书表格内容已按单元格顺序展开 -->");
        break;
      case BLOCK_TYPE.tableCell:
        if (text) lines.push(`| ${text} |`);
        break;
      case BLOCK_TYPE.text:
      default:
        if (text) lines.push(text);
        break;
    }

    (block.children || [])
      .map((id) => byId.get(id))
      .filter((item): item is FeishuBlock => Boolean(item))
      .forEach((child) => render(child, block.block_type === BLOCK_TYPE.bullet || block.block_type === BLOCK_TYPE.ordered ? depth + 1 : depth));
  }

  roots.forEach((block) => render(block));
  const body = lines.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
  const title = titleCandidates[0] || body.split("\n").find(Boolean)?.replace(/^#+\s*/, "").slice(0, 80) || "飞书导入文章";
  return { title, body };
}

interface FeishuDocumentInfo {
  document: {
    document_id: string;
    title?: string;
  };
}

async function getDocxTitle(documentId: string): Promise<string | undefined> {
  try {
    const data = await feishuGet<FeishuDocumentInfo>(
      `/open-apis/docx/v1/documents/${documentId}`,
    );
    return data.document?.title || undefined;
  } catch {
    return undefined;
  }
}

async function resolveDocument(input: string) {
  const parsed = parseFeishuDocToken(input);
  if (parsed.type !== "wiki") {
    // 对于非 wiki 文档，也从文档 API 获取标题
    const docTitle = await getDocxTitle(parsed.token);
    return { documentId: parsed.token, title: docTitle, sourceType: parsed.type };
  }

  const data = await feishuGet<FeishuWikiNode>(`/open-apis/wiki/v2/spaces/get_node`, { token: parsed.token });
  const node = data.node;
  if (!node?.obj_token) {
    throw new Error("飞书知识库节点未返回 obj_token，请确认链接有效且应用有知识库读取权限。 ");
  }
  if (node.obj_type !== "docx") {
    throw new Error(`当前知识库节点类型是 ${node.obj_type}，MVP 暂只支持 docx 文档。 `);
  }
  // wiki 文档优先用 wiki 节点标题，若为空则尝试从文档 API 获取
  const title = node.title || (await getDocxTitle(node.obj_token));
  return { documentId: node.obj_token, title, sourceType: "wiki" };
}

export async function importFeishuDoc(input: string) {
  const resolved = await resolveDocument(input);
  const blocks = await listDocBlocks(resolved.documentId);
  if (!blocks.length) {
    throw new Error("飞书文档没有读取到内容，请确认应用已获得文档读取权限。 ");
  }
  const markdown = blocksToMarkdown(blocks);
  // 优先使用飞书 API 返回的文档标题（wiki 节点标题 / 文档 API 标题），
  // 其次使用从文档内容中提取的标题（Page 块、H1、首行），
  // 最后兜底为 "飞书导入文章"
  const title = resolved.title || markdown.title;
  return {
    documentId: resolved.documentId,
    sourceType: resolved.sourceType,
    title,
    body: markdown.body,
  };
}
