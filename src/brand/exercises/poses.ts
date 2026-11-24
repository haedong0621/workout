// 자주 쓰는 자세 조각
import type { V } from './iso.ts';
import type { BodySpec, LegSpec } from './kit.ts';
import { grounded } from './kit.ts';

/** 선 다리 (어깨너비보다 살짝 좁게) */
export const STAND: LegSpec = { th: [0, 5], sh: [0, 4] };
/** 넓게 선 다리 */
export const STAND_WIDE: LegSpec = { th: [0, 10], sh: [0, 7] };
/** 바닥에 닿게 골반 높이 자동 */
export const stand = (b: Omit<BodySpec, 'pelvis' | 'leg'> & { pelvis?: V; leg?: BodySpec['leg'] }): BodySpec => grounded({ pelvis: [0, 0, 9.5], ...b, leg: b.leg ?? STAND });
/** 의자에 앉은 다리(무릎 90도, 발 바닥) */
export const SIT: LegSpec = { th: [86, 8], sh: [-4, 6] };
