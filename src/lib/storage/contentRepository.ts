import type { ContentDetail, ContentItem, GeoOptimization, PlatformVariant, PublishRecord } from "@/types/geo";
import { readCollection, storeFiles, writeCollection } from "./jsonStore";

export async function getContentDetail(id: string): Promise<ContentDetail | null> {
  const [contents, geoOptimizations, variants, publishRecords] = await Promise.all([
    readCollection<ContentItem>(storeFiles.contents),
    readCollection<GeoOptimization>(storeFiles.geoOptimizations),
    readCollection<PlatformVariant>(storeFiles.platformVariants),
    readCollection<PublishRecord>(storeFiles.publishRecords),
  ]);

  const content = contents.find((item) => item.id === id);
  if (!content) return null;

  const geoOptimization = geoOptimizations
    .filter((item) => item.contentId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return {
    content,
    geoOptimization,
    variants: variants.filter((item) => item.contentId === id),
    publishRecords: publishRecords.filter((item) => item.contentId === id),
  };
}

export async function updateContent(content: ContentItem) {
  const contents = await readCollection<ContentItem>(storeFiles.contents);
  await writeCollection(
    storeFiles.contents,
    contents.map((item) => (item.id === content.id ? content : item)),
  );
}
