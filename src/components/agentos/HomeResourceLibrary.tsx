import { useState } from 'react';
import { Activity, ArrowUpRight, BookOpen, Check, ChevronRight, FileText, Globe, Network, Presentation, Search, Sparkles, X, type LucideIcon } from 'lucide-react';
import { artifactTypeLabels, type Artifact } from '../../data/agentosArtifacts';
import type { WorkerJob } from './workspaceModel';
import type { HomeResourceId } from './HomeResourceRail';
import type { HomeProjectSummary } from './homeProjectModel';

interface HomeResourceLibraryProps {
  tab: HomeResourceId;
  projects: HomeProjectSummary[];
  readableArtifacts: Artifact[];
  jobs: WorkerJob[];
  onOpenArtifact: (id: string) => void;
}
const resourceLabels: Record<HomeResourceId, string> = { skills: '技能', plugins: '插件', knowledge: '知识库' };
interface Capability { id: string; title: string; description: string; detail: string; steps: string[]; icon: LucideIcon; artifactType: Artifact['type'] }
const capabilities: Record<'skills' | 'plugins', Capability[]> = {
  skills: [
    { id: 'brief', title: '想法整理', description: '把零散背景变成可推进的方案。', detail: '从目标、背景与约束出发，整理方案结构、执行步骤和待确认事项。', steps: ['梳理目标与已有材料', '组织方案与行动清单', '交付可继续讨论的文档'], icon: Sparkles, artifactType: 'document' },
    { id: 'presentation', title: '项目汇报', description: '围绕成果与下一步组织演示。', detail: '以受众和汇报目的为线索，组织项目进展、关键结论与下一步安排。', steps: ['确定汇报目标与受众', '提取项目成果与关键结论', '形成演示内容与讲述顺序'], icon: Presentation, artifactType: 'slides' },
    { id: 'risk', title: '风险跟进', description: '整理事项、依据与后续动作。', detail: '将项目材料中的风险和待核验信息组织成可追踪的跟进事项。', steps: ['识别风险与依据', '区分事实与待核验事项', '明确负责人、动作与后续检查'], icon: Activity, artifactType: 'web' },
  ],
  plugins: [
    { id: 'document', title: '文档阅读器', description: '阅读方案、报告与项目资料。', detail: '在成果区阅读结构化文档，包括标题、核心要点、正文与参考资料。', steps: ['滚动查看完整内容', '沿项目上下文查看相关成果', '回到输入区继续提出修改要求'], icon: FileText, artifactType: 'document' },
    { id: 'slides', title: '演示稿预览', description: '逐页查看项目演示内容。', detail: '在成果区浏览演示稿，使用预览内的翻页操作查看各页内容。', steps: ['打开演示成果', '使用左右键或翻页按钮', '围绕当前成果继续讨论'], icon: Presentation, artifactType: 'slides' },
    { id: 'web', title: '网页预览', description: '查看网页与工作台成果。', detail: '用隔离预览容器呈现网页成果，并在桌面与移动预览之间切换。', steps: ['打开网页成果', '切换预览尺寸', '检查内容与页面结构'], icon: Globe, artifactType: 'web' },
    { id: 'graph', title: '关系查看', description: '查看资料来源与依赖关系。', detail: '通过资产节点与关联记录，理解项目资料和成果之间的来源关系。', steps: ['选择资料节点', '检查来源与依赖', '打开相关报告继续阅读'], icon: Network, artifactType: 'graph' },
  ],
};
const artifactIcons: Record<Artifact['type'], LucideIcon> = { document: FileText, slides: Presentation, web: Globe, graph: Network };

export default function HomeResourceLibrary({ tab, projects, readableArtifacts, jobs, onOpenArtifact }: HomeResourceLibraryProps) {
  const [detail, setDetail] = useState<Capability | null>(null);
  const [knowledgeProject, setKnowledgeProject] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const selectedKnowledge = projects.find(project => project.id === knowledgeProject);
  const keyword = query.trim().toLocaleLowerCase();
  const libraryEntries = tab === 'knowledge' ? [] : capabilities[tab].filter(item => `${item.title} ${item.description}`.toLocaleLowerCase().includes(keyword));
  const knowledgeProjects = projects.filter(project => `${project.name} ${project.artifacts.map(artifact => `${artifact.title} ${artifact.taskTitle}`).join(' ')}`.toLocaleLowerCase().includes(keyword));
  const relatedExamples = detail ? readableArtifacts.filter(artifact => artifact.type === detail.artifactType).slice(0, 3) : [];

  return <section className="aos-home-panel aos-home-library"><header><div><BookOpen size={15} /><h2>{tab === 'knowledge' ? '项目知识库' : `${resourceLabels[tab]}列表`}</h2></div><span>{tab === 'knowledge' ? knowledgeProjects.length : libraryEntries.length} 项</span></header>
      <div className="aos-home-library-toolbar"><label className="aos-home-library-search"><Search size={13} /><input aria-label={`搜索${resourceLabels[tab]}`} placeholder={tab === 'knowledge' ? '搜索项目资料' : tab === 'plugins' ? '搜索插件' : '搜索技能'} value={query} onChange={event => { setQuery(event.target.value); setDetail(null); setKnowledgeProject(null); }} /></label></div>
      <div role="region" aria-label={`${resourceLabels[tab]}内容`} className="aos-home-library-content">
        {tab !== 'knowledge' ? <div className="aos-home-capability-grid">{libraryEntries.map(item => <button type="button" key={item.id} onClick={() => { setDetail(item); setKnowledgeProject(null); }} className={detail?.id === item.id ? 'is-selected' : ''}><item.icon size={18} strokeWidth={1.5} /><strong>{item.title}</strong><p>{item.description}</p><span>{tab === 'plugins' ? '示例插件' : '示例技能'}<ArrowUpRight size={12} /></span></button>)}{!libraryEntries.length ? <p className="aos-home-empty">没有找到相关能力。</p> : null}</div>
          : <div className="aos-home-knowledge-grid">{knowledgeProjects.map(project => <button type="button" key={project.id} onClick={() => { setKnowledgeProject(project.id); setDetail(null); }} className={knowledgeProject === project.id ? 'is-selected' : ''}><BookOpen size={18} strokeWidth={1.5} /><div><strong>{project.name}</strong><p>{project.artifacts.length} 份项目资料 · {project.total} 项任务</p></div><ChevronRight size={14} /></button>)}{!knowledgeProjects.length ? <p className="aos-home-empty">没有找到相关项目资料。</p> : null}</div>}
        {detail ? <section className="aos-home-resource-detail" aria-label={`能力详情：${detail.title}`}><button type="button" className="aos-home-detail-close" aria-label="关闭能力详情" onClick={() => setDetail(null)}><X size={15} /></button><span className="aos-home-resource-kind">{tab === 'skills' ? '技能示例' : '插件示例'}</span><h3>{detail.title}</h3><p>{detail.detail}</p><ul>{detail.steps.map(step => <li key={step}><Check size={12} />{step}</li>)}</ul>{relatedExamples.length ? <div className="aos-home-related-examples"><span>查看相关成果</span>{relatedExamples.map(artifact => <button type="button" key={artifact.id} onClick={() => onOpenArtifact(artifact.id)}>{artifact.title}<ArrowUpRight size={12} /></button>)}</div> : null}<p className="aos-home-capability-note">当前用于预览工作方式；实际执行能力随 Agent 服务接入提供。</p></section> : null}
        {tab === 'knowledge' && selectedKnowledge ? <section className="aos-home-resource-detail" aria-label={`知识库详情：${selectedKnowledge.name}`}><button type="button" className="aos-home-detail-close" aria-label="关闭知识库详情" onClick={() => setKnowledgeProject(null)}><X size={15} /></button><span className="aos-home-resource-kind">PROJECT KNOWLEDGE</span><h3>{selectedKnowledge.name}</h3><p>{selectedKnowledge.description}。这里按项目汇集当前工作空间中的成果资料。</p><div className="aos-home-knowledge-files">{selectedKnowledge.artifacts.map(artifact => { const Icon = artifactIcons[artifact.type]; const job = jobs.find(item => item.artifactId === artifact.id); const pending = !!job && job.status !== 'completed'; return <button type="button" key={artifact.id} onClick={() => onOpenArtifact(artifact.id)}><Icon size={15} /><span><strong>{artifact.title}</strong><span>{pending ? '内容准备中' : artifactTypeLabels[artifact.type]} · {artifact.version}</span></span><ArrowUpRight size={13} /></button>; })}{!selectedKnowledge.artifacts.length ? <p className="aos-home-empty">这个项目还没有成果资料。</p> : null}</div></section> : null}
      </div>
    </section>;
}
