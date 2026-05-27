# AgentOS

> AI-native 项目协同管理平台 —— 你的数字员工操作系统
> 版本：v0.1.0 | 状态：In Progress

---

## 产品概述

AgentOS 是一个面向 B 端团队的 AI 原生项目协同平台。核心转变是：**从「人管理任务」到「人指挥 Agent，Agent 执行任务」**。

人类员工通过自然语言与 AI Agent 协作，Agent 自动拆解任务、调度数字员工执行、产出结果并沉淀知识。

## v0.1.0 核心能力

### 已完成功能

| 能力 | 说明 |
|------|------|
| **账号系统** | 统一密码 `123` 登录，默认 Member，Sidebar 菜单支持 Member / Admin 切换 |
| **两栏布局** | 左侧 Sidebar（240px，可折叠）+ 右侧主内容区 |
| **Member 首页** | 个人数据看板（Token 消耗、活跃项目、任务成功率）+ OrgAgent 对话区 |
| **Admin 首页** | 全组织数据看板 + OrgAgent 对话区 + 组织管理导航 |
| **项目创建** | Sidebar `[+]` 或 OrgAgent 对话触发，项目为创建者私有 |
| **项目页** | 任务列表 + WorkAgent 对话区 + 文件 Tab（上下文 + 产物） |
| **任务创建** | 项目内 / 独立任务两种模式 |
| **任务执行页** | 聊天式执行流，8 种消息类型（member/workagent/question/plan/subagent/completion/system/permission）|
| **右侧面板** | 任务树 / 项目树 两 Tab |
| **Skills 页** | Skill 列表（预设 + 自建），Skill Creator 创建引导 |
| **连接器页** | 外部系统与数字员工连接 |
| **知识库页** | 全局知识图谱 + 知识源管理，与 Skills/连接器并列 |
| **Sidebar 操作** | 项目置顶 / 重命名 / 归档删除，任务置顶 / 重命名 / 归档删除 |
| **聊天输入** | `+` 号附件上传，Token 用量指示器 |

### 三层数据流

```
任务级 context.md  ──→  项目级 context.md（自动汇总） ──→  首页上下文记忆
```

- **任务级**：单个任务执行过程中 WorkAgent 维护的上下文
- **项目级**：所有任务 context.md 自动汇总，项目页产物卡片置顶展示
- **首页级**：点击项目 context.md 可 `@引用` 到 OrgAgent 输入框

## 产品架构

```
┌─────────────────────────────────────────────┐
│  第一层：企业效能管理智能体（OrgAgent）         │
│  全局视角：跨项目分析、风险监控、审批汇集       │
├─────────────────────────────────────────────┤
│  第二层：管理智能体（WorkAgent）               │
│  任务编排：需求解析 → 方案规划 → 数字员工调度   │
├─────────────────────────────────────────────┤
│  第三层：数字员工（Sub-Agent / Skill / Tool）  │
│  原子执行：数据采集、代码生成、报告撰写...     │
└─────────────────────────────────────────────┘
```

参考：`docs/ARCHITECTURE.md`

## 项目结构

```
agent-os/
├── src/
│   ├── components/          # React 组件
│   │   ├── App.tsx          # 路由 + 状态管理
│   │   ├── Sidebar.tsx      # 侧边导航
│   │   ├── Dashboard.tsx    # 首页数据看板
│   │   ├── ProjectView.tsx  # 项目页
│   │   ├── TaskSpace.tsx    # 任务执行页（核心）
│   │   ├── KnowledgeGraph.tsx # 知识图谱可视化（全局 + 项目级）
│   │   ├── KnowledgePage.tsx # 知识库页（全局知识图谱 + 知识源）
│   │   ├── SkillPage.tsx    # Skills 列表页
│   │   ├── ConnectorPage.tsx # 连接器页
│   │   └── LoginPage.tsx    # 登录页
│   ├── data/
│   │   └── mockData.ts      # Mock 数据（4 个完整任务对话流）
│   ├── types/
│   │   └── workagent.ts     # 核心类型定义
│   └── contexts/
│       └── ThemeContext.tsx # 主题管理
├── docs/
│   ├── AgentOS_PRD_v0.1.0.md    # 产品需求文档
│   ├── ARCHITECTURE.md          # 系统架构设计
│   └── GRAPH_UI_SPEC.md         # 图谱 UI 规范
├── features/
│   └── v0.1.0.md                # v0.1.0 Feature 设计文档
├── FEATURE_LIST.md              # Feature 追踪总表（36 个 Feature）
├── backend/                     # 后端源码（NestJS）
└── package.json
```

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS v4
- **后端**：NestJS（`backend/` 目录）
- **构建**：pnpm + Vite

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建
pnpm build
```

## 文档导航

| 文档 | 说明 |
|------|------|
| [FEATURE_LIST.md](FEATURE_LIST.md) | **Feature 追踪总表**（36 个 Feature，含优先级、状态、验收标准）|
| [features/v0.1.0.md](features/v0.1.0.md) | v0.1.0 版本详细设计文档 |
| [docs/AgentOS_PRD_v0.1.0.md](docs/AgentOS_PRD_v0.1.0.md) | 产品需求文档（概念定义 + 用户角色 + 核心流程）|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 系统架构设计（三层架构 + Anthropic Managed Agents 映射）|
| [docs/GRAPH_UI_SPEC.md](docs/GRAPH_UI_SPEC.md) | 知识图谱 UI 设计规范 |

---

*AgentOS © 2026*
