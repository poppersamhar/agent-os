# AgentOS 架构设计 —— 基于 Anthropic Managed Agents 的融合方案

> 本文档记录了 AgentOS 产品架构与 Anthropic Managed Agents 理念的融合设计思路，供团队内部参考与迭代。

---

## 1. 背景与目标

AgentOS 是一个面向 B 端的企业级 Agent 操作系统，核心定位不是让模型"回答得更好"，而是让企业能够：

- **编排任务流**：将复杂任务拆解为可执行的子任务序列
- **持续上下文组织**：跨 Session、跨项目地沉淀和复用上下文
- **可治理可审计**：所有 Agent 行动可追溯、可度量、可管控

系统整体分为三层：

| 层级 | 名称 | 定位 |
|------|------|------|
| 第一层 | 效能管理智能体 | 全局视角：风险监控、自动化覆盖率、能力缺口分析 |
| 第二层 | 管理智能体（群主） | 动态编排：计划、执行、审查，以"群聊"形态调度任务 |
| 第三层 | 普通 Agent / Skill | 具体执行：第三方 Agent、封装 Skill、知识工程、数据分析等 |

在架构演进过程中，我们参考了 Anthropic 发布的 [Managed Agents](https://www.anthropic.com/engineering/managed-agents) 工程实践，将其中关于**解耦、持久化 Session、上下文工程、安全边界**等核心思想融入产品架构。

---

## 2. Anthropic Managed Agents 核心抽象

Anthropic 将 Agent 系统虚拟化为三个通用接口，类似于操作系统对硬件的抽象（进程、文件）：

| 抽象 | 职责 | 关键接口 |
|------|------|----------|
| **Session** | 持久化的、只追加的事件日志（append-only log），**不是** LLM 的 context window | `getEvents(id)`、`emitEvent(id, event)` |
| **Harness** | 调用 LLM 并路由 tool calls 的循环，即"大脑" | `wake(sessionId)`，管理 context→LLM→tool→result 循环 |
| **Sandbox/Hands** | 执行环境，运行代码、调用工具、操作文件 | `execute(name, input) → string`、`provision({resources})` |

### 2.1 三大设计哲学

**1. Cattle, not Pets（解耦）**

Harness（大脑）、Sandbox（手）、Session（记忆）必须能独立失败、独立替换。不能因为容器挂了就把会话丢了。

**2. Session ≠ Context Window**

Session 是**外部可查询的上下文对象**，Harness 通过 `getEvents()` 按位置切片读取历史，再决定怎么组织进 LLM 的上下文。这样 compaction、trimming、caching 都可以在 Harness 层灵活演进，不破坏原始记录。

**3. Many Brains, Many Hands**

一个 Harness 可以连接多个 Sandbox/Tool（Many Hands）；多个 Harness 可以共享或传递 Hands。所有执行端统一为 `execute(name, input) → string`，Harness 不感知背后是容器、MCP 还是第三方 API。

---

## 3. 与 AgentOS 三层架构的映射关系

Anthropic 的抽象与 AgentOS 的三层架构天然对应，但存在关键视角差异：

| AgentOS 架构 | Anthropic 对应 | 当前可能的差距 |
|-------------|---------------|-------------|
| **第一层：效能管理智能体** | 基于 Session Log 的全局观测与治理层 | 如果"群聊"只是内存中的消息队列，第一层很难做真正的审计与风险分析 |
| **第二层：管理智能体（群主）** | **Harness** | 群主如果是"运行在某个容器里的 Agent"，就可能变成了 Pet；需要与执行环境解耦 |
| **第三层：普通 Agent / Skill** | **Hands / Sandbox / Tools** | 需要统一为 `execute(name, input)` 接口，且不应接触凭证 |

**一句话总结：AgentOS 的"群聊"概念应该升级为 Anthropic 的 Session 抽象，群主应该升级为 Harness 抽象，Skill 层应该升级为 Hands 抽象。**

---

## 4. 关键融入建议

### 4.1 Session 层：把"群聊"变成可审计的事件日志

**现状风险：** 如果群聊是消息队列或内存状态，容器重启、服务迁移时上下文会丢失，第一层效能管理也拿不到完整历史做风险分析。

**借鉴做法：**

- **群聊即 Session，Session 即 Append-only Log**
  - 每个项目/Session 对应一个持久化的事件流，记录：谁说了什么、群主下了什么计划、@了谁、Skill 返回了什么结果、是否报错、是否重试。

- **Harness（群主）通过查询接口读取历史，而非直接持有历史**
  - 群主 Agent 不直接把"群聊 500 条消息"塞进 prompt。而是调用 `session.getEvents(start, end)` 按需切片，再由 Harness 层做 context engineering（摘要、过滤、组织）。

- **第一层效能管理直接查询 Session Log**
  - 风险分析、自动化覆盖率、能力缺口分析，都基于对 Session Log 的离线分析。例如：
    - 统计某类任务平均要 @ 几次 Skill 才能完成 → 能力缺口
    - 检测某 Skill 频繁返回错误 → 风险/质量下降
    - 统计人类员工在哪个审批节点频繁介入 → 自动化覆盖率不足

> **引入接口：`SessionService.getEvents(sessionId, range) -> Event[]`**

### 4.2 Harness 层：群主 Agent 要与 Skill 解耦

**现状风险：** 如果群主 Agent 和 Skill Agent 跑在同一个运行时/容器里，Skill 崩溃可能导致群主也挂掉；或者群主必须等 Skill 环境初始化完才能开始推理（TTFT 高）。

**借鉴做法：**

- **群主（Harness）是"无状态"的**
  - 群主只负责：读取 Session → 组织上下文 → 调用 LLM → 拿到 tool call → 通过统一接口调用 Skill → 把结果写回 Session。
  - 如果群主进程挂了，新拉起一个实例，读取同一个 Session Id，从最后一条事件恢复。

- **Skill 调用统一为 `execute(skillName, input) → string`**
  - 群主不直接 import/调用 Skill 代码，而是通过 RPC/MCP/HTTP 调用。对群主来说，第三方 Agent、本地 Skill、知识工程服务、数据分析沙箱，都是同一个接口。

- **Lazy Provisioning（延迟初始化）**
  - 不是一建群就把所有 Skill 的容器都拉起来，而是群主决定调用某个 Skill 时，才触发 `provision()`。这样空群聊或纯讨论型 Session 的启动延迟极低。

> **引入接口：`SkillRouter.execute(skillId, input) -> Result`，`Sandbox.provision(config) -> Handle`**

### 4.3 Hands 层：Skill/Agent 是"可替换的牛"，不是"宠物"

**现状风险：** 如果某个 Skill 是专门为某个项目调教的、或者其状态只能存在于特定容器里，那这个 Skill 就是 Pet。

**借鉴做法：**

- **Skill 无状态化**
  - Skill 接收 input，返回 output，不维护跨任务的内部状态。需要持久化的状态写回 Session 或外部存储。

- **失败即替换**
  - Skill 执行失败（超时、报错、返回格式不对），群主 Harness 像 Anthropic 那样把错误当 tool-call error 捕获，自行决定重试、降级或换另一个 Skill。

- **Many Hands 支持**
  - 一个群主可以同时持有多个 Skill Handle。比如一个数据分析任务，群主同时把 SQL 生成交给 Skill A、把可视化交给 Skill B、把数据校验交给 Skill C，自己等结果后整合。

### 4.4 安全与凭证：关键的企业级加固

Anthropic 花了很大篇幅讲安全边界，这对 B 端极其重要：

- **凭证绝不进入 Sandbox / Skill 环境**
  - 第三层 Skill（尤其是第三方 Agent 或代码执行沙箱）不应该拿到数据库密码、API Key。采用 Proxy/Vault 模式：
    - 群主 Harness 也不持有凭证。
    - 独立的安全代理根据 Session 和 Skill 的权限配置，从 Vault 取凭证，代理请求外部服务。
    - Skill 调用的是"已授权代理端点"，而非直接调用外部 API。

- **可审计的行动系统**
  - 因为所有 tool calls 都通过 `execute()` 接口，且结果都写回 Session Log，第一层效能管理可以完整还原：谁在什么时间、基于什么上下文、调用了什么 Skill、传了什么参数、返回了什么。这是真正的可治理。

### 4.5 上下文工程外化：群主不是"记性好"，而是"会查档案"

这是 Anthropic 文章最深刻的点：

> *"The session provides this same benefit, serving as a context object that lives outside Claude's context window."*

映射到 AgentOS：

- **群主的"记忆"不在 prompt 里，而在 Session Log 里**
  - 跨 Session 的上下文，不是通过"给群主塞一个超长 summary"实现的，而是群主在新的 Session 中通过查询历史 Session 的 Event Log 来重建上下文。

- **Context Engineering 是 Harness 层的实现细节**
  - 未来模型能力变了（比如上下文窗口从 200k 变 2M），不需要改群主的业务逻辑，只需要升级 Harness 层怎么组织 `getEvents()` 的结果。这正符合产品"目标不是让模型回答更好，而是让企业能编排任务流"的定位。

---

## 5. 架构调整示意图

```
┌─────────────────────────────────────────┐
│  第一层：效能管理智能体                    │
│  (分析所有 Session Logs，做风险/覆盖率/缺口) │
└─────────────────────────────────────────┘
                    ↑ 查询/审计
┌─────────────────────────────────────────┐
│  Session Store (Append-only Event Log)   │
│  - getEvents(sessionId, range)           │
│  - emitEvent(sessionId, event)           │
└─────────────────────────────────────────┘
         ↑读取/恢复          ↓写入
┌─────────────────────────────────────────┐
│  第二层：管理智能体 / Harness（群主）      │
│  - wake(sessionId): 从上次事件恢复         │
│  - 计划→@调用→审查循环                    │
│  - 上下文工程(从Session选事件组织prompt)   │
└─────────────────────────────────────────┘
                    ↓ execute(name, input)
┌─────────────────────────────────────────┐
│  第三层：Hands / Skills / Sandboxes      │
│  - 各类Skill：SQL分析、搜索、代码执行...    │
│  - 第三方Agent(MCP等)                    │
│  - 统一接口，无状态，失败可替换             │
│  - 凭证由外部Vault代理，不进入Sandbox      │
└─────────────────────────────────────────┘
```

---

## 6. 前端交互设计与架构的对应

前端采用**三分法布局**，与后端架构一一对应：

| 前端区域 | 对应架构层 | 核心功能 |
|---------|-----------|---------|
| **左侧导航** | 全局入口 | 项目（Session）、Agent、Skill 的快速切换 |
| **中间/右侧聊天** | Harness 交互层 | 人类员工与群主/Agent/Skill 的群聊式任务协作 |
| **右侧可视化** | 治理与观测层 | 任务流、知识图谱、Agent 状态、审计日志 |

**主页（全局助手）**：
- 左侧聊天框 ↔ 与第一层"效能管理智能体"对话
- 右侧仪表盘 ↔ 全局 KPI、风险事件、能力缺口分析
- 体现"全局搜索能力通过聊天交互呈现"

**项目页（群聊）**：
- 右侧聊天框 ↔ 与第二层"群主 Agent"及第三层 Agent/Skill 的群聊
- 左侧可视化 ↔ 任务执行流、知识图谱、审计日志
- 体现"群主拉人进群、@下派任务、Many Hands"

**Agent/Skill 页**：
- 左侧列表 ↔ 第三层 Hands 目录
- 右侧交互面板 ↔ 与单个 Agent/Skill 的单聊测试与配置修改
- 体现"每个 Hand 都是独立接口，可单独调试"

---

## 7. 下一步演进方向

1. **接口层先行**：定义 `Session`、`Harness`、`Skill/Hand` 的核心接口（`getEvents` / `execute` / `wake`）。接口定了，实现可以慢慢换。

2. **Session 存储落地**：把"群聊"从内存/消息队列迁移为持久化 Event Log。这是第一层效能管理能运转的前提。

3. **凭证与沙箱隔离**：为 B 端安全治理，先把 Skill 执行环境和凭证拆分开，哪怕早期只做一个简单的 Proxy。

4. **上下文管理 Harness 化**：将群主 Agent 的 prompt 组装逻辑从硬编码改为从 Session Log 动态读取，支持 compaction、trimming 等策略的可插拔。

5. **多 Harness 支持**：第二层本身也可以有多种 Harness 实现（有的重规划、有的重执行），通过统一接口接入第一层治理，向 Meta-harness 演进。

---

## 参考链接

- Anthropic Managed Agents: https://www.thereturnstatement.com/p/managed-agents
- 原文 Engineering Blog: https://www.anthropic.com/engineering/managed-agents
