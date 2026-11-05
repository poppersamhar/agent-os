# KodaX 产品矩阵、AgentMemBase 与 TraceOps 上下文输入

> 用途：本文档用于开启新的产品、设计、架构或融资叙事对话。请把它当作当前 KodaX 生态的基础上下文，而不是最终对外宣传稿。
>
> 当前日期：2026-07-02。

## 0. 核心判断

KodaX 生态不是三款互相竞争的产品，而是一套三位一体的企业 Agent 产品矩阵。

- **KodaX CLI**：更懂企业的软件设施运维与软件流程。
- **KodaX Space**：更懂企业员工，承接员工个人电脑和端侧执行。
- **AgentOS**：更懂企业本身，是更上层的管理智能体层。
- **AgentMemBase**：横跨企业已有数据与知识的数据取用治理框架。
- **TraceOps**：横跨 KodaX CLI、KodaX Space、AgentOS 的运行经验沉淀与自蒸馏系统。

一句话概括：

> KodaX CLI 让企业软件设施和流程 Agent 化；KodaX Space 让 Agent 进入员工真实工作现场；AgentOS 让企业能够管理、编排和治理 Agent；AgentMemBase 让企业已有数据与知识被 Agent 合理取用；TraceOps 让每一次真实任务都沉淀为可回放、可治理、可训练、可反哺的经验资产。

## 1. 产品矩阵

| 产品 | 核心定位 | 核心对象 | 边界 |
|---|---|---|---|
| KodaX CLI | 企业软件设施运维、软件流程与代码工程能力 | 代码库、命令行、DevOps、软件工程流程、工具调用、执行环境 | 不承载企业项目协同和组织级治理 |
| KodaX Space | 企业员工本地执行端 | 员工个人电脑、本地文件、浏览器、IDE、账号、本地工具、端侧权限 | 不负责组织记忆、项目总控和企业市场治理 |
| AgentOS | 更懂企业本身的管理智能体层 | 企业、组织、项目、员工、审批、企业记忆、Skill、Connector、PAT | 不直接替代 Space 执行任务，负责上层管理、调度、治理和协同 |
| AgentMemBase | 企业数据与知识的取用治理框架 | 数据库、知识库、Skill、Connector、过程记忆、决策记录、权限、时效、装配规则 | 不是记忆数据库，不重造数据源，管“怎么合理取用” |
| TraceOps | 横跨三层的运行经验沉淀与自蒸馏系统 | Trace、事件、上下文快照、回放、质量评分、训练授权、数据集 | 不是新的任务入口，不无差别采集企业数据，先治理再训练 |

## 2. KodaX CLI

KodaX CLI 是整个体系的底层能力入口。它不仅是 Coding 工具，更重要的是更懂企业的软件设施、软件运维和软件流程。

它承担：

- 代码理解与修改。
- 命令行和工具调用。
- DevOps / 运维流程执行。
- 软件工程流程理解。
- 工程环境、仓库、测试、部署链路的执行。
- Agent + Harness 的底层协同。
- 细粒度执行 Trace 的产生。

当前产品判断：

> KodaX 应尽量作为统一 Agent 内核。AgentOS 中不同 Agent 的差异，不应该来自重写一套 Agent 能力，而应该来自角色配置、上下文、Skill、工具、权限和企业数据。

## 3. KodaX Space

KodaX Space 是面向企业员工的本地执行端。

它更懂企业员工，因为它接近员工的真实工作现场：

- 个人电脑。
- 本地文件。
- 浏览器。
- IDE。
- 企业账号。
- 本地工具。
- 端侧权限。
- 临时上下文。

Space 的主线是执行任务。

它承担：

- 接收来自本人、PAT 或 AgentOS 的任务请求。
- 在员工个人电脑上创建和执行任务。
- 下载并调用企业 Skill。
- 连接 Connector / MCP / 数据源。
- 调用 KodaX 内核完成本地任务。
- 将执行结果、状态、证据和摘要通过 PAT 回传给 AgentOS。

Space 不应该承担企业级组织治理，不应该成为项目总控，也不应该替代 AgentOS 管理企业记忆、Skill 市场、Connector 市场和审批。

## 4. AgentOS

AgentOS 是更懂企业本身的管理智能体层。

它的主线不是像 Space 一样做任务，而是更上层的管理智能体系统。

AgentOS 负责管理和组织：

- 企业。
- 组织。
- 员工。
- 项目。
- 审批。
- 企业记忆。
- Skill。
- Connector。
- PAT。
- 跨成员协同。
- 项目上下文。
- 企业级治理。
- AgentMemBase 数据取用治理。
- TraceOps 经验资产。

AgentOS 的价值不是“直接执行员工电脑上的任务”，而是：

- 管理企业对象。
- 管理组织关系。
- 管理项目协同。
- 管理企业能力资产。
- 管理权限和审批。
- 管理 Agent 对企业数据和知识的合理取用。
- 管理从 Space 回传的结果、证据和状态。
- 让企业智能体运行过程可沉淀、可治理、可复用。

一句话：

> AgentOS 是更懂企业本身的管理智能体层，负责把项目、员工、审批、企业记忆、Skill、Connector、AgentMemBase 数据取用、本地 Space 执行与 TraceOps 经验资产组织成可治理的企业协同系统。

## 5. AgentOS 的三个核心 Agent

AgentOS 当前由三个主要智能体构成：

- PAT Agent / Personal Agent。
- OrgAgent。
- ProjectAgent。

它们共享 KodaX 内核，通过角色配置、权限、上下文、工具和 Skill 区分职责。

### 5.1 PAT Agent / Personal Agent

PAT 也叫 Personal Agent。

定位：

> PAT 是 AgentOS 和 Space 之间的数据与任务通讯层。

PAT 不负责企业治理，不负责项目总控，也不替代 Space 执行任务。它的价值是通讯、路由、提醒、授权、状态同步和结果回传。

PAT 负责在 AgentOS 和 Space 之间搬运两类消息：

#### 5.1.1 数据消息

数据消息用于让 Space 获得执行任务所需的能力、工具、数据或上下文。

典型场景：

- Space 下载企业技能市场中的 Skill。
- Space 连接 Connector / MCP。
- Space 请求可能需要的数据库或数据源。
- Space 访问企业记忆库中的某些片段。
- Space 通过 AgentMemBase 请求合理取用企业数据与知识。
- Space 同步项目上下文、文件索引或字段口径。
- Space 回传结构化摘要、证据、哈希、字段口径和结果文件索引。

#### 5.1.2 任务消息

任务消息用于让 Space 创建并执行具体任务。

典型场景：

- 本人主动发起的任务请求或个人消息。
- ProjectAgent 分发给成员的项目任务。
- 同项目其他成员产生的协作消息和任务消息。
- 需要成员确认、授权或审批的任务。
- Space 执行完成后，通过 PAT 回传到对应项目页和 ProjectAgent。

PAT 关键能力：

- 消息收件箱。
- 数据通道与任务通道分类。
- 未读、提醒、回执和状态追踪。
- 权限确认。
- Space 任务创建。
- Skill 下载、Connector 连接、数据访问请求转发。
- 执行结果回传。
- trace_id 透传。
- 端侧敏感数据出端边界控制。

### 5.2 OrgAgent

OrgAgent 是企业级治理与市场管理 Agent。

它管理：

- 首页。
- 个人视角。
- 管理视角。
- 企业与个人效能面板。
- 审批中心。
- 企业记忆库。
- 技能市场。
- 连接器市场。
- AgentMemBase 取用治理。
- Skill / MCP / 数据 / Connector 相关审批。
- TraceOps 治理和训练授权。

#### 5.2.1 首页视角

OrgAgent 首页分为个人视角和管理视角。

个人视角展示：

- 个人效能。
- 待处理事项。
- Space 回传。
- 个人项目贡献。
- PAT 状态。
- 个人 Token 消耗。
- 个人记忆贡献。

管理视角展示：

- 企业效能。
- 员工数据。
- Token 消耗。
- 项目价值。
- 成员负载。
- Space 在线状态。
- 审批总览。
- Skill 上架审批。
- Connector 上架审批。
- 企业记忆库入库审批。

#### 5.2.2 企业级能力资产

OrgAgent 管理三个核心企业级能力资产：

1. **企业记忆库**
   - 个人可以上传文档、项目记忆或经验候选。
   - 管理视角的人负责审核、脱敏、去重、归类和发布。
   - 通过后进入企业记忆库，供 AgentOS、ProjectAgent、Space 调用。

2. **技能市场**
   - 个人可以创建并上传 Skill。
   - 管理视角的人审批权限、风险、依赖、测试样例和适用范围。
   - 审批通过后进入企业技能市场。
   - Space 可以下载并调用这些 Skill。

3. **连接器市场**
   - 管理 MCP、API、数据库、数据服务和企业系统连接。
   - 个人或团队可以申请接入。
   - 管理视角的人审批访问范围、授权周期、敏感字段和审计规则。
   - Space 按权限连接和使用。

市场上架链路：

```text
个人上传内容 / Skill / Connector
  -> OrgAgent 识别类型、风险和适用范围
  -> 管理视角审批
  -> 上架企业记忆库 / 技能市场 / 连接器市场
  -> Space 按权限下载、连接或调用
  -> 使用结果进入 TraceOps
```

### 5.3 ProjectAgent

ProjectAgent 是项目级管理 Agent。

它的核心是项目管理、项目看板和跨成员协同。

任意用户都可以创建项目。创建项目后，该用户自动成为项目负责人，也可以理解为项目群主。

项目负责人可以：

- 创建项目。
- 上传项目资料。
- 与 ProjectAgent 聊天。
- 通过对话产生需求、任务和项目节点。
- 拉起项目成员。
- 形成项目群组和协作空间。
- 给成员分发任务。
- 查看项目看板、节点、责任人、进度和成果。
- 审核成员通过 Space 回传的结果。
- 将有效经验沉淀为项目记忆或企业记忆候选。

项目成员可以：

- 在自己的 AgentOS 页面看到被加入的项目。
- 可视化查看项目进度、责任项、上下文、审批和回传结果。
- 通过自己的 PAT 接收项目任务。
- 在自己的 Space 中执行任务。
- 通过 PAT 将成果回传到项目页。

项目核心链路：

```text
任意用户创建项目
  -> 成为项目负责人 / 项目群主
  -> 与 ProjectAgent 对话生成需求和任务
  -> 拉起成员形成项目协作空间
  -> ProjectAgent 将任务分发到成员 PAT
  -> 成员 PAT 在成员 Space 创建任务
  -> Space 调用 KodaX / Skill / Connector 执行
  -> 成员 PAT 回传结果、状态和证据
  -> 项目页更新进度
  -> ProjectAgent 审核、统计、沉淀项目记忆
```

ProjectAgent 页面形态：

- 中间是项目看板或项目图谱。
- 展示项目节点、责任人、状态、进度、依赖和成果。
- 支持负责人和 ProjectAgent 对话。
- 支持拉成员协同。
- 支持任务分发到成员 PAT。
- 支持 Space 执行结果回传。
- 支持项目记忆沉淀。

## 6. AgentOS 内部通讯设计

AgentOS 内部通讯不应完全依赖外部 A2A 协议，也不应从零做封闭协议。

建议内部定义：

> AgentOS Message Protocol

同时保留 A2A Adapter 用于未来接入第三方 Agent 或对外开放互操作。

### 6.1 消息基础字段

建议消息至少包含：

```json
{
  "message_id": "msg_001",
  "trace_id": "trace_project_dispatch_001",
  "channel": "task",
  "type": "task.dispatch",
  "from": {
    "agent": "ProjectAgent",
    "user_id": "u_owner",
    "project_id": "p_001"
  },
  "to": {
    "agent": "PAT",
    "user_id": "u_member"
  },
  "payload": {
    "title": "产品方案工作项",
    "context": "项目背景、交付标准、截止时间、证据要求",
    "space_action": "create_task"
  },
  "permission": {
    "requires_user_confirm": true,
    "data_scope": ["project_context", "approved_files"],
    "expires_at": "2026-07-26T00:00:00Z"
  },
  "status": "created",
  "created_at": "2026-07-02T00:00:00Z"
}
```

### 6.2 典型消息类型

| 类型 | 通道 | 用途 | 典型链路 |
|---|---|---|---|
| `task.dispatch` | task | ProjectAgent 向成员 PAT 分发项目任务 | ProjectAgent -> PAT -> Space |
| `task.result` | task | Space 执行完成后回传任务结果 | Space -> PAT -> ProjectAgent |
| `data.skill_install` | data | Space 请求下载企业技能市场中的 Skill | Skill Market -> PAT -> Space |
| `data.connector_auth` | data | Space 请求连接 MCP、API 或企业数据源 | Connector Market -> PAT -> Space |
| `data.usage_request` | data | Space 或 Agent 请求通过 AgentMemBase 取用企业数据与知识 | Agent -> AgentMemBase -> Source |
| `approval.required` | data / task | 涉及权限、敏感数据或上架市场时触发审批 | PAT / OrgAgent -> Approval Center |
| `trace.promote_candidate` | trace | 将高价值 Trace 提交为记忆或训练候选 | TraceOps -> ProjectAgent / OrgAgent |

## 7. AgentMemBase 的定位

AgentMemBase 的核心定位是：

> 企业数据与知识被 Agent 合理使用的方式与框架。

AgentMemBase 不是一个“记忆数据库”，也不是给 Agent 新造一个仓库存对话、事实和经验。

它要回答的问题不是：

> Agent 经历过的事存在哪里？

而是：

> 企业已经拥有的全部数据与知识，包括数据库、文档、Skill、连接器、Agent 的过往经历、组织的决策，应该以什么方式、在什么时候、以多大颗粒度，被 Agent 合理取用？

换句话说：

- Skill 管“能力怎么按需接入”。
- AgentMemBase 管“数据怎么按需取用”。

二者是孪生关系。Skill 不是工具仓库本身，而是能力按需加载机制；AgentMemBase 也不是记忆仓库本身，而是企业数据与知识的按需取用机制。

## 8. AgentMemBase 管辖什么

AgentMemBase 不重造数据源，而是治理已有数据源。

它管辖的不是单一“记忆”，而是企业已有的多类数据与知识：

| 数据源 | 说明 | 例子 |
|---|---|---|
| 结构化数据 | 企业业务系统、数据库和可查询数据 | 数据库、数据仓库、CRM、ERP、Connector / MCP |
| 企业知识库 | 已沉淀的制度、文档、纪要和知识材料 | 规章制度、项目文档、会议纪要、知识库条目 |
| Skill 库 | 程序性知识和“怎么做”的能力表达 | 数据清洗 Skill、行业研究 Skill、报告生成 Skill |
| 过程记忆 | Agent 在运行中产生的经历和过程记录 | 任务过程、工具调用、错误修复、执行偏好 |
| 决策记录 | 组织和项目为什么这样定、否决过什么 | 审批记录、方案取舍、项目复盘、历史决策 |

关键判断：

> 过程记忆只是 AgentMemBase 管辖的一类数据源，不是 AgentMemBase 的全部。

AgentMemBase 不是第六个数据源，而是横跨这些数据源之上的取用治理层。Agent 不需要知道信息实际存在哪里，只需要表达“我现在需要什么”，治理层负责去对的地方、以对的方式取来。

## 9. AgentMemBase 的五条合理使用规则

AgentMemBase 的核心资产不是“存了多少数据”，而是判断 Agent 能否、何时、以什么方式取用数据的规则。

每一次 Agent 想用企业数据或知识，都要过五条规则：

1. **该不该给：权限**
   - 这个 Agent / 这个人有没有权限看到这条数据。
   - 同权不同视野在这里生根：员工只能取用自己和项目范围内的数据，管理者视野更大。

2. **现在该不该给：时效**
   - 这条数据现在是否还有效。
   - 政策改过、方案被否过、报价更新过，过期或被取代的数据不应被当成当前事实给出去，除非明确要回溯历史。

3. **给多少：装配粒度**
   - 不是把整个数据源塞进上下文，而是精准装配当前任务需要的那一小块。
   - 这是解决上下文窗口有限和噪音过载的关键。

4. **以什么形态给：装配形式**
   - 同一份数据在不同场景中应该以不同形态给出。
   - 审批可能要证据原文，规划可能要摘要，填表可能要结构化字段。

5. **谁批准跨域给：发布门**
   - 个人数据要给项目用、项目数据要给全组织用，必须经过显式发布、脱敏或审批。
   - 这是数据主权在取用层的落点。

## 10. AgentMemBase 的底层引擎

AgentMemBase 可以用“三维定位 + 时间 + 降维检索”来工程化。

核心轴：

- **主体轴：Who / What**
  - 这条数据关于谁或什么。
  - 例如人、客户、项目、系统。
  - 先圈定主体，缩小范围，对应权限判断。

- **语义轴：About**
  - 这条数据讲的是什么主题、概念或语义。
  - 在主体范围内再按语义找，对应精准装配。

- **时间轴：When**
  - 这条数据何时发生、何时有效、是否被取代。
  - 默认只取当前有效，可显式回溯历史。

取用漏斗：

```text
Agent 的问题 / 当前任务
  -> 圈主体：锁定项目、客户、人、系统
  -> 卡时间：只留当前有效，或按需回溯历史
  -> 过权限：只留当前人和 Agent 有权取用的数据
  -> 按粒度和形态装配：原文 / 摘要 / 结构化字段
  -> 喂给 Agent 使用
```

建议统一抽象为 `UsageNode`：

```json
{
  "source": "db | knowledge_base | skill | process_memory | decision_record",
  "content_ref": "指向原始内容，原文留在产生它的地方",
  "derived": "可跨域使用的派生形态，如摘要、结构化字段、脱敏版本",
  "subject": ["project", "customer", "person", "system"],
  "topic": ["risk_policy", "pricing", "delivery"],
  "vector": "semantic_embedding_ref",
  "valid_from": "2026-07-02T00:00:00Z",
  "valid_to": null,
  "supersedes": ["usage_node_old"],
  "scope": "personal | project | org",
  "provenance": "来源、哈希、证据、版本"
}
```

关键原则：

> 原始内容不被强制搬迁到 AgentMemBase。它留在产生它的数据源里，例如 Space 本地、知识库、Skill 定义、数据库或审批系统。AgentMemBase 存的是取用索引、治理规则和派生形态。

## 11. AgentMemBase 与 KodaX 产品矩阵的关系

AgentMemBase 是横跨 KodaX 产品矩阵的数据取用治理层。

### 11.1 与 KodaX CLI 的关系

KodaX CLI 执行软件设施、运维和工程任务时，需要合理取用：

- 仓库上下文。
- 工程规范。
- 历史修复记录。
- 部署策略。
- DevOps 文档。
- 工具和命令使用经验。

AgentMemBase 决定这些数据该不该给、给多少、以什么形态给。

### 11.2 与 KodaX Space 的关系

Space 处在员工本地执行现场，拥有本地文件、浏览器、账号和端侧权限。

AgentMemBase 负责控制：

- 哪些本地数据可以被当前 Agent 取用。
- 哪些只能摘要、哈希或结构化出端。
- 哪些必须留在本地。
- 哪些项目上下文可以进入 Space。
- Space 下载 Skill 或连接 Connector 时能拿到哪些必要知识。

### 11.3 与 AgentOS 的关系

AgentOS 管理企业、项目、员工、审批、市场和记忆。

AgentMemBase 为 AgentOS 提供统一的数据取用规则：

- ProjectAgent 在拆解任务时，按权限取用项目上下文和企业知识。
- OrgAgent 在审批、治理和管理市场时，按权限取用组织数据。
- PAT 在转发数据消息时，携带 AgentMemBase 的取用范围、数据形态和审批状态。
- 管理视角的人通过审批中心决定个人、项目、组织之间的数据跨域发布。

### 11.4 与 TraceOps 的关系

TraceOps 沉淀的是 Agent 运行过程。

AgentMemBase 治理的是 Agent 取用数据与知识的方式。

二者关系可以理解为：

```text
AgentMemBase 决定这次任务该取用什么数据、以什么形态取用
  -> Agent / Space / KodaX 执行任务
  -> TraceOps 记录完整执行过程、取用过程、授权状态和结果反馈
  -> 高价值 Trace 可沉淀为过程记忆或决策记录
  -> AgentMemBase 再把这些新沉淀的过程记忆和决策记录纳入后续取用治理
```

一句话：

> AgentMemBase 管“取用前和取用时的合理性”，TraceOps 管“执行后和复盘时的经验资产化”。

## 12. AgentMemBase 的落地路线

AgentMemBase 不应一开始就试图统一所有数据源。

建议分三步：

### 12.1 Phase 1：单数据源引擎

先在过程记忆这一类数据源上跑通五条规则。

原因：

- 过程记忆最接近 Agent 自身运行。
- 可以先在 Space 本地验证。
- 可以先做成 MCP 工具。
- 能验证跨会话记忆、权限、时效、粒度和形态。

目标：

> 一个 Agent 能跨会话记得住，但只取该取的那部分。

### 12.2 Phase 2：接入更多数据源

把企业知识库、Skill 库、连接器 MCP、数据库纳入同一套规则。

关键是统一 `UsageNode` 抽象，而不是统一底层存储。

这些数据源不用重造，只需要注册：

- subject。
- scope。
- valid_from / valid_to。
- content_ref。
- provenance。
- 可用的派生形态。

### 12.3 Phase 3：跨域治理与审计

补齐发布门：

- 个人 -> 项目。
- 项目 -> 组织。
- 原始内容 -> 脱敏派生内容。
- 私有数据 -> 可复用知识。

同时接入决策记录这一数据源，并上线取用审计：

- 谁取用了数据。
- 何时取用。
- 为了什么任务取用。
- 取用了哪些源。
- 给了什么形态。
- 是否经过审批。

## 13. AgentMemBase 的护城河

AgentMemBase 的护城河不是“比 Mem0 / Zep / Letta 更会存记忆”。

这些产品已经在单一记忆数据源上做得很成熟。

AgentMemBase 真正要做的是：

> 企业级、跨数据源、可审批治理的数据取用框架。

现有记忆产品通常只管一种数据源，只面向单个用户或单个 Agent，没有完整的企业权限可见域、发布审批、跨源统一和数据主权治理。

AgentMemBase 管的是“企业已有的一切”，不是“Agent 新产生的一点记忆”。

## 14. TraceOps 的定位

TraceOps 的全称可以定义为：

> 企业智能体运行经验沉淀与自蒸馏系统。

TraceOps 不是普通日志系统，不是单纯监控系统，也不是简单保存聊天记录。

它要记录的是：

> Agent 与 Harness 在真实企业任务中的完整协作过程。

TraceOps 关注的问题不是“发生了什么”这么简单，而是：

- 为什么这样做？
- 当时有什么上下文？
- Agent 如何计划？
- 任务如何被分发？
- Space 如何执行？
- 工具如何调用？
- 失败如何发生？
- 如何修复？
- 谁确认了结果？
- 这条链路能否沉淀成企业记忆？
- 这条链路能否变成训练、评测或偏好数据？

TraceOps 的战略价值：

> 未来企业智能体的护城河不只来自模型能力，还来自真实任务 Trace、治理能力、经验资产和自蒸馏闭环。

## 15. TraceOps 在产品矩阵中的位置

TraceOps 是横跨 KodaX CLI、Space 和 AgentOS 的底层数据资产能力。

它不是第四个并列产品。

### 15.1 KodaX CLI 产生底层执行 Trace

KodaX CLI 记录：

- 代码理解。
- 文件读写。
- 命令执行。
- 工具调用。
- 测试反馈。
- 错误修复路径。
- DevOps 和软件流程执行轨迹。

### 15.2 KodaX Space 产生端侧任务 Trace

Space 记录：

- 本地任务创建。
- 员工授权。
- 本地文件、浏览器、IDE、账号和工具使用。
- Skill 调用。
- Connector 连接。
- 端侧执行结果。
- 哪些数据可以出端，哪些只能摘要或哈希出端。

### 15.3 PAT 串联 AgentOS 与 Space Trace

PAT 记录：

- 任务消息和数据消息。
- 请求来源。
- 项目归属。
- 用户授权。
- Space 执行状态。
- 结果回传。
- trace_id 透传。
- 端侧敏感数据边界。

### 15.4 ProjectAgent 解释项目 Trace

ProjectAgent 记录：

- 项目目标。
- 项目上下文。
- 负责人意图。
- 任务拆解。
- 成员分工。
- 节点进度。
- 成果审核。
- 项目记忆候选。

### 15.5 OrgAgent 治理企业级 Trace

OrgAgent 负责：

- Trace 权限。
- Trace 脱敏。
- Trace 保留周期。
- Trace 是否进入企业记忆。
- Trace 是否进入训练池。
- Trace 数据集导出。
- Trace 对模型、Skill、Connector 和 Agent 配置的反哺策略。

## 16. TraceOps 应记录什么

一条完整 Trace 至少应该包含：

- 用户原始意图。
- 项目目标。
- 业务上下文。
- Agent 角色配置。
- 系统指令。
- Skill 列表。
- 工具列表。
- 权限状态。
- 企业记忆引用。
- 项目文件引用。
- 计划生成。
- 任务拆解。
- 任务分发。
- PAT 路由。
- Space 接收。
- KodaX 执行。
- 工具调用。
- 文件读写。
- 命令执行。
- API 调用。
- 错误和重试。
- 人工审批。
- 人工纠偏。
- 成果生成。
- 证据附件。
- 成果评价。
- 记忆候选。
- 训练价值评分。
- 风险等级。
- 脱敏状态。
- 授权状态。

Trace 不应该是：

- 只保存聊天记录。
- 只保存最终答案。
- 未经脱敏就进入训练池的原始企业数据。
- 脱离项目、成员、权限和业务目标的孤立日志。
- 把所有数据无差别沉淀到全局记忆。

## 17. TraceOps 数据生命周期

建议将 Trace 分为三层：

### 17.1 Raw Trace

原始 Trace。

用途：

- 审计。
- 回放。
- 排障。
- 完整链路保留。

特点：

- 信息最完整。
- 敏感度最高。
- 权限最严格。
- 不直接用于训练。

### 17.2 Clean Trace

清洗 Trace。

用途：

- 分析。
- 复盘。
- 质量评分。
- 项目经验提炼。
- 失败链路总结。

特点：

- 已去噪。
- 已做基础脱敏。
- 可用于内部分析。
- 仍需权限控制。

### 17.3 Train Trace

训练 Trace。

用途：

- SFT。
- Tool-use 数据。
- Planning 数据。
- Preference 数据。
- Repair 数据。
- Evaluation 数据。

特点：

- 已授权。
- 已脱敏。
- 有明确输入输出。
- 有质量标签。
- 可追溯来源。

## 18. TraceOps 与自蒸馏

TraceOps 的长期目标不是“存日志”，而是形成自蒸馏飞轮。

飞轮：

```text
真实企业任务
  -> 产生完整 Trace
  -> 治理、脱敏、评分
  -> 筛选高价值链路
  -> 生成记忆候选、训练集和评测集
  -> 反哺 KodaX 内核、Agent 配置、Skill 路由和项目拆解策略
  -> Agent 能力提升
  -> 承接更多真实任务
  -> 产生更多高质量 Trace
```

TraceOps 可以生成的数据类型：

| 数据类型 | 来源 | 作用 |
|---|---|---|
| SFT 数据 | 用户目标 + 上下文 -> 被接受结果 | 提升文档、代码、方案生成质量 |
| Tool-use 数据 | 工具选择、参数、观察、下一步 | 提升工具调用和多步执行能力 |
| Planning 数据 | 项目拆解、节点依赖、成员分工 | 提升 ProjectAgent 长程规划能力 |
| Preference 数据 | 负责人接受/驳回、人工修改、A/B 选择 | 提升质量判断和结果排序 |
| Repair 数据 | 失败、诊断、重试、修复成功链路 | 提升错误恢复能力 |
| Evaluation 数据 | 企业真实任务抽象出的 benchmark | 评估模型、Skill 和 Agent 配置是否进步 |

## 19. TraceOps 的产品形态

TraceOps 不一定一开始作为独立一级导航出现。

更合理的方式：

- 作为 AgentOS 的底层能力存在。
- 在项目页提供 Trace 时间线和回放。
- 在 OrgAgent 管理视角中提供 Trace 资产管理入口。
- 在企业记忆库中提供“从 Trace 提炼记忆”的能力。
- 在技能市场中提供“Skill 调用表现分析”和“Skill 优化样本”。
- 在后台提供候选池、治理审批和数据集导出能力。

### 19.1 项目页中的 TraceOps

项目页应展示：

- 当前项目完整 Trace 时间线。
- ProjectAgent 拆解过程。
- PAT 分发过程。
- Space 执行过程。
- KodaX 工具调用过程。
- 成果回传过程。
- 人工审批和纠偏过程。
- 项目记忆候选。
- 成果证据链。

用户看到的不是底层日志，而是项目执行脉络。

### 19.2 OrgAgent 中的 TraceOps

OrgAgent 管理视角应提供：

- Trace 总览。
- 高价值 Trace 候选。
- 可训练样本候选。
- 敏感 Trace 审核。
- 失败链路分析。
- Skill 调用效果。
- Connector 调用效果。
- 成员执行链路统计。
- 数据集导出中心。
- 自蒸馏进度。

### 19.3 企业记忆库中的 TraceOps

企业记忆库沉淀的是结论和经验。

TraceOps 沉淀的是结论如何形成的过程。

关系：

```text
TraceOps 保留过程
  -> Data Agent / Trace Distiller 提炼候选经验
  -> ProjectAgent / 负责人确认
  -> OrgAgent 审批治理
  -> 企业记忆库发布
```

## 20. TraceOps 治理原则

企业 Trace 不能无差别使用。

基本原则：

- 默认最小采集。
- 端侧敏感数据默认不出端。
- 原始 Trace 不直接进入训练。
- 训练数据必须经过脱敏、授权和审批。
- Trace 要保留来源、版本、用途和导出记录。
- 所有导出都应可追溯、可撤回、可审计。

建议风险分级：

| 级别 | 含义 | 使用范围 |
|---|---|---|
| L0 公开样本 | 无敏感信息 | 可公开展示或通用训练 |
| L1 企业内部 | 企业内部信息 | 仅企业租户内使用，可进入企业私有训练 |
| L2 项目受限 | 项目上下文、客户或业务细节 | 只允许项目内回放和分析 |
| L3 端侧敏感 | 本地文件、账号、源码、隐私 | 只允许摘要、指标或哈希出端 |
| L4 禁止训练 | 高敏感或合规限制数据 | 仅审计，不进入记忆、评测或训练 |

## 21. 当前边界共识

- AgentOS 不在本地直接执行员工电脑任务。
- Space 执行具体端侧任务。
- PAT 负责 AgentOS 与 Space 之间的数据与任务通讯。
- ProjectAgent 管理项目，不直接替成员执行本地任务。
- OrgAgent 管理企业级资产、审批和治理。
- KodaX CLI / KodaX 内核负责底层执行能力。
- AgentMemBase 不做新的数据仓库，而是治理企业已有数据与知识的取用方式。
- AgentMemBase 不强制搬迁原始内容，原文留在产生它的数据源里。
- AgentMemBase 管“取用前和取用时的合理性”，TraceOps 管“执行后和复盘时的经验资产化”。
- TraceOps 不做新的任务入口，而是沉淀任务过程。
- 企业记忆库沉淀“结论”，TraceOps 沉淀“结论形成过程”。
- Skill、Connector、企业记忆都应先经过企业级治理，再被 Space 下载或调用。

## 22. 给后续对话的提示

如果把本文档作为上下文输入给其他对话，可以直接使用下面这句话：

> 请基于这份 KodaX 产品矩阵、AgentMemBase 与 TraceOps 上下文，继续讨论 AgentOS / KodaX Space / KodaX CLI / AgentMemBase / TraceOps 的产品设计、架构、页面、叙事或融资材料。当前产品状态以本文为准，不要把 AgentOS 理解成端侧任务执行器，不要把 AgentMemBase 理解成记忆数据库，也不要把 TraceOps 理解成普通日志系统。
