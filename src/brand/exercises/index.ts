// 기본 운동 그림 목록. 새 그림을 만들면 여기에 넣고 `npm run ex-art` → public/exercises/<id>.png 생성.
// 어느 운동·토글 옵션에 어느 그림을 쓰는지는 catalogArt.ts(카탈로그 id → 그림 id, 옵션별).
import { ARTS as ABS } from './abs.ts';
import { ARTS as ARMS } from './arms.ts';
import { ARTS as BACK } from './back.ts';
import { ARTS as BASICS } from './basics.ts';
import { BENCH_PRESS } from './benchPress.ts';
import { ARTS as CHEST } from './chest.ts';
import { ARTS as LEGS } from './legs.ts';
import { ARTS as MACHINES } from './machines.ts';
import { ARTS as SHOULDERS } from './shoulders.ts';
import { ARTS as VARIANTS } from './variantArts.ts';

export const EX_ARTS = [BENCH_PRESS, ...BASICS, ...CHEST, ...BACK, ...SHOULDERS, ...ARMS, ...LEGS, ...ABS, ...MACHINES, ...VARIANTS] as const;
