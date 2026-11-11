# AgentOS 产品架构与流程

> **AgentOS 是一个智能体管理平台。**
> 用户用智能体完成项目和任务，也能用智能体创作、沉淀技能和连接器；用得好的智能体可以沉淀为专家或专家团。
> 这些专家、专家团、技能、连接器成为公司的资产，汇聚成智能体市场，并可以被第三方 Agent 调用。

本文所有图都使用 Mermaid 绘制，GitHub 会直接渲染。

- [1. 产品全景](#1-产品全景)
- [2. 核心概念](#2-核心概念)
- [3. 系统架构](#3-系统架构)
- [4. 智能体的生命周期](#4-智能体的生命周期)
- [5. 关键流程](#5-关键流程)
- [6. Agent Market 与第三方接入](#6-agent-market-与第三方接入)
- [7. 界面结构](#7-界面结构)
- [8. 名称对照](#8-名称对照)

---

## 1. 产品全景

一句话：**用智能体干活 → 在干活中长出能力 → 把成熟的能力沉淀为公司资产 → 通过市场复用和对外开放。**

```mermaid
flowchart LR
    U(["👤 用户 / 团队"])

    subgraph WORK["① 用智能体工作"]
        A["智能体<br/>完成项目与任务"]
    end

    subgraph GROW["② 在工作中创作能力"]
        S["技能<br/>会什么"]
        C["连接器<br/>连到哪些系统"]
    end

    subgraph SETTLE["③ 沉淀"]
        E["专家"]
        T["专家团"]
    end

    subgraph ASSET["④ 公司资产：智能体市场"]
        M[("Agent Market<br/>专家 · 专家团 · 技能 · 连接器")]
    end

    X(["🤖 第三方 Agent / 产品"])

    U -->|新建、对话、交代任务| A
    A -->|自主添加、移除| S
    A -->|自主申请、使用| C
    A -->|用得顺手| E
    A -->|多智能体协作| T
    E -->|发布 · 审批| M
    T -->|发布 · 审批| M
    S -->|发布 · 审批| M
    C -->|发布 · 审批| M
    M -->|一键添加，复用| U
    M -->|MCP 远程调用 / 插件包| X
```

---

## 2. 核心概念

**智能体是唯一的基本单位。** 每个页面、每段对话都是一个智能体；不再区分会话、项目、任务。智能体本身就是记忆系统。专家和专家团是成熟的产物，但仍然是智能体。

```mermaid
flowchart TB
    subgraph SYS["系统智能体（平台内置）"]
        HOME["⬢ 首页<br/>企业效能管理智能体<br/>汇总全部智能体，治理入口"]
        SE["专家<br/>管理智能体、专家、专家团"]
        SK["技能<br/>创建、修改技能"]
        SC["连接器<br/>接入系统、管理凭证"]
    end

    subgraph USER["用户的智能体"]
        AG["智能体"]
        AGG["智能体群<br/>多个智能体协作"]
        EX["专家<br/>沉淀后的智能体"]
        TM["专家团<br/>沉淀后的智能体群"]
    end

    subgraph CAP["账号级共享能力"]
        SKILL["技能 Skill"]
        CONN["连接器 MCP<br/>凭证由 Vault 托管"]
    end

    AG -->|沉淀| EX
    AGG -->|沉淀| TM
    AG -. 组成 .-> AGG
    AG -->|使用| SKILL
    AG -->|使用| CONN
    HOME -->|汇总 · 调度| AG
    SE -->|管理| EX
    SE -->|管理| TM
    SK -->|管理| SKILL
    SC -->|管理| CONN
```

一个智能体由这些部分组成：

```mermaid
classDiagram
    class 智能体 {
        名称
        头像：形状 × 颜色
        角色与目标
        模型
        对话（无会话之分）
        记忆：团队 / 个人
        工作台：由能力组装
        运行记录
        是否已沉淀
    }
    class 技能 {
        名称 · 说明
        版本 · 负责人
        调用次数 · 失败率
        可提供的工作台组件
    }
    class 连接器 {
        名称 · 地址
        工具列表
        凭证：Vault 托管
        启用 / 停用
        可提供的工作台组件
    }
    class 智能体群 {
        成员智能体
        共享上下文
    }
    智能体 "多" --> "多" 技能 : 自主添加 / 移除
    智能体 "多" --> "多" 连接器 : 自主申请 / 使用
    智能体群 o-- 智能体 : 成员
```

---

## 3. 系统架构

```mermaid
flowchart TB
    L1["<b>交互层</b><br/>首页 · 智能体页<br/>专家 · 技能 · 连接器<br/>Agent Market · 通知中心"]
    L2["<b>智能体层</b><br/>运行：对话 · 任务 · 记忆<br/>工作台：按能力组装<br/>生长：补齐技能、连接器<br/>沉淀：→ 专家 / 专家团"]
    L3["<b>能力层</b><br/>技能库 · 连接器库<br/>Vault 凭证托管"]
    L4["<b>资产与治理层</b><br/>市场：官方 · 企业 · 我的<br/>版本 · 负责人 · 失败率<br/>发布审批 · 调用审计"]
    L5["<b>开放层</b><br/>MCP 远程调用（托管运行）<br/>插件包（SKILL.md · 定义文件）"]

    USER(["用户 / 团队"]) --> L1
    L1 --> L2
    L2 --> L3
    L2 --> L4
    L3 --> L4
    L4 --> L5
    L5 --> EXT(["第三方 Agent / 产品"])
    L3 -->|连接器经 Vault 取凭证| SYSTEMS(["企业系统<br/>飞书 · GitHub · ERP …"])

    classDef layer fill:#FAF8F4,stroke:#CAC3B9,color:#222D45,text-align:left
    class L1,L2,L3,L4,L5 layer
```

**工作台怎么生成**：智能体不生成代码，只生成一份声明式的布局描述，由固定的组件库渲染，保证视觉统一、可治理、可版本化。

```mermaid
flowchart LR
    P["角色与目标"] --> SPEC
    SK1["已用技能<br/>例：数据巡检 → 异常趋势"] --> SPEC
    CN1["已用连接器<br/>例：GitHub → PR 与 Issue"] --> SPEC
    CORE["通用组件<br/>待你处理 · 运行记录 · 最近成果"] --> SPEC
    SPEC["工作台布局描述<br/>（JSON）"] --> LIB["固定组件库渲染"] --> BOARD["智能体的工作台"]
```

---

## 4. 智能体的生命周期

```mermaid
stateDiagram-v2
    [*] --> 智能体 : 新建（起名 · 选头像）<br/>或从市场添加
    智能体 --> 智能体 : 对话 · 完成任务<br/>自主添加技能 / 连接器
    智能体 --> 专家 : 沉淀
    智能体群 --> 专家团 : 沉淀
    专家 --> 待审批 : 提交发布到企业市场
    专家团 --> 待审批 : 提交发布到企业市场
    待审批 --> 已上架 : 管理员通过
    待审批 --> 专家 : 退回（附意见）
    已上架 --> 已上架 : 新版本
    已上架 --> [*] : 下架
```

---

## 5. 关键流程

### 5.1 新建智能体并完成任务

```mermaid
sequenceDiagram
    actor U as 用户
    participant UI as AgentOS
    participant A as 新智能体
    participant H as 首页

    U->>UI: 点「+」新建智能体
    UI-->>U: 左：起名 + 选头像<br/>右：推荐的专家 / 专家团
    U->>UI: 起名「产品经理」，创建
    UI->>A: 创建（无需配置技能和连接器）
    A-->>U: 打招呼 + 选择卡「你希望我先帮你做什么？」
    U->>A: 选 B「写一份 PRD」
    activate A
    A->>A: 需要时自主添加技能 / 连接器
    A-->>U: 交付成果 PRD.md
    deactivate A
    A->>H: 更新运行记录与状态
    H-->>U: 首页工作台汇总进展
```

### 5.2 在对话中创作技能和连接器

```mermaid
sequenceDiagram
    actor U as 用户
    participant SK as 技能（系统智能体）
    participant SC as 连接器（系统智能体）
    participant LIB as 技能库 / 连接器库
    participant A as 智能体

    U->>SK: 新建一个「投诉分析」技能
    SK->>LIB: 创建技能 v0.1.0
    SK-->>U: 已创建，右侧面板同步出现
    U->>SC: 接入「工单系统」，地址 mcp://…
    SC->>LIB: 登记连接器（凭证待管理员在 Vault 配置）
    SC-->>U: 已登记
    A->>LIB: 工作中需要时自主使用
```

### 5.3 沉淀为专家并发布到市场

```mermaid
sequenceDiagram
    actor U as 用户
    participant A as 智能体
    participant N as 通知中心
    actor ADM as 管理员
    participant M as Agent Market

    U->>A: 工作台右上角「沉淀为专家」
    A->>A: 标记为专家，保留角色、技能、连接器与团队记忆
    opt 勾选「同时提交发布到企业市场」
        A->>N: 已提交审批
        N->>ADM: 待我审批
        alt 通过
            ADM->>M: 上架企业市场
            M->>N: 已通过审批
        else 退回
            ADM->>N: 发布被退回（附意见）
        end
        N-->>U: 审批结果
    end
```

---

## 6. Agent Market 与第三方接入

**定义可移植，实例有状态。** 市场里上架的是无状态的「定义」；添加到 AgentOS 后才实例化为有记忆的智能体。第三方按「专家团」的思路使用定义，AgentOS 按「智能体」的思路运行实例，两者不冲突。

```mermaid
flowchart LR
    subgraph DEF["市场里的定义（无状态、可移植）"]
        D1["专家定义<br/>角色 · 所需技能和连接器"]
        D2["专家团定义<br/>成员 · 分工"]
        D3["技能<br/>SKILL.md"]
        D4["连接器<br/>MCP 地址 · 工具"]
    end

    subgraph INST["AgentOS 里的实例（有状态）"]
        I1["智能体 / 专家<br/>记忆 · 对话 · 工作台 · 运行记录"]
    end

    subgraph EXT["第三方 Agent / 产品"]
        R1["远程调用（推荐、可计费）<br/>交代任务 · 查询进度 · 取回成果<br/>记忆、审批、审计留在企业内"]
        R2["插件包<br/>下载定义，用对方的模型运行"]
    end

    DEF -->|添加：连同依赖一起带上| INST
    INST -->|沉淀并发布| DEF
    INST -->|暴露为 MCP 服务| R1
    DEF -->|下载| R2
```

```mermaid
sequenceDiagram
    participant X as 第三方 Agent
    participant MCP as AgentOS MCP 网关
    participant GOV as 治理（授权 · 审计）
    participant E as 专家实例
    participant C as 连接器
    participant V as Vault

    X->>MCP: submit_task（企业接入令牌）
    MCP->>GOV: 校验授权
    GOV-->>MCP: 通过
    MCP->>E: 交给专家执行
    E->>C: 调用企业系统
    C->>V: 取凭证（不经过专家和第三方）
    V-->>C: 凭证
    C-->>E: 结果
    E-->>MCP: 成果
    MCP->>GOV: 记录调用
    X->>MCP: get_progress / get_result
    MCP-->>X: 进度 / 成果
```

市场来源分三层：**官方**（AgentOS 预置）、**企业**（同事发布、管理员审批）、**我的**（个人私有）。整个市场本身也是一个 MCP 插件，第三方 Agent 可以在对话里搜索、添加和调用市场内容。

---

## 7. 界面结构

![AgentOS 工作空间](media/agentos-v03-workspace.jpg)

| 区域 | 内容 |
|---|---|
| 顶部 | 仅首页显示 Logo 与 Agent OS；其他页面面板直接到顶，左上角是当前智能体的头像 |
| 面板 | 左：当前智能体的对话（可收起）；右：工作台，系统智能体则为管理面板 |
| 智能体栏 | 「+」新建智能体；其他智能体为头像 + 名字，当前对话的为深色胶囊 |
| 输入行 | 左：首页；中：输入框；右：专家 · 技能 · 连接器 |
| 右侧窄栏 | 头像（菜单里有「市场」）· 亮暗切换 · 通知 |

- 首页与专家、技能、连接器四个按钮：未选中时头像在上、名字在下；选中时为深色胶囊。
- 系统智能体用专属头像形状：首页是六边形，专家是团队，技能是星芒，连接器是插头。

---

## 8. 名称对照

界面与对外材料使用中文名称；代码与数据结构沿用 bot / skill / mcp。

| 对外名称 | 内部概念 | 说明 |
|---|---|---|
| 智能体 | Bot（未沉淀） | 完成项目和任务，在工作中自主添加、移除技能和连接器 |
| 智能体群 | Bot 群聊（未沉淀） | 多个智能体协作 |
| 专家 / 专家团 | 已沉淀的 Bot / 群聊 | 成熟、可复用，可发布到企业市场 |
| 首页 | 主 Bot（企业效能管理智能体） | 汇总全部智能体，治理入口 |
| 专家 / 技能 / 连接器 | 系统 Bot | 左边对话、右边管理面板 |
| 技能 | Skill | 智能体「会什么」 |
| 连接器 | MCP | 智能体「连到哪些系统」 |
| 工作台 | Dashboard | 由角色与能力组装 |
| 市场 | Agent Market | 公司的智能体资产 |

---

更多设计细节见 [产品设计 v0.3](PRODUCT_DESIGN_v0.3.md)。当前代码为前端交互原型：智能体回复为模拟，尚未接入模型、真实 MCP 与后端。
