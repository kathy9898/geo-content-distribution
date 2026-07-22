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
