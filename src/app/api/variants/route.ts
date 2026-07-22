import { NextResponse } from "next/server";
import { readCollection, storeFiles } from "@/lib/storage/jsonStore";
import type { PlatformVariant } from "@/types/geo";

export const runtime = "nodejs";

export async function GET() {
  const variants = await readCollection<PlatformVariant>(storeFiles.platformVariants);
  return NextResponse.json(
    variants
      .filter((item) => item.reviewStatus !== "published")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
}
