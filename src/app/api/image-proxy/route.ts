import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  const format = new URL(request.url).searchParams.get("format");
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ message: "缺少 url 参数" }, { status: 400 });
  }

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ message: `图片下载失败(${response.status})` }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ message: "非图片类型" }, { status: 415 });
    }

    let buffer = Buffer.from(await response.arrayBuffer());
    if (format === "jpg") {
      buffer = await sharp(buffer).rotate().jpeg({ quality: 85 }).toBuffer();
    }
    const outputContentType = format === "jpg" ? "image/jpeg" : contentType;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": outputContentType,
        "Cache-Control": "public, max-age=86400",
        "Content-Length": String(buffer.length),
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "图片代理失败";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
