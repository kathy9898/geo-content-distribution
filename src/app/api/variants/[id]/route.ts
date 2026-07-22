import { NextResponse } from "next/server";
import { readCollection, storeFiles, writeCollection } from "@/lib/storage/jsonStore";
import type { PlatformVariant, ReviewStatus } from "@/types/geo";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const payload = await request.json() as Partial<Pick<PlatformVariant, "title" | "summary" | "bodyMarkdown" | "tags" | "reviewStatus">>;
  const variants = await readCollection<PlatformVariant>(storeFiles.platformVariants);
  const index = variants.findIndex((item) => item.id === params.id);

  if (index < 0) {
    return NextResponse.json({ message: "平台版本不存在" }, { status: 404 });
  }

  const reviewStatus = payload.reviewStatus as ReviewStatus | undefined;
  variants[index] = {
    ...variants[index],
    title: payload.title ?? variants[index].title,
    summary: payload.summary ?? variants[index].summary,
    bodyMarkdown: payload.bodyMarkdown ?? variants[index].bodyMarkdown,
    tags: Array.isArray(payload.tags) ? payload.tags : variants[index].tags,
    reviewStatus: reviewStatus ?? variants[index].reviewStatus,
    updatedAt: new Date().toISOString(),
  };

  await writeCollection(storeFiles.platformVariants, variants);
  return NextResponse.json(variants[index]);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const variants = await readCollection<PlatformVariant>(storeFiles.platformVariants);
  const index = variants.findIndex((item) => item.id === params.id);

  if (index < 0) {
    return NextResponse.json({ message: "平台版本不存在" }, { status: 404 });
  }

  variants.splice(index, 1);
  await writeCollection(storeFiles.platformVariants, variants);
  return NextResponse.json({ message: "已删除" });
}
