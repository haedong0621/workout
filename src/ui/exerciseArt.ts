// 기본 운동 그림: 운동 id → public/exercises/<그림>.png (프레임을 가로로 이어 붙인 스프라이트)
// 사용자가 사진·움짤을 넣으면 그게 우선이고, 없을 때만 이 그림을 보여 준다.
// 그림 원본은 src/brand/exercises, PNG는 `npm run ex-art`로 만든다.
const ART: Record<string, { file: string; frames: number }> = {
  'seed-0': { file: 'bench-press', frames: 2 }, // 벤치 프레스
};

export function exerciseArt(id: string | undefined): { url: string; frames: number } | null {
  const a = id ? ART[id] : undefined;
  return a ? { url: `./exercises/${a.file}.png`, frames: a.frames } : null;
}
