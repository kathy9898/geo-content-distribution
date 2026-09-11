# GEO 内容分发中台 — 长期项目笔记

## 技术栈与部署
- Next.js 14 (App Router) + antd + zod；数据存 `data/*.json`（`DATA_DIR`）。
- 部署：Docker Compose，服务器 `/opt/geo-content-distribution`，端口 3000，`env_file: .env.production`，宿主机 `./data` 挂载到 `/app/data`。
- **服务器不是 git 仓库**：更新代码必须用 scp 覆盖文件（`git pull` 无效），再执行 `docker compose up -d --build`。
  - SSH：`ssh -i "/Users/kathy/Documents/geo/密钥/geo内容平台.pem" root@106.75.232.103`（同目录 `las20260523.pem` 是另一把密钥，不用）。
- 服务器目录里混有大量 macOS `._*` 资源分叉文件（从 Mac 上传导致），无害但会干扰 `ls`/`grep`，排查时注意过滤。
- 生产数据在服务器 `./data/*.json`（bind mount），任何同步操作都不得覆盖 `data/` 与 `.env.production`。
- 模型接入：OpenAI 兼容协议，统一走 `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL`，线上中转为 `https://api.modelverse.cn`。
- 兼容历史变量：`ANTHROPIC_*` / `AI_BASE_URL` / `AI_MODEL`（新代码优先 `OPENAI_*`）。

## AI 调用约定（src/lib/ai/anthropic.ts）
- `generateJson()`：结构化输出入口，走**流式**累积后解析 JSON，所有 AI 路由（geo-optimize / variants / humanize / citation-validate / gzh ai-creative）都走它。
- `generateTextStream()`：纯文本流式，供 `/api/gzh-format/normalize` 使用。
- 超时全部由 `AbortController` 管理，SDK `maxRetries: 0`：
  - `AI_STALL_TIMEOUT_MS`（默认 90000）= 连续无新 token 才判失败；
  - `AI_TOTAL_TIMEOUT_MS`（默认 600000）= 单次请求兜底上限。

## 已知坑位
- **OpenAI SDK 在中止（abort）时会静默结束流而不抛异常**。任何流式消费都必须在 `for await` 结束后再补一次 `signal.aborted` 检查，否则超时会被误报成「AI 返回内容不是 JSON」。
- 多数 AI 路由带**二次重试**（检测到「转述原文」或「活人感不合格」会再调一次 `generateJson`），耗时约为单次的两倍，排查长耗时需留意。
- 路由的 `catch` 默认只返回 JSON、不写日志；`anthropic.ts` 中已用 `[ai]` 前缀打印中止/失败原因，排障看 `docker compose logs -f`。

## 排查口径（用户常问）
- 「是网络还是 API Key」→ 站点 curl 307 且模型域名 TLS 在百毫秒内即网络正常；Key 失效会返回 401/invalid_api_key。超时类中文提示均来自应用自身逻辑，不是网络或鉴权。
