// 벤치 프레스 — 쿼터뷰 픽셀아트 2프레임 (128×128칸, 배경 투명)
// 1프레임: 팔을 편 상태(바벨 위) / 2프레임: 가슴까지 내린 상태
import type { Grid } from '../pixelArt.ts';
import { cyl, rbox, renderIso, type Shape, type V } from './iso.ts';
import { floor, human, type Pose } from './rig.ts';

export const SIZE = 128;
const CAM = { size: SIZE, scale: 5.6, center: [0.6, -0.6, 5.2] as V, az: -112 };

function bench(): Shape[] {
  return [
    floor(1.4, 0, 8.2, 4.6),
    rbox([0, 0, 4.3], [6, 1.35, 0.4], 0.22, (p) => (p[2] > 4.62 && (Math.abs(Math.abs(p[1]) - 1.12) < 0.05 || Math.abs(Math.abs(p[0]) - 5.77) < 0.05) ? { mat: 'pad', line: true } : 'pad')), // 패드 + 박음질
    rbox([0, 0, 3.75], [5.6, 0.5, 0.18], 0.05, 'steel'),
    ...[-4.6, 4.6].flatMap((x) => [
      rbox([x, 0, 1.9], [0.28, 0.28, 1.9], 0.08, 'steel'),
      rbox([x, 0, 0.18], [0.35, 1.5, 0.18], 0.08, 'steel'),
      ...[-1.35, 1.35].map((y) => rbox([x, y, 0.1], [0.4, 0.22, 0.1], 0.05, 'pad')),                  // 고무 발
    ]),
  ];
}

function barbell(x: number, z: number): Shape[] {
  const out: Shape[] = [cyl([x, 0, z], 1, 0.15, 7.9, 'bar')];
  for (const s of [-1, 1]) {
    out.push(cyl([x, 6.0 * s, z], 1, 1.75, 0.18, 'plate'), cyl([x, 6.45 * s, z], 1, 1.75, 0.18, 'plate')); // 원판 2장
    out.push(cyl([x, 6.22 * s, z], 1, 1.45, 0.42, 'plate'));                                             // 원판 사이 홈
    out.push(cyl([x, 6.0 * s, z], 1, 0.55, 0.9, 'steel'));                                               // 허브
    out.push(cyl([x, 7.25 * s, z], 1, 0.3, 0.6, 'bar'), cyl([x, 5.55 * s, z], 1, 0.36, 0.12, 'steel'));  // 슬리브·칼라
  }
  return out;
}

function pose(hand: V, elbowOut: V): Pose {
  const leg = (s: 1 | -1) => ({ hip: [2.9, 0.8 * s, 5.5] as V, kn: [6.9, 1.3 * s, 6.3] as V, an: [7.6, 1.8 * s, 1.0] as V, toe: [8.9, 1.9 * s, 0.4] as V });
  const arm = (s: 1 | -1) => ({ sh: [-2.5, 1.65 * s, 5.95] as V, el: [elbowOut[0], elbowOut[1] * s, elbowOut[2]] as V, ha: [hand[0], hand[1] * s, hand[2]] as V });
  return { head: [-4.55, 0, 5.85], neck: [-3.5, 0, 5.75], face: [0, 0, 1], L: { ...arm(1), ...leg(1) }, R: { ...arm(-1), ...leg(-1) } };
}

function frame(barZ: number, barX: number, elbow: V): Grid {
  const h = human(pose([barX, 2.45, barZ], elbow));
  return renderIso([...bench(), ...h.shapes, ...barbell(barX, barZ)], CAM, h.marks);
}

export const benchFrameUp = () => frame(10.6, -2.3, [-2.4, 2.25, 8.3]);
export const benchFrameDown = () => frame(7.5, -1.9, [-2.1, 3.3, 5.3]);

export const BENCH_PRESS = { id: 'bench-press', frames: [benchFrameUp, benchFrameDown], size: SIZE } as const;
