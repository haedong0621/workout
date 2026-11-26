// 운동 화면에서 쓰는 "물어보고 → 저장" 흐름들
import { parseNum } from '@/lib/num';
import { findById, workoutActions, activeSession, settings, setSetting } from '@/store';
import { ensureNotifyPermission, notifySupported } from '@/services/notify';
import { needsBodyweight } from '@/domain/workout';
import { go, paths } from '@/app/router';
import { choiceSheet, promptSheet } from '@/ui/dialogs';
import { toast } from '@/ui/toast';

/** 루틴(또는 빈 운동)으로 시작. 진행 중인 운동이 있으면 먼저 물어봄 */
export async function startWorkoutFlow(routineId: string | null): Promise<void> {
  askNotifyOnce();
  if (activeSession.value) {
    const c = await choiceSheet({
      title: '진행 중인 운동이 있어요',
      options: [
        { label: '이어서 하기', value: 'resume', icon: 'play' },
        { label: '새로 시작하기', sub: '진행 중이던 기록은 삭제돼요', value: 'new', danger: true, icon: 'trash' },
      ],
    });
    if (c === 'resume') { go(paths.workout); return; }
    if (c !== 'new') return;
    workoutActions.discardWorkout();
  }
  const s = workoutActions.startWorkout(routineId);
  go(paths.workout);
  await ensureBodyweight(s.id);
}

/** 휴식 끝 알림(기본 켜짐): 아직 허용을 안 물어봤으면 운동 시작(버튼 누른 순간)에 한 번 물어봄. 거부하면 설정도 끔 → 다시 안 물음 */
function askNotifyOnce(): void {
  if (!settings.value.notify || !notifySupported() || Notification.permission !== 'default') return;
  void ensureNotifyPermission().then((p) => { if (p !== 'granted') void setSetting('notify', false); });
}

/** 어시스트·체중 운동이 있는데 체중을 모르면 한 번 물어봄 */
export async function ensureBodyweight(sessionId: string): Promise<void> {
  const s = findById('sessions', sessionId);
  if (!s || !needsBodyweight(s)) return;
  const v = await promptSheet({
    title: '체중을 입력해 주세요',
    label: '어시스트·체중 운동의 볼륨 계산에 사용돼요',
    inputMode: 'decimal', unit: 'kg', placeholder: '예: 87',
  });
  const n = parseNum(v, 0);
  if (n > 0) {
    workoutActions.setSessionBodyweight(sessionId, n);
    toast('체중이 기록됐어요');
  }
}
