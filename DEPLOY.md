# 部署到 Vercel

这个项目需要部署到 Vercel 才能正常工作，因为它使用了 Serverless Functions 来抓取 GitHub Trending 数据。

## 部署步骤

1. 访问 [Vercel](https://vercel.com)
2. 使用 GitHub 账号登录
3. 点击 "Import Project"
4. 选择 `crazyzhang277/github-trending` 仓库
5. 配置项目：
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. 点击 "Deploy"

## 部署后

部署完成后，你会得到一个 Vercel 域名，类似：
```
https://github-trending-xxx.vercel.app
```

网站会自动：
- ✅ 从 GitHub Trending 抓取实时数据
- ✅ 支持语言筛选
- ✅ 支持时间范围（今日/本周/本月）
- ✅ 显示今天新增的 star 数
- ✅ 自动刷新（每 5 分钟）

## 本地开发

如果要在本地测试：

1. 启动后端服务器：
```bash
cd server
npm install
npm start
```

2. 启动前端开发服务器：
```bash
npm run dev
```

访问 http://localhost:5173
