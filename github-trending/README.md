# GitHub Trending 排行榜

一个实时展示 GitHub Trending 项目的现代化 Web 应用。

## ✨ 特性

- 🚀 实时抓取 GitHub Trending 数据
- 🔄 自动刷新（每 5 分钟）
- 🎨 GitHub 风格的暗色主题
- 📱 响应式设计，完美支持移动端
- 🌍 多语言支持（JavaScript、TypeScript、Python、Go、Rust 等）
- ⏰ 时间范围筛选（今日/本周/本月）
- ⭐ 显示 Star、Fork 数和今日新增 Star
- 👥 展示项目贡献者

## 🛠️ 技术栈

### 前端
- React 18
- TypeScript
- Vite
- CSS3

### 后端
- Node.js
- Express
- Cheerio (网页抓取)
- Axios

## 📦 安装

```bash
# 克隆项目
git clone https://github.com/YOUR_USERNAME/github-trending.git
cd github-trending

# 安装前端依赖
npm install

# 安装后端依赖
cd server
npm install
cd ..
```

## 🚀 运行

### 开发模式

需要同时运行前端和后端服务器：

```bash
# 终端 1: 启动后端 API 服务器
cd server
npm start

# 终端 2: 启动前端开发服务器
npm run dev
```

访问 http://localhost:5173 查看应用。

### 生产模式

```bash
# 构建前端
npm run build

# 启动后端服务器
cd server
npm start
```

## 📁 项目结构

```
github-trending/
├── src/
│   ├── api/
│   │   └── trending.ts        # API 接口
│   ├── components/
│   │   ├── Header.tsx         # 页面头部
│   │   ├── Filters.tsx        # 筛选器
│   │   └── RepoCard.tsx       # 项目卡片
│   ├── types.ts               # TypeScript 类型定义
│   ├── App.tsx                # 主应用组件
│   ├── App.css                # 样式文件
│   └── main.tsx               # 入口文件
├── server/
│   ├── index.js               # Express 服务器
│   └── package.json
└── package.json
```

## 🌐 部署

本项目可以部署到以下平台：

- **Vercel**: 前端部署，配置 Serverless Functions 作为后端
- **Netlify**: 前端部署，配置 Netlify Functions
- **Railway**: 全栈部署
- **Render**: 全栈部署

## 📝 API 说明

后端提供了以下 API：

### GET /api/trending

查询参数：
- `language`: 编程语言（可选，默认为 all）
- `since`: 时间范围（daily/weekly/monthly，默认为 daily）

示例：
```
http://localhost:3001/api/trending?language=javascript&since=daily
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可

MIT License

## 🙏 鸣谢

数据来源于 [GitHub Trending](https://github.com/trending)
