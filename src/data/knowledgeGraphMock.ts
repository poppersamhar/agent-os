export type KnowledgeNodeType =
  | 'platform'
  | 'agent'
  | 'project'
  | 'document'
  | 'person'
  | 'skill'
  | 'trace'
  | 'decision';

export interface KnowledgeGraphNodeData {
  id: string;
  label: string;
  type: KnowledgeNodeType;
  cluster: string;
  description: string;
  meta: string;
  weight?: number;
}

export interface KnowledgeGraphLinkData {
  source: string;
  target: string;
  relation: string;
}

export const knowledgeGraphNodes: KnowledgeGraphNodeData[] = [
  { id: 'kodax', label: 'KodaX 企业智能体系', type: 'platform', cluster: 'core', description: '由统一智能体内核、端侧工作空间与企业管理系统组成的企业智能底座。', meta: '产品体系 · 核心', weight: 22 },
  { id: 'cli', label: 'KodaX CLI', type: 'platform', cluster: 'core', description: '面向软件设施、研发流程与运维场景的智能执行入口。', meta: '产品 · 内核入口', weight: 15 },
  { id: 'space', label: 'KodaX Space', type: 'platform', cluster: 'core', description: '驻扎在员工电脑上的本地执行工作空间。', meta: '产品 · 端侧执行', weight: 17 },
  { id: 'agentos', label: 'AgentOS', type: 'platform', cluster: 'core', description: '承载企业治理、项目协同、知识沉淀与运行经验进化。', meta: '产品 · 企业管理', weight: 18 },

  { id: 'org-agent', label: 'OrgAgent', type: 'agent', cluster: 'agentos', description: '管理企业记忆、Skill、连接器与组织级审批。', meta: 'Agent · 企业治理', weight: 13 },
  { id: 'project-agent', label: 'ProjectAgent', type: 'agent', cluster: 'agentos', description: '负责项目规划、拆分、分发、验收和项目记忆。', meta: 'Agent · 项目管理', weight: 14 },
  { id: 'pat-agent', label: 'PAT Agent', type: 'agent', cluster: 'agentos', description: '在 AgentOS 与 Space 之间中转任务、数据与执行结果。', meta: 'Agent · 通讯路由', weight: 12 },
  { id: 'traceops', label: 'TraceOps', type: 'trace', cluster: 'agentos', description: '记录和治理全链路 Trace，并生成可训练数据。', meta: '系统 · 经验进化', weight: 14 },
  { id: 'memory', label: '企业记忆库', type: 'platform', cluster: 'agentos', description: '汇聚文档知识、项目记忆、执行经验和证据链。', meta: '平台 · 组织资产', weight: 14 },
  { id: 'skill-market', label: '技能市场', type: 'platform', cluster: 'agentos', description: '创建、审核、发布和更新企业级 Skill。', meta: '平台 · 能力资产', weight: 11 },
  { id: 'connectors', label: '连接器中心', type: 'platform', cluster: 'agentos', description: '治理企业数据源、MCP 和外部系统连接。', meta: '平台 · 数据接入', weight: 10 },

  { id: 'risk-project', label: '供应链金融风控平台', type: 'project', cluster: 'risk', description: '供应商信用评估、贷后风险监控与预警模型优化项目。', meta: '项目 · 进行中', weight: 16 },
  { id: 'brand-project', label: '品牌升级 · Q3 营销合同', type: 'project', cluster: 'brand', description: '品牌升级策略与 Q3 营销合作落地项目。', meta: '项目 · 进行中', weight: 13 },
  { id: 'data-project', label: '数据中台 · 清洗建模', type: 'project', cluster: 'data', description: '统一数据口径并构建清洗质量与建模输入体系。', meta: '项目 · 已回传', weight: 14 },

  { id: 'samhar', label: 'samhar', type: 'person', cluster: 'risk', description: '项目创建者与产品负责人，负责总体方向与成果验收。', meta: '成员 · 项目负责人', weight: 9 },
  { id: 'chen', label: 'chen', type: 'person', cluster: 'risk', description: '研发负责人，承担模型服务和接口边界设计。', meta: '成员 · 研发', weight: 8 },
  { id: 'lin', label: 'lin', type: 'person', cluster: 'risk', description: '项目上级，负责数据授权与阶段审批。', meta: '成员 · 管理', weight: 8 },
  { id: 'lixue', label: 'li xue', type: 'person', cluster: 'data', description: '数据负责人，承担清洗、建模和质量核验。', meta: '成员 · 数据', weight: 8 },
  { id: 'moran', label: 'moran', type: 'person', cluster: 'brand', description: '运营负责人，承担品牌内容与发布节奏。', meta: '成员 · 运营', weight: 8 },

  { id: 'risk-brief', label: '项目立项说明.md', type: 'document', cluster: 'risk', description: '项目背景、目标、边界、参与者和里程碑。', meta: '文档 · 已入库', weight: 7 },
  { id: 'risk-model', label: '风控指标体系.xlsx', type: 'document', cluster: 'risk', description: '供应商分层、信用评分和预警指标定义。', meta: '文档 · 42 个字段', weight: 7 },
  { id: 'risk-policy', label: '授信审批制度.pdf', type: 'document', cluster: 'risk', description: '授信审批路径、权限边界和风控要求。', meta: '制度 · 权威来源', weight: 7 },
  { id: 'brand-plan', label: '品牌策略方案.pptx', type: 'document', cluster: 'brand', description: '品牌定位、视觉方向与营销主题。', meta: '文档 · v3', weight: 7 },
  { id: 'data-report', label: '清洗质量报告.md', type: 'document', cluster: 'data', description: 'Space 返回的数据质量、异常字段和修复建议。', meta: '成果 · Space 回传', weight: 8 },
  { id: 'schema', label: '统一字段口径.xlsx', type: 'document', cluster: 'data', description: '跨系统字段映射、类型定义与业务口径。', meta: '文档 · 已审核', weight: 7 },

  { id: 'market-research', label: 'MarketResearch', type: 'skill', cluster: 'skill', description: '多源行业数据检索、趋势分析和证据整理。', meta: 'Skill · v2.4', weight: 8 },
  { id: 'competitor-analysis', label: 'CompetitorAnalysis', type: 'skill', cluster: 'skill', description: '竞争格局、产品能力与市场份额对比。', meta: 'Skill · v1.8', weight: 8 },
  { id: 'content-writer', label: 'ContentWriter', type: 'skill', cluster: 'skill', description: '基于项目上下文生成结构化专业内容。', meta: 'Skill · v3.1', weight: 8 },
  { id: 'data-quality', label: 'DataQualityCheck', type: 'skill', cluster: 'skill', description: '检测缺失、重复、异常分布和口径冲突。', meta: 'Skill · v2.0', weight: 8 },

  { id: 'decision-model', label: '先统一口径再拆模型', type: 'decision', cluster: 'risk', description: '立项阶段先确认字段口径与数据边界，再拆分建模任务。', meta: '决策 · 已确认', weight: 8 },
  { id: 'decision-summary', label: '默认回传结构化摘要', type: 'decision', cluster: 'data', description: '敏感数据不离开本地，只回传摘要、证据哈希和结果引用。', meta: '规则 · 已生效', weight: 8 },
  { id: 'decision-review', label: '成果需 ProjectAgent 审核', type: 'decision', cluster: 'risk', description: 'Space 回传成果需经项目负责人侧 ProjectAgent 校验。', meta: '规则 · 项目级', weight: 8 },

  { id: 'trace-001', label: 'Session #A27F', type: 'trace', cluster: 'trace', description: '风险指标分析完整执行链路，包含工具调用与质量评价。', meta: 'Trace · 高质量', weight: 7 },
  { id: 'trace-002', label: 'Session #B14C', type: 'trace', cluster: 'trace', description: '清洗建模任务的 Agent、Harness 与人工审核记录。', meta: 'Trace · 可训练', weight: 7 },
  { id: 'dataset-sft', label: 'SFT 数据集候选', type: 'trace', cluster: 'trace', description: '从高质量 Trace 中提炼的指令、推理与结果样本。', meta: '数据集 · 128 条', weight: 9 },
  { id: 'dataset-eval', label: '项目管理评测集', type: 'trace', cluster: 'trace', description: '覆盖任务拆分、分发、审批和成果验收的评测样本。', meta: '评测集 · v0.2', weight: 9 },
];

export const knowledgeGraphLinks: KnowledgeGraphLinkData[] = [
  { source: 'kodax', target: 'cli', relation: '统一内核' },
  { source: 'kodax', target: 'space', relation: '端侧产品' },
  { source: 'kodax', target: 'agentos', relation: '企业产品' },
  { source: 'agentos', target: 'org-agent', relation: '治理' },
  { source: 'agentos', target: 'project-agent', relation: '协同' },
  { source: 'agentos', target: 'pat-agent', relation: '通讯' },
  { source: 'agentos', target: 'traceops', relation: '沉淀' },
  { source: 'org-agent', target: 'memory', relation: '管理' },
  { source: 'org-agent', target: 'skill-market', relation: '管理' },
  { source: 'org-agent', target: 'connectors', relation: '管理' },
  { source: 'space', target: 'pat-agent', relation: '任务与数据' },
  { source: 'cli', target: 'space', relation: '执行能力' },
  { source: 'project-agent', target: 'risk-project', relation: '总控' },
  { source: 'project-agent', target: 'brand-project', relation: '总控' },
  { source: 'project-agent', target: 'data-project', relation: '总控' },
  { source: 'risk-project', target: 'samhar', relation: '负责人' },
  { source: 'risk-project', target: 'chen', relation: '研发' },
  { source: 'risk-project', target: 'lin', relation: '审批' },
  { source: 'data-project', target: 'lixue', relation: '数据' },
  { source: 'brand-project', target: 'moran', relation: '运营' },
  { source: 'risk-project', target: 'risk-brief', relation: '项目资料' },
  { source: 'risk-project', target: 'risk-model', relation: '指标定义' },
  { source: 'risk-project', target: 'risk-policy', relation: '遵循' },
  { source: 'brand-project', target: 'brand-plan', relation: '产出' },
  { source: 'data-project', target: 'data-report', relation: '产出' },
  { source: 'data-project', target: 'schema', relation: '统一' },
  { source: 'memory', target: 'risk-brief', relation: '收录' },
  { source: 'memory', target: 'risk-policy', relation: '收录' },
  { source: 'memory', target: 'schema', relation: '收录' },
  { source: 'skill-market', target: 'market-research', relation: '发布' },
  { source: 'skill-market', target: 'competitor-analysis', relation: '发布' },
  { source: 'skill-market', target: 'content-writer', relation: '发布' },
  { source: 'skill-market', target: 'data-quality', relation: '发布' },
  { source: 'brand-project', target: 'market-research', relation: '调用' },
  { source: 'brand-project', target: 'competitor-analysis', relation: '调用' },
  { source: 'brand-project', target: 'content-writer', relation: '调用' },
  { source: 'data-project', target: 'data-quality', relation: '调用' },
  { source: 'risk-project', target: 'decision-model', relation: '形成决策' },
  { source: 'data-project', target: 'decision-summary', relation: '执行规则' },
  { source: 'risk-project', target: 'decision-review', relation: '验收规则' },
  { source: 'traceops', target: 'trace-001', relation: '采集' },
  { source: 'traceops', target: 'trace-002', relation: '采集' },
  { source: 'trace-001', target: 'risk-project', relation: '来自' },
  { source: 'trace-002', target: 'data-project', relation: '来自' },
  { source: 'trace-001', target: 'dataset-sft', relation: '提炼' },
  { source: 'trace-002', target: 'dataset-sft', relation: '提炼' },
  { source: 'trace-001', target: 'dataset-eval', relation: '构建' },
  { source: 'dataset-sft', target: 'kodax', relation: '反哺' },
  { source: 'dataset-eval', target: 'project-agent', relation: '评测' },
  { source: 'pat-agent', target: 'data-report', relation: '回传' },
  { source: 'samhar', target: 'decision-model', relation: '确认' },
  { source: 'lin', target: 'risk-policy', relation: '维护' },
  { source: 'lixue', target: 'schema', relation: '维护' },
];
