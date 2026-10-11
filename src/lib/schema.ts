import { z } from 'zod';
import type { TabItem } from './tabs';

// Pure: the model's answer format and the checks applied before touching any tab.

export const GROUP_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'] as const;
export type GroupColor = (typeof GROUP_COLORS)[number];

export const MAX_GROUP_TITLE = 24;

export const PlanSchema = z.object({
  groups: z.array(z.object({
    existingGroupId: z.number().int().nullable(),
    title: z.string(),
    color: z.enum(GROUP_COLORS),
    tabs: z.array(z.number().int()),
  })),
});

export type Plan = z.infer<typeof PlanSchema>;

export interface ResolvedGroup {
  /** Set when tabs join a group that already exists in the window. */
  existingGroupId: number | null;
  title: string;
  color: GroupColor;
  tabIds: number[];
}

/**
 * Turns the model's plan into something safe to apply:
 *  - unknown tab indexes are dropped, and each tab is used at most once (first group wins)
 *  - an existingGroupId that is not in this window turns the entry into a new group
 *  - new groups with fewer than minGroupSize tabs are dropped
 *  - titles are trimmed and capped at MAX_GROUP_TITLE characters
 *  - tabs keep their current window order
 */
export function validatePlan(
  plan: Plan,
  items: TabItem[],
  existingGroupIds: Iterable<number>,
  minGroupSize = 2,
): ResolvedGroup[] {
  const byIndex = new Map(items.map((item) => [item.i, item]));
  const existing = new Set(existingGroupIds);
  const used = new Set<number>();
  const result: ResolvedGroup[] = [];

  for (const group of plan.groups) {
    const picked: TabItem[] = [];
    for (const i of group.tabs) {
      const item = byIndex.get(i);
      if (!item || used.has(i)) continue;
      picked.push(item);
    }

    const existingGroupId = group.existingGroupId !== null && existing.has(group.existingGroupId)
      ? group.existingGroupId
      : null;
    const min = existingGroupId === null ? Math.max(1, minGroupSize) : 1;
    if (picked.length < min) continue;

    for (const item of picked) used.add(item.i);
    picked.sort((a, b) => a.i - b.i);
    result.push({
      existingGroupId,
      title: cleanTitle(group.title),
      color: group.color,
      tabIds: picked.map((item) => item.id),
    });
  }
  return result;
}

function cleanTitle(title: string): string {
  const t = title.replace(/\s+/g, ' ').trim();
  if (!t) return 'Tabs';
  return t.length > MAX_GROUP_TITLE ? `${t.slice(0, MAX_GROUP_TITLE - 1).trimEnd()}…` : t;
}
