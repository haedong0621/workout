// 꾹 눌러서(약 0.4초) 카드를 들어 올린 뒤 끌어서 순서를 바꾸는 기능.
//
//   const sort = useSortable({ onMove: (from, to) => ... });
//   <div ref={sort.containerRef}>{items.map((it, i) => <Card {...sort.bind(i)} />)}</div>
//
// - 누른 채로 바로 움직이면 스크롤로 보고 취소(일반 스크롤 방해 안 함)
// - 들어 올린 뒤에는 화면 스크롤을 막고, 위·아래 끝 근처에선 자동 스크롤
// - 놓은 직후의 클릭(세트 칸 열기 등)은 무시
// - 아이폰 터치는 touch 이벤트, 컴퓨터 마우스는 pointer 이벤트로 처리
import type { RefObject } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { edgeScrollSpeed, sortLayout, type Box } from './sortMath';

export const LONG_PRESS_MS = 400;
const MOVE_TOLERANCE = 8;

interface Session {
  /** data-sort-index 값(목록에서의 번호) */
  from: number;
  /** 화면에 그려진 순서에서의 위치 */
  fromPos: number;
  /** 화면 위치 → data-sort-index */
  indexes: number[];
  startX: number;
  startY: number;
  y: number;
  timer: ReturnType<typeof setTimeout> | null;
  active: boolean;
  els: HTMLElement[];
  boxes: Box[];
  scroller: HTMLElement | null;
  scrollStart: number;
  raf: number;
  to: number;
  cleanup: () => void;
}

function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let n = el?.parentElement; n; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight) return n;
  }
  return null;
}

function swallowNextClick(): void {
  const stop = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
  document.addEventListener('click', stop, { capture: true, once: true });
  setTimeout(() => document.removeEventListener('click', stop, { capture: true }), 400);
}

export interface SortableBind {
  'data-sort-index': number;
  onTouchStart: (e: TouchEvent) => void;
  onPointerDown: (e: PointerEvent) => void;
}

export function useSortable({ onMove, delay = LONG_PRESS_MS }: { onMove: (from: number, to: number) => void; delay?: number }): {
  containerRef: RefObject<HTMLDivElement>;
  bind: (index: number) => SortableBind;
  dragging: number | null;
} {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => () => sessionRef.current?.cleanup(), []);

  const items = (): HTMLElement[] => {
    const c = containerRef.current;
    if (!c) return [];
    return [...c.querySelectorAll<HTMLElement>(':scope > [data-sort-index]')]
      .sort((a, b) => Number(a.dataset.sortIndex) - Number(b.dataset.sortIndex));
  };

  const layout = (s: Session) => {
    const scrolled = s.scroller ? s.scroller.scrollTop - s.scrollStart : 0;
    const dy = s.y - s.startY + scrolled;
    const { to, shifts } = sortLayout(s.boxes, s.fromPos, dy);
    s.to = s.indexes[to] ?? s.from;
    s.els.forEach((el, i) => { el.style.transform = `translateY(${i === s.fromPos ? dy : shifts[i]}px)`; });
  };

  const autoScroll = (s: Session) => {
    if (!s.active) return;
    if (s.scroller) {
      const r = s.scroller.getBoundingClientRect();
      const v = edgeScrollSpeed(s.y, r.top, r.bottom);
      if (v) { s.scroller.scrollTop += v; layout(s); }
    }
    s.raf = requestAnimationFrame(() => autoScroll(s));
  };

  const activate = (s: Session) => {
    s.timer = null;
    s.els = items();
    s.indexes = s.els.map((el) => Number(el.dataset.sortIndex));
    s.fromPos = s.indexes.indexOf(s.from);
    if (s.fromPos < 0) { s.cleanup(); return; }
    s.boxes = s.els.map((el) => { const r = el.getBoundingClientRect(); return { top: r.top, height: r.height }; });
    s.scroller = scrollParent(containerRef.current);
    s.scrollStart = s.scroller?.scrollTop ?? 0;
    s.active = true;
    containerRef.current?.classList.add('sorting');
    s.els[s.fromPos]!.classList.add('sort-lifted');
    try { navigator.vibrate?.(15); } catch { /* 지원 안 함 */ }
    setDragging(s.from);
    window.getSelection?.()?.removeAllRanges();
    s.raf = requestAnimationFrame(() => autoScroll(s));
  };

  const begin = (from: number, x: number, y: number, kind: 'touch' | 'mouse') => {
    sessionRef.current?.cleanup();
    const s: Session = {
      from, fromPos: -1, indexes: [], startX: x, startY: y, y, timer: null, active: false, els: [], boxes: [], scroller: null, scrollStart: 0, raf: 0, to: from,
      cleanup: () => {},
    };
    const move = (cx: number, cy: number, e: Event) => {
      if (!s.active) {
        if (Math.hypot(cx - s.startX, cy - s.startY) > MOVE_TOLERANCE) s.cleanup(); // 스크롤하려는 것
        return;
      }
      if (e.cancelable) e.preventDefault();
      s.y = cy;
      layout(s);
    };
    const finish = () => {
      const wasActive = s.active;
      const { from: f, to } = s;
      s.cleanup();
      if (wasActive) {
        swallowNextClick();
        if (to !== f) onMoveRef.current(f, to);
      }
    };
    const onTouchMove = (e: TouchEvent) => { const t = e.touches[0]; if (t) move(t.clientX, t.clientY, e); };
    const onPointerMove = (e: PointerEvent) => move(e.clientX, e.clientY, e);
    const onContext = (e: Event) => { if (s.active || s.timer) e.preventDefault(); };
    if (kind === 'touch') {
      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', finish);
      document.addEventListener('touchcancel', finish);
    } else {
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', finish);
      document.addEventListener('pointercancel', finish);
    }
    document.addEventListener('contextmenu', onContext);
    s.cleanup = () => {
      if (s.timer) clearTimeout(s.timer);
      s.timer = null;
      cancelAnimationFrame(s.raf);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', finish);
      document.removeEventListener('touchcancel', finish);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
      document.removeEventListener('contextmenu', onContext);
      if (s.active) {
        for (const el of s.els) { el.style.transform = ''; el.classList.remove('sort-lifted'); }
        containerRef.current?.classList.remove('sorting');
        setDragging(null);
      }
      s.active = false;
      if (sessionRef.current === s) sessionRef.current = null;
    };
    sessionRef.current = s;
    s.timer = setTimeout(() => activate(s), delay);
  };

  const bind = (index: number): SortableBind => ({
    'data-sort-index': index,
    onTouchStart: (e) => { if (e.touches.length === 1) { const t = e.touches[0]!; begin(index, t.clientX, t.clientY, 'touch'); } else sessionRef.current?.cleanup(); },
    onPointerDown: (e) => { if (e.pointerType === 'mouse' && e.button === 0) begin(index, e.clientX, e.clientY, 'mouse'); },
  });

  return { containerRef, bind, dragging };
}
