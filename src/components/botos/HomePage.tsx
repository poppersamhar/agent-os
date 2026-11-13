import { useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck, ChevronRight, FileText, Plug, Sparkles, Sprout } from 'lucide-react';
import BotAvatar from './BotAvatar';
import { BotFaceStack } from './BotFace';
import { MATURITY_RUNS } from './botMaturity';
import { memberBots, type BotosState } from './botModel';
import { agentRecruitments, personalHome, recommendedCapabilities, recommendedExperts, type RecommendationFilter } from './homeModel';
import { catalogFor, teamMembers, type RecruitableItem } from './marketCatalog';
import './HomePage.css';

interface HomeProps {
  state: BotosState;
  onOpenBot: (id: string, messageId?: string) => void;
  onRecruit: (item: RecruitableItem) => void;
  onCapture: (botId: string) => void;
  onOpenMarket: (tab?: 'expert' | 'skill' | 'connector', itemId?: string) => void;
}

const number = new Intl.NumberFormat('zh-CN');
const percentage = new Intl.NumberFormat('zh-CN', { style: 'percent', maximumFractionDigits: 1 });
const recommendationFilters = { popular: '本周热门', department: '本部门在用', new: '新上架' } as const;
const statusText = { working: '工作中', needs: '需要你', idle: '空闲' } as const;

function AgentCard({ item, state, onOpenBot, onCapture }: Pick<HomeProps, 'state' | 'onOpenBot' | 'onCapture'> & { item: ReturnType<typeof personalHome>['agents'][number] }) {
  const { bot, status, currentTask, latestArtifact, maturity } = item;
  const label = bot.kind === 'group' ? '专家团' : '专家';
  const recruitments = bot.matured ? agentRecruitments(state, bot) : undefined;
  return <article className="home-agent-card">
    <header>
      <button type="button" className="home-agent-title" onClick={() => onOpenBot(bot.id)} aria-label={`打开 ${bot.name}`}>
        <BotAvatar bot={bot} size={37} state={status} members={memberBots(state, bot)} />
        <span>{bot.name}</span>
      </button>
      <span className={`home-agent-status is-${status}`}><i aria-hidden="true" />{statusText[status]}</span>
    </header>
    {currentTask ? <p className="home-current-task" title={currentTask}>{currentTask}</p> : null}
    <p className="home-latest-file"><FileText size={14} aria-hidden="true" /><span title={latestArtifact?.name}>{latestArtifact ? latestArtifact.name : '暂无成果'}</span></p>
    {recruitments ? <footer className="home-maturity-complete">
      <span><BadgeCheck size={15} aria-hidden="true" />已沉淀为{label}</span>
      <small>{recruitments.catalog ? '企业招募' : '本地招募'} {number.format(recruitments.count)} 次</small>
    </footer> : <footer className="home-maturity">
      <div className="home-maturity-label"><span>成熟度</span><span>{maturity.remainingRuns ? `${maturity.stableRuns} / ${MATURITY_RUNS} 次稳定运行` : `已稳定运行 ${number.format(maturity.stableRuns)} 次`}</span></div>
      <progress max={MATURITY_RUNS} value={Math.min(MATURITY_RUNS, maturity.stableRuns)} aria-label={`${bot.name}的成熟度`} />
      <div className="home-maturity-action">
        {maturity.eligible ? <button type="button" className="home-capture" aria-label={`沉淀${bot.name}为${label}`} onClick={() => onCapture(bot.id)}><Sprout size={14} aria-hidden="true" />沉淀为{label}</button>
          : <small>{maturity.remainingRuns > 0 ? `还需 ${maturity.remainingRuns} 次稳定运行` : '成功率需达到 90%'}</small>}
        {maturity.successRate !== undefined ? <small>成功率 {percentage.format(maturity.successRate)}</small> : null}
      </div>
    </footer>}
  </article>;
}

function ExpertCard({ entry, onRecruit }: { entry: ReturnType<typeof recommendedExperts>[number]; onRecruit: HomeProps['onRecruit'] }) {
  const { item, successRate, recruitments } = entry;
  return <article className="home-expert-card">
    <header>
      {item.kind === 'expert'
        ? <BotAvatar bot={{ kind: 'bot', face: item.face }} size={33} />
        : <BotFaceStack faces={teamMembers(item).map(member => member.face)} size={33} />}
      <div><h3>{item.name}</h3><p>{item.owner}{item.kind === 'team' ? ` · 专家团 ${item.memberIds.length} 人` : ''}</p></div>
    </header>
    <p className="home-expert-summary">{item.summary}</p>
    <footer><div className="home-expert-stats">
      <span>被招募 {number.format(recruitments)} 次</span>
      <span>{successRate === undefined ? '暂无运行记录' : `成功率 ${percentage.format(successRate)}`}</span>
    </div><button type="button" className="bos-secondary" aria-label={`招募 ${item.name}`} onClick={() => onRecruit(item)}>招募</button></footer>
  </article>;
}

export default function HomePage({ state, onOpenBot, onRecruit, onCapture, onOpenMarket }: HomeProps) {
  const [hour] = useState(() => new Date().getHours());
  const [filter, setFilter] = useState<RecommendationFilter>('popular');
  const { agents, waiting, working } = useMemo(() => personalHome(state), [state]);
  const catalog = useMemo(() => catalogFor(state), [state]);
  const experts = useMemo(() => recommendedExperts(state, filter, catalog), [state, filter, catalog]);
  const capabilities = useMemo(() => recommendedCapabilities(state, catalog), [state, catalog]);
  const greeting = hour < 11 ? '早上好' : hour < 13 ? '中午好' : hour < 18 ? '下午好' : '晚上好';

  return <section className="home-page" aria-label="个人工作台">
    <div className="home-content">
      <header className="home-greeting">
        <h1>{greeting}，Samhar</h1>
        <p>今天有 <strong>{waiting.length}</strong> 件事等你处理，<strong>{working}</strong> 个智能体正在工作。</p>
      </header>

      <section className="home-section" aria-labelledby="home-waiting">
        <h2 id="home-waiting">待我处理</h2>
        {waiting.length ? <ul className="home-waiting-list">{waiting.map(item => <li key={`${item.botId}:${item.messageId}`}>
          <div className="home-waiting-agent"><BotAvatar bot={item.bot} size={24} state="needs" members={memberBots(state, item.bot)} /><strong>{item.bot.name}</strong></div>
          <p>{item.title}</p>
          <button type="button" className="home-text-button" onClick={() => onOpenBot(item.botId, item.messageId)} aria-label={`去处理 ${item.bot.name}：${item.title}`}>去处理 <ChevronRight size={14} aria-hidden="true" /></button>
        </li>)}</ul> : <p className="home-empty">暂无需要你处理的事。</p>}
      </section>

      <section className="home-section" aria-labelledby="home-agents">
        <h2 id="home-agents">我的智能体</h2>
        {agents.length ? <div className="home-agent-grid">{agents.map(item => <AgentCard key={item.bot.id} item={item} state={state} onOpenBot={onOpenBot} onCapture={onCapture} />)}</div>
          : <p className="home-empty">新建或招募智能体后，可以在这里查看工作进展。</p>}
      </section>

      <section className="home-section" aria-labelledby="home-recommendations">
        <div className="home-section-header">
          <h2 id="home-recommendations">为你推荐</h2>
          <button type="button" className="home-text-button" onClick={() => onOpenMarket('expert')}>去市场看更多 <ArrowRight size={14} aria-hidden="true" /></button>
        </div>
        <div className="home-filters" role="group" aria-label="专家推荐筛选">
          {Object.entries(recommendationFilters).map(([id, label]) => <button type="button" key={id} aria-pressed={filter === id} onClick={() => setFilter(id as RecommendationFilter)}>{label}</button>)}
        </div>
        {experts.length ? <div className="home-expert-grid">{experts.map(entry => <ExpertCard key={entry.item.id} entry={entry} onRecruit={onRecruit} />)}</div>
          : <p className="home-empty">当前没有符合条件的专家或专家团。</p>}
      </section>

      <section className="home-section" aria-labelledby="home-capabilities">
        <div className="home-section-header">
          <h2 id="home-capabilities">你的智能体可能用得上</h2>
          <button type="button" className="home-text-button" onClick={() => onOpenMarket('skill')}>去市场看更多 <ArrowRight size={14} aria-hidden="true" /></button>
        </div>
        {capabilities.length ? <ul className="home-capability-grid">{capabilities.map(({ item, reason }) => {
          const Icon = item.kind === 'skill' ? Sparkles : Plug;
          return <li key={item.id}><button type="button" onClick={() => onOpenMarket(item.kind, item.id)}>
            <span className="home-capability-icon"><Icon size={17} aria-hidden="true" /></span>
            <span className="home-capability-copy"><strong>{item.name} <small>{item.kind === 'skill' ? '技能' : '连接器'}</small></strong><span>{reason}</span></span>
            <ChevronRight size={14} aria-hidden="true" />
          </button></li>;
        })}</ul> : <p className="home-empty">有符合当前工作需求的技能或连接器时，会在这里推荐。</p>}
      </section>
    </div>
  </section>;
}
