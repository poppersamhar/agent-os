import { useState, useRef, useEffect } from 'react';
import {
  Database, Network, Shield,
} from 'lucide-react';
import { dataItems, projects, agents, skills } from '../data/mockData';

interface RightPanelProps {
  activeView: string;
  activeProjectId: string | null;
  selectedDataItemId: string | null;
}

type BottomTabKey = 'audit' | 'file' | 'graph';

const bottomTabs: { key: BottomTabKey; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { key: 'audit', label: '数据', icon: Shield },
  { key: 'file', label: '文件', icon: Database },
  { key: 'graph', label: '图谱', icon: Network },
];

// 数据 Tab：上传文件 + 产出
function DataPanel() {
  return (
    <div className="h-full flex flex-col px-4 py-3 overflow-y-auto">
      {/* 上传文件 */}
      <div className="mb-3">
        <h4 className="text-[11px] font-semibold text-text-muted mb-2">上传文件</h4>
        <div className="space-y-1.5">
          {[
            { name: 'sales_q3.xlsx', size: '2.3MB' },
            { name: 'region_data.csv', size: '856KB' },
            { name: 'budget_notes.md', size: '12KB' },
          ].map((f) => (
            <div key={f.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg transition-colors cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-[10px] text-primary font-medium">{f.name.split('.').pop()?.toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-text truncate">{f.name}</div>
                <div className="text-[10px] text-text-muted">{f.size}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border-light my-2" />

      {/* 产出 */}
      <div className="flex-1">
        <h4 className="text-[11px] font-semibold text-text-muted mb-2">产出</h4>
        <div className="space-y-1.5">
          {[
            { name: 'Q3营收对比图.png', size: '1.2MB' },
            { name: '分析报告.pdf', size: '3.5MB' },
            { name: '趋势数据.xlsx', size: '1.8MB' },
          ].map((f) => (
            <div key={f.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg transition-colors cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                <span className="text-[10px] text-success font-medium">{f.name.split('.').pop()?.toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-text truncate">{f.name}</div>
                <div className="text-[10px] text-text-muted">{f.size}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 图谱 Tab：迷你 Canvas 力导向图
function GraphPanel({ projectId }: { projectId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const project = projects.find(p => p.id === projectId);
    const relatedAgents = agents.filter(a => a.workLine === project?.name);
    const relatedSkills = skills.filter(s => relatedAgents.some(a => a.mountedSkills.includes(s.id)));
    const insights = ['营收对比分析', '消费者业务下滑 5%', '海外市场增长 34%'];

    const nodeColors: Record<string, string> = {
      project: '#1e3a5f',
      agent: '#0d9488',
      skill: '#7c3aed',
      insight: '#d97706',
    };

    const nodes: Array<{ id: string; label: string; type: string; angle: number; dist: number; r: number; phase: number }> = [
      { id: 'center', label: project?.name || '项目', type: 'project', angle: 0, dist: 0, r: 10, phase: Math.random() * Math.PI * 2 },
      ...relatedAgents.map((a, i) => ({
        id: a.id, label: a.name, type: 'agent',
        angle: (i / Math.max(1, relatedAgents.length)) * Math.PI * 2,
        dist: 0.35, r: 6, phase: Math.random() * Math.PI * 2,
      })),
      ...relatedSkills.map((s, i) => ({
        id: s.id, label: s.name, type: 'skill',
        angle: (i / Math.max(1, relatedSkills.length)) * Math.PI * 2 + 0.5,
        dist: 0.58, r: 5, phase: Math.random() * Math.PI * 2,
      })),
      ...insights.map((t, i) => ({
        id: `insight-${i}`, label: t, type: 'insight',
        angle: (i / insights.length) * Math.PI * 2 + 2.5,
        dist: 0.75, r: 5, phase: Math.random() * Math.PI * 2,
      })),
    ];

    let W = 0, H = 0;
    let hovered: typeof nodes[0] | null = null;
    let animId = 0;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      W = rect.width;
      H = rect.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const now = Date.now();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2;
      const cy = H / 2;
      const maxR = Math.min(W, H) * 0.42;

      // 连线
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 0.8;
      nodes.forEach(n => {
        if (n.id === 'center') return;
        const fx = Math.sin(now * 0.0003 + n.phase) * 1.5;
        const fy = Math.cos(now * 0.0003 + n.phase) * 1.2;
        const ax = cx + Math.cos(n.angle) * n.dist * maxR + fx;
        const ay = cy + Math.sin(n.angle) * n.dist * maxR + fy;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ax, ay);
        ctx.stroke();
      });

      // 节点
      nodes.forEach(n => {
        const fx = Math.sin(now * 0.0003 + n.phase) * 1.5;
        const fy = Math.cos(now * 0.0003 + n.phase) * 1.2;
        const rx = n.id === 'center' ? cx : cx + Math.cos(n.angle) * n.dist * maxR + fx;
        const ry = n.id === 'center' ? cy : cy + Math.sin(n.angle) * n.dist * maxR + fy;
        const isHover = hovered?.id === n.id;
        const color = nodeColors[n.type] || '#52525b';

        ctx.shadowColor = isHover ? color + '50' : 'rgba(0,0,0,0.05)';
        ctx.shadowBlur = isHover ? 10 : 4;
        ctx.beginPath();
        ctx.arc(rx, ry, n.r, 0, Math.PI * 2);
        ctx.fillStyle = isHover ? color : color + 'cc';
        ctx.fill();
        ctx.shadowBlur = 0;

        if (n.id !== 'center') {
          ctx.fillStyle = isHover ? color : '#3f3f46';
          ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
          const textX = rx + n.r + 5;
          const textY = ry + 3;
          if (textX + ctx.measureText(n.label).width < W - 4) {
            ctx.fillText(n.label, textX, textY);
          }
        }
      });

      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cx = W / 2;
      const cy = H / 2;
      const maxR = Math.min(W, H) * 0.42;
      const now = Date.now();
      let hit: typeof nodes[0] | null = null;
      for (const n of nodes) {
        const fx = Math.sin(now * 0.0003 + n.phase) * 1.5;
        const fy = Math.cos(now * 0.0003 + n.phase) * 1.2;
        const rx = n.id === 'center' ? cx : cx + Math.cos(n.angle) * n.dist * maxR + fx;
        const ry = n.id === 'center' ? cy : cy + Math.sin(n.angle) * n.dist * maxR + fy;
        if ((mx - rx) ** 2 + (my - ry) ** 2 < (n.r + 6) ** 2) {
          hit = n;
          break;
        }
      }
      hovered = hit;
      canvas.style.cursor = hit ? 'pointer' : 'default';

      const tip = tooltipRef.current;
      if (tip) {
        if (hit) {
          tip.innerHTML = `<div class="text-[11px] font-semibold text-text">${hit.label}</div><div class="text-[10px] text-text-muted mt-0.5">${hit.type === 'project' ? '项目' : hit.type === 'agent' ? 'Agent' : hit.type === 'skill' ? 'Skill' : '洞察'}</div>`;
          tip.style.display = 'block';
          let tx = mx + 10;
          let ty = my + 10;
          if (tx + 140 > W) tx = mx - 150;
          if (ty + 50 > H) ty = my - 60;
          tip.style.left = tx + 'px';
          tip.style.top = ty + 'px';
        } else {
          tip.style.display = 'none';
        }
      }
    };

    canvas.addEventListener('mousemove', onMove);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      canvas.removeEventListener('mousemove', onMove);
    };
  }, [projectId]);

  return (
    <div ref={containerRef} className="h-full w-full relative">
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div ref={tooltipRef} className="absolute hidden z-20 pointer-events-none bg-white/90 backdrop-blur-sm rounded-lg border border-border/60 shadow-sm p-2 min-w-[100px]" />
    </div>
  );
}

// 数据详情面板
function DataDetailPanel({ selectedId }: { selectedId: string | null }) {
  const selected = dataItems.find(d => d.id === selectedId);

  if (selected) {
    const max = Math.max(...(selected.data?.map(d => d.value) || [0]));
    return (
      <div className="h-full flex flex-col px-4 py-3 overflow-y-auto">
        <h4 className="text-[11px] font-semibold text-text-muted mb-1">{selected.title}</h4>
        <p className="text-[10px] text-text-muted mb-3">{selected.description}</p>
        <div className="bg-white border border-primary/20 shadow-[0_8px_40px_rgba(0,0,0,0.08)] rounded-xl p-3 mb-3">
          {selected.chartType === 'bar' && selected.data && (
            <div className="flex items-end gap-2 h-32">
              {selected.data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[10px] font-medium text-text">{d.value}</div>
                  <div className={`w-full rounded-t ${d.change?.startsWith('-') ? 'bg-text-muted' : 'bg-primary/80'}`} style={{ height: `${(d.value / max) * 100}%` }} />
                  <span className="text-[9px] text-text-muted truncate w-full text-center">{d.label}</span>
                  {d.change && <span className={`text-[9px] ${d.change.startsWith('-') ? 'text-text-muted' : 'text-text-muted'}`}>{d.change}</span>}
                </div>
              ))}
            </div>
          )}
          {selected.chartType === 'line' && selected.data && (
            <div className="flex items-end gap-2 h-32 px-2">
              <svg viewBox={`0 0 ${selected.data.length * 40} 100`} className="w-full h-full" preserveAspectRatio="none">
                <polyline fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"
                  points={selected.data.map((d, i) => `${i * 40 + 20},${100 - (d.value / max) * 80}`).join(' ')} />
                {selected.data.map((d, i) => (
                  <g key={i}>
                    <circle cx={i * 40 + 20} cy={100 - (d.value / max) * 80} r="3" className="fill-primary" />
                    <text x={i * 40 + 20} y={95} textAnchor="middle" className="fill-text-muted" style={{ fontSize: '8px' }}>{d.label}</text>
                    <text x={i * 40 + 20} y={100 - (d.value / max) * 80 - 8} textAnchor="middle" className="fill-text" style={{ fontSize: '9px', fontWeight: 500 }}>{d.value}</text>
                  </g>
                ))}
              </svg>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <h5 className="text-[11px] font-semibold text-text-muted mb-1">数据明细</h5>
          {selected.data?.map((d, i) => (
            <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-bg">
              <span className="text-[11px] text-text">{d.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-text">{d.value}</span>
                {d.change && <span className="text-[10px] text-text-muted">{d.change}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col px-4 py-3 overflow-y-auto">
      <h4 className="text-[11px] font-semibold text-text-muted mb-2">数据产出</h4>
      <div className="space-y-2">
        {dataItems.map((item) => (
          <div key={item.id} className="bg-white border border-primary/20 shadow-[0_8px_40px_rgba(0,0,0,0.08)] rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-medium text-text">{item.title}</span>
              <span className="text-[10px] text-text-muted">{item.chartType === 'bar' ? '柱状图' : '折线图'}</span>
            </div>
            <p className="text-[10px] text-text-muted">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RightPanel({ activeView, activeProjectId, selectedDataItemId }: RightPanelProps) {
  const [bottomTab, setBottomTab] = useState<BottomTabKey>('graph');

  const isProjectView = activeView === 'project' && activeProjectId;
  if (!isProjectView) return null;

  return (
    <div className="h-full w-full flex flex-col bg-surface/80 backdrop-blur-md border-l border-border">
      {/* 选项卡切换 */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Tab Bar */}
        <div className="flex items-center border-b border-border shrink-0 bg-surface/50">
          {bottomTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setBottomTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium border-b-2 transition-all duration-200 ${
                  bottomTab === tab.key
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-secondary hover:text-text'
                }`}
              >
                <Icon className="w-3 h-3" strokeWidth={1.8} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {bottomTab === 'file' && <DataPanel />}
          {bottomTab === 'graph' && <GraphPanel projectId={activeProjectId} />}
          {bottomTab === 'audit' && <DataDetailPanel selectedId={selectedDataItemId} />}
        </div>
      </div>
    </div>
  );
}
