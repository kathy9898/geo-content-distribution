# GEO 内容分发中台

本地 MVP：主文录入 → GEO 调优评分 → 知乎/CSDN/稀土掘金改写 → 人工审核 → 复制发布 → 记录发布链接。

## 启动

```bash
npm install
cp .env.example .env.local
# 填入 OPENAI_API_KEY / OPENAI_MODEL
npm run dev
```

访问 http://localhost:3000

## 环境变量

- `OPENAI_API_KEY`：GPT/OpenAI 兼容 API Key，必填
- `OPENAI_MODEL`：模型名，例如 `gpt-5.5`、`gpt-4.1`、`gpt-4o`
- `OPENAI_BASE_URL`：可选。如果你用的是代理、中转或其他 OpenAI 协议兼容服务，填对应 base URL

兼容历史变量：如果暂时还用了 `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL`，系统也会读取，但推荐迁移到上面的 `OPENAI_*` 命名。

## MVP 注意

- 数据保存在 `data/*.json`
- 暂不做自动发布，先做人工审核、一键复制和发布链接记录
- AI 不应编造数据、客户案例和来源；缺失资料会进入风险提示
