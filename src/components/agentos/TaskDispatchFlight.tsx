import { useId, useLayoutEffect, useRef, type RefObject } from 'react';

export interface DispatchPoint {
  x: number;
  y: number;
}

interface Props {
  id: number;
  origin: DispatchPoint;
  taskRef: RefObject<HTMLButtonElement | null>;
  onFinish: (id: number, arrived: boolean) => void;
}

const DURATION = 620;

function easedProgress(progress: number) {
  return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
}

function curvePoint(start: DispatchPoint, end: DispatchPoint, rise: number, progress: number): DispatchPoint {
  const remaining = 1 - progress;
  const distanceX = end.x - start.x;
  return {
    x: remaining ** 3 * start.x + 3 * remaining ** 2 * progress * (start.x + distanceX * 0.32)
      + 3 * remaining * progress ** 2 * (start.x + distanceX * 0.76) + progress ** 3 * end.x,
    y: remaining ** 3 * start.y + 3 * remaining ** 2 * progress * (start.y - rise)
      + 3 * remaining * progress ** 2 * (end.y - rise) + progress ** 3 * end.y,
  };
}

export default function TaskDispatchFlight({ id, origin, taskRef, onFinish }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const orbRef = useRef<SVGGElement>(null);
  const tailRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const gradientRef = useRef<SVGLinearGradientElement>(null);
  const gradientId = `dispatch-tail-${useId().replace(/:/g, '')}`;

  useLayoutEffect(() => {
    let frame = 0;
    let stopped = false;
    const finish = (arrived: boolean) => {
      if (stopped) return;
      stopped = true;
      onFinish(id, arrived);
    };

    // Wait until the same submission's layout has committed: the first task
    // creates its own destination, while the origin belongs to the old layout.
    frame = requestAnimationFrame(() => {
      try {
        const target = taskRef.current;
        if (!target?.isConnected || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          finish(false);
          return;
        }
        const buttonRect = target.getBoundingClientRect();
        if (!buttonRect.width || !buttonRect.height) {
          finish(false);
          return;
        }
        const count = target.querySelector<HTMLElement>('.aos-task-count');
        const countRect = count?.getBoundingClientRect();
        const destinationRect = countRect?.width && countRect.height ? countRect : buttonRect;
        const destination = {
          x: destinationRect.left + destinationRect.width / 2,
          y: destinationRect.top + destinationRect.height / 2,
        };
        const targetCenter = { x: buttonRect.left + buttonRect.width / 2, y: buttonRect.top + buttonRect.height / 2 };
        const rise = Math.min(150, Math.max(42, Math.hypot(destination.x - origin.x, destination.y - origin.y) * 0.23));
        const startedAt = performance.now();

        const tick = (now: number) => {
          if (stopped) return;
          try {
            const currentRect = target.getBoundingClientRect();
            if (taskRef.current !== target || !target.isConnected || !currentRect.width || !currentRect.height
              || Math.hypot(currentRect.left + currentRect.width / 2 - targetCenter.x,
                currentRect.top + currentRect.height / 2 - targetCenter.y) > 8) {
              finish(false);
              return;
            }

            const elapsed = Math.min(1, Math.max(0, (now - startedAt) / DURATION));
            const progress = easedProgress(elapsed);
            const tailProgress = easedProgress(Math.max(0, elapsed - 0.105));
            const head = curvePoint(origin, destination, rise, progress);
            const tail = curvePoint(origin, destination, rise, tailProgress);
            const points = Array.from({ length: 13 }, (_, index) => {
              const point = curvePoint(origin, destination, rise, tailProgress + (progress - tailProgress) * index / 12);
              return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`;
            }).join(' ');

            tailRef.current?.setAttribute('d', points);
            glowRef.current?.setAttribute('d', points);
            gradientRef.current?.setAttribute('x1', String(tail.x));
            gradientRef.current?.setAttribute('y1', String(tail.y));
            gradientRef.current?.setAttribute('x2', String(head.x));
            gradientRef.current?.setAttribute('y2', String(head.y));
            orbRef.current?.setAttribute('transform', `translate(${head.x} ${head.y})`);
            svgRef.current?.setAttribute('opacity', String(Math.min(1, elapsed / 0.065)));

            if (elapsed === 1) finish(true);
            else frame = requestAnimationFrame(tick);
          } catch {
            finish(false);
          }
        };

        frame = requestAnimationFrame(tick);
      } catch {
        finish(false);
      }
    });

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
  }, [id, origin, taskRef, onFinish]);

  return (
    <svg ref={svgRef} className="aos-dispatch-flight" opacity="0" aria-hidden="true">
      <defs>
        <linearGradient ref={gradientRef} id={gradientId} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#b7c19c" stopOpacity="0" />
          <stop offset="0.5" stopColor="#a6b383" stopOpacity="0.48" />
          <stop offset="1" stopColor="#727e56" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <path ref={glowRef} className="aos-dispatch-tail-glow" stroke={`url(#${gradientId})`} />
      <path ref={tailRef} className="aos-dispatch-tail" stroke={`url(#${gradientId})`} />
      <g ref={orbRef} className="aos-dispatch-orb">
        <circle r="7" fill="#acb98a" opacity="0.12" />
        <circle r="4.2" fill="#a2af80" opacity="0.24" />
        <circle r="2.8" fill="#626e49" />
        <circle cx="-0.65" cy="-0.7" r="1.05" fill="#edf0df" opacity="0.92" />
      </g>
    </svg>
  );
}
