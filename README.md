# 💰 记账本

一个功能完整的个人日常支出管理应用，纯前端实现，支持移动端和桌面端双布局。

## 功能

- **📊 概览仪表盘** — 日历热力图、分类占比环形图、分类对比柱状图、每日趋势折线图、周消费分布、金额分布、大额支出排行、预算进度
- **💸 明细管理** — 表格视图（桌面）/ 卡片视图（移动），搜索、按分类/日期筛选、排序（日期/金额）、批量删除、导出
- **➕ 快速记账** — 金额、分类、日期、备注，移动端底部滑出，桌面端居中弹窗
- **👤 多账户** — 创建多个独立账本（个人/家庭/工作），数据完全隔离，一键切换
- **📁 本地同步** — 支持绑定本地文件夹，数据自动同步为 JSON 文件，双重备份
- **🌙 暗色模式** — 一键切换日间/夜间主题
- **🖥️ 响应式布局** — 移动端（480px 居中）和桌面端（全宽侧边栏）独立设计，一键切换
- **🔧 自定义仪表盘** — 拖拽排序模块，显隐切换，布局持久化
- **📤 数据导入导出** — JSON 格式，方便备份和迁移

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（热更新）
npm run dev

# 生产构建
npm run build

# 预览构建产物
npm run preview
```

或者直接双击 **`启动.bat`**（自动安装依赖、构建、启动）。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 |
| 构建 | Vite |
| 图表 | Recharts |
| 样式 | CSS Modules |
| 存储 | localStorage + File System Access API |

## 项目结构

```
记账/
├── index.html
├── package.json
├── vite.config.js
├── server.cjs              # 生产模式迷你服务器
├── 启动.bat                 # 一键启动脚本
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css            # 全局样式 & CSS 变量
│   ├── context/
│   │   └── AppContext.jsx   # 全局状态管理
│   ├── utils/
│   │   ├── storage.js       # localStorage & 文件系统 API
│   │   ├── stats.js         # 统计计算
│   │   └── helpers.js       # 工具函数
│   ├── data/
│   │   └── defaults.js      # 默认分类 & 账户
│   └── components/
│       ├── Header/          # 顶部栏（账户切换、导航、主题/布局切换）
│       ├── Dashboard/       # 概览仪表盘
│       ├── ExpenseList/     # 明细列表
│       ├── ExpenseForm/     # 记账表单
│       ├── Settings/        # 设置页
│       └── AccountSwitcher/ # 账户切换器
```

## 浏览器支持

- Chrome / Edge 86+（完整功能，支持本地文件夹同步）
- Firefox / Safari（基础功能，不支持本地文件夹 API）
