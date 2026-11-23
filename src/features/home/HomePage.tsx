// 홈: 진행 중 운동, 백업 알림, 루틴, 최근 기록
import { sessionStats } from '@/domain/volume';
import type { Routine } from '@/domain/types';
import { fmtDur, fmtMD, fmtNum } from '@/lib/format';
import { isIOS, isStandalone } from '@/services/viewport';
import { activeSession, doneSessions, exerciseMap, includeWarmup, routineLastRun, routines, setSetting, settings } from '@/store';
import { go, paths } from '@/app/router';
import { Elapsed } from '@/ui/Clock';
import { EmptyState } from '@/ui/controls';
import { Icon } from '@/ui/Icon';
import { openSheet } from '@/ui/sheet';
import { ExThumb, RoutineThumb } from '@/ui/thumbs';
import { startWorkoutFlow } from '../workout/flows';

const BACKUP_REMIND_DAYS = 14;

export function HomePage() {
  const act = activeSession.value;
  const S = settings.value;
  const done = doneSessions.value;
  const backupDays = (Date.now() - (S.lastBackupAt || 0)) / 86400000;
  const lastRun = routineLastRun.value;
  const sortedRoutines = [...routines.value].sort((a, b) => (lastRun.get(b.id) ?? b.createdAt) - (lastRun.get(a.id) ?? a.createdAt));

  return (
    <div class="page">
      <div class="page-head">
        <h1>운동 일지</h1>
      </div>

      {isIOS() && !isStandalone() && !S.iosTipDismissed && (
        <div class="banner tip">
          <div>
            <b>홈 화면에 추가해서 쓰세요</b>
            <div class="sub">공유 버튼 → "홈 화면에 추가". 사파리에서 입력한 기록은 홈 화면 앱과 따로 저장돼요. 추가한 뒤에는 그 아이콘으로만 쓰세요.</div>
          </div>
          <button class="icon-btn" type="button" aria-label="닫기" onClick={() => void setSetting('iosTipDismissed', true)}><Icon name="x" size={18} /></button>
        </div>
      )}

      {act && (
        <button class="banner active" type="button" onClick={() => go(paths.workout)}>
          <div class="grow">
            <div class="eyebrow">진행 중인 운동</div>
            <div class="banner-title">{act.name}<span class="sub"> · </span><Elapsed since={act.startedAt} /></div>
          </div>
          <span class="btn primary small">이어서 하기</span>
        </button>
      )}

      {done.length > 0 && backupDays > BACKUP_REMIND_DAYS && (
        <button class="banner warn" type="button" onClick={() => go(paths.settings)}>
          <div class="grow">
            <b>{S.lastBackupAt ? `백업한 지 ${Math.floor(backupDays)}일 지났어요` : '아직 백업한 적이 없어요'}</b>
            <div class="sub">기록이 쌓였어요. 파일로 백업해 두면 폰을 바꿔도 안전해요</div>
          </div>
          <Icon name="chevron" size={18} />
        </button>
      )}

      <div class="section-title">루틴
        <button class="btn soft small" type="button" onClick={() => go(paths.newRoutine)}><Icon name="plus" size={16} /> 새 루틴</button>
      </div>
      {sortedRoutines.length === 0
        ? <EmptyState box icon={<img class="app-icon" src="./icons/apple-touch-icon.png" alt="" />} title="루틴이 없어요" sub="자주 하는 운동을 묶어 두면 한 번에 시작할 수 있어요" action="첫 루틴 만들기" onAction={() => go(paths.newRoutine)} />
        : (
          <div class="routine-list">
            {sortedRoutines.map((r) => (
              <button key={r.id} class="routine-card" type="button" onClick={() => void routineSheet(r)}>
                <RoutineThumb r={r} size={52} />
                <div class="grow">
                  <div class="routine-name">{r.name}</div>
                  <div class="sub">운동 {r.items.length}개{lastRun.get(r.id) ? ` · 마지막 ${fmtMD(lastRun.get(r.id)!)}` : ''}</div>
                </div>
                <span class="chev"><Icon name="chevron" size={18} /></span>
              </button>
            ))}
          </div>
        )}

      <button class="btn soft wide mt" type="button" onClick={() => void startWorkoutFlow(null)}><Icon name="play" size={18} /> 운동 시작</button>

      {done.length > 0 && (
        <>
          <div class="section-title">최근 기록<button class="link" type="button" onClick={() => go(paths.history)}>전체 보기</button></div>
          <div class="list">
            {done.slice(0, 3).map((s) => {
              const st = sessionStats(s, includeWarmup.value);
              return (
                <button key={s.id} class="list-item" type="button" onClick={() => go(paths.session(s.id))}>
                  <div class="grow">
                    <div class="li-title">{s.name}</div>
                    <div class="sub">{fmtMD(s.startedAt)} · {fmtDur(st.durationSec)} · {st.sets}세트</div>
                  </div>
                  <div class="li-right">{fmtNum(st.volume, 0)} kg</div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function routineSheet(r: Routine) {
  return openSheet<'edit' | 'start'>({
    title: r.name,
    render: (close) => (
      <div>
        <div class="rs-list">
          {r.items.map((it, i) => {
            const ex = exerciseMap.value.get(it.exerciseId);
            if (!ex) return null;
            return (
              <div key={i} class="rs-item">
                <ExThumb ex={ex} size={38} />
                <div class="grow">{ex.name}</div>
                <span class="sub">{it.setCount || 3}세트</span>
              </div>
            );
          })}
        </div>
        <div class="btn-row">
          <button class="btn ghost" type="button" onClick={() => close('edit')}>수정</button>
          <button class="btn primary" type="button" onClick={() => close('start')}><Icon name="play" size={16} /> 운동 시작</button>
        </div>
      </div>
    ),
  }).then((c) => {
    if (c === 'edit') go(paths.routine(r.id));
    if (c === 'start') void startWorkoutFlow(r.id);
  });
}
