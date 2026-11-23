import { describe, expect, it } from 'vitest';
import { edgeScrollSpeed, sortLayout } from '@/ui/sortMath';

// 높이 100, 간격 10인 항목 4개 (top: 0, 110, 220, 330)
const boxes = [0, 110, 220, 330].map((top) => ({ top, height: 100 }));

describe('sortLayout', () => {
  it('조금 움직이면 제자리', () => {
    expect(sortLayout(boxes, 1, 20)).toEqual({ to: 1, shifts: [0, 0, 0, 0] });
  });
  it('아래 항목의 가운데를 넘으면 그 자리로, 넘은 항목은 위로 밀림', () => {
    const r = sortLayout(boxes, 0, 120);
    expect(r.to).toBe(1);
    expect(r.shifts).toEqual([0, -110, 0, 0]);
    expect(sortLayout(boxes, 0, 400).to).toBe(3);
  });
  it('위로 끌면 위 항목들이 아래로 밀림', () => {
    const r = sortLayout(boxes, 3, -250);
    expect(r.to).toBe(1);
    expect(r.shifts).toEqual([0, 110, 110, 0]);
  });
  it('끝을 넘어가도 처음/마지막 자리', () => {
    expect(sortLayout(boxes, 2, -999).to).toBe(0);
    expect(sortLayout(boxes, 1, 999).to).toBe(3);
  });
  it('높이가 다른 항목', () => {
    const b = [{ top: 0, height: 300 }, { top: 312, height: 80 }, { top: 404, height: 300 }];
    expect(sortLayout(b, 1, -210).to).toBe(0);
    expect(sortLayout(b, 1, 210).to).toBe(2);
    expect(sortLayout(b, 1, 150).to).toBe(1);
  });
});

describe('edgeScrollSpeed', () => {
  it('가운데는 0, 위·아래 끝은 방향대로', () => {
    expect(edgeScrollSpeed(400, 0, 800)).toBe(0);
    expect(edgeScrollSpeed(10, 0, 800)).toBeLessThan(0);
    expect(edgeScrollSpeed(790, 0, 800)).toBeGreaterThan(0);
  });
});
