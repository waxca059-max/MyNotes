# My Notes Fullstack

一个基于 React 和 Node.js 的现代化全栈笔记应用，采用玻璃拟态 (Glassmorphism) 设计风格，集成了 AI 辅助功能和 Markdown 实时预览。

## 🌟 核心特性

- **玻璃拟态设计**: 现代、美观、动感的 UI 界面，支持深色模式。
- **Command Center**: 通过 `Ctrl + K` 快速开启全局搜索和快捷命令。
- **Markdown 编辑器**: 支持实时预览、语法高亮和图片上传的高级编辑体验。
- **AI 智能助手**: 集成 Google Gemini API，提供内容摘要、标签提取、智能对话和文本润色。
- **高性能日志系统**: 后端集成 Morgan 和自定义 Winston Logger，确保运行状态透明可追溯。
- **身份验证**: 基于 JWT 的安全用户认证系统。
- **持久化存储**: 使用高性能的 SQLite (Better-SQLite3) 进行数据管理。
- **一键式部署/运行**: 提供完善的启动/停止脚本，适配 Windows、Linux 和 macOS。

## 🛠️ 技术栈

### 前端

- **基础**: React 19, TypeScript, Vite
- **样式**: Tailwind CSS 4, Framer Motion (细腻动画)
- **组件库**: Radix UI, Lucide React, Sonner (通知)
- **插件**: react-markdown, react-syntax-highlighter

### 后端

- **运行环境**: Node.js (Express 5)
- **数据库**: SQLite (Better-SQLite3)
- **AI 接口**: Google Generative AI (@google/generative-ai)
- **日志**: Morgan, Winston
- **认证**: JWT (jsonwebtoken), bcryptjs

## 🚀 快速开始

### 1. 安装依赖

在项目根目录下，运行以下命令自动安装前后端所有依赖：

```bash
npm run install:all
```

### 2. 配置环境

本项目采用多环境配置，请在根目录下修改对应的环境文件：

- 开发环境: `.env.development`
- 生产环境: `.env.production`

主要配置项包括：

```env
PORT=3002
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key
VITE_APP_TITLE=My Notes
```

### 3. 运行项目

推荐使用根目录提供的一键脚本：

#### Windows

- **启动**: 运行 `start.ps1` 或双击 `start.bat`。
- **停止**: 运行 `stop.ps1` 或双击 `stop.bat`。

#### Linux/macOS

- **启动**: `./start.sh`
- **停止**: `./stop.sh`

#### 纯命令行模式 (开发)

```bash
npm run dev # 同时启动前后端
```

## 📁 项目结构

```text
my-notes-fullstack/
├── client/           # 前端 React 应用 (Vite + TS)
├── server/           # 后端 Express 服务器
├── data/             # 数据库文件及上传资源
│   ├── notes.db      # SQLite 数据库
│   └── uploads/      # 用户上传图片
├── .env.development  # 开发环境配置
├── .env.production   # 生产环境配置
├── start.*           # 各平台启动脚本
├── stop.*            # 各平台停止脚本
└── package.json      # 项目管理配置
```

## 📜 许可证

本项目采用 ISC 许可证。
