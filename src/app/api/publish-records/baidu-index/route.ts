import { NextRequest, NextResponse } from "next/server";
import { readCollection, writeCollection, storeFiles } from "@/lib/storage/jsonStore";
import type { PublishRecord } from "@/types/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

function extractUrl(line: string): string | null {
  const full = line.match(/https?:\/\/[^\s,，;；。）)】\]"'<>]+/i);
  if (full) return full[0];
  // 兜底：iis7 导出有时会省略协议头
  const bare = line.match(/(?:^|[\s,，;；])([a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s,，;；。）)】\]"'<>]*)?)/i);
  if (bare && /\.(com|cn|net|org|io|dev|me|cc|tv)/i.test(bare[1])) return bare[1];
  return null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text : "";
  if (!text.trim()) {
    return NextResponse.json({ message: "请粘贴 iis7 导出的查询结果" }, { status: 400 });
  }

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const unmatched: string[] = [];
  const unparsed: string[] = [];
  const urlStatus = new Map<string, boolean>();

  for (const line of lines) {
    // 跳过 iis7 导出的表头（"查询的URL,百度是否收录"）
    if (/查询的？\s*URL/i.test(line) || (line.includes("是否收录") && !/\.[a-z]{2,}/i.test(line))) continue;
    const url = extractUrl(line);
    if (!url) {
      unparsed.push(line);
      continue;
    }
    if (line.includes("未收录")) {
      urlStatus.set(normalizeUrl(url), false);
    } else if (line.includes("已收录") || line.includes("收录")) {
      urlStatus.set(normalizeUrl(url), true);
    } else {
      unparsed.push(line);
    }
  }

  const records = await readCollection<PublishRecord>(storeFiles.publishRecords);
  const checkedAt = new Date().toISOString();
  const matchedRecordIds = new Set<string>();

  const updatedRecords = records.map((record) => {
    const key = normalizeUrl(record.publishUrl || "");
    if (!key || !urlStatus.has(key)) return record;
    matchedRecordIds.add(record.id);
    return { ...record, baiduIndexed: urlStatus.get(key), baiduCheckedAt: checkedAt };
  });

  if (matchedRecordIds.size > 0) {
    await writeCollection(storeFiles.publishRecords, updatedRecords);
  }

  urlStatus.forEach((_status, key) => {
    const found = records.some((r) => normalizeUrl(r.publishUrl || "") === key);
    if (!found) unmatched.push(key);
  });

  return NextResponse.json({
    updated: matchedRecordIds.size,
    parsed: urlStatus.size,
    unmatched,
    unparsed,
    checkedAt,
  });
}
