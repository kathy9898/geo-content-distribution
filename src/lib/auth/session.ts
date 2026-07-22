export const SESSION_COOKIE = "geo_session";
const SESSION_PAYLOAD = "geo-content-distribution";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function base64UrlFromBytes(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64UrlFromBytes(new Uint8Array(signature));
}

export function isAuthEnabled() {
  return Boolean(process.env.APP_ACCESS_PASSWORD && process.env.APP_SESSION_SECRET);
}

export async function createSessionValue() {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) throw new Error("缺少 APP_SESSION_SECRET");
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `${SESSION_PAYLOAD}.${issuedAt}`;
  return `${payload}.${await sign(payload, secret)}`;
}

export async function verifySessionValue(value?: string) {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret || !value) return false;

  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  if (parts[0] !== SESSION_PAYLOAD) return false;

  const issuedAt = Number(parts[1]);
  if (!Number.isFinite(issuedAt)) return false;
  if (Math.floor(Date.now() / 1000) - issuedAt > MAX_AGE_SECONDS) return false;

  return `${payload}.${await sign(payload, secret)}` === value;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.APP_COOKIE_SECURE === "true",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
