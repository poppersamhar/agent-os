import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  Focus,
  Maximize2,
  Minus,
  Network,
  Plus,
  Search,
  X,
} from 'lucide-react';
import {
  knowledgeGraphLinks,
  knowledgeGraphNodes,
  type KnowledgeGraphNodeData,
  type KnowledgeNodeType,
} from '../data/knowledgeGraphMock';

interface SimNode extends KnowledgeGraphNodeData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  fixed: boolean;
}

interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

const NODE_STYLE: Record<KnowledgeNodeType, { color: string; glow: string; label: string }> = {
  platform: { color: '#e7e9ee', glow: 'rgba(231,233,238,0.34)', label: '产品 / 平台' },
  agent: { color: '#8ab4ff', glow: 'rgba(77,134,255,0.42)', label: 'Agent' },
  project: { color: '#77d6b2', glow: 'rgba(61,207,155,0.42)', label: '项目' },
  document: { color: '#f1bd72', glow: 'rgba(239,167,70,0.42)', label: '文档 / 成果' },
  person: { color: '#f189a0', glow: 'rgba(235,93,126,0.42)', label: '成员' },
  skill: { color: '#b69cff', glow: 'rgba(143,105,255,0.42)', label: 'Skill' },
  trace: { color: '#69d5ea', glow: 'rgba(50,194,224,0.42)', label: 'Trace / 数据集' },
  decision: { color: '#f2df75', glow: 'rgba(230,200,59,0.42)', label: '决策 / 规则' },
};

const CLUSTER_ANCHORS: Record<string, [number, number]> = {
  core: [0, 0],
  agentos: [260, -120],
  risk: [-260, 150],
  brand: [-330, -170],
  data: [120, 250],
  skill: [380, 90],
  trace: [260, 280],
};

function createNodes(): SimNode[] {
  const counters = new Map<string, number>();
  return knowledgeGraphNodes.map((node, index) => {
    const order = counters.get(node.cluster) ?? 0;
    counters.set(node.cluster, order + 1);
    const [anchorX, anchorY] = CLUSTER_ANCHORS[node.cluster] ?? [0, 0];
    const angle = order * 2.22 + index * 0.31;
    const spread = node.cluster === 'core' ? 68 + order * 25 : 50 + (order % 4) * 34;
    return {
      ...node,
      x: anchorX + Math.cos(angle) * spread,
      y: anchorY + Math.sin(angle) * spread,
      vx: 0,
      vy: 0,
      radius: Math.max(5.5, Math.min(14, (node.weight ?? 8) * 0.58)),
      fixed: false,
    };
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export default function KnowledgeGraphDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<SimNode[]>(createNodes());
  const viewportRef = useRef<ViewportState>({ x: 0, y: 0, scale: 1 });
  const pointerRef = useRef({
    down: false,
    moved: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    dragged: null as SimNode | null,
  });
  const hoveredRef = useRef<SimNode | null>(null);
  const selectedRef = useRef<SimNode | null>(null);
  const queryRef = useRef('');
  const focusModeRef = useRef(false);
  const [selected, setSelected] = useState<SimNode | null>(null);
  const [query, setQuery] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [visibleCount, setVisibleCount] = useState(knowledgeGraphNodes.length);

  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    knowledgeGraphLinks.forEach(link => {
      if (!map.has(link.source)) map.set(link.source, new Set());
      if (!map.has(link.target)) map.set(link.target, new Set());
      map.get(link.source)!.add(link.target);
      map.get(link.target)!.add(link.source);
    });
    return map;
  }, []);

  const resetView = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    viewportRef.current = { x: container.clientWidth / 2, y: container.clientHeight / 2, scale: Math.min(1.05, container.clientWidth / 1180) };
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const container = containerRef.current;
    if (!container) return;
    const viewport = viewportRef.current;
    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;
    const nextScale = Math.max(0.42, Math.min(2.7, viewport.scale * factor));
    const worldX = (cx - viewport.x) / viewport.scale;
    const worldY = (cy - viewport.y) / viewport.scale;
    viewportRef.current = {
      x: cx - worldX * nextScale,
      y: cy - worldY * nextScale,
      scale: nextScale,
    };
  }, []);

  const focusNode = useCallback((node: SimNode) => {
    const container = containerRef.current;
    if (!container) return;
    const scale = Math.max(1.12, viewportRef.current.scale);
    viewportRef.current = {
      x: container.clientWidth / 2 - node.x * scale,
      y: container.clientHeight / 2 - node.y * scale,
      scale,
    };
    selectedRef.current = node;
    setSelected({ ...node });
  }, []);

  const handleCanvasKeyDown = useCallback((event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const nodes = nodesRef.current;
    const currentId = selectedRef.current?.id;
    const currentIndex = nodes.findIndex(node => node.id === currentId);

    if (event.key === 'Escape') {
      selectedRef.current = null;
      setSelected(null);
      setFocusMode(false);
      return;
    }

    if (event.key === 'Enter' && selectedRef.current) {
      event.preventDefault();
      focusNode(selectedRef.current);
      setFocusMode(true);
      return;
    }

    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (Math.max(currentIndex, 0) + direction + nodes.length) % nodes.length;
    const nextNode = nodes[nextIndex];
    selectedRef.current = nextNode;
    setSelected({ ...nextNode });
  }, [focusNode]);

  useEffect(() => {
    queryRef.current = query.trim().toLowerCase();
    if (!queryRef.current) {
      setVisibleCount(knowledgeGraphNodes.length);
      return;
    }
    const count = knowledgeGraphNodes.filter(node =>
      `${node.label} ${node.description} ${node.meta}`.toLowerCase().includes(queryRef.current)
    ).length;
    setVisibleCount(count);
  }, [query]);

  useEffect(() => {
    focusModeRef.current = focusMode;
  }, [focusMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let lastTime = performance.now();

    const resize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (viewportRef.current.x === 0 && viewportRef.current.y === 0) resetView();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const worldToScreen = (x: number, y: number) => ({
      x: x * viewportRef.current.scale + viewportRef.current.x,
      y: y * viewportRef.current.scale + viewportRef.current.y,
    });

    const screenToWorld = (x: number, y: number) => ({
      x: (x - viewportRef.current.x) / viewportRef.current.scale,
      y: (y - viewportRef.current.y) / viewportRef.current.scale,
    });

    const nodeAt = (screenX: number, screenY: number) => {
      const point = screenToWorld(screenX, screenY);
      const nodes = nodesRef.current;
      for (let index = nodes.length - 1; index >= 0; index -= 1) {
        const node = nodes[index];
        if (Math.hypot(point.x - node.x, point.y - node.y) <= node.radius + 7 / viewportRef.current.scale) return node;
      }
      return null;
    };

    const simulate = (dt: number) => {
      const nodes = nodesRef.current;
      const byId = new Map(nodes.map(node => [node.id, node]));
      const step = Math.min(1.6, dt / 16.67);

      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        if (a.fixed) continue;
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          const distanceSq = Math.max(60, dx * dx + dy * dy);
          const distance = Math.sqrt(distanceSq);
          const force = 780 / distanceSq;
          dx /= distance;
          dy /= distance;
          a.vx -= dx * force * step;
          a.vy -= dy * force * step;
          if (!b.fixed) {
            b.vx += dx * force * step;
            b.vy += dy * force * step;
          }
        }
      }

      knowledgeGraphLinks.forEach(link => {
        const source = byId.get(link.source);
        const target = byId.get(link.target);
        if (!source || !target) return;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const desired = source.cluster === target.cluster ? 90 : 128;
        const force = (distance - desired) * 0.00155 * step;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        if (!source.fixed) {
          source.vx += fx;
          source.vy += fy;
        }
        if (!target.fixed) {
          target.vx -= fx;
          target.vy -= fy;
        }
      });

      nodes.forEach(node => {
        if (node.fixed) return;
        const [anchorX, anchorY] = CLUSTER_ANCHORS[node.cluster] ?? [0, 0];
        node.vx += (anchorX - node.x) * 0.00032 * step;
        node.vy += (anchorY - node.y) * 0.00032 * step;
        node.vx *= Math.pow(0.91, step);
        node.vy *= Math.pow(0.91, step);
        node.x += node.vx * step;
        node.y += node.vy * step;
      });
    };

    const draw = (time: number) => {
      const dt = Math.min(34, time - lastTime);
      lastTime = time;
      simulate(dt);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const background = ctx.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, '#0b0d12');
      background.addColorStop(0.55, '#10131a');
      background.addColorStop(1, '#090b10');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      const viewport = viewportRef.current;
      const gridGap = 32 * viewport.scale;
      if (gridGap > 12) {
        const offsetX = ((viewport.x % gridGap) + gridGap) % gridGap;
        const offsetY = ((viewport.y % gridGap) + gridGap) % gridGap;
        ctx.fillStyle = 'rgba(255,255,255,0.035)';
        for (let x = offsetX; x < width; x += gridGap) {
          for (let y = offsetY; y < height; y += gridGap) {
            ctx.beginPath();
            ctx.arc(x, y, 0.7, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      const nodes = nodesRef.current;
      const byId = new Map(nodes.map(node => [node.id, node]));
      const active = hoveredRef.current ?? selectedRef.current;
      const related = active ? new Set([active.id, ...(adjacency.get(active.id) ?? [])]) : new Set<string>();
      const queryValue = queryRef.current;
      const matches = new Set(
        queryValue
          ? nodes.filter(node => `${node.label} ${node.description} ${node.meta}`.toLowerCase().includes(queryValue)).map(node => node.id)
          : nodes.map(node => node.id)
      );

      knowledgeGraphLinks.forEach(link => {
        const source = byId.get(link.source);
        const target = byId.get(link.target);
        if (!source || !target) return;
        const a = worldToScreen(source.x, source.y);
        const b = worldToScreen(target.x, target.y);
        const isActive = Boolean(active && (link.source === active.id || link.target === active.id));
        const isDimmed = focusModeRef.current && active && !isActive;
        ctx.globalAlpha = isDimmed ? 0.035 : isActive ? 0.82 : 0.18;
        ctx.strokeStyle = isActive ? '#b9c7df' : '#8390a5';
        ctx.lineWidth = isActive ? 1.45 : 0.7;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const bend = Math.min(14, Math.hypot(b.x - a.x, b.y - a.y) * 0.05);
        ctx.quadraticCurveTo(midX - (b.y - a.y) / Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)) * bend, midY + (b.x - a.x) / Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)) * bend, b.x, b.y);
        ctx.stroke();

        if (isActive && viewport.scale > 0.75) {
          ctx.globalAlpha = 0.75;
          ctx.font = '500 10px "IBM Plex Mono", monospace';
          const labelWidth = ctx.measureText(link.relation).width + 10;
          roundRect(ctx, midX - labelWidth / 2, midY - 9, labelWidth, 18, 5);
          ctx.fillStyle = 'rgba(11,13,18,0.86)';
          ctx.fill();
          ctx.fillStyle = '#aeb7c5';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(link.relation, midX, midY);
        }
      });

      nodes.forEach(node => {
        const position = worldToScreen(node.x, node.y);
        const style = NODE_STYLE[node.type];
        const isActive = active?.id === node.id;
        const isRelated = related.has(node.id);
        const isMatch = matches.has(node.id);
        const dimmedByFocus = Boolean(focusModeRef.current && active && !isRelated);
        const dimmedBySearch = Boolean(queryValue && !isMatch);
        const opacity = dimmedByFocus ? 0.08 : dimmedBySearch ? 0.12 : active && !isRelated ? 0.28 : 1;
        const radius = node.radius * viewport.scale * (isActive ? 1.22 : 1);
        if (position.x < -80 || position.x > width + 80 || position.y < -80 || position.y > height + 80) return;

        ctx.globalAlpha = opacity;
        const halo = ctx.createRadialGradient(position.x, position.y, radius * 0.2, position.x, position.y, radius * 3.1);
        halo.addColorStop(0, isActive ? style.glow : style.glow.replace(/0\.4\d/, '0.24'));
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(position.x, position.y, radius * 3.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = style.glow;
        ctx.shadowBlur = isActive ? 18 : 9;
        ctx.fillStyle = style.color;
        ctx.beginPath();
        ctx.arc(position.x, position.y, Math.max(3.8, radius), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (isActive || node.type === 'platform') {
          ctx.lineWidth = isActive ? 2 : 1;
          ctx.strokeStyle = isActive ? '#ffffff' : 'rgba(255,255,255,0.6)';
          ctx.stroke();
        }

        const showLabel = viewport.scale > 0.68 && (isActive || isRelated || node.radius >= 6.8 || Boolean(queryValue && isMatch));
        if (showLabel) {
          ctx.globalAlpha = opacity;
          ctx.font = `${isActive ? 600 : 500} ${Math.max(10, Math.min(13, 11.5 * viewport.scale))}px "Noto Sans SC", sans-serif`;
          ctx.fillStyle = isActive ? '#ffffff' : '#d8dde6';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(node.label, position.x + radius + 7, position.y);
        }
      });

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    const pointerPosition = (event: PointerEvent | WheelEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const onPointerDown = (event: PointerEvent) => {
      canvas.setPointerCapture(event.pointerId);
      const point = pointerPosition(event);
      const node = nodeAt(point.x, point.y);
      pointerRef.current = { down: true, moved: false, startX: point.x, startY: point.y, lastX: point.x, lastY: point.y, dragged: node };
      if (node) node.fixed = true;
      canvas.style.cursor = node ? 'grabbing' : 'move';
    };

    const onPointerMove = (event: PointerEvent) => {
      const point = pointerPosition(event);
      const pointer = pointerRef.current;
      if (pointer.down) {
        const dx = point.x - pointer.lastX;
        const dy = point.y - pointer.lastY;
        if (Math.hypot(point.x - pointer.startX, point.y - pointer.startY) > 3) pointer.moved = true;
        if (pointer.dragged) {
          const world = screenToWorld(point.x, point.y);
          pointer.dragged.x = world.x;
          pointer.dragged.y = world.y;
          pointer.dragged.vx = 0;
          pointer.dragged.vy = 0;
        } else {
          viewportRef.current.x += dx;
          viewportRef.current.y += dy;
        }
        pointer.lastX = point.x;
        pointer.lastY = point.y;
        return;
      }
      const hovered = nodeAt(point.x, point.y);
      hoveredRef.current = hovered;
      canvas.style.cursor = hovered ? 'pointer' : 'grab';
    };

    const onPointerUp = (event: PointerEvent) => {
      const pointer = pointerRef.current;
      if (pointer.dragged) {
        pointer.dragged.fixed = false;
        if (!pointer.moved) {
          selectedRef.current = pointer.dragged;
          setSelected({ ...pointer.dragged });
        }
      } else if (!pointer.moved) {
        selectedRef.current = null;
        setSelected(null);
      }
      pointer.down = false;
      pointer.dragged = null;
      canvas.releasePointerCapture(event.pointerId);
      canvas.style.cursor = hoveredRef.current ? 'pointer' : 'grab';
    };

    const onDoubleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const node = nodeAt(event.clientX - rect.left, event.clientY - rect.top);
      if (node) {
        focusNode(node);
        setFocusMode(true);
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const point = pointerPosition(event);
      const viewport = viewportRef.current;
      const world = screenToWorld(point.x, point.y);
      const factor = Math.exp(-event.deltaY * 0.0011);
      const nextScale = Math.max(0.42, Math.min(2.7, viewport.scale * factor));
      viewportRef.current = {
        x: point.x - world.x * nextScale,
        y: point.y - world.y * nextScale,
        scale: nextScale,
      };
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('dblclick', onDoubleClick);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('dblclick', onDoubleClick);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [adjacency, focusNode, resetView]);

  return (
    <div ref={containerRef} className="relative h-screen w-screen overflow-hidden bg-[#0b0d12] text-white">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        onKeyDown={handleCanvasKeyDown}
        className="block h-full w-full touch-none focus:outline-none"
        aria-label="企业知识图谱交互画布。方向键切换节点，回车聚焦，Escape 退出聚焦。"
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-6 p-5 md:p-7">
        <div className="pointer-events-auto min-w-0">
          <div className="flex items-center gap-2.5">
            <Network className="h-4 w-4 text-white/70" strokeWidth={1.7} />
            <h1 className="text-[15px] font-semibold text-white">企业知识图谱</h1>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-white/38">
            <span>{knowledgeGraphNodes.length} 个节点</span>
            <span>·</span>
            <span>{knowledgeGraphLinks.length} 条关系</span>
            <span>·</span>
            <span>Mock 数据</span>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <label className="flex h-9 w-[240px] items-center gap-2 rounded-lg border border-white/10 bg-black/24 px-3 backdrop-blur-xl transition focus-within:border-white/22">
            <Search className="h-3.5 w-3.5 shrink-0 text-white/36" strokeWidth={1.7} />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              aria-label="搜索知识图谱节点"
              placeholder="搜索节点"
              className="min-w-0 flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-white/28"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-white/35 transition hover:text-white" aria-label="清除搜索">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>

          <div className="flex h-9 items-center rounded-lg border border-white/10 bg-black/24 p-1 backdrop-blur-xl">
            <button type="button" onClick={() => zoomBy(1.18)} className="flex h-7 w-7 items-center justify-center rounded-md text-white/55 transition hover:bg-white/8 hover:text-white" title="放大" aria-label="放大图谱">
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => zoomBy(0.84)} className="flex h-7 w-7 items-center justify-center rounded-md text-white/55 transition hover:bg-white/8 hover:text-white" title="缩小" aria-label="缩小图谱">
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={resetView} className="flex h-7 w-7 items-center justify-center rounded-md text-white/55 transition hover:bg-white/8 hover:text-white" title="适应画布" aria-label="适应画布">
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {query && (
        <div className="absolute left-1/2 top-[78px] z-10 -translate-x-1/2 rounded-full border border-white/10 bg-black/34 px-3 py-1.5 text-[11px] text-white/55 backdrop-blur-xl">
          匹配 {visibleCount} 个节点
        </div>
      )}

      <div className="pointer-events-none absolute bottom-5 left-5 z-10 md:bottom-7 md:left-7">
        <div className="pointer-events-auto flex max-w-[680px] flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-white/8 bg-black/22 px-3 py-2 backdrop-blur-xl">
          {Object.entries(NODE_STYLE).map(([type, style]) => (
            <div key={type} className="flex items-center gap-1.5 text-[10px] text-white/44">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: style.color, boxShadow: `0 0 8px ${style.color}` }} />
              <span>{style.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-5 right-5 top-[86px] z-10 flex items-end md:bottom-7 md:right-7">
        {selected ? (
          <aside className="pointer-events-auto w-[294px] rounded-lg border border-white/10 bg-[#11141b]/88 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] text-white/40">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: NODE_STYLE[selected.type].color, boxShadow: `0 0 8px ${NODE_STYLE[selected.type].color}` }} />
                  {NODE_STYLE[selected.type].label}
                </div>
                <h2 className="mt-2 text-[15px] font-semibold leading-snug text-white">{selected.label}</h2>
              </div>
              <button type="button" onClick={() => { selectedRef.current = null; setSelected(null); }} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/32 transition hover:bg-white/8 hover:text-white" aria-label="关闭节点详情">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-3 text-[12px] leading-6 text-white/58">{selected.description}</p>
            <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3 text-[10px] text-white/34">
              <span>{selected.meta}</span>
              <span>{adjacency.get(selected.id)?.size ?? 0} 个关联</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => focusNode(selected)} className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-white/9 bg-white/5 text-[11px] text-white/62 transition hover:bg-white/9 hover:text-white">
                <Focus className="h-3.5 w-3.5" />
                居中节点
              </button>
              <button type="button" onClick={() => setFocusMode(value => !value)} className={`flex h-8 items-center justify-center gap-1.5 rounded-md border text-[11px] transition ${focusMode ? 'border-[#8ab4ff]/45 bg-[#8ab4ff]/12 text-[#c9dcff]' : 'border-white/9 bg-white/5 text-white/62 hover:bg-white/9 hover:text-white'}`}>
                <Network className="h-3.5 w-3.5" />
                {focusMode ? '显示全部' : '只看关联'}
              </button>
            </div>
          </aside>
        ) : (
          <div className="rounded-lg border border-white/8 bg-black/22 px-3 py-2 text-[10px] text-white/34 backdrop-blur-xl">
            点击节点查看关系
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-[68px] left-1/2 z-10 -translate-x-1/2 text-[10px] text-white/24">
        拖拽画布 · 滚轮缩放 · 双击节点聚焦
      </div>
    </div>
  );
}
