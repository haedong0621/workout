// 간단한 SVG 라인 차트. 점을 누르거나 끌면 그 값이 위에 표시돼요.
import { useMemo, useRef, useState } from 'preact/hooks';
import { fmtMD, fmtNum } from '@/lib/format';

export interface ChartPoint { ts: number; value: number }

const W = 340, PL = 40, PR = 14, PT = 14, PB = 26;

export function LineChart({ points, unit = 'kg', height = 180 }: { points: readonly ChartPoint[]; unit?: string; height?: number }) {
  const [sel, setSel] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const H = height;

  const geo = useMemo(() => {
    if (!points.length) return null;
    const vals = points.map((p) => p.value);
    let min = Math.min(...vals), max = Math.max(...vals);
    if (min === max) { const pad = Math.max(1, Math.abs(max) * 0.1); min -= pad; max += pad; }
    const span = max - min;
    min = Math.max(0, min - span * 0.12); max += span * 0.12;
    const x = (i: number) => PL + (points.length === 1 ? (W - PL - PR) / 2 : (i * (W - PL - PR)) / (points.length - 1));
    const y = (v: number) => PT + (1 - (v - min) / (max - min)) * (H - PT - PB);
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
    return { min, max, x, y, d };
  }, [points, H]);

  if (!geo || !points.length) return <div class="chart-empty">아직 기록이 없어요</div>;
  const { min, max, x, y, d } = geo;
  const active = sel != null && sel < points.length ? sel : points.length - 1;
  const ap = points[active]!;
  const n = points.length;
  const labelIdx = [...new Set([0, Math.floor((n - 1) / 2), n - 1])];

  const pick = (ev: PointerEvent) => {
    const el = svgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * W;
    let best = 0, bd = Infinity;
    for (let i = 0; i < n; i++) { const dd = Math.abs(x(i) - px); if (dd < bd) { bd = dd; best = i; } }
    setSel(best);
  };

  return (
    <div class="chart">
      <div class="chart-read"><b>{fmtNum(ap.value)} {unit}</b><span class="sub"> · {fmtMD(ap.ts)}</span></div>
      <svg
        ref={svgRef} viewBox={`0 0 ${W} ${H}`} class="chart-svg" preserveAspectRatio="none"
        onPointerDown={pick} onPointerMove={(e) => { if (e.buttons || e.pointerType === 'touch') pick(e); }}
      >
        {[min, (min + max) / 2, max].map((t, i) => (
          <g key={i}>
            <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} class="chart-grid" />
            <text x={PL - 6} y={y(t) + 4} class="chart-axis" text-anchor="end">{fmtNum(t, t >= 100 ? 0 : 1)}</text>
          </g>
        ))}
        {n > 1 && <path d={`${d} L${x(n - 1)},${H - PB} L${x(0)},${H - PB} Z`} class="chart-area" />}
        {n > 1 && <path d={d} class="chart-line" fill="none" />}
        {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.value)} r={i === active ? 5.5 : 3.6} class={'chart-dot' + (i === active ? ' active' : '')} />)}
        {labelIdx.map((i) => (
          <text key={'l' + i} x={x(i)} y={H - 7} class="chart-axis" text-anchor={n > 1 && i === 0 ? 'start' : n > 1 && i === n - 1 ? 'end' : 'middle'}>{fmtMD(points[i]!.ts)}</text>
        ))}
      </svg>
    </div>
  );
}
