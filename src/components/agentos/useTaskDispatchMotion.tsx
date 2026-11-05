import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import TaskDispatchFlight, { type DispatchPoint } from './TaskDispatchFlight';
import './TaskDispatchMotion.css';

interface Options {
  composerRef: RefObject<HTMLTextAreaElement | null>;
  taskRef: RefObject<HTMLButtonElement | null>;
}

interface Flight {
  id: number;
  origin: DispatchPoint;
  incrementsTaskCount: boolean;
}

export default function useTaskDispatchMotion({ composerRef, taskRef }: Options) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [receiving, setReceiving] = useState(false);
  const nextId = useRef(0);
  const receiveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const receiveAnimations = useRef<Animation[]>([]);

  const stopReceiving = useCallback(() => {
    clearTimeout(receiveTimer.current);
    receiveTimer.current = undefined;
    receiveAnimations.current.forEach(animation => animation.cancel());
    receiveAnimations.current = [];
  }, []);

  const finish = useCallback((id: number, arrived: boolean) => {
    setFlights(current => current.filter(flight => flight.id !== id));
    if (!arrived || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const target = taskRef.current;
    if (!target?.isConnected) return;
    stopReceiving();
    setReceiving(true);
    receiveTimer.current = setTimeout(() => setReceiving(false), 360);

    // Restart each arrival independently, including overlapping submissions.
    // These effects only decorate the button; dispatching never awaits them.
    try {
      receiveAnimations.current.push(target.animate([
        { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(139, 155, 99, 0)' },
        { transform: 'scale(1.065)', boxShadow: '0 0 0 4px rgba(139, 155, 99, 0.13)', offset: 0.32 },
        { transform: 'scale(0.985)', boxShadow: '0 0 0 2px rgba(139, 155, 99, 0.04)', offset: 0.65 },
        { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(139, 155, 99, 0)' },
      ], { duration: 360, easing: 'cubic-bezier(.2,.7,.3,1)' }));
      const count = target.querySelector<HTMLElement>('.aos-task-count');
      if (count) receiveAnimations.current.push(count.animate([
        { transform: 'translateY(1px) scale(.8)', opacity: 0.65 },
        { transform: 'translateY(-1px) scale(1.2)', opacity: 1, offset: 0.46 },
        { transform: 'translateY(0) scale(1)', opacity: 1 },
      ], { duration: 300, easing: 'cubic-bezier(.2,.7,.3,1)' }));
    } catch {
      // Older browsers can still update the count without decorative motion.
    }
  }, [taskRef, stopReceiving]);

  const launch = useCallback((incrementsTaskCount: boolean) => {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const composer = composerRef.current;
      if (!composer?.isConnected) return;
      const rect = composer.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const style = window.getComputedStyle(composer);
      const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.6 || 22;
      const origin = {
        x: rect.left + (Number.parseFloat(style.paddingLeft) || 0) + 12,
        y: rect.top + (Number.parseFloat(style.paddingTop) || 0) + Math.min(rect.height / 2, lineHeight / 2),
      };
      const id = ++nextId.current;
      setFlights(current => [...current, { id, origin, incrementsTaskCount }]);
    } catch {
      // A presentation failure must never interrupt accepting the user's work.
    }
  }, [composerRef]);

  useEffect(() => {
    const cancelFlights = () => {
      setFlights([]);
      setReceiving(false);
      stopReceiving();
    };
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionPreference = () => { if (motionPreference.matches) cancelFlights(); };
    const onVisibilityChange = () => { if (document.hidden) cancelFlights(); };

    window.addEventListener('resize', cancelFlights);
    // Inner conversation/carousel scrolling does not move these fixed endpoints.
    window.addEventListener('scroll', cancelFlights, { passive: true });
    window.visualViewport?.addEventListener('resize', cancelFlights);
    window.visualViewport?.addEventListener('scroll', cancelFlights);
    motionPreference.addEventListener('change', onMotionPreference);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('resize', cancelFlights);
      window.removeEventListener('scroll', cancelFlights);
      window.visualViewport?.removeEventListener('resize', cancelFlights);
      window.visualViewport?.removeEventListener('scroll', cancelFlights);
      motionPreference.removeEventListener('change', onMotionPreference);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      stopReceiving();
    };
  }, [stopReceiving]);

  const overlay = flights.length && typeof document !== 'undefined'
    ? createPortal(<div className="aos-dispatch-overlay" aria-hidden="true">
      {flights.map(flight => <TaskDispatchFlight key={flight.id} id={flight.id} origin={flight.origin}
        taskRef={taskRef} onFinish={finish} />)}
    </div>, document.body)
    : null;

  return {
    launch,
    pendingTaskCount: flights.filter(flight => flight.incrementsTaskCount).length,
    overlay,
    receiving,
  };
}
