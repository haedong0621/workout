import { mergeBodyEntry } from '@/domain/body';
import type { BodyEntry, BodyMetric } from '@/domain/types';
import { uuid } from '@/lib/id';
import { body, put, removeRecord } from './core';

/** 같은 날짜 기록이 있으면 값만 덮어씀 */
export function upsertBody(date: string, fields: Partial<Record<BodyMetric, number>>): BodyEntry {
  const existing = body.value.find((b) => b.date === date);
  return put('body', mergeBodyEntry(existing, existing?.id ?? uuid(), date, fields));
}

export const deleteBody = (id: string): void => removeRecord('body', id);
