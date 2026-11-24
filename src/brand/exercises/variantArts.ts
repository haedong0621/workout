// 토글 옵션별 그림 목록 (스미스 15 · 이지바 4)
import { add, mul, type V } from './iso.ts';
import { pelvisOf, type P } from './gear.ts';
import { BENCH_PRESS_SMITH } from './benchPress.ts';
import { DECLINE_BENCH, INCLINE_BENCH } from './chest.ts';
import { CLOSE_GRIP_BENCH, LYING_TRICEPS, PREACHER_CURL } from './arms.ts';
import { BARBELL_CURL, SHOULDER_PRESS } from './basics.ts';
import { BARBELL_SHRUG, BARBELL_UPRIGHT_ROW } from './shoulders.ts';
import { BARBELL_ROW, DEADLIFT } from './back.ts';
import { BARBELL_HIP_THRUST, BARBELL_LUNGE, BARBELL_SPLIT, FRONT_SQUAT, RDL, SQUAT, STIFF_DL } from './legs.ts';
import { ezOf, smithOf } from './variants.ts';

const backBar = (p: P): V => add(add(p.shMid, mul(p.front, -0.75)), mul(p.spine, 0.35));
const frontBar = (p: P): V => add(add(p.shMid, mul(p.front, 0.95)), mul(p.spine, 0.45));
const hipBar = (p: P): V => add(pelvisOf(p), [0, 0, 1.2]);

export const SMITH_ARTS = [
  BENCH_PRESS_SMITH,
  smithOf(INCLINE_BENCH, 'hands'), smithOf(DECLINE_BENCH, 'hands'), smithOf(CLOSE_GRIP_BENCH, 'hands'),
  smithOf(SHOULDER_PRESS, 'hands'), smithOf(BARBELL_SHRUG, 'hands'),
  smithOf(DEADLIFT, 'hands'), smithOf(BARBELL_ROW, 'hands'), smithOf(RDL, 'hands'), smithOf(STIFF_DL, 'hands'),
  smithOf(SQUAT, 'body', backBar), smithOf(FRONT_SQUAT, 'body', frontBar), smithOf(BARBELL_LUNGE, 'body', backBar), smithOf(BARBELL_SPLIT, 'body', backBar),
  smithOf(BARBELL_HIP_THRUST, 'body', hipBar),
];
export const EZ_ARTS = [ezOf(BARBELL_CURL), ezOf(PREACHER_CURL), ezOf(LYING_TRICEPS), ezOf(BARBELL_UPRIGHT_ROW)];
export const ARTS = [...SMITH_ARTS, ...EZ_ARTS];
