export interface Chat {
  id: string;
  name: string;
  projectId: string;
  type: 'single' | 'group';
  messages: ChatMessage[];
  pinned?: boolean;
}

export interface WorkLine {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  memberCount: number;
  unread: boolean;
  status: 'active' | 'idle' | 'completed';
  icon?: string;
  pinned?: boolean;
  createdBy?: string;
  chats: Chat[];
}

export type Project = WorkLine;

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  domain: 'knowledge' | 'governance' | 'analysis' | 'code';
  description: string;
  status: 'online' | 'busy' | 'offline';
  calls: number;
  mountedSkills: string[];
  workLine: string;
  currentTask?: string;
  recentOutputs: Array<{ title: string; completedAt: string; quality: number }>;
}

export interface SkillInputParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface SkillOutput {
  name: string;
  description: string;
}

export interface Skill {
  id: string;
  name: string;
  icon: string;
  category: 'knowledge' | 'governance' | 'analysis' | 'tool';
  description: string;
  enabled: boolean;
  configFields: string[];
  source: string;
  scopeCount: number;
  createdAt: string;
  author: string;
  version: string;
  steps?: Array<{ order: number; name: string; description: string }>;
  calls: number;
  successRate: number;
  avgDuration: string;
  dependencies: string[];
  graphWrite: boolean;
  graphWriteDesc: string;
  inputParams: SkillInputParam[];
  outputs: SkillOutput[];
  callExample: string;
  approvalNote: string;
  isPreset?: boolean;
}

export interface DataItem {
  id: string;
  type: 'chart' | 'table' | 'file';
  title: string;
  description?: string;
  chartType?: 'bar' | 'line' | 'pie';
  data?: Array<{ label: string; value: number; change?: string }>;
  sourceMessageId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'system' | 'host' | 'agent' | 'skill' | 'human';
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  mentions?: string[];
  status?: 'sending' | 'sent' | 'error';
  metadata?: {
    plan?: string[];
    steps?: Array<{ step: number; name: string; tool: string }>;
    result?: string;
    toolCall?: { name: string; input: string };
    dataItemIds?: string[];
    delegation?: {
      target: string;
      goal: string;
      constraints: string[];
      requiredSkills: string[];
      skillCoverage: 'sufficient' | 'insufficient';
    };
    messageType?: 'member' | 'workagent' | 'question' | 'plan' | 'completion' | 'subagent' | 'system';
    reasoning?: { text: string; duration?: number };
    artifactUrl?: string;
    files?: string[];
    reportTitle?: string;
    reportSummary?: string;
    themeColor?: string;
    pages?: number;
    style?: string;
    slideStructure?: Array<{ page: number; type: string; title: string }>;
    previewImage?: string;
    fileSize?: string;
    responseTime?: string;
    permissionType?: 'bash' | 'edit' | 'dispatch';
  };
}

export interface PendingItem {
  id: string;
  type: 'review' | 'skill-gap' | 'blocked';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  workLine?: string;
}

export interface TrackedTask {
  id: string;
  name: string;
  agentName: string;
  stage: string;
  blocked: boolean;
  eta: string;
  progress: number;
}

export type UserRole = 'member' | 'admin';

export const currentUserId = 'user-samhar';

/* ═══════════════════════════════════════════════
   项目数据
   ═══════════════════════════════════════════════ */

export const workLines: WorkLine[] = [
  {
    id: 'p_risk',
    name: '供应链金融风控平台',
    description: '基于大数据的供应商信用评估、贷后风险监控与预警模型优化',
    updatedAt: '刚刚',
    memberCount: 1,
    unread: true,
    status: 'active',
    icon: 'shield',
    createdBy: 'user-samhar',
    chats: [],
  },
  {
    id: 'p_brand_contract',
    name: '品牌升级 · Q3 营销合同',
    description: '围绕品牌升级项目整理合同条款、审批节点、供应商协作和交付边界',
    updatedAt: '12分钟前',
    memberCount: 5,
    unread: false,
    status: 'active',
    icon: 'briefcase',
    createdBy: 'user-samhar',
    chats: [],
  },
  {
    id: 'p_data_middle',
    name: '数据中台 · 清洗建模',
    description: '建设跨部门数据清洗、指标口径统一和模型训练前的数据治理作战室',
    updatedAt: '今天',
    memberCount: 4,
    unread: false,
    status: 'active',
    icon: 'database',
    createdBy: 'user-lixue',
    chats: [],
  },
];

export const projects = workLines;

/* ═══════════════════════════════════════════════
   Agent 数据
   ═══════════════════════════════════════════════ */

export const agents: Agent[] = [
  {
    id: 'a_workagent', name: '管理智能体', avatar: '🤖', domain: 'analysis',
    description: '任务编排与调度中枢（管理智能体），负责需求解析、方案规划和结果汇总',
    status: 'online', calls: 3280, mountedSkills: ['s_market', 's_compete', 's_report'],
    workLine: '供应链金融风控平台',
    recentOutputs: [
      { title: '供应商信用评估报告', completedAt: '刚刚', quality: 96 },
      { title: '贷后预警模型优化方案', completedAt: '30分钟前', quality: 94 },
    ],
  },
  {
    id: 'a_dataclean', name: '数据清洗 数字员工', avatar: '🧹', domain: 'governance',
    description: '数据质量校验、缺失值处理、异常检测与标准化转换（数字员工）',
    status: 'online', calls: 1560, mountedSkills: ['s_sql', 's_python'],
    workLine: '供应链金融风控平台',
    recentOutputs: [
      { title: '供应商数据清洗', completedAt: '刚刚', quality: 98 },
    ],
  },
  {
    id: 'a_credit', name: '信用评估 数字员工', avatar: '📊', domain: 'analysis',
    description: '多维度信用评分计算、风险分级、尽调报告生成（数字员工）',
    status: 'online', calls: 890, mountedSkills: ['s_credit', 's_python', 's_chart'],
    workLine: '供应链金融风控平台',
    recentOutputs: [
      { title: '50家供应商信用评分', completedAt: '刚刚', quality: 95 },
    ],
  },
  {
    id: 'a_ml', name: '模型优化 数字员工', avatar: '🧠', domain: 'analysis',
    description: '特征工程、模型调参、A/B测试、性能评估（数字员工）',
    status: 'online', calls: 670, mountedSkills: ['s_python', 's_chart'],
    workLine: '供应链金融风控平台',
    recentOutputs: [
      { title: '预警模型特征重要性分析', completedAt: '30分钟前', quality: 93 },
    ],
  },
];

/* ═══════════════════════════════════════════════
   Skill 数据
   ═══════════════════════════════════════════════ */

export const skills: Skill[] = [
  {
    id: 'skill-creator', name: 'Skill Creator', icon: '✨', category: 'tool',
    description: '通过 HubAgent 对话交互式创建和修改 Skill，支持自然语言描述需求并自动生成配置',
    enabled: true, configFields: [], source: '系统内置', scopeCount: 0,
    createdAt: '2026-01-01', author: '系统', version: 'v1.0',
    calls: 0, successRate: 100, avgDuration: '—',
    dependencies: ['HubAgent'], graphWrite: false, graphWriteDesc: 'Skill 配置写入 Skill 库',
    inputParams: [{ name: 'description', type: 'string', required: true, description: 'Skill 功能描述' }],
    outputs: [{ name: 'skill_config', description: '生成的 Skill 配置' }],
    callExample: '创建一个能自动生成周报摘要的 Skill',
    approvalNote: '', isPreset: true,
  },
  // 柯布西耶 PPT Skill（保留）
  {
    id: 's9', name: 'SlideCraft', icon: '🎨', category: 'tool',
    description: '电子杂志风格 PPT 生成引擎，支持主题切换、WebGL 动态背景、流水线布局',
    enabled: true, configFields: ['默认主题', '页数限制'], source: '来自任务#柯布西耶PPT', scopeCount: 1,
    createdAt: '2026-05-08', author: 'WorkAgent', version: 'v1.0',
    steps: [
      { order: 1, name: '读取模板', description: '读取 references/themes.md、layouts.md、components.md' },
      { order: 2, name: '主题应用', description: '应用沙丘/墨水经典主题色到 CSS 变量' },
      { order: 3, name: '布局构建', description: '按 page-patterns 构建 15 页幻灯片骨架' },
      { order: 4, name: '内容填充', description: '写入建筑学专业内容、语录、数据卡片' },
      { order: 5, name: '背景注入', description: '注入 WebGL shader（全息色散/旋转涡流）' },
    ],
    calls: 1, successRate: 100, avgDuration: '25s',
    dependencies: ['ThemeEngine', 'LayoutBuilder', 'WebGLBackground', 'ContentWriter'],
    graphWrite: false, graphWriteDesc: 'PPT 产物作为文件输出，不写入图谱',
    inputParams: [
      { name: 'topic', type: 'string', required: true, description: 'PPT 主题' },
      { name: 'pages', type: 'number', required: false, description: '页数（默认15）' },
      { name: 'theme', type: 'string', required: false, description: '主题色（dune/ink）' },
    ],
    outputs: [
      { name: 'html_file', description: '生成的 PPT HTML 文件路径' },
      { name: 'slide_count', description: '实际生成页数' },
    ],
    callExample: '生成一个15页介绍柯布西耶的电子杂志风格PPT，使用沙丘主题',
    approvalNote: '', isPreset: true,
  },
  {
    id: 's10', name: 'ThemeEngine', icon: '🎭', category: 'tool',
    description: '主题色管理系统，支持沙丘、墨水经典等艺术/建筑类主题切换',
    enabled: true, configFields: ['主题库路径'], source: '来自任务#柯布西耶PPT', scopeCount: 1,
    createdAt: '2026-05-08', author: 'WorkAgent', version: 'v1.0',
    steps: [
      { order: 1, name: '解析主题', description: '从 themes.md 解析主题色定义' },
      { order: 2, name: '生成 CSS', description: '生成 :root CSS 变量块' },
      { order: 3, name: '注入文档', description: '将变量写入 HTML style 标签' },
    ],
    calls: 1, successRate: 100, avgDuration: '2s',
    dependencies: ['File Tool'], graphWrite: false, graphWriteDesc: '主题配置不写入图谱',
    inputParams: [{ name: 'theme_name', type: 'string', required: true, description: '主题名称' }],
    outputs: [{ name: 'css_vars', description: 'CSS 变量字符串' }],
    callExample: '应用沙丘主题色',
    approvalNote: '', isPreset: true,
  },
  {
    id: 's11', name: 'LayoutBuilder', icon: '📐', category: 'analysis',
    description: '页面布局构建系统，支持网格、分栏、流水线、数据卡片等多种版式',
    enabled: true, configFields: ['布局库路径'], source: '来自任务#柯布西耶PPT', scopeCount: 1,
    createdAt: '2026-05-08', author: 'WorkAgent', version: 'v1.0',
    steps: [
      { order: 1, name: '读取布局', description: '从 layouts.md 读取布局定义' },
      { order: 2, name: '选择版式', description: '根据内容类型选择最优版式' },
      { order: 3, name: '生成结构', description: '输出 HTML/CSS 网格结构' },
    ],
    calls: 1, successRate: 100, avgDuration: '3s',
    dependencies: ['File Tool'], graphWrite: false, graphWriteDesc: '布局定义不写入图谱',
    inputParams: [
      { name: 'layout_type', type: 'string', required: true, description: '布局类型' },
      { name: 'content', type: 'object', required: true, description: '内容数据' },
    ],
    outputs: [{ name: 'html_structure', description: 'HTML 布局结构' }],
    callExample: '为生平数据选择 grid-2-7-5 分栏布局',
    approvalNote: '', isPreset: true,
  },
  {
    id: 's12', name: 'WebGLBackground', icon: '✨', category: 'tool',
    description: 'WebGL 动态背景生成器，支持全息色散、旋转涡流等高级 shader 效果',
    enabled: true, configFields: ['shader 库路径'], source: '来自任务#柯布西耶PPT', scopeCount: 1,
    createdAt: '2026-05-08', author: 'WorkAgent', version: 'v1.0',
    steps: [
      { order: 1, name: '选择效果', description: '根据主题选择深色/浅色背景 shader' },
      { order: 2, name: '编译 Shader', description: '编译顶点/片段着色器' },
      { order: 3, name: '绑定画布', description: '创建 canvas 并绑定 WebGL 上下文' },
      { order: 4, name: '运行动画', description: '启动 requestAnimationFrame 渲染循环' },
    ],
    calls: 1, successRate: 100, avgDuration: '5s',
    dependencies: ['Canvas API'], graphWrite: false, graphWriteDesc: 'Shader 代码不写入图谱',
    inputParams: [{ name: 'variant', type: 'string', required: true, description: '效果变体（dark/light）' }],
    outputs: [{ name: 'shader_code', description: '完整 WebGL shader 代码' }],
    callExample: '为深色页面生成全息色散背景',
    approvalNote: '', isPreset: true,
  },
  {
    id: 's13', name: 'ContentWriter', icon: '✍️', category: 'knowledge',
    description: '建筑学专业内容撰写，支持生平、理念、代表作品等结构化内容生成',
    enabled: true, configFields: ['知识库路径'], source: '来自任务#柯布西耶PPT', scopeCount: 1,
    createdAt: '2026-05-08', author: 'WorkAgent', version: 'v1.0',
    steps: [
      { order: 1, name: '资料检索', description: '检索建筑师相关资料和学术文献' },
      { order: 2, name: '结构规划', description: '按时间线/主题规划内容结构' },
      { order: 3, name: '文案撰写', description: '生成专业级建筑学介绍文案' },
      { order: 4, name: '金句提取', description: '提取经典语录和 callout 引用' },
    ],
    calls: 1, successRate: 100, avgDuration: '8s',
    dependencies: ['企业搜索', 'LLM'], graphWrite: true, graphWriteDesc: '建筑学知识写入项目知识图谱',
    inputParams: [
      { name: 'architect', type: 'string', required: true, description: '建筑师姓名' },
      { name: 'style', type: 'string', required: false, description: '风格（专业/科普）' },
    ],
    outputs: [
      { name: 'content', description: '结构化内容文本' },
      { name: 'quotes', description: '经典语录列表' },
    ],
    callExample: '撰写柯布西耶建筑专业介绍内容',
    approvalNote: '', isPreset: true,
  },
  // 新增报告相关 Skill
  {
    id: 's_market', name: 'MarketResearch', icon: '🔍', category: 'analysis',
    description: '行业市场数据收集与趋势分析，支持多源数据聚合',
    enabled: true, configFields: ['数据源', '时间范围'], source: '来自任务#AIAgent报告', scopeCount: 1,
    createdAt: '2026-05-09', author: 'WorkAgent', version: 'v1.0',
    steps: [
      { order: 1, name: '数据源识别', description: '识别行业报告、融资数据、用户调研等数据源' },
      { order: 2, name: '数据抓取', description: '从公开渠道抓取市场规模、增长率等核心指标' },
      { order: 3, name: '趋势分析', description: '分析市场趋势，识别增长驱动因素' },
    ],
    calls: 1, successRate: 100, avgDuration: '15s',
    dependencies: ['企业搜索', 'Python'], graphWrite: true, graphWriteDesc: '市场数据写入项目知识图谱',
    inputParams: [
      { name: 'industry', type: 'string', required: true, description: '行业名称' },
      { name: 'year', type: 'number', required: true, description: '分析年份' },
    ],
    outputs: [
      { name: 'market_data', description: '市场规模与增长数据' },
      { name: 'trends', description: '趋势分析报告' },
    ],
    callExample: '收集2026年AI Agent行业市场规模和融资数据',
    approvalNote: '', isPreset: true,
  },
  {
    id: 's_compete', name: 'CompetitorAnalysis', icon: '🏢', category: 'analysis',
    description: '竞品公司分析，包括产品能力、融资情况、市场份额对比',
    enabled: true, configFields: ['竞品列表', '对比维度'], source: '来自任务#AIAgent报告', scopeCount: 1,
    createdAt: '2026-05-09', author: 'WorkAgent', version: 'v1.0',
    steps: [
      { order: 1, name: '竞品识别', description: '识别行业头部企业和新兴玩家' },
      { order: 2, name: '能力对比', description: '对比各竞品的核心产品能力' },
      { order: 3, name: '融资分析', description: '分析融资轮次、金额、估值趋势' },
    ],
    calls: 1, successRate: 100, avgDuration: '12s',
    dependencies: ['企业搜索', '企查查 MCP'], graphWrite: true, graphWriteDesc: '竞品数据写入项目知识图谱',
    inputParams: [
      { name: 'competitors', type: 'list', required: true, description: '竞品公司列表' },
    ],
    outputs: [
      { name: 'comparison_matrix', description: '竞品能力对比矩阵' },
      { name: 'funding_report', description: '融资分析报告' },
    ],
    callExample: '分析OpenAI、Anthropic、Google等AI Agent竞品',
    approvalNote: '', isPreset: true,
  },
  {
    id: 's_usecase', name: 'UseCaseAnalysis', icon: '📋', category: 'knowledge',
    description: '应用场景梳理与案例分析，覆盖B端和C端典型落地场景',
    enabled: true, configFields: ['场景分类', '案例来源'], source: '来自任务#AIAgent报告', scopeCount: 1,
    createdAt: '2026-05-09', author: 'WorkAgent', version: 'v1.0',
    steps: [
      { order: 1, name: '场景分类', description: '按行业/职能分类梳理应用场景' },
      { order: 2, name: '案例收集', description: '收集典型落地案例和客户反馈' },
      { order: 3, name: '价值评估', description: '评估各场景的ROI和落地成熟度' },
    ],
    calls: 1, successRate: 100, avgDuration: '10s',
    dependencies: ['企业搜索'], graphWrite: true, graphWriteDesc: '场景数据写入项目知识图谱',
    inputParams: [
      { name: 'industry', type: 'string', required: true, description: '目标行业' },
    ],
    outputs: [
      { name: 'use_cases', description: '应用场景清单' },
      { name: 'case_studies', description: '案例分析报告' },
    ],
    callExample: '梳理AI Agent在客服、编程、数据分析等场景的应用',
    approvalNote: '', isPreset: true,
  },
  {
    id: 's_report', name: 'ReportWriter', icon: '📄', category: 'tool',
    description: '专业报告撰写引擎，支持自动生成目录、图表、 executive summary',
    enabled: true, configFields: ['模板', '输出格式'], source: '来自任务#AIAgent报告', scopeCount: 1,
    createdAt: '2026-05-09', author: 'WorkAgent', version: 'v1.0',
    steps: [
      { order: 1, name: '结构规划', description: '根据数据自动规划报告章节结构' },
      { order: 2, name: '内容撰写', description: '生成各章节正文内容' },
      { order: 3, name: '图表嵌入', description: '自动插入数据图表和可视化' },
      { order: 4, name: '格式输出', description: '输出为 HTML/PDF/Word 格式' },
    ],
    calls: 1, successRate: 100, avgDuration: '20s',
    dependencies: ['图表生成', 'LLM'], graphWrite: false, graphWriteDesc: '报告作为文件输出',
    inputParams: [
      { name: 'data', type: 'object', required: true, description: '报告数据源' },
      { name: 'pages', type: 'number', required: false, description: '目标页数' },
    ],
    outputs: [
      { name: 'report_html', description: '报告 HTML 文件' },
      { name: 'report_pdf', description: '报告 PDF 文件' },
    ],
    callExample: '基于市场数据和竞品分析生成30页投资分析报告',
    approvalNote: '', isPreset: true,
  },
  // 风控相关 Skill
  {
    id: 's_sql', name: 'SQL执行器', icon: '🗄️', category: 'governance',
    description: '连接企业数据仓库执行SQL查询', enabled: true,
    configFields: ['数据源', '超时时间'], source: '系统内置', scopeCount: 5,
    createdAt: '2026-03-15', author: '系统', version: 'v1.2',
    steps: [
      { order: 1, name: '接收查询', description: '接收并解析用户输入的 SQL 语句' },
      { order: 2, name: '语法验证', description: '校验 SQL 语法合法性及权限范围' },
      { order: 3, name: '连接数据源', description: '根据配置建立到目标数据库的连接' },
      { order: 4, name: '执行查询', description: '在超时限制内执行 SQL 并获取结果集' },
      { order: 5, name: '格式化返回', description: '将结果转换为 JSON/表格等结构化格式' },
    ],
    calls: 2450, successRate: 99, avgDuration: '2.3s',
    dependencies: ['SQL Tool'], graphWrite: false, graphWriteDesc: '查询结果不写入图谱',
    inputParams: [
      { name: 'query', type: 'string', required: true, description: 'SQL 查询语句' },
      { name: 'datasource', type: 'string', required: false, description: '目标数据源名称' },
    ],
    outputs: [
      { name: 'result', description: '查询结果集（JSON/表格）' },
      { name: 'row_count', description: '返回行数' },
    ],
    callExample: '查询供应商交易记录和财务数据',
    approvalNote: '', isPreset: false,
  },
  {
    id: 's_python', name: 'Python沙箱', icon: '🐍', category: 'analysis',
    description: '安全执行Python代码进行数据分析与模型训练', enabled: true,
    configFields: ['内存限制', '包白名单'], source: '系统内置', scopeCount: 4,
    createdAt: '2026-02-01', author: '系统', version: 'v2.0',
    steps: [
      { order: 1, name: '代码接收', description: '接收 Python 代码片段及输入数据' },
      { order: 2, name: '安全检查', description: '扫描危险操作、验证包白名单' },
      { order: 3, name: '隔离执行', description: '在 Docker 沙箱中运行代码' },
      { order: 4, name: '输出捕获', description: '捕获 stdout、stderr 及返回对象' },
      { order: 5, name: '结果返回', description: '返回执行结果、图表对象或错误信息' },
    ],
    calls: 1892, successRate: 94, avgDuration: '12s',
    dependencies: ['Python Sandbox'], graphWrite: true, graphWriteDesc: '分析结果写入项目知识图谱',
    inputParams: [
      { name: 'code', type: 'string', required: true, description: 'Python 代码' },
      { name: 'input_data', type: 'object', required: false, description: '输入数据' },
    ],
    outputs: [
      { name: 'output', description: '执行输出' },
      { name: 'charts', description: '生成的图表对象' },
    ],
    callExample: '运行信用评分模型，输入供应商财务数据',
    approvalNote: '', isPreset: false,
  },
  {
    id: 's_credit', name: '供应商信用评估', icon: '📑', category: 'knowledge',
    description: '对供应商进行多维度信用评分，输出风险等级和评估摘要', enabled: true,
    configFields: ['评分模型', '阈值'], source: '来自任务#信用评估', scopeCount: 5,
    createdAt: '2026-04-10', author: 'samhar', version: 'v1.2.0',
    steps: [
      { order: 1, name: '数据收集', description: '收集供应商交易记录、财报、外部评级等数据' },
      { order: 2, name: '指标计算', description: '计算偿债能力、盈利能力、运营能力等关键指标' },
      { order: 3, name: '评分计算', description: '基于评分模型计算综合信用分数' },
      { order: 4, name: '风险分级', description: '根据阈值划分为 A/B/C/D 风险等级' },
      { order: 5, name: '报告生成', description: '生成信用评估报告和风险预警摘要' },
    ],
    calls: 1243, successRate: 96, avgDuration: '2m14s',
    dependencies: ['SQL Tool', 'Python', '企查查 MCP'], graphWrite: true, graphWriteDesc: '高风险供应商标记为「风险实体」，评分结果写入项目知识图谱',
    inputParams: [
      { name: 'supplier_ids', type: 'list', required: true, description: '供应商 ID 列表' },
      { name: 'period', type: 'string', required: false, description: '评估周期' },
    ],
    outputs: [
      { name: 'scores', description: '每家供应商评分详情' },
      { name: 'summary', description: '自然语言摘要' },
      { name: 'high_risk', description: '高风险供应商列表' },
    ],
    callExample: '评估这 50 家供应商的信用风险',
    approvalNote: '', isPreset: false,
  },
  {
    id: 's_chart', name: '图表生成', icon: '📈', category: 'analysis',
    description: '基于数据自动生成多种类型图表', enabled: true,
    configFields: ['默认主题', '导出格式'], source: '系统内置', scopeCount: 6,
    createdAt: '2026-01-10', author: '系统', version: 'v1.5',
    steps: [
      { order: 1, name: '数据解析', description: '识别输入数据的类型、维度与数值分布' },
      { order: 2, name: '图表推荐', description: '根据数据特征推荐最优图表类型' },
      { order: 3, name: '配置生成', description: '生成 ECharts 配置，应用主题与配色' },
      { order: 4, name: '图表渲染', description: '渲染交互式图表' },
      { order: 5, name: '导出交付', description: '导出为 PNG/SVG/PDF 等指定格式' },
    ],
    calls: 1567, successRate: 96, avgDuration: '4.5s',
    dependencies: ['ECharts', 'Python Sandbox'], graphWrite: false, graphWriteDesc: '图表作为产出物',
    inputParams: [
      { name: 'data', type: 'object', required: true, description: '输入数据' },
      { name: 'chart_type', type: 'string', required: false, description: '指定图表类型' },
    ],
    outputs: [
      { name: 'chart', description: '渲染后的图表对象' },
      { name: 'export_url', description: '导出文件链接' },
    ],
    callExample: '生成供应商信用评分分布柱状图',
    approvalNote: '', isPreset: false,
  },
];

/* ═══════════════════════════════════════════════
   独立任务 — 柯布西耶 PPT（保留）
   ═══════════════════════════════════════════════ */

export interface StandaloneTask {
  id: string;
  name: string;
  type: 'single' | 'group';
  messages: ChatMessage[];
  createdAt: string;
  pinned?: boolean;
  archived?: boolean;
}

export const standaloneTasks: StandaloneTask[] = [
  {
    id: 'st_corbusier',
    name: '柯布西耶 PPT',
    type: 'single',
    createdAt: '刚刚',
    pinned: true,
    messages: [
      {
        id: 'corbusier_u1',
        role: 'human',
        senderId: 'samhar',
        senderName: 'samhar',
        content: '帮我生成一个介绍柯布西耶的PPT',
        timestamp: '09:30',
      },
      {
        id: 'corbusier_r1',
        role: 'agent',
        senderId: 'workagent',
        senderName: 'WorkAgent',
        content:
          '好的！我来帮你生成一个介绍柯布西耶的电子杂志风格 PPT。\n\n' +
          '在动手之前，让我先确认几个基本需求：\n\n' +
          '1. **主题色偏好**：我推荐用 沙丘（🌙） 或 墨水经典（✒️），比较适合艺术/建筑类主题，你有偏好吗？\n\n' +
          '2. **页数**：大概需要多少页？15分钟演讲≈10页，30分钟≈20页。\n\n' +
          '3. **风格**：你想要偏建筑专业介绍，还是偏大众科普？\n\n' +
          '不过，如果你想直接开始，我可以先用 **沙丘主题色**，给你做一个 15-18 页的标准分享 PPT（覆盖柯布西耶生平、建筑理念、代表作品、影响等）。\n\n' +
          '你先告诉我偏好，我来规划具体内容结构？',
        timestamp: '09:31',
        metadata: {
          messageType: 'workagent' as const,
          reasoning: {
            text:
              'The user wants to create a PPT about Le Corbusier. Let me first read the relevant skill for PPT creation.\n\n' +
              'I\'ll need to:\n' +
              '1. Clarify requirements (theme, page count, style)\n' +
              '2. Copy the template\n' +
              '3. Fill in the content\n\n' +
              'Le Corbusier is a famous architect. I should ask a few questions first.',
            duration: 29,
          },
        },
      },
      {
        id: 'corbusier_u2',
        role: 'human',
        senderId: 'samhar',
        senderName: 'samhar',
        content: '沙丘 15页 建筑专业介绍',
        timestamp: '09:32',
      },
      {
        id: 'corbusier_r2',
        role: 'agent',
        senderId: 'workagent',
        senderName: 'WorkAgent',
        content:
          '收到！确认需求：**沙丘主题 · 15页 · 建筑专业介绍**。\n\n' +
          '我现在开始创建。规划的内容结构如下：\n\n' +
          '1. 封面（hero dark）— 柯布西耶肖像 + 标题\n' +
          '2. 幕封（hero light）— Act I: 生平\n' +
          '3. 数据大字报（light）— 1887-1965 关键数字\n' +
          '4. 左文右图（dark）— 早年经历：瑞士工匠家庭 → 巴黎求学\n' +
          '5. 幕封（hero dark）— Act II: 建筑理念\n' +
          '6. 五大原则 Pipeline（light）— 新建筑五点\n' +
          '7. 大引用（hero light）—「住宅是居住的机器」\n' +
          '8. 模度系统（dark）— Le Modulor 人体比例\n' +
          '9. 幕封（hero light）— Act III: 代表作品\n' +
          '10. 朗香教堂（light）— 混凝土与光的对话\n' +
          '11. 拉图雷特（dark）— 修道院的空间体验\n' +
          '12. 图片网格（light）— 全球足迹\n' +
          '13. 城市规划（dark）— 光辉城市\n' +
          '14. 影响与遗产（light）— 国际主义 / 粗野主义 / CIAM\n' +
          '15. 收束（hero dark）— 留给后世的问题',
        timestamp: '09:33',
        metadata: {
          messageType: 'workagent' as const,
          reasoning: {
            text:
              'User selected: Dune theme, 15 pages, architectural professional style.\n\n' +
              'I\'ll execute the plan:\n' +
              '1. Read themes.md to confirm Dune color scheme\n' +
              '2. Read layouts.md for architecture-friendly layouts\n' +
              '3. Write the 15 slides\n\n' +
              'Content plan:\n' +
              '• Cover: Portrait + title\n' +
              '• TOC\n' +
              '• Biography (2 pages)\n' +
              '• Architecture principles (3 pages)\n' +
              '• Masterpieces (4 pages)\n' +
              '• Legacy + Conclusion',
            duration: 15,
          },
        },
      },
      {
        id: 'corbusier_r3',
        role: 'agent',
        senderId: 'workagent',
        senderName: 'WorkAgent',
        content:
          '柯布西耶 PPT 已生成完毕！\n\n' +
          '📄 **文件位置**：corbusier-ppt/index.html\n' +
          '📊 **页数**：15页\n' +
          '🎨 **主题**：沙丘（电子杂志风格）\n\n' +
          '内容涵盖：\n' +
          '• 柯布西耶生平与时代背景\n' +
          '• 建筑五要素与模度理论\n' +
          '• 四大代表作品深度解析\n' +
          '• 对现代建筑的深远影响',
        timestamp: '09:34',
        metadata: {
          messageType: 'completion' as const,
          files: ['corbusier-ppt/index.html'],
          reportTitle: '柯布西耶 PPT 已完成',
          artifactUrl: '/corbusier-ppt/index.html',
          themeColor: '沙丘（炭灰 + 沙色）',
          pages: 15,
          style: '建筑专业介绍',
          slideStructure: [
            { page: 1, type: '封面', title: '柯布西耶 — 现代建筑之父' },
            { page: 2, type: 'Act I 幕封', title: '生平' },
            { page: 3, type: '数据大字报', title: '一生关键数字（1887-1965, 78作品, 24著作...）' },
            { page: 4, type: '左文右图', title: '早年经历 — 从工匠到大师' },
            { page: 5, type: 'Act II 幕封', title: '建筑理念' },
            { page: 6, type: 'Pipeline', title: '新建筑五点原则（柱墩/屋顶花园/自由平面/横窗/自由立面）' },
            { page: 7, type: '大引用', title: '"住宅是居住的机器"' },
            { page: 8, type: '图文混排', title: '模度系统 Le Modulor' },
            { page: 9, type: 'Act III 幕封', title: '代表作品' },
            { page: 10, type: '左文右图', title: '朗香教堂 Notre-Dame-du-Haut' },
            { page: 11, type: '左文右图', title: '拉图雷特修道院 La Tourette' },
            { page: 12, type: '图片网格', title: '全球足迹（联合国总部/马赛公寓/昌迪加尔...）' },
            { page: 13, type: 'Pipeline', title: '影响与遗产 + 核心著作' },
            { page: 14, type: '问题收束', title: '留给建筑的问题' },
            { page: 15, type: '结尾幕封', title: 'The Question' },
          ],
          fileSize: '48.8 KB',
          responseTime: '10m 50s',
        },
      },
    ],
  },
  /* ═══════════════════════════════════════════════
     独立任务 — AI Agent 行业深度分析报告
     ═══════════════════════════════════════════════ */
  {
    id: 'st_agent_report',
    name: 'AI Agent 行业深度分析报告',
    type: 'single',
    createdAt: '2小时前',
    pinned: false,
    messages: [
      {
        id: 'agent_u1',
        role: 'human',
        senderId: 'samhar',
        senderName: 'samhar',
        content: '帮我写一份2026年AI Agent行业的深度分析报告',
        timestamp: '14:00',
      },
      {
        id: 'agent_q1',
        role: 'agent',
        senderId: 'workagent',
        senderName: 'WorkAgent',
        content:
          '好的！我来帮你撰写 2026 年 AI Agent 行业深度分析报告。\n\n' +
          '在动笔之前，让我先确认几个关键需求：\n\n' +
          '1. **报告受众**：面向投资人 / 技术从业者 / 企业决策者？这会影响报告的深度和侧重点。\n\n' +
          '2. **篇幅要求**：20页简版概览 / 30页深度分析 / 50页完整研报？\n\n' +
          '3. **内容侧重**：你更关注哪些方面？\n' +
          '   • 技术架构与基础设施\n' +
          '   • 市场格局与融资趋势\n' +
          '   • 应用场景与落地案例\n' +
          '   • 竞争壁垒与未来预测\n\n' +
          '如果你想直接开始，我可以先用 **投资人视角**，给你做一份 30 页的深度分析报告（覆盖市场格局 + 应用场景 + 竞争分析 + 投资建议）。',
        timestamp: '14:01',
        metadata: {
          messageType: 'question' as const,
        },
      },
      {
        id: 'agent_u2',
        role: 'human',
        senderId: 'samhar',
        senderName: 'samhar',
        content: '投资人视角 30页深度 市场格局+应用场景+投资建议',
        timestamp: '14:02',
      },
      {
        id: 'agent_plan',
        role: 'agent',
        senderId: 'workagent',
        senderName: 'WorkAgent',
        content:
          '收到！确认需求：**投资人视角 · 30页深度 · 市场格局 + 应用场景 + 投资建议**。\n\n' +
          '我现在开始编排任务。报告执行方案如下：',
        timestamp: '14:02',
        metadata: {
          messageType: 'plan' as const,
          steps: [
            { step: 1, name: '市场数据收集', tool: 'MarketResearch Skill' },
            { step: 2, name: '竞品分析', tool: 'CompetitorAnalysis Skill' },
            { step: 3, name: '场景梳理', tool: 'UseCaseAnalysis Skill' },
            { step: 4, name: '报告撰写', tool: 'ReportWriter Skill' },
          ],
        },
      },
      {
        id: 'agent_sub1',
        role: 'agent',
        senderId: 'subagent_market',
        senderName: 'MarketResearch',
        content:
          '✓ 市场数据收集完成（耗时 18s）\n\n' +
          '**2026年AI Agent市场核心数据（来源：大象研究院、IDC、智研咨询）：**\n\n' +
          '• 全球核心市场规模：**$187亿**（同比增长 **215%**）\n' +
          '• 相关经济生态规模：突破 **$5000亿**\n' +
          '• 中国市场规模：**¥480亿**（CAGR **53.7%**）\n' +
          '• 中国软件市场：突破 **¥130亿**（IDC口径）\n' +
          '• 2025年全球融资：**665亿元**（同比 +80%，占AI领域32%）\n' +
          '• 2025上半年种子轮：**$7亿**（单笔均值较2023年提升280%）\n\n' +
          '**重点融资案例：**\n' +
          '• Manus AI：**$7500万**（Benchmark领投，估值近$5亿）\n' +
          '• 智谱AI AutoGLM：**¥18亿**（多地国资战略投资）\n' +
          '• 新晋独角兽：7家（3家中国公司）\n\n' +
          '**政策环境：**\n' +
          '• 2026年政府工作报告**首次将"智能体"写入政策文本**\n' +
          '• 国务院目标：2027年智能体应用普及率超70%\n' +
          '• 工信部八部门：2027年前推出1000个高水平工业智能体',
        timestamp: '14:03',
        metadata: {
          messageType: 'subagent' as const,
          toolCall: { name: 'MarketResearch', input: '收集2026年AI Agent行业市场规模、增长率、融资数据与政策动向' },
        },
      },
      {
        id: 'agent_sub2',
        role: 'agent',
        senderId: 'subagent_compete',
        senderName: 'CompetitorAnalysis',
        content:
          '✓ 竞品分析完成（耗时 15s）\n\n' +
          '**2026年头部玩家能力对比矩阵（综合评测数据）：**\n\n' +
          '| 公司 | 核心产品 | 综合得分 | 代码能力 | 市场份额 | 估值 |\n' +
          '|------|---------|---------|---------|---------|------|\n' +
          '| OpenAI | GPT-5 + Operator | 87.4 | 85 | 28% | $1570亿 |\n' +
          '| Anthropic | Claude 3.5 Agent | 87.0 | **91** | 18% | $615亿 |\n' +
          '| Google | Gemini 2.0 + ADK | 84 | 82 | 22% | - |\n' +
          '| Meta | Llama 4 Agents | 76 | 75 | 12% | - |\n' +
          '| 智谱AI | ChatGLM-Agent | 72 | 70 | 8% | $30亿 |\n\n' +
          '**关键发现：**\n' +
          '• **OpenAI**：全能冠军，工具调用与网页自动化最强，但价格行业最高\n' +
          '• **Anthropic**：代码开发碾压级领先（91分），AI人才留存率行业第一（2.68倍），长上下文200k+\n' +
          '• **Google**：多模态最强（1M上下文），广告变现效率远超OpenAI/Anthropic\n' +
          '• **Meta**：开源首选，AI广告变现2025 Q2收入增长21%，170万亿tokens数据量\n' +
          '• **中国公司**：客服、办公场景落地速度更快，但在基础模型上仍有差距',
        timestamp: '14:04',
        metadata: {
          messageType: 'subagent' as const,
          toolCall: { name: 'CompetitorAnalysis', input: '分析OpenAI、Anthropic、Google、Meta、智谱AI等头部玩家产品能力与竞争壁垒' },
        },
      },
      {
        id: 'agent_sub3',
        role: 'agent',
        senderId: 'subagent_usecase',
        senderName: 'UseCaseAnalysis',
        content:
          '✓ 场景梳理完成（耗时 12s）\n\n' +
          '**AI Agent 核心应用场景落地数据（按成熟度排序）：**\n\n' +
          '🥇 **智能客服**（成熟度最高，渗透率全球80%/中国60%）\n' +
          '  • B站：基于RAG重构客服，拦截率提升 **30%**\n' +
          '  • 哈啰出行：从Copilot进阶到Agent模式，可调用业务API处理判责\n' +
          '  • 去哪儿网：多Agent并行架构完成航班预订与比价\n' +
          '  • 平均降本：**60%-80%** 人力成本（德勤数据）\n\n' +
          '🥈 **编程辅助**（用户规模最大，Copilot用户超2000万）\n' +
          '  • GitHub Copilot：付费订阅 **470万+**，市场份额 **42%**\n' +
          '  • 编码效率提升 **55%**，PR交付周期缩短 **75%**\n' +
          '  • Claude Code 开发者喜爱度 **46%**，远超Copilot的9%\n\n' +
          '🥉 **数据分析**（金融投研标杆）\n' +
          '  • 贝莱德Aladdin：每日执行 **5000次** 压力测试，监控2000+风险因素\n' +
          '  • 报表生成时间：从4h降至 **15min**\n' +
          '  • ChatBI模式：业务人员自然语言对话即可获取分析结论\n\n' +
          '**高潜力新兴场景：**\n' +
          '• 供应链决策（中控技术落地110+项目，经济效益超17亿元）\n' +
          '• 金融风控（国家电网"营销供电方案智能体"已上线）\n' +
          '• 工业制造（工信部目标2027年前1000个工业智能体）',
        timestamp: '14:05',
        metadata: {
          messageType: 'subagent' as const,
          toolCall: { name: 'UseCaseAnalysis', input: '梳理AI Agent在客服、编程、数据分析、金融、工业等场景的落地案例与量化效果' },
        },
      },
      {
        id: 'agent_sub4',
        role: 'agent',
        senderId: 'subagent_report',
        senderName: 'ReportWriter',
        content:
          '✓ 报告撰写完成（耗时 22s）\n\n' +
          '已生成 **34页** 深度投资分析报告（因数据丰富自动扩展2页），包含：\n\n' +
          '• Executive Summary（2页）\n' +
          '• 市场规模与增长预测（6页）\n' +
          '• 竞争格局与头部玩家深度对比（7页）\n' +
          '• 应用场景与落地案例（8页）\n' +
          '• 投融资趋势与估值分析（4页）\n' +
          '• 政策环境与监管风险（3页）\n' +
          '• 投资建议与风险提示（3页）\n' +
          '• 附录：数据图表与引用来源（1页）',
        timestamp: '14:06',
        metadata: {
          messageType: 'subagent' as const,
          toolCall: { name: 'ReportWriter', input: '基于市场数据、竞品分析、场景分析生成30页投资报告' },
        },
      },
      {
        id: 'agent_complete',
        role: 'agent',
        senderId: 'workagent',
        senderName: 'WorkAgent',
        content:
          'AI Agent 行业深度分析报告已生成完毕！\n\n' +
          '📄 **文件位置**：ai-agent-report-2026/index.html\n' +
          '📊 **页数**：34页（因数据丰富自动扩展）\n' +
          '🎯 **受众**：投资人视角\n\n' +
          '**核心结论（基于真实调研数据）：**\n' +
          '• 2026年全球AI Agent核心市场达 **$187亿**，增速 **215%**，为规模化商用元年\n' +
          '• 中国市场 **¥480亿**，CAGR 53.7%，政策首次写入政府工作报告\n' +
          '• 客服（渗透率80%）、编程（Copilot 470万付费）、数据分析三大场景已规模化落地\n' +
          '• OpenAI/Anthropic/Google/Meta 四强格局确立，中国在应用层有差异化机会\n\n' +
          '**投资建议：**\n' +
          '• **短期（6个月）**：关注已验证商业模式的客服Agent（B站/哈啰模式可复制）\n' +
          '• **中期（1-2年）**：布局编程Agent基础设施（Claude Code生态、Cursor模式）\n' +
          '• **长期（3年+）**：押注工业智能体（政策驱动，中控技术已验证经济效益）',
        timestamp: '14:07',
        metadata: {
          messageType: 'completion' as const,
          files: ['ai-agent-report-2026/index.html', 'ai-agent-report-2026/data-charts.zip'],
          reportTitle: 'AI Agent 行业深度分析报告',
          artifactUrl: '/ai-agent-report-2026/index.html',
          themeColor: '专业蓝灰',
          pages: 34,
          style: '投资人深度分析',
          fileSize: '3.1 MB',
          responseTime: '7m 30s',
        },
      },
    ],
  },
];

/* ═══════════════════════════════════════════════
   项目任务 — 供应链金融风控平台
   ═══════════════════════════════════════════════ */

// 任务1：供应商信用评估报告
const creditAssessmentMessages: ChatMessage[] = [
  {
    id: 'credit_u1',
    role: 'human',
    senderId: 'samhar',
    senderName: 'samhar',
    content: '帮我评估这50家核心供应商的信用风险，数据已上传到项目上下文',
    timestamp: '10:00',
    metadata: {
      files: ['supplier_data_2026Q1.xlsx'],
    },
  },
  {
    id: 'credit_q1',
    role: 'agent',
    senderId: 'workagent',
    senderName: 'WorkAgent',
    content:
      '收到！已读取 **supplier_data_2026Q1.xlsx**，共 50 家供应商，包含交易记录、财报数据、合同履约信息。\n\n' +
      '在启动评估之前，确认几个需求细节：\n\n' +
      '1. **评估维度**：\n' +
      '   • 仅财务健康度（偿债能力、盈利能力）\n' +
      '   • 全维度（财务 + 履约记录 + 行业风险 + 舆情）\n\n' +
      '2. **输出格式**：\n' +
      '   • 简洁评分表（A/B/C/D 四级）\n' +
      '   • 分级报告 + 高风险供应商详细尽调\n\n' +
      '3. **预警机制**：高风险供应商是否需要单独标记并生成预警通知？',
    timestamp: '10:01',
    metadata: {
      messageType: 'question' as const,
    },
  },
  {
    id: 'credit_u2',
    role: 'human',
    senderId: 'samhar',
    senderName: 'samhar',
    content: '全维度评估 分级报告+详细尽调 高风险需要预警',
    timestamp: '10:02',
  },
  {
    id: 'credit_plan',
    role: 'agent',
    senderId: 'workagent',
    senderName: 'WorkAgent',
    content:
      '收到！确认需求：**全维度评估 · 分级报告 + 详细尽调 · 高风险预警**。\n\n' +
      '评估执行方案如下：',
    timestamp: '10:02',
    metadata: {
      messageType: 'plan' as const,
      steps: [
        { step: 1, name: '数据清洗', tool: 'DataClean Skill' },
        { step: 2, name: '财务指标计算', tool: 'FinanceCalc Skill' },
        { step: 3, name: '信用评分', tool: 'CreditScore Skill' },
        { step: 4, name: '风险报告生成', tool: 'RiskReport Skill' },
      ],
    },
  },
  {
    id: 'credit_sub1',
    role: 'agent',
    senderId: 'subagent_dataclean',
    senderName: '数据清洗 Agent',
    content:
      '✓ 数据清洗完成（耗时 8s）\n\n' +
      '**数据质量检查结果：**\n\n' +
      '• 总记录：50 家供应商\n' +
      '• 完整记录：47 家（94%）\n' +
      '• 缺失值处理：3 家缺失近一期财报，已用历史均值插补\n' +
      '• 异常检测：发现 2 家供应商营收波动异常（>300%），已标记待复核\n\n' +
      '**清洗后数据维度：**\n' +
      '• 基础信息：注册资本、成立年限、所属行业\n' +
      '• 财务数据：近3年营收、净利润、资产负债率、现金流\n' +
      '• 交易数据：近12个月订单金额、履约率、退货率\n' +
      '• 外部数据：企查查信用评分、涉诉记录、行政处罚',
    timestamp: '10:03',
    metadata: {
      messageType: 'subagent' as const,
      toolCall: { name: 'DataClean', input: '清洗50家供应商数据，处理缺失值和异常' },
    },
  },
  {
    id: 'credit_sub2',
    role: 'agent',
    senderId: 'subagent_credit',
    senderName: '信用评估 Agent',
    content:
      '✓ 信用评分完成（耗时 45s）\n\n' +
      '**50家供应商信用评估结果：**\n\n' +
      '🟢 **A级（优秀）— 12家（24%）**\n' +
      '  评分区间：85-100分\n' +
      '  代表：华为技术、比亚迪股份、宁德时代\n' +
      '  特征：财务稳健、履约率>98%、无不良记录\n\n' +
      '🟡 **B级（良好）— 28家（56%）**\n' +
      '  评分区间：70-84分\n' +
      '  特征：财务健康、偶有延迟交付、整体可控\n\n' +
      '🟠 **C级（关注）— 8家（16%）**\n' +
      '  评分区间：55-69分\n' +
      '  特征：负债率偏高、现金流紧张、需密切监控\n\n' +
      '🔴 **D级（高风险）— 2家（4%）**\n' +
      '  评分区间：<55分\n' +
      '  ⚠️ 盛达贸易（38分）：连续2季度亏损，涉诉3起\n' +
      '  ⚠️ 宏远建材（42分）：资产负债率 89%，现金流断裂风险',
    timestamp: '10:04',
    metadata: {
      messageType: 'subagent' as const,
      toolCall: { name: 'CreditScore', input: '基于清洗后数据计算50家供应商信用评分' },
    },
  },
  {
    id: 'credit_sub3',
    role: 'agent',
    senderId: 'subagent_report',
    senderName: '报告生成 Agent',
    content:
      '✓ 风险报告生成完成（耗时 20s）\n\n' +
      '已输出以下 deliverables：\n\n' +
      '1. **供应商信用评分总表**（50家完整评分）\n' +
      '2. **高风险供应商详细尽调报告**（盛达贸易、宏远建材）\n' +
      '3. **风险预警清单**（C级+D级共10家）\n' +
      '4. **信用评分分布图**（柱状图 + 雷达图）\n' +
      '5. **行业对比分析**（按制造业/贸易/物流分组）',
    timestamp: '10:05',
    metadata: {
      messageType: 'subagent' as const,
      toolCall: { name: 'RiskReport', input: '生成信用评估分级报告和高风险尽调' },
    },
  },
  {
    id: 'credit_complete',
    role: 'agent',
    senderId: 'workagent',
    senderName: 'WorkAgent',
    content:
      '供应商信用评估报告已完成！\n\n' +
      '📄 **文件位置**：\n' +
      '  • supplier-credit-report-2026Q1.html（总报告）\n' +
      '  • high-risk-due-diligence.pdf（高风险尽调）\n' +
      '  • risk-alert-list.xlsx（预警清单）\n\n' +
      '📊 **评估概况：**\n' +
      '  • 评估供应商：50家\n' +
      '  • A级（优秀）：12家（24%）\n' +
      '  • B级（良好）：28家（56%）\n' +
      '  • C级（关注）：8家（16%）\n' +
      '  • D级（高风险）：2家（4%）\n\n' +
      '⚠️ **紧急预警：**\n' +
      '  • 盛达贸易（38分）：建议暂停新增订单，启动法务尽调\n' +
      '  • 宏远建材（42分）：建议收紧账期，要求追加担保\n\n' +
      '所有 C 级及以上供应商已生成监控看板，后续每季度自动更新评分。',
    timestamp: '10:06',
    metadata: {
      messageType: 'completion' as const,
      files: ['supplier-credit-report-2026Q1.html', 'high-risk-due-diligence.pdf', 'risk-alert-list.xlsx'],
      reportTitle: '供应商信用评估报告 2026Q1',
      artifactUrl: '/supplier-credit-report-2026Q1.html',
      fileSize: '3.8 MB',
      responseTime: '6m 12s',
    },
  },
];

// 任务2：贷后监控预警模型优化
const monitorOptimizeMessages: ChatMessage[] = [
  {
    id: 'monitor_u1',
    role: 'human',
    senderId: 'samhar',
    senderName: 'samhar',
    content: '现有的贷后预警模型误报率太高了，帮我优化一下',
    timestamp: '11:00',
  },
  {
    id: 'monitor_q1',
    role: 'agent',
    senderId: 'workagent',
    senderName: 'WorkAgent',
    content:
      '了解。已读取当前贷后预警模型配置和历史运行日志。\n\n' +
      '当前模型概况：\n' +
      '• 模型类型：XGBoost 二分类\n' +
      '• 触发规则：12个风险指标，任意3个异常即预警\n' +
      '• 近30天数据：总预警 1,247 次，经人工复核误报 187 次\n\n' +
      '为了更精准地优化，确认几个细节：\n\n' +
      '1. **当前误报率**：约 15%（187/1247），你的目标误报率是多少？（行业优秀水平 3-5%）\n\n' +
      '2. **主要误报场景**：\n' +
      '   • 正常经营波动被误判（如季节性备货导致的短期资金紧张）\n' +
      '   • 数据延迟导致的滞后误报\n' +
      '   • 行业周期性波动被误判为个体风险\n' +
      '   哪个场景占比最高？\n\n' +
      '3. **优化方向偏好**：特征工程优化 / 模型算法升级 / 规则阈值调优 / 多模型融合？',
    timestamp: '11:01',
    metadata: {
      messageType: 'question' as const,
    },
  },
  {
    id: 'monitor_u2',
    role: 'human',
    senderId: 'samhar',
    senderName: 'samhar',
    content: '目标误报率5% 主要是季节性误报 特征工程+模型调参',
    timestamp: '11:02',
  },
  {
    id: 'monitor_plan',
    role: 'agent',
    senderId: 'workagent',
    senderName: 'WorkAgent',
    content:
      '收到！确认需求：**目标误报率 5% · 主要解决季节性误报 · 特征工程 + 模型调参**。\n\n' +
      '优化执行方案如下：',
    timestamp: '11:02',
    metadata: {
      messageType: 'plan' as const,
      steps: [
        { step: 1, name: '特征工程', tool: 'FeatureEngineer Skill' },
        { step: 2, name: '样本重采样', tool: 'SampleBalancer Skill' },
        { step: 3, name: '模型调参', tool: 'ModelTuner Skill' },
        { step: 4, name: '效果验证', tool: 'ModelValidator Skill' },
      ],
    },
  },
  {
    id: 'monitor_sub1',
    role: 'agent',
    senderId: 'subagent_feature',
    senderName: '特征工程 Agent',
    content:
      '✓ 特征工程完成（耗时 25s）\n\n' +
      '**新增特征（共 23 个）：**\n\n' +
      '📅 **季节性因子（8个）**\n' +
      '  • 行业月度均值偏离度\n' +
      '  • 季度库存周转率基准\n' +
      '  • 节假日备货模式识别\n' +
      '  • 现金流季节性波动系数\n\n' +
      '📊 **滚动窗口统计（7个）**\n' +
      '  • 近3月/6月/12月指标均值\n' +
      '  • 环比变化率（去季节性）\n' +
      '  • 波动率（标准差/均值）\n\n' +
      '🏭 **行业基准（5个）**\n' +
      '  • 同行业分位数排名\n' +
      '  • 行业景气度指数\n' +
      '  • 上下游联动风险指标\n\n' +
      '🔧 **交互特征（3个）**\n' +
      '  • 资产负债率 × 现金流比率\n' +
      '  • 营收增长率 × 行业增速偏离\n' +
      '  • 订单集中度 × 客户稳定性',
    timestamp: '11:03',
    metadata: {
      messageType: 'subagent' as const,
      toolCall: { name: 'FeatureEngineer', input: '新增季节性因子、滚动窗口统计、行业基准偏离度等23个特征' },
    },
  },
  {
    id: 'monitor_sub2',
    role: 'agent',
    senderId: 'subagent_ml',
    senderName: '模型优化 Agent',
    content:
      '✓ 模型调参完成（耗时 60s）\n\n' +
      '**XGBoost 超参优化结果：**\n\n' +
      '| 参数 | 旧值 | 新值 | 优化方向 |\n' +
      '|------|------|------|---------|\n' +
      '| max_depth | 6 | 8 | 增加模型复杂度 |\n' +
      '| learning_rate | 0.1 | 0.05 | 更精细的梯度下降 |\n' +
      '| n_estimators | 200 | 500 | 更多弱学习器 |\n' +
      '| subsample | 0.8 | 0.7 | 减少过拟合 |\n' +
      '| colsample_bytree | 0.8 | 0.9 | 增加特征多样性 |\n' +
      '| scale_pos_weight | 1 | 2.5 | 平衡正负样本 |\n' +
      '| min_child_weight | 1 | 5 | 抑制异常值影响 |\n\n' +
      '**训练结果：**\n' +
      '• AUC-ROC：0.847 → 0.912（+7.7%）\n' +
      '• Precision：0.72 → 0.86（+19.4%）\n' +
      '• Recall：0.81 → 0.83（+2.5%）\n' +
      '• F1-Score：0.76 → 0.84（+10.5%）',
    timestamp: '11:04',
    metadata: {
      messageType: 'subagent' as const,
      toolCall: { name: 'ModelTuner', input: 'GridSearch XGBoost最优超参，目标降低季节性误报' },
    },
  },
  {
    id: 'monitor_sub3',
    role: 'agent',
    senderId: 'subagent_validate',
    senderName: '效果验证 Agent',
    content:
      '✓ A/B 测试验证完成（耗时 30s）\n\n' +
      '**新旧模型对比（近30天测试集）：**\n\n' +
      '| 指标 | 旧模型 | 新模型 | 提升 |\n' +
      '|------|--------|--------|------|\n' +
      '| 总预警数 | 1,247 | 892 | -28.5% |\n' +
      '| 误报数 | 187 | 42 | -77.5% |\n' +
      '| **误报率** | **15.0%** | **4.7%** | **-68.7%** ✅ |\n' +
      '| 漏报数 | 23 | 19 | -17.4% |\n' +
      '| 漏报率 | 2.1% | 1.8% | -14.3% |\n\n' +
      '**季节性误报专项分析：**\n' +
      '• 春节前备货导致的误报：旧模型 67次 → 新模型 8次（-88%）\n' +
      '• 季度末回款延迟误报：旧模型 45次 → 新模型 12次（-73%）\n' +
      '• 行业景气度波动误报：旧模型 38次 → 新模型 11次（-71%）\n\n' +
      '🎯 **目标达成：误报率从 15% 降至 4.7%，满足 <5% 目标！**',
    timestamp: '11:05',
    metadata: {
      messageType: 'subagent' as const,
      toolCall: { name: 'ModelValidator', input: 'A/B测试对比新旧模型误报率' },
    },
  },
  {
    id: 'monitor_complete',
    role: 'agent',
    senderId: 'workagent',
    senderName: 'WorkAgent',
    content:
      '贷后监控预警模型优化已完成！\n\n' +
      '📄 **交付物：**\n' +
      '  • model-optimization-report.html（优化报告）\n' +
      '  • new-xgboost-model.pkl（新模型文件）\n' +
      '  • feature-importance-chart.png（特征重要性图）\n' +
      '  • ab-test-result.pdf（A/B测试报告）\n\n' +
      '📊 **核心成果：**\n' +
      '  • 误报率：**15.0% → 4.7%**（↓68.7%，达成 <5% 目标）\n' +
      '  • 预警总量：1,247 → 892（↓28.5%，减少无效预警 355次/月）\n' +
      '  • 漏报率：2.1% → 1.8%（同时降低，风险覆盖更全面）\n\n' +
      '🔧 **关键优化点：**\n' +
      '  • 新增 23 个特征，重点解决季节性误报\n' +
      '  • XGBoost 超参调优，AUC 提升至 0.912\n' +
      '  • 样本重采样平衡，抑制异常值干扰\n\n' +
      '💡 **后续建议：**\n' +
      '  • 新模型已部署至灰度环境，建议观察 2 周后全量上线\n' +
      '  • 建议每月自动重训练，持续适应市场变化',
    timestamp: '11:06',
    metadata: {
      messageType: 'completion' as const,
      files: ['model-optimization-report.html', 'new-xgboost-model.pkl', 'feature-importance-chart.png', 'ab-test-result.pdf'],
      reportTitle: '贷后预警模型优化报告',
      artifactUrl: '/model-optimization-report.html',
      fileSize: '5.2 MB',
      responseTime: '6m 45s',
    },
  },
];

// 装配项目任务
workLines[0].chats = [
  {
    id: 't_credit',
    name: '供应商信用评估报告',
    projectId: 'p_risk',
    type: 'single',
    messages: creditAssessmentMessages,
    pinned: true,
  },
  {
    id: 't_monitor',
    name: '贷后预警模型优化',
    projectId: 'p_risk',
    type: 'single',
    messages: monitorOptimizeMessages,
    pinned: false,
  },
];

/* ═══════════════════════════════════════════════
   辅助数据（Dashboard 等页面用）
   ═══════════════════════════════════════════════ */

export const taskFlow = [
  { step: 1, name: '需求澄清', agent: 'WorkAgent', status: 'completed' as const, time: '10:00' },
  { step: 2, name: '数据清洗', agent: '数据清洗 Agent', status: 'completed' as const, time: '10:03' },
  { step: 3, name: '信用评分', agent: '信用评估 Agent', status: 'completed' as const, time: '10:04' },
  { step: 4, name: '报告生成', agent: '报告生成 Agent', status: 'completed' as const, time: '10:05' },
  { step: 5, name: '任务完成', agent: '-', status: 'completed' as const, time: '10:06' },
];

export const activeAgents = [
  { id: 'a_workagent', name: '管理智能体', role: 'host' as const, status: 'running' as const, currentTask: '任务编排' },
  { id: 'a_dataclean', name: '数据清洗 数字员工', role: 'agent' as const, status: 'idle' as const, currentTask: '等待调度' },
  { id: 'a_credit', name: '信用评估 数字员工', role: 'agent' as const, status: 'idle' as const, currentTask: '等待调度' },
];

export const auditLogs = [
  { time: '10:06:00', event: 'WorkAgent 完成供应商信用评估报告', type: 'agent' as const },
  { time: '10:05:30', event: '报告生成 Agent 输出风险报告', type: 'skill' as const },
  { time: '10:04:45', event: '信用评估 Agent 完成50家供应商评分', type: 'agent' as const },
  { time: '10:03:20', event: '数据清洗 Agent 完成数据质量检查', type: 'agent' as const },
  { time: '10:02:10', event: 'WorkAgent 创建执行计划（4步）', type: 'plan' as const },
  { time: '10:00:05', event: 'samhar 上传文件 supplier_data_2026Q1.xlsx', type: 'file' as const },
];

export const dataItems: DataItem[] = [
  {
    id: 'd1',
    type: 'chart',
    title: '供应商信用评分分布',
    description: '50家供应商A/B/C/D四级评分分布柱状图',
    chartType: 'bar',
    data: [
      { label: 'A级（优秀）', value: 12 },
      { label: 'B级（良好）', value: 28 },
      { label: 'C级（关注）', value: 8 },
      { label: 'D级（高风险）', value: 2 },
    ],
    sourceMessageId: 'credit_sub2',
  },
  {
    id: 'd2',
    type: 'chart',
    title: '预警模型A/B测试对比',
    description: '新旧模型误报率、漏报率对比',
    chartType: 'bar',
    data: [
      { label: '旧模型误报率', value: 15 },
      { label: '新模型误报率', value: 4.7 },
      { label: '旧模型漏报率', value: 2.1 },
      { label: '新模型漏报率', value: 1.8 },
    ],
    sourceMessageId: 'monitor_sub3',
  },
];

export const pendingItems: PendingItem[] = [
  {
    id: 'pi1', type: 'review', title: '供应商信用评估报告待复核',
    description: '2家D级供应商（盛达贸易、宏远建材）建议暂停合作，等待确认',
    priority: 'high', workLine: '供应链金融风控平台',
  },
  {
    id: 'pi2', type: 'review', title: '贷后预警模型灰度部署',
    description: '新模型误报率降至4.7%，建议2周后全量上线',
    priority: 'medium', workLine: '供应链金融风控平台',
  },
];

export const trackedTasks: TrackedTask[] = [
  {
    id: 't_credit', name: '供应商信用评估报告', agentName: '信用评估 Agent',
    stage: '已完成', blocked: false, eta: '10:06', progress: 100,
  },
  {
    id: 't_monitor', name: '贷后预警模型优化', agentName: '模型优化 Agent',
    stage: '灰度验证中', blocked: false, eta: '11:06', progress: 100,
  },
];

/* ═══════════════════════════════════════════════
   Sub-Agent 数据
   ═══════════════════════════════════════════════ */

export interface SubAgent {
  id: string;
  name: string;
  taskId: string;
  status: 'idle' | 'running' | 'waiting' | 'paused' | 'completed' | 'error';
  tokenUsed: number;
  tokenEstimated: number;
  duration: string;
  tools: string[];
}

export const subAgents: SubAgent[] = [
  {
    id: 'w_dataclean',
    name: '数据清洗',
    taskId: 't_credit',
    status: 'completed',
    tokenUsed: 1200,
    tokenEstimated: 1500,
    duration: '8s',
    tools: ['SQL Tool', 'DataClean Skill'],
  },
  {
    id: 'w_credit',
    name: '信用评分',
    taskId: 't_credit',
    status: 'completed',
    tokenUsed: 4500,
    tokenEstimated: 5000,
    duration: '45s',
    tools: ['Python Sandbox', 'CreditScore Skill'],
  },
  {
    id: 'w_report',
    name: '报告生成',
    taskId: 't_credit',
    status: 'completed',
    tokenUsed: 2800,
    tokenEstimated: 3000,
    duration: '20s',
    tools: ['Chart Skill', 'ReportWriter Skill'],
  },
  {
    id: 'w_feature',
    name: '特征工程',
    taskId: 't_monitor',
    status: 'completed',
    tokenUsed: 3200,
    tokenEstimated: 4000,
    duration: '25s',
    tools: ['Python Sandbox', 'FeatureEngineer Skill'],
  },
  {
    id: 'w_tuner',
    name: '模型调参',
    taskId: 't_monitor',
    status: 'completed',
    tokenUsed: 5600,
    tokenEstimated: 6000,
    duration: '60s',
    tools: ['Python Sandbox', 'ModelTuner Skill'],
  },
  {
    id: 'w_validate',
    name: '效果验证',
    taskId: 't_monitor',
    status: 'completed',
    tokenUsed: 1800,
    tokenEstimated: 2000,
    duration: '30s',
    tools: ['Python Sandbox', 'ModelValidator Skill'],
  },
];

export interface TaskTokenEntry {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  status: 'running' | 'idle' | 'waiting_approval' | 'error';
  totalTokens: number;
  estimatedTokens: number;
  subAgentIds: string[];
}

export const taskTokenEntries: TaskTokenEntry[] = [
  {
    id: 't_credit',
    name: '供应商信用评估报告',
    projectId: 'p_risk',
    projectName: '供应链金融风控平台',
    status: 'idle',
    totalTokens: 8500,
    estimatedTokens: 9500,
    subAgentIds: ['w_dataclean', 'w_credit', 'w_report'],
  },
  {
    id: 't_monitor',
    name: '贷后预警模型优化',
    projectId: 'p_risk',
    projectName: '供应链金融风控平台',
    status: 'idle',
    totalTokens: 10600,
    estimatedTokens: 12000,
    subAgentIds: ['w_feature', 'w_tuner', 'w_validate'],
  },
];

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  load: number;
  taskCount: number;
  status: 'online' | 'busy' | 'offline';
  currentTask?: string;
}

export const teamMembers: TeamMember[] = [
  { id: 'u1', name: 'samhar', initials: 'S', role: '成员', load: 65, taskCount: 3, status: 'busy', currentTask: '供应商信用评估' },
];

export interface TeamPerformance {
  id: string;
  name: string;
  roi: number;
  roiChange: number;
  trend: 'up' | 'stable' | 'down';
  tokenUsage: number;
  tokenBudget: number;
  successRate: number;
  alert?: string;
}

export const teamPerformances: TeamPerformance[] = [
  { id: 'team1', name: '风控部', roi: 2.1, roiChange: 0.18, trend: 'up', tokenUsage: 191000, tokenBudget: 300000, successRate: 98 },
];
