import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

const STORAGE_KEY = 'agentos-chat-split-v1';
const DESKTOP = '(width > 820px)';
const GAP = 8;
const SNAP_WIDTH = 48;
const SETTLE_MS = 160;

type Preferences = { open: boolean; ratio: number | null };
type Drag = { pointerId: number; target: HTMLDivElement; startX: number; startWidth: number; available: number; width: number; moved: boolean };

function initialPreferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved && typeof saved.open === 'boolean') {
      return { open: saved.open, ratio: typeof saved.ratio === 'number' && Number.isFinite(saved.ratio) && saved.ratio > 0 ? Math.min(.5, saved.ratio) : null };
    }
  } catch { /* Storage may be unavailable; keep the in-memory layout. */ }
  return { open: true, ratio: null };
}

/** Pointer movement updates only the grid, not the conversation or dashboard tree. */
export function useChatSplit(active = true) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const preferencesRef = useRef(preferences);
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP).matches);
  const [mobileOpen, setMobileOpen] = useState(true);
  const [resizing, setResizing] = useState(false);
  const [settling, setSettling] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const separatorRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const settleRef = useRef(0);

  const applyWidth = useCallback((value: Preferences) => {
    const panel = panelRef.current;
    if (!panel) return;
    if (value.ratio === null) panel.style.removeProperty('--bos-chat-width');
    else panel.style.setProperty('--bos-chat-width', `calc((100% - ${GAP}px) * ${value.ratio})`);
  }, []);

  useLayoutEffect(() => { if (active) applyWidth(preferences); }, [active, preferences, applyWidth]);
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const pane = paneRef.current;
    if (!active || !panel || !pane) return;
    const updateValue = () => {
      const available = Math.max(1, panel.getBoundingClientRect().width - GAP);
      separatorRef.current?.setAttribute('aria-valuenow', String(Math.min(50, Math.round(pane.getBoundingClientRect().width / available * 100))));
    };
    const observer = new ResizeObserver(updateValue);
    observer.observe(panel);
    observer.observe(pane);
    updateValue();
    return () => observer.disconnect();
  }, [active]);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch { /* Session state still works. */ }
  }, [preferences]);

  const save = useCallback((value: Preferences) => {
    preferencesRef.current = value;
    setPreferences(value);
  }, []);

  const settle = useCallback(() => {
    window.clearTimeout(settleRef.current);
    setSettling(true);
    settleRef.current = window.setTimeout(() => setSettling(false), SETTLE_MS);
  }, []);

  const finishDrag = useCallback((cancelled = false) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    document.documentElement.classList.remove('bos-resizing-chat');
    if (drag.target.hasPointerCapture(drag.pointerId)) drag.target.releasePointerCapture(drag.pointerId);
    setResizing(false);

    const previous = preferencesRef.current;
    if (cancelled || !drag.moved) {
      applyWidth(previous);
      return;
    }
    // Flush the last pointer position before a possible short snap to zero.
    panelRef.current?.style.setProperty('--bos-chat-width', `${drag.width}px`);
    const available = Math.max(1, (panelRef.current?.getBoundingClientRect().width ?? drag.available + GAP) - GAP);
    const width = Math.min(drag.width, available / 2);
    if (width < SNAP_WIDTH) {
      settle();
      save({ ...previous, open: false });
    } else {
      save({ open: true, ratio: width / available });
    }
  }, [applyWidth, save, settle]);

  useEffect(() => {
    const cancel = () => finishDrag(true);
    const media = window.matchMedia(DESKTOP);
    const onLayoutChange = () => {
      if (!media.matches) cancel();
      setDesktop(media.matches);
    };
    window.addEventListener('blur', cancel);
    media.addEventListener('change', onLayoutChange);
    return () => {
      window.removeEventListener('blur', cancel);
      media.removeEventListener('change', onLayoutChange);
      window.clearTimeout(settleRef.current);
      const drag = dragRef.current;
      dragRef.current = null;
      if (drag?.target.hasPointerCapture(drag.pointerId)) drag.target.releasePointerCapture(drag.pointerId);
      document.documentElement.classList.remove('bos-resizing-chat');
    };
  }, [finishDrag]);

  const setChatOpen = useCallback((open: boolean) => {
    // A desktop collapse must not put away the independently stacked mobile chat.
    if (!desktop) { setMobileOpen(open); return; }
    finishDrag(true);
    if (preferencesRef.current.open === open) return;
    settle();
    save({ ...preferencesRef.current, open });
  }, [desktop, finishDrag, save, settle]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !event.isPrimary || dragRef.current || !window.matchMedia(DESKTOP).matches) return;
    const panel = panelRef.current;
    const pane = paneRef.current;
    if (!panel || !pane) return;
    event.preventDefault();
    window.clearTimeout(settleRef.current);
    setSettling(false);
    const width = pane.getBoundingClientRect().width;
    const available = panel.getBoundingClientRect().width - GAP;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, target: event.currentTarget, startX: event.clientX, startWidth: width, available, width, moved: false };
    panel.style.setProperty('--bos-chat-width', `${width}px`);
    document.documentElement.classList.add('bos-resizing-chat');
    window.getSelection()?.removeAllRanges();
    setResizing(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const delta = event.clientX - drag.startX;
    drag.moved ||= Math.abs(delta) > 1;
    drag.width = Math.max(0, Math.min(drag.available / 2, drag.startWidth + delta));
    // No React render, layout read, or transition on the pointer-move path.
    panelRef.current?.style.setProperty('--bos-chat-width', `${drag.width}px`);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== dragRef.current?.pointerId) return;
    onPointerMove(event);
    finishDrag();
  };

  const onPointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerId === dragRef.current?.pointerId) finishDrag(true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'].includes(event.key) || !window.matchMedia(DESKTOP).matches) return;
    event.preventDefault();
    if (event.key === 'Enter') { setChatOpen(!preferencesRef.current.open); return; }
    const available = (panelRef.current?.getBoundingClientRect().width ?? GAP) - GAP;
    if (available <= 0) return;
    const width = paneRef.current?.getBoundingClientRect().width ?? 0;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? available / 2 : Math.max(0, Math.min(available / 2, width + (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 64 : 24)));
    if (next === 0 || (event.key === 'ArrowLeft' && next < SNAP_WIDTH)) setChatOpen(false);
    else save({ open: true, ratio: Math.max(SNAP_WIDTH, next) / available });
  };

  return { panelRef, paneRef, separatorRef, chatOpen: desktop ? preferences.open : mobileOpen, resizing, settling, setChatOpen,
    separatorProps: {
      onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture: onPointerCancel, onKeyDown,
    },
  };
}
