import { fmtClock } from '@/lib/format';
import { addRest, rest, restDone, restProgress, restRemainingSec, stopRest } from '@/services/restTimer';

export function RestBar() {
  const r = rest.value;
  if (!r.endAt) return <div class="restbar" />;
  const done = restDone.value;
  return (
    <div class={'restbar show' + (done ? ' done' : '')} role="timer">
      <div class="rest-fill" style={{ width: `${done ? 100 : restProgress.value * 100}%` }} />
      <div class="rest-inner">
        <div class="rest-info">
          <div class="rest-label">{done ? '다음 세트 시작' : r.label ? `휴식 · ${r.label}` : '휴식'}</div>
          <div class="rest-time mono">{done ? '휴식 끝!' : fmtClock(restRemainingSec.value)}</div>
        </div>
        <div class="rest-btns">
          <button type="button" onClick={() => addRest(-15)}>−15</button>
          <button type="button" onClick={() => addRest(15)}>+15</button>
          <button type="button" class="skip" onClick={stopRest}>닫기</button>
        </div>
      </div>
    </div>
  );
}
