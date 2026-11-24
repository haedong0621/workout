// 토글 옵션별 그림: 스미스(바벨 운동 → 스미스 머신) · 이지바(바벨 → W자 바)
// 같은 운동은 사람·카메라 각도를 그대로 쓰고 장비만 바꾼다.
import type { Grid } from '../pixelArt.ts';
import { add, mul, type V } from './iso.ts';
import { BAR_STYLE, draw, pose, SIZE, type BodySpec, type ExArt, type LegSpec, type Scene } from './kit.ts';
import { smith } from './machine.ts';
import type { P } from './gear.ts';

const handsMid = (p: P): V => mul(add(p.hands.L, p.hands.R), 0.5);
const poleOf = (b: BodySpec): V => {
  const a = 'L' in b.arm ? b.arm.L : b.arm;
  return 'pole' in a && a.pole ? a.pole : [-0.3, 1, -0.4];
};
const ftOf = (b: BodySpec, side: 'L' | 'R'): number => {
  const l: LegSpec = 'L' in b.leg ? (side === 'L' ? b.leg.L : b.leg.R) : b.leg;
  return l.ft ?? 65;
};

/**
 * 스미스 버전: 바가 가이드 봉에 걸려 수직으로만 움직이게 맞춘다.
 * - hands: 바를 손으로 든 운동 → 2장면의 손을 1장면 바 x 위치로 옮김
 * - body: 바가 몸에 얹힌 운동(스쿼트·런지·힙 쓰러스트) → 발은 1장면 자리에 두고 몸을 앞뒤로 옮겨 바 x를 맞춤
 */
export function smithOf(src: ExArt, mode: 'hands' | 'body', bar: (p: P) => V = handsMid): ExArt {
  const [a, b] = src.scenes!;
  const pa = pose(a.body);
  const rodX = bar(pa)[0];
  let bb: BodySpec = b.body;
  if (mode === 'hands') {
    const pb = pose(b.body);
    const pl = poleOf(b.body);
    const hl = pb.hands.L, hr = pb.hands.R;
    bb = { ...b.body, arm: { L: { hand: [rodX, hl[1], hl[2]], pole: pl }, R: { hand: [rodX, hr[1], hr[2]], pole: [pl[0], -pl[1], pl[2]] } } };
  } else {
    const pb = pose(b.body);
    const dx = rodX - bar(pb)[0];
    bb = { ...b.body, pelvis: add(b.body.pelvis, [dx, 0, 0]), leg: { L: { ankle: pa.L.an, pole: [1, 0.2, 0.1], ft: ftOf(b.body, 'L') }, R: { ankle: pa.R.an, pole: [1, -0.2, 0.1], ft: ftOf(b.body, 'R') } } };
  }
  const g = (sc: Scene) => (p: P) => [...(sc.gear?.(p) ?? []), ...smith(rodX, bar(p)[2])];
  // 높이 18.6 기구가 들어가게: 같은 각도, 조금 작게·조금 위로
  const cam = (sc: Scene): Partial<Scene> => ({ scale: Math.min(sc.scale ?? 5.6, 4.7), center: [sc.center?.[0] ?? rodX - 0.5, 0, Math.max(sc.center?.[2] ?? 8.6, 9.6)] });
  const fl = (sc: Scene): Scene['floor'] => { const f = sc.floor || [5.5, 4.5]; return [Math.max(f[0], 6.5), Math.max(f[1], 7.2)]; };
  return {
    id: src.id + '-smith', size: SIZE,
    frames: [(): Grid => draw({ ...a, gear: g(a), floor: fl(a), ...cam(a) }), (): Grid => draw({ ...b, body: bb, gear: g(b), floor: fl(b), ...cam(b) })],
  };
}

/** 이지바 버전: 같은 그림에서 바만 W자로 */
export function ezOf(src: ExArt): ExArt {
  const ez = (f: () => Grid) => (): Grid => { BAR_STYLE.ez = true; try { return f(); } finally { BAR_STYLE.ez = false; } };
  return { id: src.id + '-ez', size: SIZE, frames: src.frames.map(ez) };
}
