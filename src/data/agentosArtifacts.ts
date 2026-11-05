export type ArtifactType = 'document' | 'slides' | 'web' | 'graph';
export type ArtifactStatus = 'ready' | 'draft' | 'updating';

export interface Project {
  id: string;
  name: string;
  description: string;
  taskCount: number;
  updatedAt: string;
}

export interface DocumentSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface Slide {
  eyebrow: string;
  title: string;
  subtitle?: string;
  points?: string[];
  metrics?: { value: string; label: string }[];
  note?: string;
  layout?: 'cover' | 'content' | 'metrics';
}

export interface Artifact {
  id: string;
  title: string;
  type: ArtifactType;
  projectId: string;
  taskId: string;
  taskTitle: string;
  status: ArtifactStatus;
  updatedAt: string;
  version: string;
  summary: string;
  document?: {
    eyebrow: string;
    introduction: string;
    highlights: string[];
    sections: DocumentSection[];
    sources: string[];
  };
  slides?: Slide[];
  web?: {
    address: string;
    label: string;
    kind: 'brand' | 'dashboard';
  };
  graph?: {
    description: string;
    nodes: { id: string; label: string; kind: string; description: string }[];
    relations: { from: string; to: string; label: string }[];
  };
}

export const artifactTypeLabels: Record<ArtifactType, string> = {
  document: '文档',
  slides: '演示文稿',
  web: '网页',
  graph: '关系图谱',
};

export const DEFAULT_PROJECT_ID = 'p_default';

export const agentosProjects: Project[] = [
  { id: DEFAULT_PROJECT_ID, name: '默认项目', description: '收纳尚未归类的任务', taskCount: 0, updatedAt: '今天' },
  { id: 'p_risk', name: '供应链风控', description: '识别风险，跟进关键事项', taskCount: 4, updatedAt: '今天' },
  { id: 'p_brand_contract', name: '品牌升级', description: '从品牌策略到发布落地', taskCount: 5, updatedAt: '今天' },
  { id: 'p_data_middle', name: '数据中台', description: '让数据清晰、可靠、可用', taskCount: 3, updatedAt: '昨天' },
];

export function normalizeProjectId(projectId: unknown): string {
  return agentosProjects.find(project => project.id === projectId)?.id ?? DEFAULT_PROJECT_ID;
}

export const agentosArtifacts: Artifact[] = [
  {
    id: 'brand-brief', title: '品牌升级项目简报', type: 'document', projectId: 'p_brand_contract',
    taskId: 'task-brand-brief', taskTitle: '梳理品牌升级方向和执行计划', status: 'ready', updatedAt: '今天 10:42', version: 'v1.2',
    summary: '整合品牌定位、沟通主张与三阶段发布计划。',
    document: {
      eyebrow: 'PROJECT BRIEF',
      introduction: '品牌升级的目标，是让客户更快理解我们提供的价值，并在每一个接触点获得一致的体验。本次工作围绕定位、表达和发布三个环节展开，以现有客户认知为起点，形成可执行的升级方案。',
      highlights: ['核心主张：让复杂工作，变得清晰。', '先统一关键表达，再更新高频接触点。', '发布分三阶段推进，每阶段保留明确验收标准。'],
      sections: [
        { heading: '01 / 我们要解决的问题', paragraphs: ['目前官网、销售材料与产品内的表达存在差异，客户需要通过多次沟通才能理解产品的完整价值。新的品牌体系需要建立统一的信息结构，让第一次接触与深入了解都能找到合适的入口。', '此次升级保留已有品牌资产，将主要精力放在价值表达、内容结构和使用规范上。'] },
        { heading: '02 / 品牌定位与表达', paragraphs: ['面向需要组织复杂工作的团队，以清晰的工作流、可追溯的成果和持续积累的知识，帮助团队把想法推进到完成。对外沟通采用直接、具体的语言，用真实工作场景解释价值。'], bullets: ['一句话介绍：一个与团队一起推进工作的智能协作者。', '沟通原则：先说结果，再给证据；让每个承诺都能对应到使用体验。', '视觉方向：简洁的黑白灰，清晰的层级，给内容和成果留出空间。'] },
        { heading: '03 / 三阶段执行计划', paragraphs: ['第一阶段完成品牌定位、核心文案及使用规范，形成团队共同使用的表达基础。第二阶段更新官网首页、产品介绍和销售演示材料，优先覆盖客户最常接触的场景。第三阶段统一产品内的关键文案，并发布更新说明。'], bullets: ['准备期：整理现有资产，确认主张与信息层级。', '制作期：完成发布页、提案与核心物料，并进行一致性检查。', '发布期：小范围收集反馈，修订后分批上线。'] },
        { heading: '04 / 下一步与验收', paragraphs: ['下一步需要确认品牌主张与发布范围。方向确定后，发布页与演示文稿可以并行细化。每项物料都应对应同一份品牌简报，并在交付时说明用途、版本与适用场景。', '验收以客户能否快速理解价值、物料表达是否一致、交付是否可直接使用为准。发布后的反馈会回写到项目记录，作为下一轮调整的依据。'] },
      ],
      sources: ['品牌升级项目记录', '现有产品介绍与销售材料', '发布计划讨论纪要'],
    },
  },
  {
    id: 'brand-slides', title: '品牌升级提案', type: 'slides', projectId: 'p_brand_contract',
    taskId: 'task-brand-slides', taskTitle: '制作品牌升级提案', status: 'ready', updatedAt: '今天 11:06', version: 'v1.0',
    summary: '六页提案，说明升级目标、品牌主张与发布节奏。',
    slides: [
      { eyebrow: 'BRAND STRATEGY · 2026', title: '让复杂工作，\n变得清晰。', subtitle: '品牌升级提案', note: '从统一表达，到一致的客户体验', layout: 'cover' },
      { eyebrow: '01 / WHY NOW', title: '让价值更容易被理解', subtitle: '将分散的表达，收束为清晰的共同语言。', points: ['客户第一次接触，就能理解我们解决什么问题。', '官网、产品与销售材料，传递一致的价值。', '用真实的工作成果，支撑每一个品牌承诺。'], layout: 'content' },
      { eyebrow: '02 / OUR POSITION', title: '与团队一起，\n把工作推进到完成。', subtitle: '清晰的工作流 · 可追溯的成果 · 持续积累的知识', note: '以真实协作体验，建立长期信任。', layout: 'cover' },
      { eyebrow: '03 / DESIGN PRINCIPLES', title: '少一点噪声，\n多一点确定。', points: ['表达直接：先说结果，再给依据。', '视觉克制：清晰层级，让内容成为主角。', '体验连贯：从第一次了解，到日常使用。'], layout: 'content' },
      { eyebrow: '04 / ROLLOUT', title: '分三步，稳步发布', metrics: [{ value: '01', label: '统一定位与表达' }, { value: '02', label: '更新高频接触点' }, { value: '03', label: '收集反馈与迭代' }], note: '每一阶段都有明确的交付物与验收标准。', layout: 'metrics' },
      { eyebrow: '05 / NEXT STEP', title: '一个方向，\n一套一致的体验。', subtitle: '确认品牌主张 · 细化关键物料 · 启动小范围验证', note: '项目成果：品牌简报 / 发布页 / 演示文稿', layout: 'cover' },
    ],
  },
  {
    id: 'brand-web', title: '品牌发布页', type: 'web', projectId: 'p_brand_contract',
    taskId: 'task-brand-web', taskTitle: '制作品牌发布页', status: 'ready', updatedAt: '今天 11:18', version: 'v1.1',
    summary: '品牌升级发布页，可切换桌面和移动端预览。',
    web: { address: 'preview.agentos.local/brand', label: '品牌发布页', kind: 'brand' },
  },
  {
    id: 'risk-report', title: '供应链风险评估报告', type: 'document', projectId: 'p_risk',
    taskId: 'task-risk-review', taskTitle: '整理本周供应链风险与跟进建议', status: 'ready', updatedAt: '今天 09:36', version: 'v1.0',
    summary: '梳理交付、资料完整性与集中度风险，形成可跟进的事项。',
    document: {
      eyebrow: 'WEEKLY REVIEW', introduction: '本报告整合本周项目记录与供应商跟进事项，按交付进度、资料完整性和供应集中度三个维度梳理风险。评估用于安排下一步核验与跟进，不替代原始资料和业务判断。',
      highlights: ['优先确认两项待核验的交付节点。', '把缺失资料补齐后，再更新供应商评估结论。', '风险事项与具体负责人、下一次检查时间关联。'],
      sections: [
        { heading: '01 / 本周情况', paragraphs: ['本周重点检查了关键交付节点与已有风险事项的处理进度。部分事项已具备新的说明材料，但仍需回到原始记录核实。对尚未取得依据的内容，保留“待核验”状态，避免将讨论中的判断直接写为事实。'] },
        { heading: '02 / 重点风险', paragraphs: ['交付风险主要来自关键节点的确认滞后，资料风险主要来自少量证明文件未完成更新。供应集中度需要结合替代方案和实际采购安排持续观察。'], bullets: ['交付进度：与供应商确认最新时间，并记录变更原因。', '资料完整性：汇总缺失项，逐条明确补充责任与截止时间。', '集中度：核对关键品类的替代来源和切换成本。'] },
        { heading: '03 / 跟进建议', paragraphs: ['将待核验事项转为可执行清单，优先处理会影响近期交付的条目。每次更新保留来源与变更说明；确认风险解除后，记录实际处理结果。', '下一次复核以原始材料、负责人确认和交付记录为依据。新增信息如果与已有结论冲突，应先保留冲突，再进行核验。'] },
      ], sources: ['本周供应链项目记录', '供应商跟进清单', '交付节点确认材料'],
    },
  },
  {
    id: 'risk-dashboard', title: '风险跟进工作台', type: 'web', projectId: 'p_risk',
    taskId: 'task-risk-board', taskTitle: '制作风险事项跟进看板', status: 'draft', updatedAt: '今天 10:12', version: 'v0.3',
    summary: '把待核验、跟进中和已完成事项汇集到一个工作台。',
    web: { address: 'preview.agentos.local/risk-board', label: '风险跟进工作台', kind: 'dashboard' },
  },
  {
    id: 'data-report', title: '数据质量巡检报告', type: 'document', projectId: 'p_data_middle',
    taskId: 'task-data-quality', taskTitle: '梳理数据质量问题与清洗规则', status: 'ready', updatedAt: '昨天 16:24', version: 'v1.3',
    summary: '整理字段口径、缺失值与重复记录的处理规则。',
    document: {
      eyebrow: 'DATA QUALITY', introduction: '本轮巡检围绕字段口径、完整性和唯一性展开。先确定业务含义与记录粒度，再制定清洗规则，保证修复后的数据能够解释、复现和追溯。',
      highlights: ['在清洗之前，先统一关键字段的业务口径。', '缺失值与重复记录分别处理，保留原始数据。', '规则、执行结果和例外事项放在同一份记录中。'],
      sections: [
        { heading: '01 / 巡检范围', paragraphs: ['本次聚焦客户、订单与供应商三类基础数据，检查标识字段、日期格式、状态枚举以及跨表关联。巡检结果按数据集和规则归档，便于后续复查与比较。'] },
        { heading: '02 / 清洗规则', paragraphs: ['日期统一到约定的格式；状态值映射到明确的枚举；重复记录以业务主键与更新时间联合判断。对于无法确定归属的记录，先进入例外清单，避免直接删除。'], bullets: ['完整性：关键标识缺失时，标记并回溯来源。', '唯一性：在确认记录粒度后检查主键重复。', '一致性：关联字段先规范格式，再检查匹配情况。', '可追溯：每条规则记录用途、版本与执行结果。'] },
        { heading: '03 / 后续安排', paragraphs: ['先在样本数据上复核规则，再批量执行；清洗前后分别保存快照，并比较记录数量、关键指标与关联结果。', '下一阶段将稳定的规则纳入日常巡检，同时持续记录新出现的例外。数据集更新后，按照同一规则重新检查，观察问题是否复发。'] },
      ], sources: ['数据字典与字段口径说明', '清洗规则讨论记录', '本轮巡检与例外清单'],
    },
  },
  {
    id: 'data-lineage', title: '数据资产关系图', type: 'graph', projectId: 'p_data_middle',
    taskId: 'task-data-lineage', taskTitle: '整理数据资产与报告的来源关系', status: 'ready', updatedAt: '昨天 17:08', version: 'v1.0',
    summary: '从原始来源到清洗规则，再到分析产物，查看每一条关系。',
    graph: {
      description: '这份关系视图串起数据来源、处理规则与工作成果，帮助团队理解结论从哪里来、变更会影响什么。',
      nodes: [
        { id: 'source', label: '业务原始数据', kind: '数据源', description: '订单、客户与供应商的原始记录。' },
        { id: 'dictionary', label: '字段口径说明', kind: '知识', description: '统一记录粒度、标识字段与状态含义。' },
        { id: 'rules', label: '数据清洗规则', kind: '处理规则', description: '完整性、唯一性与一致性检查。' },
        { id: 'dataset', label: '标准化数据集', kind: '数据产物', description: '保留来源与规则版本的可复用数据。' },
        { id: 'report', label: '数据质量巡检报告', kind: '报告', description: '记录检查发现、处理结果与例外事项。' },
        { id: 'dashboard', label: '项目分析看板', kind: '应用', description: '为日常跟进提供一致的指标视图。' },
      ],
      relations: [
        { from: 'source', to: 'rules', label: '作为输入' },
        { from: 'dictionary', to: 'rules', label: '定义口径' },
        { from: 'rules', to: 'dataset', label: '生成' },
        { from: 'rules', to: 'report', label: '记录检查结果' },
        { from: 'dataset', to: 'dashboard', label: '支持分析' },
      ],
    },
  },
  {
    id: 'data-slides', title: '数据中台阶段汇报', type: 'slides', projectId: 'p_data_middle',
    taskId: 'task-data-slides', taskTitle: '整理数据中台阶段成果', status: 'ready', updatedAt: '昨天 17:32', version: 'v1.0',
    summary: '四页阶段汇报：当前成果、质量规则与下一步计划。',
    slides: [
      { eyebrow: 'PROJECT UPDATE', title: '让数据清晰，\n让协作有据。', subtitle: '数据中台 · 阶段汇报', note: '数据标准 / 质量巡检 / 资产关联', layout: 'cover' },
      { eyebrow: '01 / WHAT WE BUILT', title: '从分散记录，\n到可复用的数据资产。', points: ['梳理关键字段与业务口径。', '形成可复现的数据清洗规则。', '连接原始来源、数据集与分析报告。'], layout: 'content' },
      { eyebrow: '02 / QUALITY FIRST', title: '把质量检查，\n变成日常工作。', metrics: [{ value: '完整', label: '关键字段可检查' }, { value: '一致', label: '业务口径可对齐' }, { value: '可溯', label: '来源与规则可回查' }], layout: 'metrics' },
      { eyebrow: '03 / NEXT STEP', title: '让每一次更新，\n都有可靠的依据。', subtitle: '复核规则 · 处理例外 · 建立日常巡检', note: '下一阶段：将稳定规则纳入持续检查。', layout: 'cover' },
    ],
  },
];

export const findArtifact = (id: string): Artifact | undefined => agentosArtifacts.find((artifact) => artifact.id === id);
export const projectForArtifact = (artifact: Artifact): Project | undefined => agentosProjects.find((project) => project.id === artifact.projectId);


const webBaseStyles = `*{box-sizing:border-box}body{margin:0;background:#fff;color:#171717;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans SC",sans-serif}button,a{font:inherit}nav{height:72px;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:0 7%;border-bottom:1px solid #eee}.brand{font-size:21px;font-weight:700;letter-spacing:-1px}.nav-links{display:flex;gap:24px;font-size:11px;color:#777}main{padding:65px 7% 48px}.eyebrow{font-size:9px;letter-spacing:2px;color:#888;margin:0 0 24px}h1{font-size:clamp(32px,6vw,54px);line-height:1.24;letter-spacing:-2px;margin:0 0 22px;font-weight:600}p{font-size:12px;line-height:1.9;color:#737373}.hero-copy{max-width:360px}.cta{display:inline-flex;align-items:center;gap:20px;background:#202020;color:white;padding:12px 19px;font-size:10px;border-radius:5px;margin:12px 0 45px;text-decoration:none}.hero-grid{display:grid;grid-template-columns:1fr .8fr;gap:30px;align-items:center}.composition{background:#f4f4f1;padding:30px 22px;border:1px solid #eee;border-radius:6px;transform:rotate(-2deg)}.composition-top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #dededb;padding-bottom:18px;font-size:10px;color:#737373}.composition-title{font-size:23px;font-weight:600;line-height:1.5;margin:30px 0;letter-spacing:-1px}.composition-footer{font-size:8px;letter-spacing:2px;color:#888}.feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;border-top:1px solid #eee;padding-top:30px}.feature-grid h2{font-size:13px;margin:12px 0}.feature-grid p{font-size:10px}.num{font-size:9px;color:#aaa}footer{padding:20px 7%;display:flex;justify-content:space-between;font-size:9px;color:#aaa;border-top:1px solid #eee}.board-heading{display:flex;justify-content:space-between;align-items:end;gap:15px;margin-bottom:28px}.board-heading h1{font-size:28px;letter-spacing:-1px;margin:0}.board-heading p{margin:8px 0 0;font-size:11px}.badge{border:1px solid #e5e5e5;padding:6px 10px;border-radius:5px;font-size:9px;color:#777;white-space:nowrap}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:0 0 30px}.stat{border:1px solid #e8e8e8;padding:20px;border-radius:6px}.stat span{display:block;font-size:10px;color:#888}.stat strong{display:block;font-size:27px;font-weight:500;margin-top:10px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;text-align:left;font-size:10px;white-space:nowrap}th{color:#999;font-weight:400;border-bottom:1px solid #e8e8e8;padding:12px 10px}td{padding:18px 10px;border-bottom:1px solid #f0f0f0;color:#555}td:first-child{color:#222}.pill{display:inline-block;background:#f3f3f3;padding:4px 7px;border-radius:3px;font-size:9px}.board-note{margin-top:22px;font-size:10px;color:#999}@media(max-width:500px){nav{height:60px}.nav-links{gap:12px;font-size:9px}.hero-grid{grid-template-columns:1fr}.composition{margin:10px 0 32px;transform:none}.feature-grid{grid-template-columns:1fr;gap:12px}.feature-grid>div{border-bottom:1px solid #eee}.stats{gap:7px}.stat{padding:12px}.stat strong{font-size:23px}main{padding-top:38px}}`;

export function getArtifactWebPreview(kind: 'brand' | 'dashboard'): string {
  const brand = `<nav><span class="brand">agentos.</span><div class="nav-links"><span>产品</span><span>工作方式</span><span>关于我们</span></div></nav><main><div class="hero-grid"><div><div class="eyebrow">A CLEARER WAY TO WORK</div><h1>让复杂工作，<br>变得清晰。</h1><p class="hero-copy">把想法交给一个理解你工作方式的协作者。<br>从计划到成果，每一步都有迹可循。</p><a class="cta" href="#experience">了解新的工作方式 <span>↗</span></a></div><div class="composition"><div class="composition-top"><span>工作，与成果相连</span><span>01 — 03</span></div><div class="composition-title">一个目标。<br>持续推进。<br>清晰可见的成果。</div><div class="composition-footer">THINK / CREATE / DELIVER</div></div></div><section class="feature-grid" id="experience"><div><span class="num">01 / CONTINUITY</span><h2>接着上次，继续向前</h2><p>想法、背景与决策相互连接，工作不会从零开始。</p></div><div><span class="num">02 / CLARITY</span><h2>让每一份成果可见</h2><p>文档、网页和演示文稿，就在对话旁边展开。</p></div><div><span class="num">03 / COLLABORATION</span><h2>在需要你的时候出现</h2><p>任务持续推进，把注意力留给真正重要的决策。</p></div></section></main><footer><span>AGENTOS</span><span>Made for the way you work.</span></footer>`;
  const dashboard = `<nav><span class="brand">risk / workspace</span><div class="nav-links"><span>概览</span><span>事项</span><span>报告</span></div></nav><main><div class="board-heading"><div><div class="eyebrow">SUPPLY CHAIN</div><h1>把风险，跟进到解决。</h1><p>关键事项、责任与下一步，在一个地方看清。</p></div><span class="badge">本周工作视图</span></div><div class="stats"><div class="stat"><span>待核验</span><strong>02</strong></div><div class="stat"><span>跟进中</span><strong>04</strong></div><div class="stat"><span>已完成</span><strong>12</strong></div></div><div class="table-wrap"><table><thead><tr><th>跟进事项</th><th>负责团队</th><th>状态</th><th>下一步</th></tr></thead><tbody><tr><td>关键交付节点确认</td><td>供应链团队</td><td><span class="pill">待核验</span></td><td>确认最新交付时间</td></tr><tr><td>供应商资料补充</td><td>采购团队</td><td><span class="pill">跟进中</span></td><td>补齐资质与证明材料</td></tr><tr><td>替代供应方案</td><td>业务团队</td><td><span class="pill">跟进中</span></td><td>整理备选与切换条件</td></tr><tr><td>历史风险事项复核</td><td>风控团队</td><td><span class="pill">已完成</span></td><td>结果已归入项目记录</td></tr></tbody></table></div><p class="board-note">示例工作台 · 所有数字与事项用于展示布局。</p></main><footer><span>AGENTOS / SUPPLY CHAIN</span><span>清晰记录，持续跟进。</span></footer>`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><style>${webBaseStyles}</style></head><body>${kind === 'brand' ? brand : dashboard}</body></html>`;
}

export function getArtifactDownload(artifact: Artifact): { filename: string; mimeType: string; content: string } {
  const filename = artifact.title.replace(/[\\/:*?"<>|]/g, '_');
  if (artifact.type === 'document' && artifact.document) {
    const doc = artifact.document;
    const content = [`# ${artifact.title}`, `${artifact.version} · ${artifact.updatedAt}`, doc.introduction, '## 核心要点', ...doc.highlights.map((text) => `- ${text}`), ...doc.sections.flatMap((section) => [`## ${section.heading}`, ...section.paragraphs, ...(section.bullets?.map((text) => `- ${text}`) || [])]), '## 参考资料', ...doc.sources.map((text) => `- ${text}`)].join('\n\n');
    return { filename: `${filename}.md`, mimeType: 'text/markdown;charset=utf-8', content };
  }
  if (artifact.type === 'web' && artifact.web) return { filename: `${filename}.html`, mimeType: 'text/html;charset=utf-8', content: getArtifactWebPreview(artifact.web.kind) };
  if (artifact.type === 'slides' && artifact.slides) {
    const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const pages = artifact.slides.map((slide, index) => `<section><header>${escape(slide.eyebrow)}<span>AGENTOS</span></header><main><h1>${escape(slide.title)}</h1>${slide.subtitle ? `<p>${escape(slide.subtitle)}</p>` : ''}${slide.points ? `<ol>${slide.points.map((point) => `<li>${escape(point)}</li>`).join('')}</ol>` : ''}${slide.metrics ? `<div class="metrics">${slide.metrics.map((metric) => `<div><strong>${escape(metric.value)}</strong><p>${escape(metric.label)}</p></div>`).join('')}</div>` : ''}</main><footer>${escape(slide.note || artifact.title)}<span>${index + 1} / ${artifact.slides!.length}</span></footer></section>`).join('');
    return { filename: `${filename}.html`, mimeType: 'text/html;charset=utf-8', content: `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(artifact.title)}</title><style>body{margin:0;background:#eee;color:#222;font-family:Arial,"Noto Sans SC",sans-serif}section{box-sizing:border-box;max-width:1040px;aspect-ratio:16/10;background:white;padding:45px;margin:30px auto;display:flex;flex-direction:column;break-after:page}header,footer{display:flex;justify-content:space-between;color:#999;font-size:11px;padding:15px 0;border-bottom:1px solid #eee}footer{border:0;border-top:1px solid #eee}main{flex:1;display:flex;flex-direction:column;justify-content:center}h1{font-size:45px;font-weight:500;white-space:pre-line;line-height:1.4;margin:20px 0}p,li{font-size:16px;line-height:2;color:#888}.metrics{display:flex;gap:70px;margin-top:30px}.metrics strong{font-size:42px;font-weight:400}@media print{body{background:white}section{margin:0;max-width:none;box-shadow:none}}@media(max-width:600px){section{margin:15px;padding:25px;min-height:420px}h1{font-size:30px}.metrics{gap:20px}.metrics strong{font-size:27px}p,li{font-size:12px}}</style>${pages}</html>` };
  }
  return { filename: `${filename}.json`, mimeType: 'application/json;charset=utf-8', content: JSON.stringify({ title: artifact.title, version: artifact.version, updatedAt: artifact.updatedAt, ...artifact.graph }, null, 2) };
}
