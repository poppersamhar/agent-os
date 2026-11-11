// 新专家的开场：先打招呼，再用一张选择卡问「先帮你做什么」。
// 原型按名称与角色里的关键词给出三个起步任务；之后可以换成由模型根据角色生成。

import { nowTime, uid, type BotChoices, type BotMessage, type MessageAuthor } from './botModel';

const rules: [RegExp, string, string[]][] = [
  [/调研|研究|竞品|情报/, '我可以帮你持续跟踪一个领域，整理来源和结论。', ['调研一个竞品的最新动态', '整理某个行业的关键玩家', '每周汇总一次竞品变化']],
  [/风险|风控|合规|审计/, '我可以帮你识别和跟进风险，按时汇报进展。', ['梳理当前最需要关注的风险', '跟进一个具体的风险事项', '每周生成一份风险周报']],
  [/数据|巡检|报表|指标|质量/, '我可以帮你检查数据质量，发现异常并说明影响。', ['检查一张表的数据质量', '解释一个指标异常的原因', '设定每天自动巡检']],
  [/客服|工单|质检|投诉/, '我可以帮你分析工单和客服对话，找出问题和改进点。', ['抽查最近的客服对话质量', '分析这周投诉最多的问题', '整理一份客服话术建议']],
  [/合同|法务|条款/, '我可以帮你审查合同，标出风险条款和缺失条款。', ['审查一份合同', '对照模板列出缺失条款', '整理常见风险条款清单']],
  [/会议|纪要|待办/, '我可以帮你整理会议结论和待办，并跟进到人。', ['整理一次会议的纪要', '跟进上周会议的待办', '设定每次会后自动发纪要']],
  [/品牌|内容|写作|文案|演示|营销|运营|小红书/, '我可以帮你产出文案、网页和演示稿，保持表达一致。', ['写一篇产品介绍文案', '做一份汇报演示稿', '整理品牌表达规范']],
  [/研发|代码|github|PR|Issue|开发/i, '我可以帮你跟进代码仓库的进展，在群里提醒相关同事。', ['汇总本周的 PR 和 Issue', '找出卡住超过三天的 PR', '每天在群里同步研发进展']],
  [/产品|需求|PRD/i, '我可以帮你梳理需求、写 PRD、排优先级。', ['梳理一个新功能的需求', '写一份 PRD', '给需求池排优先级']],
];
const fallback: [string, string[]] = ['告诉我你希望我负责什么，我会在工作中补齐需要的技能和连接器。', ['先介绍一下你能做什么', '帮我整理一份工作周报', '跟进一件正在进行的事']];

export function firstTask(name: string, prompt = ''): { greeting: string; choices: BotChoices } {
  const text = `${name} ${prompt}`;
  const [intro, options] = rules.find(([pattern]) => pattern.test(text))?.slice(1) as [string, string[]] | undefined ?? fallback;
  return {
    greeting: `你好，我是${name}。${intro}`,
    choices: { question: '你希望我先帮你做什么？', options },
  };
}

/** 新专家（或从市场添加的专家）的第一条消息：打招呼 + 选择卡。 */
export function openingMessage(name: string, prompt = '', author: MessageAuthor = 'bot', prefix = ''): BotMessage {
  const { greeting, choices } = firstTask(name, prompt);
  return { id: uid(), author, name, text: `${prefix}${greeting}`, time: nowTime(), choices };
}
