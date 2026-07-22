import { NextResponse } from "next/server";
import { getTenantAccessToken } from "@/lib/feishu/client";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  try {
    const accessToken = await getTenantAccessToken();
    const url = `https://open.feishu.cn/open-apis/drive/v1/medias/${params.token}/download`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      let msg = response.statusText;
      try { const json = JSON.parse(text); msg = json.msg || msg; } catch {}
      throw new Error(`飞书图片下载失败(${response.status})：${msg}`);
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Content-Length": String(buffer.length),
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "图片获取失败";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}