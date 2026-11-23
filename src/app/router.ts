// 해시 라우터 (#/home, #/exercise/abc …). GitHub Pages 같은 정적 호스팅에서 새로고침해도 안전해요.
import { computed, signal } from '@preact/signals';
import type { ComponentType } from 'preact';

export type TabKey = 'home' | 'history' | 'library' | 'body' | 'settings';

export interface RouteProps { params: Record<string, string> }

export interface RouteDef {
  /** 예: '/exercise/:id' */
  path: string;
  component: ComponentType<RouteProps>;
  /** 강조할 하단 탭 */
  tab: TabKey | null;
  /** true면 탭바·미니바 없이 전체 화면(운동 진행) */
  bare?: boolean;
  /** true면 하위 화면(탭바 숨김) */
  sub?: boolean;
}

export const DEFAULT_HASH = '#/home';
const readHash = () => location.hash || DEFAULT_HASH;
export const currentHash = signal(typeof location === 'undefined' ? DEFAULT_HASH : readHash());

interface Compiled { def: RouteDef; re: RegExp; keys: string[] }
let compiled: Compiled[] = [];

function compile(path: string): { re: RegExp; keys: string[] } {
  const keys: string[] = [];
  const src = path.replace(/\/:([A-Za-z0-9_]+)/g, (_, k: string) => { keys.push(k); return '/([^/]+)'; });
  return { re: new RegExp('^#' + src + '$'), keys };
}

export function matchRoute(hash: string, defs: readonly Compiled[] = compiled): { def: RouteDef; params: Record<string, string> } | null {
  const path = hash.split('?')[0] ?? hash;
  for (const c of defs) {
    const m = c.re.exec(path);
    if (!m) continue;
    const params: Record<string, string> = {};
    c.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1] ?? ''); });
    return { def: c.def, params };
  }
  return null;
}

export const compileRoutes = (defs: readonly RouteDef[]): Compiled[] => defs.map((def) => ({ def, ...compile(def.path) }));

export const currentRoute = computed(() => matchRoute(currentHash.value));

/** cutoff: 이 시각(performance.now) 이전에 연 시트는 닫아도 되는 시점 */
type NavListener = (hash: string, cutoff: number) => void;
const listeners = new Set<NavListener>();
export const onNavigate = (fn: NavListener) => { listeners.add(fn); return () => listeners.delete(fn); };
let requestedAt: number | null = null;

export function initRouter(defs: readonly RouteDef[]): void {
  compiled = compileRoutes(defs);
  const sync = () => {
    const h = readHash();
    if (!matchRoute(h)) { location.replace(DEFAULT_HASH); return; }
    const cutoff = requestedAt ?? performance.now();
    requestedAt = null;
    if (h !== currentHash.value) {
      currentHash.value = h;
      for (const f of listeners) f(h, cutoff);
    }
  };
  addEventListener('hashchange', sync);
  if (!location.hash || !matchRoute(location.hash)) location.replace(DEFAULT_HASH);
  currentHash.value = readHash();
}

export function go(hash: string, { replace = false } = {}): void {
  if (location.hash === hash) return;
  requestedAt = performance.now();
  if (replace) location.replace(hash); else location.hash = hash;
}

/** 이전 화면으로. 앱을 그 화면에서 바로 열었으면 fallback으로 */
export function back(fallback = DEFAULT_HASH): void {
  if (history.length > 1) history.back(); else go(fallback, { replace: true });
}

export const paths = {
  home: '#/home',
  history: '#/history',
  library: '#/library',
  body: '#/body',
  settings: '#/settings',
  workout: '#/workout',
  exercise: (id: string) => '#/exercise/' + encodeURIComponent(id),
  session: (id: string) => '#/session/' + encodeURIComponent(id),
  routine: (id: string) => '#/routine/' + encodeURIComponent(id),
  newRoutine: '#/routine/new',
} as const;
