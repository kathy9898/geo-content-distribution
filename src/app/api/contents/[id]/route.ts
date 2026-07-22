import { NextResponse } from "next/server";
import { getContentDetail } from "@/lib/storage/contentRepository";
import { readCollection, storeFiles, writeCollection } from "@/lib/storage/jsonStore";
import type { ContentItem, GeoOptimization, PlatformVariant, PublishRecord } from "@/types/geo";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const detail = await getContentDetail(params.id);
  if (!detail) {
    return NextResponse.json({ message: "内容不存在" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const contents = await readCollection<ContentItem>(storeFiles.contents);
    const index = contents.findIndex((item) => item.id === params.id);
    if (index === -1) {
      return NextResponse.json({ message: "内容不存在" }, { status: 404 });
    }

    const payload = await request.json() as Partial<Pick<ContentItem, "title" | "body" | "brandName" | "keywords" | "targetAudience" | "references" | "callToAction">>;

    const updated: ContentItem = {
      ...contents[index],
      title: payload.title ?? contents[index].title,
      body: payload.body ?? contents[index].body,
      brandName: payload.brandName ?? contents[index].brandName,
      keywords: payload.keywords ?? contents[index].keywords,
      targetAudience: payload.targetAudience ?? contents[index].targetAudience,
      references: payload.references ?? contents[index].references,
      callToAction: payload.callToAction ?? contents[index].callToAction,
      updatedAt: new Date().toISOString(),
    };

    await writeCollection(
      storeFiles.contents,
      contents.map((item) => (item.id === params.id ? updated : item)),
    );

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "保存失败" },
      { status: 500 },
    );
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const contents = await readCollection<ContentItem>(storeFiles.contents);
    const target = contents.find((item) => item.id === params.id);
    if (!target) {
      return NextResponse.json({ message: "内容不存在" }, { status: 404 });
    }

    await writeCollection(storeFiles.contents, contents.filter((item) => item.id !== params.id));

    const geos = await readCollection<GeoOptimization>(storeFiles.geoOptimizations);
    await writeCollection(storeFiles.geoOptimizations, geos.filter((item) => item.contentId !== params.id));

    const variants = await readCollection<PlatformVariant>(storeFiles.platformVariants);
    await writeCollection(storeFiles.platformVariants, variants.filter((item) => item.contentId !== params.id));

    const records = await readCollection<PublishRecord>(storeFiles.publishRecords);
    await writeCollection(storeFiles.publishRecords, records.filter((item) => item.contentId !== params.id));

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "删除失败" },
      { status: 500 },
    );
  }
}
