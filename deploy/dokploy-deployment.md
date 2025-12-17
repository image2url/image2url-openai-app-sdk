# 🐳 Dokploy 部署指南

## 🎯 MCP 服务器 URL

```
https://mcp.image2url.com
```

## 📋 Dokploy 部署步骤

### 1. 准备 Dockerfile

确保您的 `Dockerfile` 配置正确：

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build
RUN npm prune --omit=dev

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nodejs

EXPOSE 3001

ENV PORT=3001
ENV HOST=0.0.0.0
ENV MCP_DOMAIN=mcp.image2url.com

CMD ["node", "dist/index.js"]
```

### 2. Dokploy 应用配置

#### 2.1 创建新应用

1. 登录 Dokploy 控制台
2. 点击 "New Application"
3. 选择 "Docker" 部署方式
4. 应用名称：`image2url-mcp-server`

#### 2.2 Git 仓库配置

```
Repository: https://github.com/your-username/image2url-main.git
Branch: main
Root Path: openai-apps-sdk
```

#### 2.3 环境变量配置

在 Dokploy 的环境变量部分添加：

```env
# Cloudflare R2 配置
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_r2_bucket_name
R2_PUBLIC_URL=https://your-bucket.r2.dev

# 服务器配置
PORT=3001
HOST=0.0.0.0
MCP_DOMAIN=mcp.image2url.com
NODE_ENV=production
```

#### 2.4 网络配置

- **端口映射**: `3001:3001`
- **健康检查**: `/health`
- **自动重启**: 启用

### 3. 域名配置 (mcp.image2url.com)

#### 3.1 DNS 配置

在您的域名提供商处添加 CNAME 记录：

```
mcp.image2url.com -> your-dokploy-subdomain.dokploy.com
```

#### 3.2 Dokploy 域名配置

1. 在 Dokploy 应用中，进入 "Domains" 标签
2. 添加域名：`mcp.image2url.com`
3. Dokploy 会自动配置 SSL 证书

### 4. 部署和验证

#### 4.1 触发部署

1. 保存配置
2. Dokploy 会自动开始部署
3. 等待部署完成

#### 4.2 验证部署

```bash
# 健康检查
curl https://mcp.image2url.com/health

# 应该返回
{
  "status": "healthy",
  "services": {
    "mcp_server": "online",
    "r2_storage": "connected"
  }
}
```

#### 4.3 测试功能

```bash
# 测试图片上传
curl -X POST https://mcp.image2url.com/tools/upload_image \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/test.jpg",
    "filename": "dokploy-test"
  }'
```

## 🔧 OpenAI 应用商店配置

### MCP 服务器 URL
```
https://mcp.image2url.com
```

### 环境变量
```json
{
  "R2_ACCOUNT_ID": "your_cloudflare_account_id",
  "R2_ACCESS_KEY_ID": "your_r2_access_key_id",
  "R2_SECRET_ACCESS_KEY": "your_r2_secret_access_key",
  "R2_BUCKET_NAME": "your_r2_bucket_name",
  "R2_PUBLIC_URL": "https://your-bucket.r2.dev",
  "MCP_DOMAIN": "mcp.image2url.com",
  "HOST": "0.0.0.0",
  "PORT": "3001",
  "NODE_ENV": "production"
}
```

## 🚨 Dokploy 特定注意事项

### 1. 构建优化

如果构建时间过长，可以在 Dokploy 中设置：

```yaml
# dokploy.yml (在根目录创建)
build:
  context: ./openai-apps-sdk
  dockerfile: ./openai-apps-sdk/Dockerfile
  args:
    NODE_ENV: production
```

### 2. 资源限制

在 Dokploy 中设置合适的资源限制：

```yaml
resources:
  limits:
    memory: "512Mi"
    cpu: "500m"
  requests:
    memory: "256Mi"
    cpu: "100m"
```

### 3. 日志配置

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### 4. 健康检查优化

在 Dokploy 中配置健康检查：

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## 🔍 监控和调试

### 1. 查看日志

在 Dokploy 控制台中：
- 进入应用详情
- 点击 "Logs" 标签
- 实时查看应用日志

### 2. 监控指标

Dokploy 提供的基础监控：
- CPU 使用率
- 内存使用率
- 网络流量
- 存储使用

### 3. 告警设置

在 Dokploy 中设置告警：
- 应用崩溃
- 健康检查失败
- 资源使用过高

## 🔄 CI/CD 集成

### GitHub Actions (可选)

创建 `.github/workflows/dokploy.yml`：

```yaml
name: Deploy to Dokploy

on:
  push:
    branches: [ main ]
    paths: [ 'openai-apps-sdk/**' ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Trigger Dokploy Deployment
      run: |
        curl -X POST "${{ secrets.DOKPLOY_WEBHOOK_URL }}" \
          -H "Content-Type: application/json" \
          -d '{"event": "push", "branch": "main"}'
```

## 🔒 安全配置

### 1. 网络安全

- 确保 Dokploy 项目是私有的
- 使用强密码和 2FA
- 定期更新依赖

### 2. 环境变量安全

- 使用 Dokploy 的加密环境变量功能
- 不要在代码中硬编码敏感信息
- 定期轮换 API 密钥

## 🚨 故障排除

### 常见问题

**Q: 部署失败**
```bash
A: 检查 Dokploy 日志：
1. 查看构建日志
2. 检查环境变量配置
3. 验证 Dockerfile 语法
```

**Q: 域名无法访问**
```bash
A: 检查 DNS 和 SSL：
1. 确认 CNAME 记录正确
2. 等待 DNS 传播（可能需要几分钟）
3. 检查 Dokploy SSL 证书状态
```

**Q: 健康检查失败**
```bash
A: 调试应用状态：
1. 查看应用实时日志
2. 检查 Cloudflare R2 配置
3. 验证端口映射
```

**Q: 上传功能不工作**
```bash
A: 检查 R2 配置：
1. 验证 R2 凭据正确
2. 检查 bucket 权限
3. 测试网络连接
```

## 📞 支持

- **Dokploy 文档**: https://dokploy.com/docs
- **项目 Issues**: GitHub Issues
- **技术支持**: support@image2url.com

---

## 🎉 部署完成

一旦部署成功，您的 MCP 服务器将在以下地址运行：

- **MCP 服务器 URL**: `https://mcp.image2url.com`
- **健康检查**: `https://mcp.image2url.com/health`

现在可以向 OpenAI 应用商店提交您的应用了！🚀
