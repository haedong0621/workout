// 내 몸: 몸무게·골격근량·체지방률 기록
import { signal } from '@preact/signals';
import { useState } from 'preact/hooks';
import { bodySeries, sortBody } from '@/domain/body';
import type { BodyMetric } from '@/domain/types';
import { dateKey, fmtNum, fmtYMD, keyToTs } from '@/lib/format';
import { parseNum } from '@/lib/num';
import { body, bodyActions } from '@/store';
import { Card, Segmented } from '@/ui/controls';
import { confirmSheet } from '@/ui/dialogs';
import { Icon } from '@/ui/Icon';
import { LineChart } from '@/ui/LineChart';
import { toast } from '@/ui/toast';

const METRICS: Record<BodyMetric, { label: string; unit: string; cls: string; placeholder: string }> = {
  weight: { label: '몸무게', unit: 'kg', cls: 'm-weight', placeholder: '몸무게 kg' },
  muscle: { label: '골격근량', unit: 'kg', cls: 'm-muscle', placeholder: '골격근량 kg (선택)' },
  fat: { label: '체지방률', unit: '%', cls: 'm-fat', placeholder: '체지방률 % (선택)' },
};
const KEYS = Object.keys(METRICS) as BodyMetric[];
type Range = 'recent' | 'all';
const RECENT_POINTS = 30;

const metric = signal<BodyMetric>('weight');
const range = signal<Range>('recent');

export function BodyPage() {
  const entries = sortBody(body.value);
  const m = METRICS[metric.value];
  const ser = bodySeries(body.value, metric.value);
  const chartSrc = range.value === 'recent' ? ser.slice(-RECENT_POINTS) : ser;

  return (
    <div class="page">
      <div class="page-head"><h1>내 몸</h1></div>
      <div class="metric-row">
        {KEYS.map((k) => {
          const s = bodySeries(body.value, k);
          const last = s[s.length - 1]?.[k];
          const prev = s[s.length - 2]?.[k];
          const delta = last != null && prev != null ? last - prev : null;
          const meta = METRICS[k];
          return (
            <button key={k} class={'metric-tile ' + meta.cls + (metric.value === k ? ' sel' : '')} type="button" onClick={() => { metric.value = k; }}>
              <div class="mt-label">{meta.label}</div>
              <div class="mt-val">{last != null ? fmtNum(last) : '–'}<span>{meta.unit}</span></div>
              <div class="mt-delta">{delta != null ? `${delta > 0 ? '▲' : delta < 0 ? '▼' : '–'} ${fmtNum(Math.abs(delta))}${meta.unit}` : ' '}</div>
            </button>
          );
        })}
      </div>

      <BodyForm />

      <Card title={m.label} right={<Segmented options={[['recent', '최근'], ['all', '전체']]} value={range.value} onChange={(v) => { range.value = v; }} />}>
        <LineChart points={chartSrc.map((e) => ({ ts: keyToTs(e.date), value: Number(e[metric.value]) }))} unit={m.unit} />
      </Card>

      <Card title="기록 목록">
        {entries.length === 0 ? <div class="sub pad">아직 기록이 없어요</div> : (
          <div class="list">
            {[...entries].reverse().slice(0, 40).map((e) => (
              <div key={e.id} class="list-item static">
                <div class="grow">
                  <div class="li-title">{fmtYMD(keyToTs(e.date))}</div>
                  <div class="sub">{[e.weight ? `${fmtNum(e.weight)}kg` : null, e.muscle ? `근육 ${fmtNum(e.muscle)}kg` : null, e.fat ? `체지방 ${fmtNum(e.fat)}%` : null].filter(Boolean).join(' · ')}</div>
                </div>
                <button class="icon-btn danger" type="button" aria-label="삭제" onClick={async () => {
                  if (await confirmSheet({ title: '기록을 삭제할까요?', message: fmtYMD(keyToTs(e.date)), ok: '삭제', danger: true })) bodyActions.deleteBody(e.id);
                }}><Icon name="trash" size={18} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function BodyForm() {
  const today = dateKey(Date.now());
  const [date, setDate] = useState(today);
  const [vals, setVals] = useState<Record<BodyMetric, string>>({ weight: '', muscle: '', fat: '' });
  const latest = (k: BodyMetric) => { const s = bodySeries(body.value, k); return s[s.length - 1]?.[k]; };

  function submit() {
    const fields = Object.fromEntries(KEYS.map((k) => [k, parseNum(vals[k], NaN)])) as Record<BodyMetric, number>;
    if (!KEYS.some((k) => Number.isFinite(fields[k]) && fields[k] > 0)) { toast('값을 하나 이상 입력해 주세요'); return; }
    bodyActions.upsertBody(date || today, fields);
    setVals({ weight: '', muscle: '', fat: '' });
    toast('기록했어요');
  }

  return (
    <Card title="기록하기" right={<input class="input" type="date" value={date} onInput={(e) => setDate(e.currentTarget.value)} />}>
      <div class="form-grid">
        {KEYS.map((k) => {
          const l = latest(k);
          const meta = METRICS[k];
          return (
            <input key={k} class="input" type="text" inputMode="decimal" aria-label={meta.label}
              placeholder={l != null ? `${meta.label} (최근 ${l}${meta.unit})` : meta.placeholder}
              value={vals[k]} onInput={(e) => { const v = e.currentTarget.value; setVals((x) => ({ ...x, [k]: v })); }} />
          );
        })}
      </div>
      <button class="btn primary wide mt" type="button" onClick={submit}>저장</button>
      <div class="sub pad">몸무게는 어시스트·체중 운동의 볼륨 계산에도 쓰여요</div>
    </Card>
  );
}
