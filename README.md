# Image2URL OpenAI Apps SDK

将图片转换为永久可分享URL的OpenAI Apps SDK，基于MCP (Model Context Protocol) 架构。

## 🚀 特性

- **🖼️ 多种上传方式**: 支持URL上传、Base64数据上传、直接文件上传
- **☁️ 云存储**: 基于Cloudflare R2的高可靠性存储
- **⚡ 高性能**: 快速上传和全球CDN分发
- **🔒 安全**: 文件类型验证和大小限制（最大10MB）
- **🌐 MCP集成**: 与ChatGPT深度集成，支持智能对话
- **📱 用户友好**: 无需提供URL，直接拖拽上传文件

## 📦 安装

```bash
npm install @image2url/apps-sdk
```

## 🔧 配置

1. 复制环境变量配置文件：
```bash
cp .env.example .env
```

2. 设置Cloudflare R2配置：
```env
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_r2_bucket_name
R2_PUBLIC_URL=https://your-bucket-url.r2.dev
```

## 🏃‍♂️ 运行

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm run build
npm start
```

## 🛠️ API工具

### upload_image
上传图片并转换为永久URL（支持多种上传方式）

**参数（二选一）：**
- `image_url` (string): 图片的URL地址
- `image_data` (string): Base64编码的图片数据
- `filename` (string): 自定义文件名（使用image_data时必需）

**示例：**
```javascript
// URL上传
{
  "image_url": "https://example.com/photo.jpg",
  "filename": "my-photo"
}

// Base64上传
{
  "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...",
  "filename": "chart"
}
```

**返回：**
```json
{
  "success": true,
  "url": "https://your-bucket.r2.dev/images/1234567890-uuid.jpg",
  "filename": "images/1234567890-uuid.jpg",
  "size": 1024000,
  "type": "image/jpeg",
  "uploaded_at": "2024-01-01T00:00:00.000Z"
}
```

### upload_file
专门用于直接文件上传的工具

**参数：**
- `image_data` (string, 必需): Base64编码的图片数据
- `filename` (string, 必需): 原始文件名（含扩展名）

**示例：**
```javascript
{
  "image_data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...",
  "filename": "vacation-photo.jpg"
}
```

### get_image_info
获取已上传图片的信息

**参数：**
- `image_url` (string, 必需): 已上传图片的URL地址

**返回：**
```json
{
  "url": "https://your-bucket.r2.dev/images/1234567890-uuid.jpg",
  "size": "1024000",
  "type": "image/jpeg",
  "cache_control": "public, max-age=31536000",
  "last_modified": "Mon, 01 Jan 2024 00:00:00 GMT"
}
```

## 🤖 ChatGPT集成

此SDK基于OpenAI Apps SDK构建，可以直接与ChatGPT集成。用户可以在ChatGPT对话中使用以下功能：

1. **图片上传**: "请帮我把这张图片上传到Image2URL"
2. **直接文件上传**: "我有一个文件要上传"（拖拽或粘贴文件）
3. **Base64上传**: "我有base64图片数据要上传"
4. **批量处理**: "帮我把这些图片都转换为永久链接"
5. **信息查询**: "查看这张上传图片的详细信息"

### 用户体验升级
- ✅ **无需URL**: 用户可以直接拖拽文件到对话框
- ✅ **自动识别**: 系统自动识别文件格式和大小
- ✅ **实时反馈**: 上传进度和结果即时显示
- ✅ **多格式支持**: JPEG, PNG, GIF, WebP, SVG等

## 🌐 部署

### Vercel部署
1. 将代码推送到GitHub
2. 连接Vercel账号
3. 设置环境变量
4. 自动部署

### Docker部署
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📞 支持

如有问题，请创建GitHub Issue或联系开发团队。