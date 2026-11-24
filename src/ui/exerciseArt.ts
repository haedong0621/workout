// 기본 운동 그림: 운동 id(+ 토글 옵션) → public/exercises/<그림>.png (프레임을 가로로 이어 붙인 스프라이트)
// 기본 운동은 사진을 바꿀 수 없고 항상 이 그림(옵션마다 다름: 스미스·플레이트·이지바). 직접 만든 운동만 사진·움짤.
// 그림 원본은 src/brand/exercises, PNG는 `npm run ex-art`로 만든다. 연결표는 catalogArt.ts.
import { CATALOG_ART, OPTION_SUFFIX } from '@/brand/exercises/catalogArt.ts';

export function exerciseArt(id: string | undefined, opt?: string | null): { url: string; frames: number } | null {
  const base = id ? CATALOG_ART[id] : undefined;
  if (!base) return null;
  const file = base + (opt ? OPTION_SUFFIX[opt] ?? '' : '');
  return { url: `./exercises/${file}.png`, frames: 2 };
}
