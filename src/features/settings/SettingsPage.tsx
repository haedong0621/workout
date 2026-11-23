// 설정 + 백업/복원
import { parseBackup, BackupError } from '@/domain/backup';
import { buildCSV } from '@/domain/csv';
import type { SoundMode } from '@/domain/types';
import { dateKey, fmtYMD } from '@/lib/format';
import { parseNum } from '@/lib/num';
import { shareOrDownload, pickFile } from '@/services/files';
import { ensureNotifyPermission, notifyGranted, notifySupported } from '@/services/notify';
import { playBeep, setSoundMode, unlockAudio } from '@/services/sound';
import { isStandalone, screenInfo } from '@/services/viewport';
import { setWakeLock } from '@/services/wakeLock';
import { activeSession, backupActions, doneSessions, exercises, routines, sessions, setSetting, settings, storageInfo } from '@/store';
import { go, paths } from '@/app/router';
import { MiniStepper, Segmented, SettingRow, Toggle } from '@/ui/controls';
import { choiceSheet, confirmSheet, promptSheet } from '@/ui/dialogs';
import { Icon } from '@/ui/Icon';
import { openSheet } from '@/ui/sheet';
import { toast } from '@/ui/toast';


export function SettingsPage() {
  const S = settings.value;
  const info = storageInfo.value;
  const standalone = isStandalone();
  const stepDefault = (d: number) => void setSetting('restDefault', Math.max(10, S.restDefault + d));

  return (
    <div class="page">
      <div class="page-head"><h1>설정</h1></div>

      <div class="card">
        <div class="card-title">휴식 타이머</div>
        <SettingRow label="세트 체크하면 자동 시작"><Toggle value={S.restAuto} onChange={(v) => void setSetting('restAuto', v)} label="자동 시작" /></SettingRow>
        <SettingRow label="기본 휴식 시간" sub="종목별로 따로 정하지 않았을 때">
          <MiniStepper onMinus={() => stepDefault(-15)} onPlus={() => stepDefault(15)}>{S.restDefault}초</MiniStepper>
        </SettingRow>
        <SettingRow label="종료 소리" sub="앱이 켜져 있을 때 울려요">
          <div class="inline">
            <button class="btn ghost small" type="button" onClick={() => { unlockAudio(); setTimeout(playBeep, 50); }}>들어보기</button>
            <Toggle value={S.sound} onChange={(v) => void setSetting('sound', v)} label="종료 소리" />
          </div>
        </SettingRow>
        <SettingRow label="소리 방식" sub="음악과 같이 울리는 방식은 무음 스위치를 따라요">
          <Segmented<SoundMode> options={[['mix', '음악과 함께'], ['loud', '확실히 울리기']]} value={S.soundMode} onChange={(v) => {
            void setSetting('soundMode', v);
            setSoundMode(v);
            toast(v === 'loud' ? '소리는 확실하지만 음악이 멈출 수 있어요' : '음악을 끊지 않고 같이 울려요');
          }} />
        </SettingRow>
        <SettingRow label="종료 알림 (배너)" sub={notifySupported() ? '앱이 백그라운드에 살아 있을 때만 와요' : '이 브라우저는 지원하지 않아요'}>
          <Toggle value={S.notify && notifyGranted()} label="종료 알림" onChange={async (v) => {
            if (!v) { void setSetting('notify', false); return; }
            const p = await ensureNotifyPermission();
            if (p === 'granted') { void setSetting('notify', true); toast('알림을 켰어요'); }
            else { void setSetting('notify', false); toast('알림 권한이 필요해요 (홈 화면 앱에서만 가능)'); }
          }} />
        </SettingRow>
        <SettingRow label="운동 중 화면 켜짐 유지" sub="휴식 타이머가 정확히 울리도록 도와줘요">
          <Toggle value={S.keepAwake} label="화면 켜짐 유지" onChange={(v) => { void setSetting('keepAwake', v); void setWakeLock(v && !!activeSession.value); }} />
        </SettingRow>
      </div>

      <div class="card">
        <div class="card-title">볼륨 계산</div>
        <SettingRow label="웜업(W) 세트도 볼륨에 포함" sub="끄면 W 세트는 볼륨·그래프에서 빠져요">
          <Toggle value={S.includeWarmup} label="웜업 포함" onChange={(v) => void setSetting('includeWarmup', v)} />
        </SettingRow>
        <SettingRow label="기본 체중" sub="내 몸 탭에 체중 기록이 없을 때만 사용">
          <div class="inline">
            <b class="mono">{S.bodyweight ? `${S.bodyweight}kg` : '미설정'}</b>
            <button class="btn ghost small" type="button" onClick={async () => {
              const v = await promptSheet({ title: '기본 체중', inputMode: 'decimal', unit: 'kg', value: S.bodyweight ? String(S.bodyweight) : '' });
              if (v != null) void setSetting('bodyweight', Math.max(0, parseNum(v, 0)));
            }}>수정</button>
          </div>
        </SettingRow>
      </div>

      <div class="card">
        <div class="card-title">데이터 백업 · 복원</div>
        <div class="sub pad0">운동 기록 {doneSessions.value.length}개 · 루틴 {routines.value.length}개 · 종목 {exercises.value.length}개</div>
        <div class="sub">{S.lastBackupAt ? `마지막 백업 ${fmtYMD(S.lastBackupAt)}` : '아직 백업한 적이 없어요'}</div>
        <div class="btn-col">
          <button class="btn primary wide" type="button" onClick={exportFlow}><Icon name="download" size={18} /> 백업 파일 만들기 (JSON)</button>
          <button class="btn soft wide" type="button" onClick={() => void saveFile(`workout-log-${dateKey(Date.now())}.csv`, new Blob([buildCSV(sessions.value)], { type: 'text/csv' }))}>엑셀용 CSV 내보내기</button>
          <button class="btn soft wide" type="button" onClick={importFlow}><Icon name="upload" size={18} /> 백업 파일 불러오기</button>
        </div>
        <div class="sub pad">폰을 바꾸거나 앱을 지우기 전에 꼭 백업 파일을 저장해 두세요. 새 폰에서 이 앱을 홈 화면에 추가한 뒤 "불러오기"를 누르면 그대로 복원돼요.</div>
      </div>

      <div class="card">
        <div class="card-title">저장 상태</div>
        <SettingRow label="저장 방식" sub="이 기기 안(IndexedDB)에 저장돼요"><b>{info.persistent ? '정상' : '임시'}</b></SettingRow>
        <SettingRow label="홈 화면 앱으로 실행 중" sub={standalone ? null : '사파리 탭에서는 데이터가 따로 저장돼요'}><b>{standalone ? '예' : '아니오'}</b></SettingRow>
        <SettingRow label="저장소 보호" sub={info.persisted ? '브라우저가 임의로 지우지 않아요' : '승인되지 않았어요(홈 화면 앱이면 보통 안전해요)'}><b>{info.persisted ? '켜짐' : '꺼짐'}</b></SettingRow>
      </div>

      <div class="card">
        <div class="card-title">초기화</div>
        <button class="btn danger-ghost wide" type="button" onClick={wipeFlow}>모든 데이터 삭제</button>
      </div>
      <div class="sub center pad">운동 일지 v{__APP_VERSION__}</div>
      <div class="sub center mono diag">{screenInfo()}</div>
    </div>
  );
}

/** 공유 시트로 저장. 데이터가 커서 터치 허용 시간이 지나면 버튼을 한 번 더 누르게 함 */
async function saveFile(filename: string, blob: Blob): Promise<boolean> {
  const { result, file } = await shareOrDownload(filename, blob);
  if (result === 'shared' || result === 'downloaded') return true;
  if (result === 'cancelled') return false;
  const ok = await openSheet<boolean>({
    title: '백업 파일',
    render: (close) => (
      <div>
        <p class="sheet-msg">파일이 준비됐어요. 아래 버튼을 눌러 저장하거나 공유하세요.</p>
        <button class="btn primary wide" type="button" onClick={async () => { try { await navigator.share({ files: [file] }); close(true); } catch { /* 취소 */ } }}>파일 저장 · 공유</button>
      </div>
    ),
  });
  return ok === true;
}

async function exportFlow() {
  try {
    const data = await backupActions.exportBackup();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    if (await saveFile(`workout-backup-${dateKey(Date.now())}.json`, blob)) {
      await setSetting('lastBackupAt', Date.now());
      toast('백업 파일을 만들었어요');
    }
  } catch (e) { console.error(e); toast('백업에 실패했어요: ' + (e as Error).message); }
}

async function importFlow() {
  const f = await pickFile('.json,application/json');
  if (!f) return;
  try {
    const parsed = parseBackup(JSON.parse(await f.text()));
    const c = parsed.counts;
    const mode = await choiceSheet({
      title: '백업 파일 불러오기',
      options: [
        { label: '지금 기록에 합치기', sub: `운동 ${c.sessions} · 루틴 ${c.routines} · 종목 ${c.exercises} · 몸 기록 ${c.body} (같은 항목은 파일 내용으로 덮어써요)`, value: 'merge', icon: 'plus' },
        { label: '전부 교체하기', sub: '지금 기기의 모든 데이터를 지우고 파일 내용으로 바꿔요', value: 'replace', icon: 'swap', danger: true },
      ],
    });
    if (!mode) return;
    if (mode === 'replace' && !(await confirmSheet({ title: '전부 교체할까요?', message: '지금 기기의 기록이 모두 지워지고 파일 내용으로 바뀌어요.', ok: '교체', danger: true }))) return;
    await backupActions.importBackup(parsed, mode);
    setSoundMode(settings.value.soundMode);
    toast('불러왔어요');
  } catch (e) {
    console.error(e);
    const msg = e instanceof BackupError ? e.message : e instanceof SyntaxError ? '파일 내용을 읽을 수 없어요' : (e as Error).message;
    toast('불러오지 못했어요: ' + msg, { ms: 3500 });
  }
}

async function wipeFlow() {
  const ok = await confirmSheet({ title: '모든 데이터를 삭제할까요?', message: '운동 기록, 루틴, 종목, 이미지가 모두 사라져요. 먼저 백업을 권장해요.', ok: '계속', danger: true });
  if (!ok) return;
  const t = await promptSheet({ title: '확인', label: '삭제하려면 "삭제"라고 입력하세요' });
  if (t?.trim() !== '삭제') return;
  await backupActions.wipeAll();
  void setWakeLock(false);
  toast('모두 삭제했어요');
  go(paths.home, { replace: true });
}
