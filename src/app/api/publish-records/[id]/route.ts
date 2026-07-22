import { NextResponse } from "next/server";
import { readCollection, storeFiles, writeCollection } from "@/lib/storage/jsonStore";
import type { PublishRecord } from "@/types/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const payload = await request.json() as Partial<Pick<PublishRecord, "publishUrl" | "syncStatus" | "note" | "publishedAt" | "articleTitle">>;
  const records = await readCollection<PublishRecord>(storeFiles.publishRecords);
  const index = records.findIndex((r) => r.id === params.id);

  if (index < 0) {
    return NextResponse.json({ message: "记录不存在" }, { status: 404 });
  }

  records[index] = {
    ...records[index],
    publishUrl: payload.publishUrl ?? records[index].publishUrl,
    syncStatus: payload.syncStatus ?? records[index].syncStatus,
    note: payload.note ?? records[index].note,
    publishedAt: payload.publishedAt ?? records[index].publishedAt,
    articleTitle: payload.articleTitle ?? records[index].articleTitle,
  };

  await writeCollection(storeFiles.publishRecords, records);
  return NextResponse.json(records[index]);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const records = await readCollection<PublishRecord>(storeFiles.publishRecords);
  const target = records.find((r) => r.id === params.id);
  if (!target) {
    return NextResponse.json({ message: "记录不存在" }, { status: 404 });
  }

  await writeCollection(
    storeFiles.publishRecords,
    records.filter((r) => r.id !== params.id),
  );
  return NextResponse.json({ ok: true });
}
