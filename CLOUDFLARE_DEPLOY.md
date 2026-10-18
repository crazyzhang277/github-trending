# Cloudflare Pages 部署指南

## 快速部署

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 登录后，进入 **Workers & Pages**
3. 点击 **Create application** → **Pages** → **Connect to Git**
4. 选择你的 GitHub 账号，授权访问 `github-trending` 仓库
5. 配置构建设置：
   - **Framework preset**: 选择 `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. 点击 **Save and Deploy**

## 完成！

部署完成后，你会得到一个 Cloudflare Pages 域名：
```
https://github-trending-xxx.pages.dev
```

## 优势

✅ **真正的 GitHub Trending 数据** - 直接从 github.com/trending 抓取
✅ **全球 CDN** - Cloudflare 全球节点，访问速度快
✅ **免费额度** - 每天 100,000 次请求完全免费
✅ **自动部署** - 推送到 GitHub 自动重新构建
✅ **Serverless Functions** - 使用 Cloudflare Workers 运行后端

## 项目功能

- 📊 显示今天/本周/本月的热门项目
- 🔍 支持 16 种编程语言筛选
- ⭐ 显示今日新增 Star 数
- 🔄 每 5 分钟自动刷新
- 🎨 深色主题 GitHub 风格设计

## 本地开发

```bash
# 启动后端（在 server 目录）
cd server
npm install
npm start

# 启动前端
npm run dev
```
