// 운동 페이지 넘기기 (손가락을 따라 움직이고, 떼면 항상 한 장에 딱 맞춰 멈춤)
// 브라우저 기본 가로 스크롤 + 스냅은 아이폰에서 중간에 멈추는 일이 있어서 직접 처리한다.
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';

const GAP = 10; // .ex-track gap과 같게
const SIDE = 16; // .ex-track 좌우 여백 (다음 카드가 옆에 살짝 보이게)
const LOCK_PX = 8; // 이만큼 움직이면 가로/세로 방향을 정함
const EDGE_PULL = 0.35; // 처음·끝에서 더 밀면 덜 따라옴
const DIST_RATIO = 0.2; // 카드 폭의 20% 넘게 밀면 넘어감
const FLICK = 0.35; // px/ms — 짧게 튕겨도 넘어감
const ANIM = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';

export function useSwipePager(count: number, page: number, onChange: (i: number) => void) {
  const viewRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const st = useRef({ page, count, onChange, first: true });
  st.current.page = page; st.current.count = count; st.current.onChange = onChange;

  const step = () => (viewRef.current?.clientWidth ?? 0) - SIDE * 2 + GAP;
  const place = (i: number, dx = 0, anim = false) => {
    const t = trackRef.current;
    if (!t) return;
    t.style.transition = anim ? ANIM : 'none';
    t.style.transform = `translate3d(${-i * step() + dx}px, 0, 0)`;
  };

  // 페이지가 바뀌면 그 카드로 (처음엔 애니메이션 없이)
  useLayoutEffect(() => {
    place(page, 0, !st.current.first);
    st.current.first = false;
  }, [page, count]);

  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    let x0 = 0, y0 = 0, dx = 0, axis: 'x' | 'y' | null = null, active = false, dragged = false, blockUntil = 0;
    let samples: { t: number; x: number }[] = [];
    const onResize = () => place(st.current.page);

    const start = (e: TouchEvent) => {
      const p = e.touches[0];
      if (e.touches.length !== 1 || !p) { active = false; return; }
      x0 = p.clientX; y0 = p.clientY; dx = 0; axis = null; active = true; dragged = false;
      samples = [{ t: e.timeStamp, x: x0 }];
    };
    const move = (e: TouchEvent) => {
      const p = e.touches[0];
      if (!active || !p) return;
      const mx = p.clientX - x0, my = p.clientY - y0;
      if (!axis) {
        if (Math.abs(mx) < LOCK_PX && Math.abs(my) < LOCK_PX) return;
        axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
      }
      if (axis !== 'x') return; // 세로면 평소처럼 화면 스크롤
      e.preventDefault(); // 가로로 미는 동안 화면이 위아래로 끌리지 않게
      dragged = true;
      const { page: pg, count: n } = st.current;
      dx = mx;
      if ((pg === 0 && dx > 0) || (pg === n - 1 && dx < 0)) dx *= EDGE_PULL;
      samples.push({ t: e.timeStamp, x: p.clientX });
      if (samples.length > 6) samples.shift();
      place(pg, dx);
    };
    const end = (e: TouchEvent) => {
      if (!active) return;
      active = false;
      if (dragged) blockUntil = performance.now() + 400;
      if (axis !== 'x') return;
      const { page: pg, count: n, onChange: go } = st.current;
      const last = samples[samples.length - 1], old = samples.find((s) => e.timeStamp - s.t < 120) ?? samples[0];
      const v = last && old && last.t > old.t ? (last.x - old.x) / (last.t - old.t) : 0;
      let to = pg;
      if (dx < -step() * DIST_RATIO || v < -FLICK) to = pg + 1;
      else if (dx > step() * DIST_RATIO || v > FLICK) to = pg - 1;
      to = Math.max(0, Math.min(n - 1, to));
      if (to === pg) place(pg, 0, true); // 덜 밀었으면 제자리로
      else go(to);
    };
    // 민 손가락을 뗄 때 버튼이 눌리지 않게
    const click = (e: MouseEvent) => { if (performance.now() < blockUntil) { e.stopPropagation(); e.preventDefault(); blockUntil = 0; } };

    v.addEventListener('touchstart', start, { passive: true });
    v.addEventListener('touchmove', move, { passive: false });
    v.addEventListener('touchend', end);
    v.addEventListener('touchcancel', end);
    v.addEventListener('click', click, true);
    window.addEventListener('resize', onResize);
    return () => {
      v.removeEventListener('touchstart', start);
      v.removeEventListener('touchmove', move);
      v.removeEventListener('touchend', end);
      v.removeEventListener('touchcancel', end);
      v.removeEventListener('click', click, true);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return { viewRef, trackRef };
}
