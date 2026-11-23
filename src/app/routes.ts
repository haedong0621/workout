// 화면(라우트) 등록표. 새 화면을 추가할 때는 여기에 한 줄 추가하면 돼요.
import { BodyPage } from '@/features/body/BodyPage';
import { HistoryPage } from '@/features/history/HistoryPage';
import { SessionDetailPage } from '@/features/history/SessionDetailPage';
import { HomePage } from '@/features/home/HomePage';
import { ExerciseDetailPage } from '@/features/library/ExerciseDetailPage';
import { LibraryPage } from '@/features/library/LibraryPage';
import { RoutineEditPage } from '@/features/routine/RoutineEditPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { WorkoutPage } from '@/features/workout/WorkoutPage';
import type { IconName } from '@/ui/Icon';
import type { RouteDef, TabKey } from './router';

export const ROUTES: RouteDef[] = [
  { path: '/home', component: HomePage, tab: 'home' },
  { path: '/history', component: HistoryPage, tab: 'history' },
  { path: '/library', component: LibraryPage, tab: 'library' },
  { path: '/body', component: BodyPage, tab: 'body' },
  { path: '/settings', component: SettingsPage, tab: 'settings' },
  { path: '/workout', component: WorkoutPage, tab: null, bare: true },
  { path: '/exercise/:id', component: ExerciseDetailPage, tab: 'library', sub: true },
  { path: '/session/:id', component: SessionDetailPage, tab: 'history', sub: true },
  { path: '/routine/:id', component: RoutineEditPage, tab: 'home', sub: true },
];

export const TABS: { key: TabKey; label: string; icon: IconName; hash: string }[] = [
  { key: 'home', label: '홈', icon: 'home', hash: '#/home' },
  { key: 'history', label: '기록', icon: 'cal', hash: '#/history' },
  { key: 'library', label: '종목', icon: 'dumbbell', hash: '#/library' },
  { key: 'body', label: '내 몸', icon: 'body', hash: '#/body' },
  { key: 'settings', label: '설정', icon: 'gear', hash: '#/settings' },
];
