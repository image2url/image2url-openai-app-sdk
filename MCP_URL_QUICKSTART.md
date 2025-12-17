# 🌐 MCP 服务器 URL 快速配置

## 🎯 您的 MCP 服务器 URL

对于域名 `mcp.image2url.com`，您需要提供给 OpenAI 的 MCP 服务器 URL 是：

```
https://mcp.image2url.com
```

## ⚡ 快速配置步骤

### 1. 本地测试
```bash
cd openai-apps-sdk

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入您的 Cloudflare R2 配置

# 启动服务器
npm install
npm run dev
```

本地测试地址：`http://localhost:3001`

### 2. 生产部署

#### 域名配置
```bash
# DNS CNAME记录（Dokploy部署）
mcp.image2url.com -> your-dokploy-subdomain.dokploy.com

# 或 A记录（自建服务器）
mcp.image2url.com -> 您的服务器IP
```

#### SSL 证书（必需）
```bash
# 使用 Let's Encrypt
sudo certbot --nginx -d mcp.image2url.com

# Dokploy 会自动配置 SSL 证书
```

#### Nginx 配置
```nginx
server {
    listen 443 ssl;
    server_name mcp.image2url.com;

    # SSL 配置
    ssl_certificate /etc/letsencrypt/live/mcp.image2url.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.image2url.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 环境变量
```bash
# 生产环境配置
export R2_ACCOUNT_ID=your_account_id
export R2_ACCESS_KEY_ID=your_access_key
export R2_SECRET_ACCESS_KEY=your_secret_key
export R2_BUCKET_NAME=your_bucket
export R2_PUBLIC_URL=https://your-bucket.r2.dev
export MCP_DOMAIN=mcp.image2url.com
export HOST=0.0.0.0
export PORT=3001
```

#### 启动服务
```bash
npm run build
npm start
```

### 3. 验证部署

```bash
# 健康检查
curl https://mcp.image2url.com/health

# 应该返回类似：
{
  "status": "healthy",
  "services": {
    "mcp_server": "online",
    "r2_storage": "connected"
  }
}
```

## 📝 OpenAI 应用商店配置

在 OpenAI 应用商店中填写：

**MCP 服务器 URL：**
```
https://mcp.image2url.com
```

**环境变量：**
```json
{
  "R2_ACCOUNT_ID": "your_cloudflare_account_id",
  "R2_ACCESS_KEY_ID": "your_r2_access_key_id",
  "R2_SECRET_ACCESS_KEY": "your_r2_secret_access_key",
  "R2_BUCKET_NAME": "your_r2_bucket_name",
  "R2_PUBLIC_URL": "https://your-bucket.r2.dev",
  "MCP_DOMAIN": "mcp.image2url.com",
  "HOST": "0.0.0.0",
  "PORT": "3001"
}
```

## 🔧 常用云服务快速部署

### Vercel 部署
```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod

# 设置环境变量
vercel env add R2_ACCOUNT_ID
vercel env add R2_ACCESS_KEY_ID
# ... 其他环境变量
```

**MCP 服务器 URL（Vercel）：**
```
https://your-app-name.vercel.app
```

### Docker 部署
```bash
# 构建镜像
docker build -t image2url-mcp .

# 运行容器
docker run -d \
  --name mcp-server \
  -p 3001:3001 \
  --env-file .env \
  image2url-mcp

# 配置反向代理到 https://mcp.url2image.com
```

### Railway 部署
```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录并部署
railway login
railway up

# 在 Railway 控制台设置环境变量
```

**MCP 服务器 URL（Railway）：**
```
https://your-app-name.up.railway.app
```

## 🚨 重要提醒

1. **HTTPS 是必需的** - OpenAI MCP 只接受 HTTPS 连接
2. **域名必须匹配** - 确保申请时使用的域名与实际部署域名一致
3. **健康检查** - 确保 `/health` 端点可访问
4. **CORS 配置** - 确保 OpenAI 可以访问您的服务器

## 🔍 测试工具

```bash
# 测试 MCP 服务器连接
curl -X POST https://mcp.image2url.com/tools/upload_image \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/test.jpg",
    "filename": "test-upload"
  }'

# 检查服务器状态
curl https://mcp.image2url.com/health
```

---

**🎉 现在您的 MCP 服务器 URL 是 `https://mcp.image2url.com`，可以向 OpenAI 应用商店提交了！**

需要详细的生产环境配置，请参考 `deploy/production-setup.md` 文件。

**使用 Dokploy 部署**：请参考 `deploy/dokploy-deployment.md` 文件。