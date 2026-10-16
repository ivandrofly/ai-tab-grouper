import { describe, it, expect } from 'vitest';
import { validatePlan, PlanSchema, type Plan } from '../src/lib/schema';
import type { TabItem } from '../src/lib/tabs';

const items: TabItem[] = [10, 11, 12, 13, 14].map((id, i) => ({
  i,
  id,
  title: `Tab ${id}`,
  url: `https://t${id}.com`,
  promptUrl: `t${id}.com`,
}));

const group = (tabs: number[], extra: Partial<Plan['groups'][number]> = {}) => ({
  existingGroupId: null,
  title: 'Docs',
  color: 'blue' as const,
  tabs,
  ...extra,
});

describe('validatePlan', () => {
  it('maps indexes to tab ids in window order', () => {
    const [g] = validatePlan({ groups: [group([3, 0, 1])] }, items, []);
    expect(g?.tabIds).toEqual([10, 11, 13]);
    expect(g?.existingGroupId).toBeNull();
  });

  it('drops unknown indexes and tabs already used by an earlier group', () => {
    const result = validatePlan({ groups: [group([0, 1, 99]), group([1, 2, 3], { title: 'B' })] }, items, []);
    expect(result.map((g) => g.tabIds)).toEqual([[10, 11], [12, 13]]);
  });

  it('enforces the minimum size for new groups only', () => {
    const result = validatePlan({
      groups: [
        group([0]),
        group([1], { existingGroupId: 5, title: 'Work' }),
        group([2, 3, 4], { title: 'Big' }),
      ],
    }, items, [{ id: 5, title: 'Work' }], 3);
    expect(result.map((g) => [g.title, g.tabIds])).toEqual([['Work', [11]], ['Big', [12, 13, 14]]]);
  });

  it('turns a stale existingGroupId into a new group', () => {
    const [g] = validatePlan({ groups: [group([0, 1], { existingGroupId: 42 })] }, items, [{ id: 5, title: 'Work' }]);
    expect(g?.existingGroupId).toBeNull();
  });

  it('sends a new group to an existing group with the same title', () => {
    const [g] = validatePlan({ groups: [group([0], { title: '  docs ' })] }, items, [{ id: 5, title: 'Docs' }]);
    expect(g).toEqual({ existingGroupId: 5, title: 'Docs', color: 'blue', tabIds: [10] });
  });

  it('does not match untitled existing groups by title', () => {
    const [g] = validatePlan({ groups: [group([0, 1], { title: '' })] }, items, [{ id: 5, title: '' }]);
    expect(g?.existingGroupId).toBeNull();
  });

  it('merges entries aimed at the same group', () => {
    const result = validatePlan({
      groups: [
        group([0], { existingGroupId: 5 }),
        group([3], { title: 'News' }),
        group([2], { title: 'work' }),
        group([4], { title: 'News' }),
      ],
    }, items, [{ id: 5, title: 'Work' }]);
    expect(result.map((g) => [g.existingGroupId, g.title, g.tabIds])).toEqual([
      [5, 'Work', [10, 12]],
      [null, 'News', [13, 14]],
    ]);
  });

  it('does not let a dropped group consume its tabs', () => {
    const result = validatePlan({ groups: [group([0]), group([0, 1], { title: 'Second' })] }, items, []);
    expect(result.map((g) => g.title)).toEqual(['Second']);
  });

  it('cleans and caps titles', () => {
    const [a, b] = validatePlan({
      groups: [
        group([0, 1], { title: '  Very   long group title that goes on  ' }),
        group([2, 3], { title: '   ' }),
      ],
    }, items, []);
    expect(a?.title).toBe('Very long group title t…');
    expect(a?.title.length).toBeLessThanOrEqual(24);
    expect(b?.title).toBe('Tabs');
  });

  it('treats minGroupSize below 1 as 1', () => {
    expect(validatePlan({ groups: [group([0])] }, items, [], 0)).toHaveLength(1);
  });
});

describe('PlanSchema', () => {
  it('accepts a well-formed plan and rejects an unknown color', () => {
    expect(PlanSchema.safeParse({ groups: [group([0, 1])] }).success).toBe(true);
    expect(PlanSchema.safeParse({ groups: [group([0, 1], { color: 'black' as never })] }).success).toBe(false);
  });
});
