import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Artifact } from '../../data/agentosArtifacts';
import type { WorkerJob } from './workspaceModel';
import type { HomeResourceId } from './HomeResourceRail';
import { buildHomeProjects } from './homeProjectModel';
import HomeResourceLibrary from './HomeResourceLibrary';
import './UserHomeDashboard.css';
import './HomeResourcePage.css';

interface HomeResourcePageProps {
  resourceId: HomeResourceId;
  artifacts: Artifact[];
  jobs: WorkerJob[];
  onOpenArtifact: (id: string) => void;
  onBack: () => void;
}

const resourceContent: Record<HomeResourceId, { title: string; description: string }> = {
  skills: { title: '技能', description: '浏览工作技能，了解每项技能可以帮助推进什么。' },
  plugins: { title: '插件', description: '查看插件预览，了解可扩展的工作能力。' },
  knowledge: { title: '知识库', description: '按项目整理资料与成果，找到工作的上下文。' },
};

export default function HomeResourcePage({ resourceId, artifacts, jobs, onOpenArtifact, onBack }: HomeResourcePageProps) {
  const content = resourceContent[resourceId];
  const projects = useMemo(() => buildHomeProjects(artifacts, jobs), [artifacts, jobs]);
  const readableArtifacts = useMemo(() => {
    const pending = new Set(jobs.filter(job => job.status !== 'completed').map(job => job.artifactId));
    return artifacts.filter(artifact => !pending.has(artifact.id));
  }, [artifacts, jobs]);

  return <section className="aos-home-resource-page" aria-label={`${content.title}页面`} data-resource-id={resourceId}>
    <header className="aos-home-resource-page-heading">
      <div><h1>{content.title}</h1><p>{content.description}</p></div>
      <button type="button" className="aos-home-resource-back" onClick={onBack}>
        <ArrowLeft size={13} strokeWidth={1.5} aria-hidden="true" />返回 Home
      </button>
    </header>
    <HomeResourceLibrary key={resourceId} tab={resourceId} projects={projects} readableArtifacts={readableArtifacts} jobs={jobs} onOpenArtifact={onOpenArtifact} />
  </section>;
}
