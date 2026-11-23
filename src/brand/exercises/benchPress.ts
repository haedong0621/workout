// 벤치 프레스 — 쿼터뷰 픽셀아트 2프레임 (배경 투명)
// 1프레임: 팔을 편 상태(바벨 위) / 2프레임: 가슴까지 내린 상태
import type { Grid } from '../pixelArt.ts';
import { cyl, rbox, renderIso, type Shape, type V } from './iso.ts';
import { MAT, floor, human, type Pose } from './rig.ts';

export const SIZE = 64;
const CAM = { size: SIZE, scale: 2.75, center: [0.6, -0.6, 5.2] as V, az: -112 };

function bench(): Shape[] {
  return [
    floor(1.4, 0, 8.2, 4.6),
    rbox([0, 0, 4.3], [6, 1.35, 0.4], 0.2, MAT.pad),                  // 패드
    rbox([0, 0, 3.75], [5.6, 0.5, 0.18], 0.05, MAT.steel),             // 패드 밑 틀
    ...[-4.6, 4.6].flatMap((x) => [
      rbox([x, 0, 1.9], [0.28, 0.28, 1.9], 0.08, MAT.steel),           // 다리
      rbox([x, 0, 0.18], [0.35, 1.5, 0.18], 0.08, MAT.steel),          // 받침
    ]),
  ];
}

function barbell(x: number, z: number): Shape[] {
  const plate = (y: number) => cyl([x, y, z], 1, 1.75, 0.32, MAT.plate);
  return [
    cyl([x, 0, z], 1, 0.16, 7.8, MAT.bar),
    plate(-6.4), plate(6.4),
    cyl([x, -7.0, z], 1, 0.3, 0.3, MAT.bar), cyl([x, 7.0, z], 1, 0.3, 0.3, MAT.bar), // 칼라
  ];
}

function pose(hand: V, elbowOut: V): Pose {
  const leg = (s: 1 | -1) => ({ hip: [2.9, 0.8 * s, 5.5] as V, kn: [6.9, 1.3 * s, 6.3] as V, an: [7.6, 1.8 * s, 0.95] as V, toe: [8.7, 1.9 * s, 0.4] as V });
  const arm = (s: 1 | -1) => ({ sh: [-2.5, 1.65 * s, 5.95] as V, el: [elbowOut[0], elbowOut[1] * s, elbowOut[2]] as V, ha: [hand[0], hand[1] * s, hand[2]] as V });
  return {
    head: [-4.55, 0, 5.75], neck: [-3.5, 0, 5.7], face: [0, 0, 1],
    L: { ...arm(1), ...leg(1) }, R: { ...arm(-1), ...leg(-1) },
  };
}

function frame(barZ: number, barX: number, elbow: V): Grid {
  const h = human(pose([barX, 2.45, barZ], elbow));
  return renderIso([...bench(), ...h.shapes, ...barbell(barX, barZ)], CAM, h.eyes.map((at) => ({ at, color: 'K' })));
}

export const benchFrameUp = () => frame(10.6, -2.3, [-2.4, 2.25, 8.3]);
export const benchFrameDown = () => frame(7.5, -1.9, [-2.1, 3.3, 5.3]);

export const BENCH_PRESS = { id: 'bench-press', frames: [benchFrameUp, benchFrameDown], size: SIZE } as const;
