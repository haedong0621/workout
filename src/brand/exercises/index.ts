// 기본 운동 그림 목록. 새 그림을 만들면 여기에 넣고 `npm run ex-art` → public/exercises/<id>.png 생성.
// 앱이 어느 운동에 어느 그림을 쓰는지는 src/ui/exerciseArt.ts 에서 정한다.
import { BENCH_PRESS } from './benchPress.ts';

export const EX_ARTS = [BENCH_PRESS] as const;
