# 🌐 MCP 服务器生产环境部署指南

## MCP 服务器 URL 配置

对于域名 `mcp.url2image.com`，您的 MCP 服务器 URL 是：

```
https://mcp.url2image.com
```

## 📋 完整部署步骤

### 1. 域名和DNS配置

#### DNS 记录设置
```bash
# A记录（指向您的服务器IP）
mcp.url2image.com.    IN    A    YOUR_SERVER_IP

# 或使用 CNAME（如果使用云服务）
mcp.url2image.com.    IN    CNAME    your-cloud-provider.com
```

#### 验证DNS解析
```bash
nslookup mcp.url2image.com
dig mcp.url2image.com
```

### 2. SSL/TLS 证书配置

#### 使用 Let's Encrypt（推荐）
```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d mcp.url2image.com

# 自动续期
sudo crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

#### 证书文件位置
```
/etc/letsencrypt/live/mcp.url2image.com/fullchain.pem
/etc/letsencrypt/live/mcp.url2image.com/privkey.pem
```

### 3. Nginx 反向代理配置

创建 `/etc/nginx/sites-available/mcp.url2image.com`：

```nginx
server {
    listen 80;
    server_name mcp.url2image.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mcp.url2image.com;

    # SSL 配置
    ssl_certificate /etc/letsencrypt/live/mcp.url2image.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.url2image.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # 安全头部
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # 日志
    access_log /var/log/nginx/mcp.url2image.com.access.log;
    error_log /var/log/nginx/mcp.url2image.com.error.log;

    # 代理到 MCP 服务器
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 健康检查端点
    location /health {
        proxy_pass http://localhost:3001/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用站点：
```bash
sudo ln -s /etc/nginx/sites-available/mcp.url2image.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. 环境变量配置

创建生产环境配置文件 `/etc/environment.d/mcp-server.conf`：

```bash
# Cloudflare R2 配置
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_r2_bucket_name
R2_PUBLIC_URL=https://your-bucket.r2.dev

# 服务器配置
PORT=3001
HOST=0.0.0.0
MCP_DOMAIN=mcp.url2image.com

# 生产环境标识
NODE_ENV=production
```

### 5. Systemd 服务配置

创建 `/etc/systemd/system/mcp-image2url.service`：

```ini
[Unit]
Description=Image2URL MCP Server
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/image2url-mcp-server
EnvironmentFile=/etc/environment.d/mcp-server.conf
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

# 日志
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mcp-image2url

# 安全
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/image2url-mcp-server

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl daemon-reload
sudo systemctl enable mcp-image2url
sudo systemctl start mcp-image2url
sudo systemctl status mcp-image2url
```

### 6. 部署应用

```bash
# 创建应用目录
sudo mkdir -p /opt/image2url-mcp-server
sudo chown www-data:www-data /opt/image2url-mcp-server

# 构建和部署
cd /path/to/your/openai-apps-sdk
npm run build
sudo cp -r dist/* /opt/image2url-mcp-server/
sudo chown -R www-data:www-data /opt/image2url-mcp-server

# 重启服务
sudo systemctl restart mcp-image2url
```

## 🔍 验证部署

### 1. 健康检查
```bash
curl https://mcp.url2image.com/health
```

### 2. SSL 证书检查
```bash
openssl s_client -connect mcp.url2image.com:443 -servername mcp.url2image.com
```

### 3. 日志查看
```bash
# Nginx 日志
sudo tail -f /var/log/nginx/mcp.url2image.com.access.log
sudo tail -f /var/log/nginx/mcp.url2image.com.error.log

# MCP 服务器日志
sudo journalctl -u mcp-image2url -f
```

### 4. 端口检查
```bash
sudo netstat -tlnp | grep :3001
sudo ss -tlnp | grep :3001
```

## 🔧 OpenAI 应用商店配置

在 OpenAI 应用商店中，您需要提供：

**MCP 服务器 URL：**
```
https://mcp.url2image.com
```

**健康检查端点：**
```
https://mcp.url2image.com/health
```

**环境变量配置：**
```json
{
  "R2_ACCOUNT_ID": "your_cloudflare_account_id",
  "R2_ACCESS_KEY_ID": "your_r2_access_key_id",
  "R2_SECRET_ACCESS_KEY": "your_r2_secret_access_key",
  "R2_BUCKET_NAME": "your_r2_bucket_name",
  "R2_PUBLIC_URL": "https://your-bucket.r2.dev",
  "MCP_DOMAIN": "mcp.url2image.com"
}
```

## 🚨 监控和告警

### 1. Uptime 监控
使用 UptimeRobot 或类似服务监控：
- `https://mcp.url2image.com/health`
- 检查间隔：5分钟
- 告警邮箱：admin@yourcompany.com

### 2. 日志监控
```bash
# 设置日志轮转
sudo nano /etc/logrotate.d/mcp-image2url

内容：
/opt/image2url-mcp-server/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
```

### 3. 性能监控
```bash
# 安装监控工具
sudo apt install htop iotop

# 查看系统资源
htop
iotop
df -h
free -h
```

## 🔒 安全加固

### 1. 防火墙配置
```bash
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Fail2Ban
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. 自动更新
```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 📞 故障排除

### 常见问题

**Q: SSL 证书问题**
```bash
A: 检查证书路径和权限：
sudo ls -la /etc/letsencrypt/live/mcp.url2image.com/
sudo nginx -t
```

**Q: 服务无法启动**
```bash
A: 检查日志：
sudo journalctl -u mcp-image2url --no-pager
```

**Q: 代理连接失败**
```bash
A: 检查端口和防火墙：
sudo netstat -tlnp | grep :3001
sudo ufw status
```

现在您的 MCP 服务器已经在 `https://mcp.url2image.com` 上运行，可以向 OpenAI 应用商店提交了！🚀