interface FeishuTokenResponse {
  code: number;
  msg: string;
  tenant_access_token?: string;
  expire?: number;
}

export interface FeishuApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getTenantAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("缺少 FEISHU_APP_ID 或 FEISHU_APP_SECRET，请先在 .env.local 中配置飞书应用凭证。 ");
  }

  const response = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    cache: "no-store",
  });

  const data = await response.json() as FeishuTokenResponse;
  if (!response.ok || data.code !== 0 || !data.tenant_access_token) {
    throw new Error(`获取飞书 tenant_access_token 失败：${data.msg || response.statusText}`);
  }

  cachedToken = {
    token: data.tenant_access_token,
    expiresAt: Date.now() + ((data.expire || 7200) - 120) * 1000,
  };
  return cachedToken.token;
}

export async function feishuGet<T>(path: string, query?: Record<string, string | number | undefined>) {
  const token = await getTenantAccessToken();
  const url = new URL(`https://open.feishu.cn${path}`);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await response.json() as FeishuApiResponse<T>;
  if (!response.ok || data.code !== 0) {
    throw new Error(`飞书接口请求失败：${data.msg || response.statusText}`);
  }
  return data.data;
}

export async function downloadFeishuImage(imageKey: string) {
  const token = await getTenantAccessToken();
  const url = `https://open.feishu.cn/open-apis/im/v1/images/${imageKey}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    let msg = response.statusText;
    try { const json = JSON.parse(text); msg = json.msg || msg; } catch {}
    throw new Error(`飞书图片下载失败：${msg}`);
  }

  const contentType = response.headers.get("content-type") || "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, contentType };
}
