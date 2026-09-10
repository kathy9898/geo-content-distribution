# GEO 内容分发中台部署说明

## 服务器建议

- Ubuntu 22.04/24.04
- 2 核 4G 起
- 系统盘 40G 起
- 安全组开放：22、3000（正式建议后续改 80/443 + HTTPS）

## 1. 安装 Docker

```bash
apt update
apt install -y ca-certificates curl gnupg git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

验证：

```bash
docker --version
docker compose version
```

## 2. 创建生产环境变量

复制模板：

```bash
cp .env.production.example .env.production
```

生成 Session Secret：

```bash
openssl rand -hex 32
```

编辑 `.env.production`：

```env
NODE_ENV=production
PORT=3000
DATA_DIR=/app/data

APP_ACCESS_PASSWORD=你的访问密码
APP_SESSION_SECRET=openssl生成的随机字符串

OPENAI_API_KEY=你的模型Key
OPENAI_BASE_URL=https://api.modelverse.cn
OPENAI_MODEL=gpt-5.5

# AI 生成超时控制（毫秒，可选）。生成走流式，只统计“无新内容”的停滞时间。
# AI_STALL_TIMEOUT_MS=90000
# AI_TOTAL_TIMEOUT_MS=600000

FEISHU_APP_ID=你的飞书AppID
FEISHU_APP_SECRET=你的飞书Secret
```

## 3. 启动服务

```bash
docker compose up -d --build
```

查看日志：

```bash
docker compose logs -f
```

访问：

```text
http://服务器IP:3000
```

## 4. 数据持久化

`docker-compose.yml` 会把宿主机的 `./data` 挂载到容器的 `/app/data`。

请定期备份：

```bash
tar -czf geo-data-backup-$(date +%F).tar.gz data
```

## 5. 更新发布

上传新代码后执行：

```bash
docker compose up -d --build
```

## 6. 常用命令

```bash
# 查看容器状态
docker compose ps

# 查看日志
docker compose logs -f

# 重启服务
docker compose restart

# 停止服务
docker compose down
```

## 7. 安全建议

- 不要把 `.env.production` 上传到公开仓库。
- 第一版用访问密码保护，后续建议升级为账号体系。
- 正式使用建议配置域名和 HTTPS。
- 云主机安全组只开放必要端口。

## 8. 常见问题：AI 生成超时

现象：页面提示“AI 生成超时（长时间无返回 / 总时长超限，xx 秒），文章较长时请拆分或稍后重试”。

排查顺序：

```bash
# 1. 站点本身是否可用（正常应返回 307）
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" http://127.0.0.1:3000/

# 2. 模型服务网络是否正常（TLS 握手应在百毫秒内）
curl -s -o /dev/null -w "connect=%{time_connect}s tls=%{time_appconnect}s total=%{time_total}s\n" https://api.modelverse.cn/

# 3. 从容器内验证网络与 Key（替换为你的 Key 和模型名）
docker compose exec geo-content-distribution sh -c \
  'wget -qO- --header="Authorization: Bearer $OPENAI_API_KEY" --header="Content-Type: application/json" \
   --post-data="{\"model\":\"$OPENAI_MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}],\"max_tokens\":8}" \
   $OPENAI_BASE_URL/v1/chat/completions'
```

- 第 1、2 步正常 → 不是网络问题；第 3 步能返回内容 → Key 正常。此时问题在生成耗时，调整 `AI_STALL_TIMEOUT_MS` / `AI_TOTAL_TIMEOUT_MS`，或改用更快的模型。
- 第 3 步报 401 / invalid_api_key → 是 Key 或额度问题。
- 第 3 步报连接错误 → 是服务器到模型服务的网络问题（安全组 / DNS / 中转站可用性）。
- 服务端日志中会打印 `[ai]` 前缀的中止与失败原因，用 `docker compose logs -f` 查看。

