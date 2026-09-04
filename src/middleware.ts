import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isAuthEnabled, verifySessionValue } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

const PUBLIC_PREFIXES = ["/api/feishu-image/", "/api/image-proxy"];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|map)$/)
  );
}

export async function middleware(request: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const isAuthed = await verifySessionValue(request.cookies.get(SESSION_COOKIE)?.value);
  if (isAuthed) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ message: "未登录" }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
