import { MAIN_BOT_ID, SYSTEM_AGENTS, assignFaces, type SystemRole, seedHistory, type Bot, type BotMessage, type BotosState, type Mcp, type Skill } from './botModel';

export const seedSkills: Skill[] = [
  { id: 'research', name: '网页调研', category: '调研', version: '1.4.0', owner: 'Samhar', calls: 312, failRate: 0.02,
    description: '围绕一个问题检索公开资料，交叉核对来源并整理发现。', widgets: [{ kind: 'sources', title: '来源与发现', span: 2 }] },
  { id: 'risk', name: '风险评估', category: '分析', version: '2.1.0', owner: '供应链组', calls: 148, failRate: 0.05,
    description: '按影响与可能性评估事项，给出跟进建议与负责人。', widgets: [{ kind: 'alerts', title: '风险事项', span: 2 }] },
  { id: 'weekly', name: '周报生成', category: '写作', version: '1.0.3', owner: 'Samhar', calls: 96, failRate: 0.01,
    description: '汇总一周的对话、成果与运行记录，生成结构化周报。', widgets: [{ kind: 'metrics', title: '本周要点', span: 1 }] },
  { id: 'inspect', name: '数据巡检', category: '数据', version: '3.0.0', owner: '数据中台', calls: 820, failRate: 0.11,
    description: '按规则检查关键字段的完整性、一致性与时效性。', widgets: [{ kind: 'trend', title: '异常趋势', span: 2 }, { kind: 'checks', title: '巡检规则', span: 1 }] },
  { id: 'brand', name: '品牌写作', category: '写作', version: '1.2.0', owner: '品牌组', calls: 57, failRate: 0.03,
    description: '按品牌语气改写文案，保持术语与表达一致。', widgets: [] },
  { id: 'slides', name: '演示稿生成', category: '写作', version: '0.9.1', owner: 'Samhar', calls: 74, failRate: 0.08,
    description: '把文档或要点组织成演示稿结构与页面。', widgets: [] },
];

export const seedMcps: Mcp[] = [
  { id: 'feishu', name: '飞书', kind: 'feishu', endpoint: 'mcp://feishu.internal/v1', credential: 'vault', enabled: true, owner: 'IT', calls: 1204,
    tools: ['读取群聊消息', '发送消息', '读取云文档'], widgets: [{ kind: 'feed', title: '群聊待回复', span: 1 }] },
  { id: 'github', name: 'GitHub', kind: 'github', endpoint: 'https://api.github.com/mcp', credential: 'vault', enabled: true, owner: '研发', calls: 388,
    tools: ['列出 Issue', '读取 PR', '发表评论'], widgets: [{ kind: 'repo', title: 'PR 与 Issue', span: 2 }] },
  { id: 'warehouse', name: '数据仓库', kind: 'database', endpoint: 'mcp://dw.internal:7020', credential: 'vault', enabled: true, owner: '数据中台', calls: 2310,
    tools: ['查询表结构', '执行只读 SQL', '读取血缘'], widgets: [{ kind: 'checks', title: '数据表检查', span: 1 }] },
  { id: 'erp', name: 'ERP 采购', kind: 'erp', endpoint: 'mcp://erp.internal/purchase', credential: 'vault', enabled: true, owner: '供应链组', calls: 451,
    tools: ['查询供应商', '查询订单', '读取交付节点'], widgets: [{ kind: 'metrics', title: '采购指标', span: 1 }] },
  { id: 'websearch', name: '网页搜索', kind: 'web', endpoint: 'mcp://search.agentos/v2', credential: 'none', enabled: true, owner: '平台', calls: 1780,
    tools: ['搜索', '抓取网页'], widgets: [{ kind: 'sources', title: '来源与发现', span: 2 }] },
];

const msg = (author: BotMessage['author'], name: string, text: string, time: string, attachment?: string): BotMessage =>
  ({ id: `seed-${name}-${time}-${text.slice(0, 6)}`, author, name, text, time, attachment });

type SeedBot = Omit<Bot, 'face'>;
const bot = (b: Omit<SeedBot, 'history' | 'memberIds' | 'createdAt'> & { memberIds?: string[]; scale?: number }): SeedBot => ({
  memberIds: [], createdAt: '2026-09-01', history: seedHistory(b.id, b.scale ?? 1), ...b,
});

const systemGreeting: Record<SystemRole, { text: string; options: string[] }> = {
  experts: { text: '我负责智能体、专家和专家团。可以帮你从市场里挑专家、新建智能体，或把用得好的智能体沉淀为专家。', options: ['推荐适合我的专家', '新建一个智能体', '把一个智能体沉淀为专家'] },
  skills: { text: '我负责技能。可以帮你新建、修改技能，也能看看哪些技能需要优化。', options: ['新建一个技能', '看看哪些技能失败率高', '把一段做法沉淀成技能'] },
  connectors: { text: '我负责连接器。可以帮你接入企业系统、检查连接器和凭证。', options: ['接入一个新系统', '查看哪些连接器已停用', '检查凭证配置'] },
};

export function seedBotos(): BotosState {
  // 头像按名称自动分配（与新建智能体的规则相同）。
  const bots: Bot[] = assignFaces([
    bot({
      id: MAIN_BOT_ID, name: '企业效能管理智能体', kind: 'main', model: '系统默认', skillIds: [], mcpIds: [],
      prompt: '统一管理全部智能体、技能与连接器，汇总进展与待处理事项。',
      memory: [{ id: 'm-main-1', text: 'Samhar 每周一上午查看整体进展。', scope: 'personal', createdAt: '10-20' }],
      messages: [msg('bot', '企业效能管理智能体', '早上好。今天有 2 件事等你确认，「数据巡检专家」正在处理一次失败的检查。可以直接问我任何专家、技能或连接器的情况。', '09:02')],
    }),
    bot({
      id: 'work', name: '日常办公', kind: 'bot', model: 'Claude Sonnet 4.6', skillIds: ['weekly', 'slides', 'brand'], mcpIds: ['feishu'],
      prompt: '日常办公智能体。整理飞书群聊里的需求，生成周报、网页与演示稿。',
      memory: [
        { id: 'm-work-1', text: '品牌相关物料使用「让复杂工作，变得清晰」作为主张。', scope: 'team', createdAt: '10-28' },
        { id: 'm-work-2', text: 'Samhar 偏好先给结论，再列依据。', scope: 'personal', createdAt: '11-02' },
      ],
      messages: [
        msg('user', 'Samhar', '生成一个品牌产品介绍网页', '10:12'),
        msg('bot', '日常办公', '已完成品牌产品介绍网页，结构为：主张 → 三项价值 → 案例 → 联系方式。', '10:15', '品牌产品介绍.html'),
        msg('source', '飞书群聊', '@日常办公把上周的项目总结整理一下发群里', '14:20'),
        msg('bot', '日常办公', '项目总结已整理并发送到「品牌升级」群。', '14:24', '项目总结示例.md'),
      ],
    }),
    bot({
      id: 'risk', name: '风险跟进专家', kind: 'bot', matured: true, sourceId: 'expert:risk', model: '系统默认', skillIds: ['risk', 'weekly'], mcpIds: ['erp', 'feishu'],
      prompt: '跟进供应链风险。用风险评估识别交付与供应商风险，每周生成风险周报。',
      memory: [{ id: 'm-risk-1', text: '华东二号供应商交付节点需每周二核对。', scope: 'team', createdAt: '10-15' }],
      messages: [
        msg('user', 'Samhar', '本周有哪些需要关注的供应链风险？', '09:40'),
        msg('bot', '风险跟进专家', '有两项需要你确认：华东二号供应商交付延期 5 天；一项物料单价上涨 12%。详情见右侧风险事项。', '09:43', '供应链风险评估报告.md'),
      ],
    }),
    bot({
      id: 'data', name: '数据巡检专家', kind: 'bot', matured: true, sourceId: 'expert:data', model: 'DeepSeek Chat', skillIds: ['inspect'], mcpIds: ['warehouse'], scale: 3,
      prompt: '每天检查数据仓库关键表的质量。数据巡检发现异常时，说明影响范围并给出修复建议。',
      memory: [{ id: 'm-data-1', text: '订单表的 region 字段允许为空，不计入异常。', scope: 'team', createdAt: '10-30' }],
      messages: [
        msg('bot', '数据巡检专家', '今日巡检完成：48 张表，3 项异常。其中 dw_orders.amount 有 0.4% 负值，已定位到上游退款同步。', '08:00', '数据巡检专家报告.md'),
      ],
    }),
    bot({
      id: 'research', name: '竞品调研专家', kind: 'bot', matured: true, sourceId: 'expert:research', model: 'GPT-4o', skillIds: ['research'], mcpIds: ['websearch', 'github'],
      prompt: '持续跟踪竞品动态。用网页调研整理产品更新、定价与开源动向。',
      memory: [{ id: 'm-research-1', text: '重点关注三家：Grok 专家、Manus、Dify。', scope: 'team', createdAt: '11-05' }],
      messages: [
        msg('user', 'Samhar', '看一下 Grok 专家最近的更新', '昨天'),
        msg('bot', '竞品调研专家', 'Grok Bot 9 月上线团队专家：记忆分为团队与个人两层；技能与工具放在账号级共享。已整理成对比。', '昨天', 'Grok 专家动态整理.md'),
      ],
    }),
    bot({
      id: 'brand-team', name: '品牌专家团', kind: 'group', matured: true, model: '系统默认', skillIds: ['brand', 'slides'], mcpIds: [], memberIds: ['research', 'work'],
      prompt: '品牌升级专家团。竞品调研专家负责研究，日常办公负责内容与物料。',
      memory: [],
      messages: [
        msg('user', 'Samhar', '准备下周品牌升级汇报', '11-07'),
        msg('member', '竞品调研专家', '我整理了三家竞品的品牌主张，供定位参考。', '11-07'),
        msg('member', '日常办公', '演示稿初版已完成，共 6 页。', '11-07', '品牌升级提案.pptx'),
      ],
    }),
    // 系统管理智能体：左边对话，右边是对应的管理面板
    ...SYSTEM_AGENTS.map(sys => bot({
      id: sys.id, name: sys.name, kind: 'system', role: sys.role, model: '系统默认', skillIds: [], mcpIds: [], prompt: sys.prompt, memory: [],
      messages: [{ ...msg('bot', sys.name, systemGreeting[sys.role].text, '09:00'), choices: { question: '你想先做什么？', options: systemGreeting[sys.role].options } }],
    })),
  ]);
  return {
    version: 1, bots, currentId: 'work',
    order: ['work', 'risk', 'data', 'research', 'brand-team'],
    skills: seedSkills, mcps: seedMcps, pending: [],
  };
}

export interface BotTemplate { id: string; name: string; prompt: string; skillIds: string[]; mcpIds: string[] }
export const botTemplates: BotTemplate[] = [
  { id: 't-research', name: '调研专家', prompt: '围绕一个主题持续调研。用网页调研整理来源与发现，定期给出结论。', skillIds: ['research'], mcpIds: ['websearch'] },
  { id: 't-risk', name: '风险跟进专家', prompt: '识别并跟进业务风险，每周汇总风险周报。', skillIds: ['risk', 'weekly'], mcpIds: ['feishu'] },
  { id: 't-data', name: '数据巡检专家', prompt: '定时检查数据质量，发现异常时说明影响并给出修复建议。', skillIds: ['inspect'], mcpIds: ['warehouse'] },
  { id: 't-dev', name: '研发协作专家', prompt: '跟进代码仓库的 PR 与 Issue，在飞书提醒相关同事。', skillIds: ['weekly'], mcpIds: ['github', 'feishu'] },
];
