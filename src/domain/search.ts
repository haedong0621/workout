// 한글 검색(초성 포함)
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';

export function choseong(str: string): string {
  return [...str].map((ch) => {
    const c = ch.charCodeAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) return CHO[Math.floor((c - 0xac00) / 588)];
    return ch;
  }).join('');
}

const norm = (s: string) => s.toLowerCase().replace(/\s/g, '');

/** 이름에 검색어가 들어 있거나, 초성만 입력했을 때 초성이 일치하면 true */
export function matchName(name: string, q: string): boolean {
  const query = norm(q || '');
  if (!query) return true;
  const n = norm(name);
  if (n.includes(query)) return true;
  if (/^[ㄱ-ㅎ]+$/.test(query)) return choseong(n).includes(query);
  return false;
}

/** 운동 이름 또는 다른 이름(aka)으로 찾기 */
export function matchExercise(ex: { name: string; aka?: string[] }, q: string): boolean {
  return matchName(ex.name, q) || (ex.aka ?? []).some((a) => matchName(a, q));
}
