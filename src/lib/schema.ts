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
 *  - an existingGroupId that is not in this window is ignored
 *  - a "new" group whose title matches an existing group's joins that group instead
 *  - entries aimed at the same group (same existing id, or same new title) are merged
 *  - unknown tab indexes are dropped, and each tab is used at most once (first group wins)
 *  - new groups with fewer than minGroupSize tabs are dropped
 *  - titles are trimmed and capped at MAX_GROUP_TITLE characters
 *  - tabs keep their current window order
 */
export function validatePlan(
  plan: Plan,
  items: TabItem[],
  existingGroups: Iterable<{ id: number; title: string }>,
  minGroupSize = 2,
): ResolvedGroup[] {
  const byIndex = new Map(items.map((item) => [item.i, item]));
  const existingById = new Map<number, string>();
  const existingByTitle = new Map<string, number>();
  for (const g of existingGroups) {
    existingById.set(g.id, g.title);
    const key = titleKey(g.title);
    if (key && !existingByTitle.has(key)) existingByTitle.set(key, g.id);
  }

  // Merge entries that target the same group, keeping the order they first appear in.
  const merged = new Map<string, { existingGroupId: number | null; title: string; color: GroupColor; tabs: number[] }>();
  for (const group of plan.groups) {
    const title = cleanTitle(group.title);
    const existingGroupId = group.existingGroupId !== null && existingById.has(group.existingGroupId)
      ? group.existingGroupId
      : existingByTitle.get(titleKey(title)) ?? null;
    const key = existingGroupId !== null ? `id:${existingGroupId}` : `new:${titleKey(title)}`;
    const entry = merged.get(key);
    if (entry) {
      entry.tabs.push(...group.tabs);
    } else {
      const existingTitle = existingGroupId !== null ? existingById.get(existingGroupId) : '';
      merged.set(key, { existingGroupId, title: existingTitle || title, color: group.color, tabs: [...group.tabs] });
    }
  }

  const used = new Set<number>();
  const result: ResolvedGroup[] = [];
  for (const group of merged.values()) {
    const picked = new Map<number, TabItem>();
    for (const i of group.tabs) {
      const item = byIndex.get(i);
      if (item && !used.has(i)) picked.set(i, item);
    }

    const min = group.existingGroupId === null ? Math.max(1, minGroupSize) : 1;
    if (picked.size < min) continue;

    for (const i of picked.keys()) used.add(i);
    result.push({
      existingGroupId: group.existingGroupId,
      title: group.title,
      color: group.color,
      tabIds: [...picked.values()].sort((a, b) => a.i - b.i).map((item) => item.id),
    });
  }
  return result;
}

/** Case- and whitespace-insensitive key for comparing group titles. */
function titleKey(title: string): string {
  return title.replace(/\s+/g, ' ').trim().toLowerCase();
}

function cleanTitle(title: string): string {
  const t = title.replace(/\s+/g, ' ').trim();
  if (!t) return 'Tabs';
  return t.length > MAX_GROUP_TITLE ? `${t.slice(0, MAX_GROUP_TITLE - 1).trimEnd()}…` : t;
}
