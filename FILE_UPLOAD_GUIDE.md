# 文件上传功能指南

Image2URL OpenAI Apps SDK 现在支持直接文件上传，用户不再需要提供图片URL，可以直接上传本地图片文件。

## 🆕 新功能概述

### 支持的上传方式

1. **URL 上传** (原有功能)
   - 从网络URL下载图片并上传
   - 适合已在线的图片

2. **Base64 数据上传** (新功能)
   - 直接上传图片的base64数据
   - 支持data URL格式和原始base64字符串

3. **直接文件上传** (新功能)
   - 专门为文件上传优化的工具
   - 更简单的参数结构

## 🛠️ API 工具详解

### 1. upload_image (增强版)

支持两种上传方式的通用工具：

```json
{
  "name": "upload_image",
  "description": "上传图片并转换为永久URL（支持URL或base64数据）",
  "parameters": {
    "image_url": "图片URL（与image_data二选一）",
    "image_data": "Base64编码图片数据（与image_url二选一）",
    "filename": "自定义文件名（使用image_data时必需）"
  }
}
```

**使用示例：**

**方式1：URL上传**
```javascript
{
  "image_url": "https://example.com/photo.jpg",
  "filename": "my-photo"
}
```

**方式2：Base64数据上传**
```javascript
{
  "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...",
  "filename": "my-image"
}
```

**方式3：原始Base64数据**
```javascript
{
  "image_data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...",
  "filename": "logo.png"
}
```

### 2. upload_file (专门的文件上传工具)

专为文件上传设计的简化工具：

```json
{
  "name": "upload_file",
  "description": "直接上传文件并转换为永久URL",
  "parameters": {
    "image_data": "Base64编码图片数据（必需）",
    "filename": "原始文件名含扩展名（必需）"
  }
}
```

**使用示例：**

```javascript
{
  "image_data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...",
  "filename": "vacation-photo.jpg"
}
```

## 🎮 ChatGPT 对话示例

### 场景1：用户直接上传文件
```
用户：我有一张照片想要上传生成链接

ChatGPT：我来帮您上传照片。请您将图片文件拖拽到对话框中，或者粘贴图片，我将直接为您生成永久链接。

*(用户上传文件后)*

ChatGPT：✅ 上传成功！
🔗 永久链接：https://your-bucket.r2.dev/images/1703012345678-uuid-2024-12-18-photo.jpg
📊 文件大小：2.3MB
🎨 图片格式：JPEG
🌐 全球CDN加速访问
```

### 场景2：处理Base64数据
```
用户：我有一张base64编码的图片需要上传：data:image/png;base64,iVBORw0KGgo...

ChatGPT：我来帮您上传这张图片。

*(调用upload_image工具处理base64数据)*

ChatGPT：✅ 图片上传成功！
🔗 永久链接：https://your-bucket.r2.dev/images/1703012345678-uuid-chart.png
📊 文件大小：156KB
🎨 图片格式：PNG
📅 上传时间：2024-12-18T10:30:00Z
```

### 场景3：批量上传
```
用户：帮我上传这些图片：
1. https://example.com/photo1.jpg
2. [本地文件1]
3. [本地文件2]

ChatGPT：我来帮您批量上传这些图片。

*(分别处理URL上传和文件上传)*

ChatGPT：📦 批量上传完成：
1️⃣ https://your-bucket.r2.dev/images/...-photo1.jpg ✅
2️⃣ https://your-bucket.r2.dev/images/...-file1.png ✅
3️⃣ https://your-bucket.r2.dev/images/...-file2.gif ✅

🎉 所有图片都已成功上传并生成永久链接！
```

## 📋 技术规格

### 支持的文件格式
- ✅ JPEG (.jpg, .jpeg)
- ✅ PNG (.png)
- ✅ GIF (.gif)
- ✅ WebP (.webp)
- ✅ SVG (.svg)
- ✅ BMP (.bmp)
- ✅ TIFF (.tiff, .tif)
- ✅ ICO (.ico)

### 文件大小限制
- **直接文件上传**: 最大 10MB
- **URL上传**: 最大 5MB（受网络下载限制）

### Base64格式支持

**Data URL格式：**
```
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...
data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...
```

**原始Base64格式：**
```
iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...
/9j/4AAQSkZJRgABAQEAYABgAAD...
```

### 安全特性
- 🔒 文件类型自动验证
- 📏 文件大小限制
- 🛡️ Base64数据格式验证
- 🎯 自动识别图片格式
- 🔍 恶意文件检测

## 🔄 集成示例

### 前端集成
```javascript
// 文件选择器处理
async function handleFileUpload(file) {
  const base64 = await fileToBase64(file);

  const result = await callUploadTool({
    tool: "upload_file",
    parameters: {
      image_data: base64,
      filename: file.name
    }
  });

  return result.url;
}

// 文件转Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}
```

### 后端集成
```javascript
// Express.js示例
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

    const result = await mcpClient.callTool('upload_file', {
      image_data: dataUrl,
      filename: req.file.originalname
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🎯 使用建议

### 最佳实践
1. **文件命名**: 使用描述性文件名，便于管理
2. **格式选择**: 推荐使用JPEG（照片）或PNG（图表）
3. **大小优化**: 上传前适当压缩图片
4. **批量处理**: 多个文件可以并行上传

### 错误处理
```javascript
try {
  const result = await uploadImage({...});
  console.log('上传成功:', result.url);
} catch (error) {
  if (error.message.includes('Unsupported content type')) {
    console.error('不支持的文件格式');
  } else if (error.message.includes('exceeds')) {
    console.error('文件过大');
  } else {
    console.error('上传失败:', error.message);
  }
}
```

## 🔍 故障排除

### 常见问题

**Q: Base64数据格式错误**
```
A: 确保Base64数据格式正确：
   - Data URL: data:image/png;base64,xxxxx
   - 原始Base64: 直接的base64字符串
```

**Q: 文件名包含特殊字符**
```
A: 文件名中的特殊字符会自动替换为连字符，不影响上传
```

**Q: 上传速度慢**
```
A: 大文件上传需要时间，建议：
   - 压缩图片后再上传
   - 检查网络连接
   - 使用较小的文件格式
```

## 📈 性能优化

### 上传优化
- 🗜️ 自动文件压缩（可配置）
- 🚀 并行上传支持
- 📊 上传进度追踪
- 🔄 自动重试机制

### 存储优化
- ☁️ Cloudflare R2 全球分布式存储
- ⚡ CDN边缘缓存
- 🔗 智能URL重定向
- 📈 自动负载均衡

---

💡 **提示**: 文件上传功能现在让您的用户体验更加流畅，无需提供URL即可直接上传图片！