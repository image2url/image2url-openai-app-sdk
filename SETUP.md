# Image2URL OpenAI Apps SDK 安装指南

## 📋 目录
- [快速开始](#快速开始)
- [详细配置](#详细配置)
- [部署选项](#部署选项)
- [故障排除](#故障排除)

## 🚀 快速开始

### 1. 环境要求
- Node.js 18+
- Cloudflare R2 账号
- OpenAI Apps SDK

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

### 4. 启动开发服务器
```bash
npm run dev
```

## ⚙️ 详细配置

### Cloudflare R2 配置

1. **创建 R2 Bucket**:
   - 登录 Cloudflare Dashboard
   - 进入 R2 Object Storage
   - 创建新的 bucket

2. **生成 API Token**:
   ```
   Account ID: 在 Cloudflare Dashboard 右侧找到
   Access Key ID: R2 API Tokens 中生成
   Secret Access Key: 生成时获得
   Bucket Name: 创建的 bucket 名称
   Public URL: bucket 的公共访问 URL
   ```

3. **设置公共访问**:
   - 在 bucket 设置中启用公共访问
   - 配置自定义域名（可选）

### 环境变量详细说明

```env
# Cloudflare R2 配置（必需）
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_r2_bucket_name
R2_PUBLIC_URL=https://your-bucket.r2.dev

# 服务器配置（可选）
PORT=3001
HOST=localhost
```

## 🌐 部署选项

### 1. 本地部署

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

### 2. Docker 部署

```bash
# 构建镜像
docker build -t image2url-mcp-server .

# 运行容器
docker run -p 3001:3001 --env-file .env image2url-mcp-server

# 使用 docker-compose
docker-compose up -d
```

### 3. Vercel 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod

# 设置环境变量
vercel env add R2_ACCOUNT_ID
vercel env add R2_ACCESS_KEY_ID
vercel env add R2_SECRET_ACCESS_KEY
vercel env add R2_BUCKET_NAME
vercel env add R2_PUBLIC_URL
```

### 4. Kubernetes 部署

```bash
# 创建 namespace
kubectl create namespace image2url

# 应用配置
kubectl apply -f deploy/k8s-deployment.yaml

# 设置 secrets
kubectl create secret generic r2-credentials \
  --from-literal=account-id=your_account_id \
  --from-literal=access-key-id=your_access_key \
  --from-literal=secret-access-key=your_secret_key \
  -n image2url

# 检查状态
kubectl get pods -n image2url
```

## 🔧 验证安装

### 健康检查
```bash
curl http://localhost:3001/health
```

### 测试图片上传
```bash
curl -X POST http://localhost:3001/tools/upload_image \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/test-image.jpg",
    "filename": "test-upload"
  }'
```

## 🤖 ChatGPT 集成

### 1. 在 ChatGPT 中添加应用

1. 打开 ChatGPT 应用商店
2. 搜索 "Image2URL"
3. 点击安装
4. 配置环境变量
5. 开始使用

### 2. 支持的对话示例

- "帮我把这张图片上传：https://example.com/photo.jpg"
- "我需要为这张图片生成永久链接"
- "批量处理这些图片"
- "查看图片详情"

## 🐛 故障排除

### 常见问题

**1. R2 连接失败**
```
错误: R2 configuration error. Please check your credentials.
解决: 检查环境变量是否正确设置，特别是 Account ID 和 API Keys
```

**2. 图片上传失败**
```
错误: Failed to fetch image: HTTP 404
解决: 确保图片 URL 可以访问，检查网络连接
```

**3. 文件类型不支持**
```
错误: Unsupported content type: application/octet-stream
解决: 确保上传的是有效的图片文件（JPEG, PNG, GIF 等）
```

### 日志查看

```bash
# Docker 日志
docker logs image2url-mcp-server

# Kubernetes 日志
kubectl logs -f deployment/image2url-mcp-server -n image2url

# 本地日志
tail -f logs/app.log
```

### 性能优化

1. **CDN 配置**: 配置 Cloudflare CDN 加速
2. **缓存策略**: 调整 `Cache-Control` 头部
3. **图片压缩**: 上传前压缩图片大小
4. **并发控制**: 设置合理的并发限制

## 📞 支持

- 文档: [README.md](./README.md)
- 问题反馈: [GitHub Issues](https://github.com/image2url/issues)
- 技术支持: support@image2url.com

## 🔐 安全注意事项

1. **API 密钥管理**: 使用环境变量存储敏感信息
2. **访问控制**: 限制 bucket 访问权限
3. **文件验证**: 验证上传文件的类型和大小
4. **速率限制**: 实施合理的 API 调用限制
5. **HTTPS**: 生产环境强制使用 HTTPS

---

💡 **提示**: 建议在部署前先在开发环境充分测试所有功能。