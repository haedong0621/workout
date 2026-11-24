// 종목 상세: 이미지, 최고 기록, 그래프, 메모(수정하면 날짜 자동 갱신), 휴식, 기록 목록
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { exerciseHistory, lastUsedOption, metricOf, personalRecords, pinnedFirst, type ChartMetric } from '@/domain/history';
import { TOGGLE_OPTIONS } from '@/domain/catalog';
import { fmtMD, fmtNum, fmtYMD } from '@/lib/format';
import { pickImageFile, processImage } from '@/services/imageFile';
import { exName, exerciseActions, exerciseMap, imgURL, includeWarmup, replaceImage, restFor, sessions } from '@/store';
import { back, go, paths, type RouteProps } from '@/app/router';
import { Card, DiffBadge, EmptyState, MiniStepper, Segmented, StatTile, TopBar } from '@/ui/controls';
import { confirmSheet } from '@/ui/dialogs';
import { Icon } from '@/ui/Icon';
import { LineChart } from '@/ui/LineChart';
import { SetChips } from '@/ui/SetChips';
import { ExThumb } from '@/ui/thumbs';
import { toast } from '@/ui/toast';
import { exerciseForm } from '../exercises/ExerciseForm';

type Range = 'recent' | 'all';
const RECENT_POINTS = 12;
const LIST_LIMIT = 40;

export function ExerciseDetailPage({ params }: RouteProps) {
  const ex = exerciseMap.value.get(params.id ?? '');
  const [metric, setMetric] = useState<ChartMetric>('volume');
  const [range, setRange] = useState<Range>('recent');
  const inc = includeWarmup.value;
  // 바·머신 토글 운동은 옵션별로 기록을 따로 봄 (맨몸은 한 줄로)
  const opts = ex?.toggle && ex.toggle !== 'body' ? TOGGLE_OPTIONS[ex.toggle] : null;
  const [opt, setOpt] = useState<string | undefined>(() => (opts ? lastUsedOption(sessions.value, ex!.id) ?? opts[0] : undefined));
  const hist = useMemo(() => (ex ? exerciseHistory(sessions.value, ex.id, { includeWarmup: inc, opt: { toggle: ex.toggle, value: opt } }) : []), [sessions.value, ex?.id, inc, opt]);

  if (!ex) return <div class="page"><EmptyState title="운동을 찾을 수 없어요" action="종목으로" onAction={() => go(paths.library, { replace: true })} /></div>;

  const pr = personalRecords(hist);
  const chartSrc = range === 'recent' ? hist.slice(-RECENT_POINTS) : hist;
  const rows = pinnedFirst(hist.map((e, i) => ({ ...e, prev: i > 0 ? hist[i - 1] : undefined })).reverse(), ex.pinned);
  const pinned = new Set(ex.pinned);
  const url = imgURL(ex.imageId);

  async function changeImage() {
    const f = await pickImageFile();
    if (!f || !ex) return;
    try {
      const { blob, note } = await processImage(f);
      if (note) toast(note);
      const imageId = await replaceImage(ex.imageId, blob);
      exerciseActions.updateExercise(ex.id, (e) => ({ ...e, imageId }));
    } catch { toast('이미지를 불러오지 못했어요'); }
  }

  async function remove() {
    if (!ex) return;
    const ok = await confirmSheet({ title: `"${ex.name}" 삭제`, message: '지난 운동 기록에는 이름이 그대로 남아요. 루틴에서는 빠져요.', ok: '삭제', danger: true });
    if (!ok) return;
    exerciseActions.deleteExercise(ex.id);
    back(paths.library);
  }

  const stepRest = (d: number) => exerciseActions.setExerciseRest(ex.id, Math.max(10, restFor(ex) + d));

  return (
    <div class="page">
      <TopBar title="종목 상세" onBack={() => back(paths.library)} />
      <div class="hero">
        {ex.seed
          ? <div class="hero-img"><ExThumb ex={ex} size={120} opt={opt ?? null} /></div>
          : (
            <button class="hero-img" type="button" aria-label="이미지 변경" onClick={changeImage}>
              {url ? <img src={url} alt="" /> : <ExThumb ex={ex} size={120} />}
              <span class="thumb-edit"><Icon name="image" size={14} /></span>
            </button>
          )}
        <div class="hero-name">{exName(ex, opt)}</div>
        <div class="chips center">
          <span class="tag">{ex.part}</span>
          <span class="tag">{ex.toggle ? TOGGLE_OPTIONS[ex.toggle].join('/') : ex.equip}</span>
          {!ex.toggle && ex.kind === 'assist' && <span class="tag accent">어시스트</span>}
          {!ex.toggle && ex.kind === 'bodyweight' && <span class="tag accent">체중+추가</span>}
        </div>
        {!ex.imageId && <div class="sub">이미지를 눌러 사진·움짤로 바꿀 수 있어요</div>}
      </div>

      <div class="action-row">
        <button class="btn ghost small" type="button" onClick={() => void exerciseForm(ex)}><Icon name="edit" size={16} /> 수정</button>
        <button class={'btn ghost small' + (ex.fav ? ' on' : '')} type="button" onClick={() => exerciseActions.toggleFav(ex.id)}><Icon name="star" size={16} />{ex.fav ? ' 즐겨찾기 해제' : ' 즐겨찾기'}</button>
        <button class="btn danger-ghost small" type="button" aria-label="삭제" onClick={remove}><Icon name="trash" size={16} /></button>
      </div>

      {opts && opt && (
        <div class="opt-row">
          <div class="ex-toggle"><Segmented options={opts.map((o) => [o, o] as [string, string])} value={opt} onChange={setOpt} /></div>
          <div class="sub">고른 옵션의 최고 기록 · 그래프 · 운동 기록만 보여요</div>
        </div>
      )}

      <div class="stat-row">
        <StatTile label="최고 중량" value={pr.pr ? fmtNum(pr.pr) : '–'} unit="kg" />
        <StatTile label="추정 1RM" value={pr.rm ? fmtNum(pr.rm, 0) : '–'} unit="kg" />
        <StatTile label="최고 볼륨" value={pr.vol ? fmtNum(pr.vol, 0) : '–'} unit="kg" />
      </div>

      <Card title={<Segmented options={[['volume', '볼륨'], ['maxW', '최고 중량'], ['rm', '1RM']]} value={metric} onChange={setMetric} />}
        right={<Segmented options={[['recent', '최근'], ['all', '전체']]} value={range} onChange={setRange} />}>
        <LineChart points={chartSrc.map((e) => ({ ts: e.ts, value: Math.round(metricOf(e, metric) * 10) / 10 }))} />
      </Card>

      <MemoCard exId={ex.id} memo={ex.memo} memoAt={ex.memoAt} />

      <div class="card row-card">
        <div class="card-title"><Icon name="timer" size={16} /> 휴식 시간</div>
        <MiniStepper onMinus={() => stepRest(-15)} onPlus={() => stepRest(15)} minusLabel="15초 줄이기" plusLabel="15초 늘리기">{restFor(ex)}초</MiniStepper>
      </div>

      <Card title="운동 기록" right={<span class="sub">{hist.length}회</span>}>
        {rows.length === 0
          ? <div class="sub pad">아직 이 운동의 기록이 없어요. 운동을 완료하면 여기에 쌓여요.</div>
          : (
            <div class="hist-list">
              {rows.slice(0, LIST_LIMIT).map((e) => (
                <div key={e.sessionId + e.ts} class="hist-item static">
                  <button class="hist-main" type="button" onClick={() => go(paths.session(e.sessionId))}>
                    <div class="hist-top">
                      <b>{fmtMD(e.ts)}</b>
                      <span class="sub">{fmtNum(e.volume, 0)} kg</span>
                      {e.prev && <DiffBadge delta={e.volume - e.prev.volume} />}
                    </div>
                    <SetChips sets={e.sets} />
                  </button>
                  <button class={'icon-btn' + (pinned.has(e.sessionId) ? ' on' : '')} type="button" aria-label="고정" aria-pressed={pinned.has(e.sessionId)} onClick={() => exerciseActions.togglePin(ex.id, e.sessionId)}>
                    <Icon name="pin" size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
      </Card>
    </div>
  );
}

function MemoCard({ exId, memo, memoAt }: { exId: string; memo: string; memoAt: number | null }) {
  const [text, setText] = useState(memo);
  const latest = useRef(text);
  latest.current = text;
  // 다른 곳(운동 화면)에서 메모가 바뀌면 반영
  useEffect(() => setText(memo), [memo]);
  // 아이폰은 버튼을 눌러도 입력창 포커스가 안 빠질 수 있어서, 화면을 떠날 때도 저장
  useEffect(() => () => exerciseActions.setMemo(exId, latest.current), [exId]);
  const commit = () => exerciseActions.setMemo(exId, text);
  return (
    <Card title={<div class="card-title"><Icon name="note" size={16} /> 메모</div>} right={<span class="sub">{memoAt ? `마지막 수정 ${fmtYMD(memoAt)}` : ''}</span>}>
      <textarea class="input memo-area" rows={3} placeholder="세팅, 자세 팁, 시트 높이, 느낌 등을 적어 두세요" value={text}
        onInput={(e) => setText(e.currentTarget.value)} onBlur={commit} onChange={commit} />
    </Card>
  );
}
