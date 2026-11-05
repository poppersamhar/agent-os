import { BookOpen, Puzzle, Sparkles } from 'lucide-react';
import './HomeResourceRail.css';

export type HomeResourceId = 'skills' | 'plugins' | 'knowledge';

interface HomeResourceRailProps {
  selectedId: HomeResourceId | null;
  onSelect: (id: HomeResourceId) => void;
}

const resources = [
  { id: 'skills', label: '技能', icon: Sparkles },
  { id: 'plugins', label: '插件', icon: Puzzle },
  { id: 'knowledge', label: '知识库', icon: BookOpen },
] as const;

export default function HomeResourceRail({ selectedId, onSelect }: HomeResourceRailProps) {
  return <nav className="aos-home-resource-rail" aria-label="Home 资源导航">
    {resources.map(resource => <button type="button" key={resource.id} className="aos-home-resource-shortcut"
      aria-label={`查看${resource.label}`} aria-current={selectedId === resource.id ? 'true' : undefined}
      onClick={() => onSelect(resource.id)}>
      <span className="aos-home-resource-circle" aria-hidden="true"><resource.icon size={10} strokeWidth={1.5} /></span>
      <span className="aos-home-resource-name" aria-hidden="true">{resource.label}</span>
    </button>)}
  </nav>;
}
