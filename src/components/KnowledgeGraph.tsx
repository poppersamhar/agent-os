import { useRef, useEffect, useState } from 'react';
import { projects, agents, skills, standaloneTasks } from '../data/mockData';
import { useTheme } from '../contexts/ThemeContext';
import { X, FileText } from 'lucide-react';
import type { ExcludeRect } from './DraggableChat';

/* ─── Types ─── */
// 按设计规范：核心实体 / 属性子实体 / 叶子节点 / 来源标记
type NodeType = 'core_entity' | 'property' | 'leaf' | 'source';

interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  floatPhase: number;
  floatSpeed: number;
  layer: number;
  detail: string;
  meta?: Record<string, string>;
}

const themeNodeColors: Record<string, Record<NodeType, { fill: string; stroke: string; label: string }>> = {
  ink: {
    core_entity: { fill: '#E84B25', stroke: '#c43a1a', label: '核心实体' },
    property:    { fill: '#3B82F6', stroke: '#2563eb', label: '属性' },
    leaf:        { fill: '#6B6B6B', stroke: '#525252', label: '叶子' },
    source:      { fill: '#22C55E', stroke: '#16a34a', label: '来源' },
  },
  stone: {
    core_entity: { fill: '#E84B25', stroke: '#c43a1a', label: '核心实体' },
    property:    { fill: '#3B82F6', stroke: '#2563eb', label: '属性' },
    leaf:        { fill: '#6B6B6B', stroke: '#525252', label: '叶子' },
    source:      { fill: '#22C55E', stroke: '#16a34a', label: '来源' },
  },
  charcoal: {
    core_entity: { fill: '#E84B25', stroke: '#c43a1a', label: '核心实体' },
    property:    { fill: '#3B82F6', stroke: '#2563eb', label: '属性' },
    leaf:        { fill: '#6B6B6B', stroke: '#525252', label: '叶子' },
    source:      { fill: '#22C55E', stroke: '#16a34a', label: '来源' },
  },
};

interface GraphEdge {
  source: string;
  target: string;
}

function buildGraph(projectId?: string | null, taskId?: string | null) {
  const project = projectId ? projects.find((p) => p.id === projectId) : undefined;
  const standaloneTask = projectId ? standaloneTasks.find((t) => t.id === projectId) : undefined;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const degree = new Map<string, number>();
  const inc = (id: string) => degree.set(id, (degree.get(id) || 0) + 1);

  const makeNode = (id: string, label: string, type: NodeType, radius: number, mass: number, layer: number, detail: string, meta?: Record<string, string>): GraphNode => ({
    id, label, type, x: 0, y: 0, baseX: 0, baseY: 0, vx: 0, vy: 0, radius, mass,
    floatPhase: Math.random() * Math.PI * 2,
    floatSpeed: 0.0004 + Math.random() * 0.0008,
    layer, detail, meta,
  });

  // ── Global graph (no projectId) ──
  if (!projectId) {
    nodes.push(makeNode('global-center', '组织知识图谱', 'core_entity', 18, 6, 0, '全组织知识资产总览'));

    // 所有项目
    projects.forEach((p, i) => {
      const pid = `proj-${p.id}`;
      nodes.push(makeNode(pid, p.name, 'property', 10, 2.5, 1, `项目 · ${p.memberCount} 成员`, { 任务数: String(p.chats.length) }));
      edges.push({ source: 'global-center', target: pid });
      inc('global-center'); inc(pid);
    });

    // 独立任务
    standaloneTasks.slice(0, 4).forEach((t, i) => {
      const tid = `st-${t.id}`;
      nodes.push(makeNode(tid, t.name, 'property', 9, 2, 1, '独立任务'));
      edges.push({ source: 'global-center', target: tid });
      inc('global-center'); inc(tid);
    });

    // Agent 类型聚合
    const agentTypes = [
      { id: 'agent-workagent', name: '管理智能体', detail: '任务编排与调度' },
      { id: 'agent-sub', name: '数字员工', detail: '原子任务执行' },
      { id: 'agent-org', name: '企业效能管理智能体', detail: '组织级效能管理' },
    ];
    agentTypes.forEach((a) => {
      nodes.push(makeNode(a.id, a.name, 'property', 9, 2, 1, a.detail));
      edges.push({ source: 'global-center', target: a.id });
      inc('global-center'); inc(a.id);
    });

    // Skills
    skills.slice(0, 8).forEach((s) => {
      nodes.push(makeNode(s.id, s.name, 'leaf', 6.5, 1.3, 2, s.description, { 类别: s.category, 作者: s.author }));
      edges.push({ source: 'global-center', target: s.id });
      inc('global-center'); inc(s.id);
    });

    // 关键洞察
    const insights = [
      { id: 'insight-1', text: '12 个活跃项目', detail: '本季度知识沉淀' },
      { id: 'insight-2', text: '86 个 Skills', detail: '可复用能力资产' },
      { id: 'insight-3', text: '3 层记忆架构', detail: '任务→项目→全局' },
      { id: 'insight-4', text: '98.5% 成功率', detail: '数字员工执行' },
    ];
    insights.forEach((kp) => {
      nodes.push(makeNode(kp.id, kp.text, 'leaf', 6, 1.2, 2, kp.detail));
      edges.push({ source: 'global-center', target: kp.id });
      inc('global-center'); inc(kp.id);
    });

    nodes.forEach((n) => {
      const d = degree.get(n.id) || 0;
      if (d >= 6) n.radius = 16;
      else if (d >= 4) n.radius = 11;
      else if (d >= 2) n.radius = 8;
    });

    return { nodes, edges };
  }

  // ── Standalone task graph ──
  if (!project && standaloneTask) {
    nodes.push(makeNode('task-center', standaloneTask.name, 'core_entity', 14, 5, 0, '独立任务', { 类型: standaloneTask.type }));

    const completionMsg = standaloneTask.messages.find((m) => m.metadata?.messageType === 'completion');
    const metadata = completionMsg?.metadata;

    if (projectId === 'st_corbusier') {
      // Agents involved
      const taskAgents = [
        { id: 'agent-workagent', name: 'WorkAgent', detail: '需求解析与任务规划' },
        { id: 'agent-content', name: 'ContentWriter', detail: '建筑学专业内容撰写' },
        { id: 'agent-theme', name: 'ThemeEngine', detail: '沙丘主题色管理' },
        { id: 'agent-layout', name: 'LayoutBuilder', detail: '页面布局构建' },
        { id: 'agent-webgl', name: 'WebGLBackground', detail: 'WebGL 动态背景生成' },
        { id: 'agent-slide', name: 'SlideCraft', detail: 'PPT 生成引擎' },
      ];
      taskAgents.forEach((a) => {
        nodes.push(makeNode(a.id, a.name, 'property', 8.5, 2, 1, a.detail));
        edges.push({ source: 'task-center', target: a.id });
        inc('task-center'); inc(a.id);
      });

      // Skills (use real skill IDs from mockData)
      const taskSkills = [
        { id: 's13', name: 'ContentWriter', detail: '建筑学专业内容撰写' },
        { id: 's10', name: 'ThemeEngine', detail: '主题色管理系统' },
        { id: 's11', name: 'LayoutBuilder', detail: '页面布局构建系统' },
        { id: 's12', name: 'WebGLBackground', detail: 'WebGL 动态背景生成器' },
        { id: 's9', name: 'SlideCraft', detail: 'PPT 生成引擎' },
      ];
      taskSkills.forEach((s) => {
        nodes.push(makeNode(s.id, s.name, 'leaf', 6.5, 1.3, 2, s.detail, { 来源: '任务#柯布西耶PPT' }));
        edges.push({ source: 'task-center', target: s.id });
        // Also connect skill to its corresponding agent for richer topology
        const agentId = `agent-${s.name.toLowerCase().replace(/[^a-z]/g, '')}`;
        if (nodes.find((n) => n.id === agentId)) {
          edges.push({ source: agentId, target: s.id });
          inc(agentId); inc(s.id);
        } else {
          inc('task-center'); inc(s.id);
        }
      });

      // Files
      if (metadata?.files && metadata.files.length > 0) {
        metadata.files.forEach((f: string, i: number) => {
          const fid = `file-${i}`;
          const fileName = f.split('/').pop() || f;
          nodes.push(makeNode(fid, fileName, 'source', 5.5, 1, 2, '产出文件', { 路径: f, 大小: metadata.fileSize || '' }));
          edges.push({ source: 'task-center', target: fid });
          inc('task-center'); inc(fid);
        });
      }

      // Insights
      const insights: Array<{ id: string; text: string; detail: string; meta?: Record<string, string> }> = [
        { id: 'insight-pages', text: '15页', detail: '完整内容结构', meta: { 章节: '3幕15页' } },
        { id: 'insight-theme', text: '沙丘主题', detail: metadata?.themeColor || '沙丘（炭灰 + 沙色）', meta: { 风格: '电子杂志' } },
        { id: 'insight-style', text: '建筑专业', detail: metadata?.style || '建筑学专业介绍' },
        { id: 'insight-size', text: metadata?.fileSize || '48.8 KB', detail: '文件大小' },
      ];
      insights.forEach((kp) => {
        nodes.push(makeNode(kp.id, kp.text, 'leaf', 5.5, 1, 2, kp.detail, kp.meta));
        edges.push({ source: 'task-center', target: kp.id });
        inc('task-center'); inc(kp.id);
      });
    } else {
      // Generic standalone task graph
      const uniqueSenders = [...new Set(standaloneTask.messages.map((m) => m.senderName).filter((s) => s !== '系统'))];
      uniqueSenders.forEach((sender, i) => {
        const sid = `sender-${i}`;
        nodes.push(makeNode(sid, sender, 'property', 8.5, 2, 1, '参与者'));
        edges.push({ source: 'task-center', target: sid });
        inc('task-center'); inc(sid);
      });

      // Add a few generic insights
      const genericInsights = [
        { id: 'insight-msgs', text: `${standaloneTask.messages.length} 条消息`, detail: '对话记录' },
        { id: 'insight-time', text: standaloneTask.createdAt, detail: '创建时间' },
      ];
      genericInsights.forEach((kp) => {
        nodes.push(makeNode(kp.id, kp.text, 'leaf', 5.5, 1, 2, kp.detail));
        edges.push({ source: 'task-center', target: kp.id });
        inc('task-center'); inc(kp.id);
      });
    }

    nodes.forEach((n) => {
      const d = degree.get(n.id) || 0;
      if (d >= 6) n.radius = 16;
      else if (d >= 4) n.radius = 11;
      else if (d >= 2) n.radius = 8;
    });

    return { nodes, edges };
  }

  if (!project) return { nodes: [] as GraphNode[], edges: [] as GraphEdge[] };

  if (taskId) {
    // 任务子图谱模式
    const chat = project.chats.find((c) => c.id === taskId);
    const centerLabel = chat ? chat.name : '任务节点';
    nodes.push(makeNode('task-center', centerLabel, 'core_entity', 14, 5, 0, chat ? `${chat.name}任务详情` : '任务详情', { 消息数: String(chat?.messages.length || 0) }));

    // 关联的 Agent（从消息中提取）
    const taskAgents = agents.filter((a) => a.workLine === project.name).slice(0, 3);
    taskAgents.forEach((agent) => {
      nodes.push(makeNode(agent.id, agent.name, 'property', 8.5, 2, 1, agent.description, { 状态: agent.status, 调用: String(agent.calls) }));
      edges.push({ source: 'task-center', target: agent.id });
      inc('task-center'); inc(agent.id);
    });

    // 任务相关文件
    const taskFiles = [
      { name: 'task_data.xlsx', size: '1.2MB' },
      { name: 'analysis_result.csv', size: '456KB' },
    ];
    taskFiles.forEach((f, i) => {
      const fid = `tfile-${i}`;
      nodes.push(makeNode(fid, f.name, 'source', 5.5, 1, 2, `任务文件`, { 大小: f.size }));
      edges.push({ source: 'task-center', target: fid });
      inc('task-center'); inc(fid);
    });

    // 任务洞察
    const taskInsights = [
      { text: '异常发现', desc: '发现3处数据异常' },
      { text: '优化建议', desc: '建议调整参数配置' },
    ];
    taskInsights.forEach((kp, i) => {
      const kid = `tkp-${i}`;
      nodes.push(makeNode(kid, kp.text, 'leaf', 5.5, 1, 2, kp.desc));
      edges.push({ source: 'task-center', target: kid });
      inc('task-center'); inc(kid);
    });
  } else {
    // 项目图谱模式
    nodes.push(makeNode(project.id, project.name, 'core_entity', 14, 5, 0, project.description || '项目节点', { 成员: String(project.memberCount) }));

    // 任务节点（用 chats 作为任务）
    project.chats.forEach((chat) => {
      const tid = `chat-${chat.id}`;
      nodes.push(makeNode(tid, chat.name, 'property', 8.5, 2, 1, `项目任务：${chat.name}`, { 消息数: String(chat.messages.length) }));
      edges.push({ source: project.id, target: tid });
      inc(project.id); inc(tid);
    });

    const relatedAgents = agents.filter((a) => a.workLine === project.name);
    relatedAgents.forEach((agent) => {
      nodes.push(makeNode(agent.id, agent.name, 'property', 8.5, 2, 1, agent.description, { 状态: agent.status, 调用: String(agent.calls) }));
      edges.push({ source: project.id, target: agent.id });
      inc(project.id); inc(agent.id);
    });

    const relatedSkills = skills.filter((s) =>
      relatedAgents.some((a) => a.mountedSkills.includes(s.id))
    );
    relatedSkills.forEach((skill) => {
      nodes.push(makeNode(skill.id, skill.name, 'leaf', 6.5, 1.3, 1, skill.description, { 类别: skill.category, 作者: skill.author }));
      const parent = relatedAgents.find((a) => a.mountedSkills.includes(skill.id));
      if (parent) {
        edges.push({ source: parent.id, target: skill.id });
        inc(parent.id); inc(skill.id);
      }
    });

    const files = [
      { name: 'sales_q3.xlsx', size: '2.3MB' },
      { name: 'region_data.csv', size: '856KB' },
      { name: 'budget_notes.md', size: '12KB' },
    ];
    files.forEach((f, i) => {
      const fid = `file-${i}`;
      nodes.push(makeNode(fid, f.name, 'source', 5.5, 1, 2, `项目文件`, { 大小: f.size }));
      edges.push({ source: project.id, target: fid });
      inc(project.id); inc(fid);
    });

    const keypoints = [
      { text: '营收对比分析', desc: '各业务线Q3营收横向对比' },
      { text: '消费者业务下滑', desc: '消费者业务同比下滑5%' },
      { text: '海外市场+34%', desc: '海外市场增速领跑全业务' },
    ];
    keypoints.forEach((kp, i) => {
      const kid = `kp-${i}`;
      nodes.push(makeNode(kid, kp.text, 'leaf', 5.5, 1, 2, kp.desc));
      edges.push({ source: project.id, target: kid });
      inc(project.id); inc(kid);
    });
  }

  nodes.forEach((n) => {
    const d = degree.get(n.id) || 0;
    if (d >= 6) n.radius = 16;
    else if (d >= 4) n.radius = 11;
    else if (d >= 2) n.radius = 8;
  });

  return { nodes, edges };
}

export default function KnowledgeGraph({
  projectId,
  excludeRectRef,
}: {
  projectId?: string;
  excludeRectRef?: React.RefObject<ExcludeRect | null>;
}) {
  const { themeColor } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const graphRef = useRef<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });
  const draggedNodeRef = useRef<GraphNode | null>(null);
  const hoveredNodeRef = useRef<GraphNode | null>(null);
  const prevExRef = useRef<{ cx: number; cy: number; active: boolean }>({ cx: 0, cy: 0, active: false });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const themeColorRef = useRef(themeColor);
  themeColorRef.current = themeColor;

  // 视图缩放与平移
  const scaleRef = useRef(1);
  const offsetXRef = useRef(0);
  const offsetYRef = useRef(0);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  // 递进层级状态
  const [currentLevel, setCurrentLevel] = useState<'project' | 'task'>('project');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskName, setSelectedTaskName] = useState('');
  const [docPreview, setDocPreview] = useState<{ name: string; content: string } | null>(null);

  // ref 同步（供 Canvas 事件闭包读取）
  const levelRef = useRef(currentLevel);
  const taskIdRef = useRef(selectedTaskId);
  const dragMovedRef = useRef(false);
  levelRef.current = currentLevel;
  taskIdRef.current = selectedTaskId;

  // 切换图谱时重置视图
  useEffect(() => {
    scaleRef.current = 1;
    offsetXRef.current = 0;
    offsetYRef.current = 0;
  }, [projectId, currentLevel, selectedTaskId]);

  const project = projectId ? projects.find((p) => p.id === projectId) : undefined;
  const standaloneTask = projectId ? standaloneTasks.find((t) => t.id === projectId) : undefined;
  const displayName = project?.name || standaloneTask?.name || '全局知识图谱';

  useEffect(() => {
    const taskId = currentLevel === 'task' ? selectedTaskId : null;
    const { nodes, edges } = buildGraph(projectId, taskId);
    graphRef.current = { nodes, edges };
    prevExRef.current = { cx: 0, cy: 0, active: false };
  }, [projectId, currentLevel, selectedTaskId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0;
    let H = 0;

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

    const { nodes, edges } = graphRef.current;
    const cx = W / 2;
    const cy = H / 2;
    const minDim = Math.min(W, H);

    const centerNodes = nodes.filter((n) => n.layer === 0);
    const midNodes = nodes.filter((n) => n.layer === 1);
    const outerNodes = nodes.filter((n) => n.layer === 2);

    centerNodes.forEach((n) => {
      n.x = cx + (Math.random() - 0.5) * 40;
      n.y = cy + (Math.random() - 0.5) * 40;
    });

    midNodes.forEach((n, i) => {
      const angle = (i / Math.max(1, midNodes.length)) * Math.PI * 2 + Math.random() * 0.5;
      const r = minDim * (0.38 + Math.random() * 0.18);
      n.x = cx + Math.cos(angle) * r;
      n.y = cy + Math.sin(angle) * r;
    });

    outerNodes.forEach((n, i) => {
      const angle = (i / Math.max(1, outerNodes.length)) * Math.PI * 2 + Math.random() * 0.8;
      const r = minDim * (0.62 + Math.random() * 0.22);
      n.x = cx + Math.cos(angle) * r;
      n.y = cy + Math.sin(angle) * r;
    });

    // 预热收敛
    for (let f = 0; f < 1500; f++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (1200 * a.mass * b.mass) / (dist * dist);
          a.vx -= (dx / dist) * force / a.mass;
          a.vy -= (dy / dist) * force / a.mass;
          b.vx += (dx / dist) * force / b.mass;
          b.vy += (dy / dist) * force / b.mass;
        }
      }
      edges.forEach((e) => {
        const a = nodes.find((n) => n.id === e.source);
        const b = nodes.find((n) => n.id === e.target);
        if (!a || !b) return;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 260) * 0.004;
        a.vx += (dx / dist) * force / a.mass;
        a.vy += (dy / dist) * force / a.mass;
        b.vx -= (dx / dist) * force / b.mass;
        b.vy -= (dy / dist) * force / b.mass;
      });
      const pad = 40;
      nodes.forEach((n) => {
        if (n.x < pad) n.vx += (pad - n.x) * 0.04;
        if (n.x > W - pad) n.vx -= (n.x - (W - pad)) * 0.04;
        if (n.y < pad) n.vy += (pad - n.y) * 0.04;
        if (n.y > H - pad) n.vy -= (n.y - (H - pad)) * 0.04;
      });
      nodes.forEach((n) => {
        n.vx *= 0.94; n.vy *= 0.94;
        n.x += n.vx; n.y += n.vy;
      });
    }

    nodes.forEach((n) => { n.baseX = n.x; n.baseY = n.y; n.vx = 0; n.vy = 0; });

    // ─── 流体渲染循环 ───
    const NODE_REPULSE = 300;
    const FLOW_SPRING = 0.002;
    const FLOW_REST = 280;
    const BOUNDARY_K = 0.02;
    const MOTION_DAMP = 0.97;
    const JITTER = 0.025;
    const RETURN_K = 0.004;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const ex = excludeRectRef?.current;
      const exActive = ex && ex.active;
      const now = Date.now();

      // 排斥当前 BizAgent 位置
      if (exActive) {
        const exCX = ex.x + ex.width / 2;
        const exCY = ex.y + ex.height / 2;

        nodes.forEach((n) => {
          const dx = n.x - exCX;
          const dy = n.y - exCY;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 150) {
            const t = 1 - dist / 150;
            const strength = t * t * 0.06;
            n.vx += (dx / dist) * strength;
            n.vy += (dy / dist) * strength;
          }
        });

        // 吸引上一位置（后方流入）
        if (prevExRef.current.active) {
          const moved = Math.abs(exCX - prevExRef.current.cx) + Math.abs(exCY - prevExRef.current.cy);
          if (moved > 2) {
            nodes.forEach((n) => {
              const dx = prevExRef.current.cx - n.x;
              const dy = prevExRef.current.cy - n.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              if (dist < 220) {
                const t = 1 - dist / 220;
                const strength = t * t * 0.035;
                n.vx += (dx / dist) * strength;
                n.vy += (dy / dist) * strength;
              }
            });
          }
        }

        prevExRef.current = { cx: exCX, cy: exCY, active: true };
      } else {
        prevExRef.current.active = false;
      }

      nodes.forEach((n) => {
        if (n === draggedNodeRef.current) {
          n.vx = 0; n.vy = 0;
          n.baseX = n.x; n.baseY = n.y;
          return;
        }

        // 微扰动
        n.vx += (Math.random() - 0.5) * JITTER;
        n.vy += (Math.random() - 0.5) * JITTER;

        // 极弱回归
        n.vx += (n.baseX - n.x) * RETURN_K;
        n.vy += (n.baseY - n.y) * RETURN_K;
      });

      // 持续节点间斥力
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (NODE_REPULSE * a.mass * b.mass) / (dist * dist);
          a.vx -= (dx / dist) * force / a.mass;
          a.vy -= (dy / dist) * force / a.mass;
          b.vx += (dx / dist) * force / b.mass;
          b.vy += (dy / dist) * force / b.mass;
        }
      }

      // 持续弱弹簧
      edges.forEach((e) => {
        const a = nodes.find((n) => n.id === e.source);
        const b = nodes.find((n) => n.id === e.target);
        if (!a || !b) return;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - FLOW_REST) * FLOW_SPRING;
        a.vx += (dx / dist) * force / a.mass;
        a.vy += (dy / dist) * force / a.mass;
        b.vx -= (dx / dist) * force / b.mass;
        b.vy -= (dy / dist) * force / b.mass;
      });

      // 软边界
      const pad = 45;
      nodes.forEach((n) => {
        if (n.x < pad) n.vx += (pad - n.x) * BOUNDARY_K;
        if (n.x > W - pad) n.vx -= (n.x - (W - pad)) * BOUNDARY_K;
        if (n.y < pad) n.vy += (pad - n.y) * BOUNDARY_K;
        if (n.y > H - pad) n.vy -= (n.y - (H - pad)) * BOUNDARY_K;
      });

      // 积分
      nodes.forEach((n) => {
        n.vx *= MOTION_DAMP;
        n.vy *= MOTION_DAMP;
        n.x += n.vx;
        n.y += n.vy;
      });

      /* ─── Render ─── */
      const viewScale = scaleRef.current;
      const viewOffsetX = offsetXRef.current;
      const viewOffsetY = offsetYRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const colors = themeNodeColors[themeColorRef.current] || themeNodeColors.ink;
      const edgeColor = themeColorRef.current === 'charcoal'
        ? 'rgba(38,38,38,0.12)'
        : 'rgba(28,25,23,0.10)';

      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = 0.8 * viewScale;
      edges.forEach((e) => {
        const a = nodes.find((n) => n.id === e.source);
        const b = nodes.find((n) => n.id === e.target);
        if (!a || !b) return;
        const ax = a.x + Math.sin(now * a.floatSpeed + a.floatPhase) * 0.6;
        const ay = a.y + Math.cos(now * a.floatSpeed * 0.7 + a.floatPhase) * 0.5;
        const bx = b.x + Math.sin(now * b.floatSpeed + b.floatPhase) * 0.6;
        const by = b.y + Math.cos(now * b.floatSpeed * 0.7 + b.floatPhase) * 0.5;
        ctx.beginPath();
        ctx.moveTo(ax * viewScale + viewOffsetX, ay * viewScale + viewOffsetY);
        ctx.lineTo(bx * viewScale + viewOffsetX, by * viewScale + viewOffsetY);
        ctx.stroke();
      });

      nodes.forEach((n) => {
        const floatX = Math.sin(now * n.floatSpeed + n.floatPhase) * 0.6;
        const floatY = Math.cos(now * n.floatSpeed * 0.7 + n.floatPhase) * 0.5;
        const wx = n.x + floatX;
        const wy = n.y + floatY;
        const sx = wx * viewScale + viewOffsetX;
        const sy = wy * viewScale + viewOffsetY;
        const sr = n.radius * viewScale;

        ctx.shadowColor = 'rgba(0,0,0,0.06)';
        ctx.shadowBlur = 5 * viewScale;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1.5 * viewScale;

        const c = colors[n.type];
        const isHover = hoveredNodeRef.current?.id === n.id;
        const isDrag = draggedNodeRef.current?.id === n.id;

        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        if (isHover) ctx.fillStyle = c.stroke;
        else if (isDrag) ctx.fillStyle = c.fill;
        else ctx.fillStyle = c.fill;
        ctx.fill();

        // 悬停/拖拽时加外圈高亮
        if (isHover || isDrag) {
          ctx.beginPath();
          ctx.arc(sx, sy, sr + 3 * viewScale, 0, Math.PI * 2);
          ctx.strokeStyle = c.stroke + '60';
          ctx.lineWidth = 2 * viewScale;
          ctx.stroke();
        }

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        ctx.fillStyle = isHover ? c.stroke : '#3f3f46';
        ctx.font = `${12 * viewScale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillText(n.label, sx + sr + 8 * viewScale, sy + 4 * viewScale);
      });

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(animRef.current); ro.disconnect(); };
  }, [projectId, excludeRectRef, themeColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const posOf = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const toWorld = (sx: number, sy: number) => ({
      x: (sx - offsetXRef.current) / scaleRef.current,
      y: (sy - offsetYRef.current) / scaleRef.current,
    });

    const hitTest = (sx: number, sy: number) => {
      const w = toWorld(sx, sy);
      const now = Date.now();
      for (const n of graphRef.current.nodes) {
        const fx = Math.sin(now * n.floatSpeed + n.floatPhase) * 0.6;
        const fy = Math.cos(now * n.floatSpeed * 0.7 + n.floatPhase) * 0.5;
        const rx = n.x + fx;
        const ry = n.y + fy;
        const dx = w.x - rx;
        const dy = w.y - ry;
        if (dx * dx + dy * dy < (n.radius + 8) ** 2) return n;
      }
      return null;
    };

    const onDown = (e: MouseEvent) => {
      const p = posOf(e);
      const hit = hitTest(p.x, p.y);
      if (hit) {
        draggedNodeRef.current = hit;
        dragMovedRef.current = false;

        // 点击节点进入子图谱或预览文档（短按+无位移时触发，拖拽时不触发）
        const clickTimer = setTimeout(() => {
          if (dragMovedRef.current) return; // 发生了拖拽，不触发点击
          if (levelRef.current === 'project' && (hit.type === 'property' || hit.type === 'leaf')) {
            // 进入任务子图谱
            const tid = hit.id.startsWith('chat-') ? hit.id.replace('chat-', '') : hit.id;
            setSelectedTaskId(tid);
            setSelectedTaskName(hit.label);
            setCurrentLevel('task');
          } else if (hit.type === 'source') {
            // 预览文档
            setDocPreview({
              name: hit.label,
              content: `文档：${hit.label}\n\n${hit.detail}\n\n${Object.entries(hit.meta || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n（此处为文档预览内容占位，实际应调用后端接口获取文档内容）`,
            });
          }
        }, 200);

        const clearTimer = () => clearTimeout(clickTimer);
        window.addEventListener('mouseup', clearTimer, { once: true });
      } else {
        // 空白处按下 → 画布平移
        isPanningRef.current = true;
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          offsetX: offsetXRef.current,
          offsetY: offsetYRef.current,
        };
      }
    };
    const onMove = (e: MouseEvent) => {
      const p = posOf(e);
      if (draggedNodeRef.current) {
        const w = toWorld(p.x, p.y);
        const dx = draggedNodeRef.current.x - w.x;
        const dy = draggedNodeRef.current.y - w.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMovedRef.current = true;
        draggedNodeRef.current.x = w.x;
        draggedNodeRef.current.y = w.y;
        // 同步更新 base 位置，避免弹回
        draggedNodeRef.current.baseX = w.x;
        draggedNodeRef.current.baseY = w.y;
      }
      if (isPanningRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        offsetXRef.current = panStartRef.current.offsetX + dx;
        offsetYRef.current = panStartRef.current.offsetY + dy;
      }
      const hit = hitTest(p.x, p.y);
      hoveredNodeRef.current = hit;
      canvas.style.cursor = draggedNodeRef.current ? 'grabbing' : isPanningRef.current ? 'grabbing' : hit ? 'pointer' : 'default';

      const tip = tooltipRef.current;
      if (tip) {
        if (hit) {
          const color = (themeNodeColors[themeColorRef.current] || themeNodeColors.emerald)[hit.type];
          const metaRows = hit.meta
            ? Object.entries(hit.meta).map(([k, v]) => `<div class="flex justify-between gap-4"><span class="text-text-muted">${k}</span><span class="text-text font-medium">${v}</span></div>`).join('')
            : '';
          tip.innerHTML = `<div class="flex items-center gap-2 mb-1.5"><span class="w-2 h-2 rounded-full" style="background:${color.stroke}"></span><span class="text-[11px] font-medium" style="color:${color.stroke}">${color.label}</span></div><div class="text-[13px] font-semibold text-text mb-0.5">${hit.label}</div><div class="text-[11px] text-text-secondary leading-relaxed mb-1.5">${hit.detail}</div>${metaRows ? `<div class="space-y-0.5 border-t border-border/40 pt-1.5 mt-1">${metaRows}</div>` : ''}`;
          tip.style.display = 'block';
          const rect = canvas.getBoundingClientRect();
          let tx = p.x + 16;
          let ty = p.y + 16;
          if (tx + 220 > rect.width) tx = p.x - 220;
          if (ty + 140 > rect.height) ty = p.y - 140;
          tip.style.left = tx + 'px';
          tip.style.top = ty + 'px';
        } else {
          tip.style.display = 'none';
        }
      }
    };
    const onUp = () => {
      draggedNodeRef.current = null;
      isPanningRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const oldScale = scaleRef.current;
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.max(0.3, Math.min(5, oldScale * zoomFactor));

      // 以鼠标位置为中心缩放
      scaleRef.current = newScale;
      offsetXRef.current = mx - (mx - offsetXRef.current) / oldScale * newScale;
      offsetYRef.current = my - (my - offsetYRef.current) / oldScale * newScale;
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('mouseup', onUp);
    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full bg-white relative">
      <canvas ref={canvasRef} className="w-full h-full block" />
      {/* 面包屑导航 */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <button
          onClick={() => {
            setCurrentLevel('project');
            setSelectedTaskId(null);
            setSelectedTaskName('');
          }}
          className={`text-[13px] font-medium text-text hover:text-text transition-colors ${
            currentLevel === 'project' ? 'text-text-secondary cursor-default' : ''
          }`}
          disabled={currentLevel === 'project'}
        >
          {displayName}
        </button>
        {currentLevel === 'task' && (
          <>
            <span className="text-text-muted text-xs">/</span>
            <span className="text-[13px] font-semibold text-text">{selectedTaskName}</span>
          </>
        )}
      </div>

      {/* 文档预览面板 */}
      {docPreview && (
        <div className="absolute bottom-4 right-4 z-30 w-[320px] max-h-[360px] bg-white/85 backdrop-blur-xl rounded-2xl border border-border/60 shadow-xl shadow-black/5 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
              <span className="text-[13px] font-semibold text-text truncate">{docPreview.name}</span>
            </div>
            <button
              onClick={() => setDocPreview(null)}
              className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors text-text-muted"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <p className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-line">{docPreview.content}</p>
          </div>
        </div>
      )}

      <div
        ref={tooltipRef}
        className="absolute hidden z-20 pointer-events-none bg-white/85 backdrop-blur-md rounded-xl border border-border/60 shadow-lg shadow-black/5 p-3 min-w-[180px] max-w-[240px]"
        style={{ transition: 'opacity 0.15s ease' }}
      />
    </div>
  );
}
