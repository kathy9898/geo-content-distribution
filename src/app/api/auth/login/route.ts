import { NextResponse } from "next/server";
import { SESSION_COOKIE, createSessionValue, isAuthEnabled, sessionCookieOptions } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ message: "未开启访问密码，请配置 APP_ACCESS_PASSWORD 和 APP_SESSION_SECRET" }, { status: 500 });
  }

  const { password } = await request.json() as { password?: string };
  if (!password || password !== process.env.APP_ACCESS_PASSWORD) {
    return NextResponse.json({ message: "访问密码不正确" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSessionValue(), sessionCookieOptions);
  return response;
}
