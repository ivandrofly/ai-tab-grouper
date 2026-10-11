import type { ResolvedGroup } from './schema';

export interface AppliedGroup {
  groupId: number;
  title: string;
  color: string;
  tabIds: number[];
  created: boolean;
}

export interface ApplyResult {
  applied: AppliedGroup[];
  /** Groups that could not be created or joined. */
  failed: number;
}

/**
 * Creates or joins groups. Tabs that were closed, pinned, grouped or moved to
 * another window while Claude was thinking are skipped rather than failing the run.
 */
export async function applyPlan(
  windowId: number,
  groups: ResolvedGroup[],
  { collapseNew = false }: { collapseNew?: boolean } = {},
): Promise<ApplyResult> {
  const current = await chrome.tabs.query({ windowId, pinned: false });
  const stillUngrouped = new Set(
    current.filter((t) => t.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE).map((t) => t.id),
  );
  const liveGroups = new Set((await chrome.tabGroups.query({ windowId })).map((g) => g.id));

  const applied: AppliedGroup[] = [];
  let failed = 0;
  for (const group of groups) {
    const tabIds = group.tabIds.filter((id) => stillUngrouped.has(id)) as [number, ...number[]];
    if (!tabIds.length) continue;
    try {
      if (group.existingGroupId !== null && liveGroups.has(group.existingGroupId)) {
        await chrome.tabs.group({ tabIds, groupId: group.existingGroupId });
        applied.push({ groupId: group.existingGroupId, title: group.title, color: group.color, tabIds, created: false });
      } else {
        const groupId = await chrome.tabs.group({ tabIds, createProperties: { windowId } });
        await chrome.tabGroups.update(groupId, { title: group.title, color: group.color });
        applied.push({ groupId, title: group.title, color: group.color, tabIds, created: true });
        if (collapseNew) {
          // Chrome refuses to collapse the group holding the active tab; that's fine.
          chrome.tabGroups.update(groupId, { collapsed: true }).catch(() => {});
        }
      }
      for (const id of tabIds) stillUngrouped.delete(id);
    } catch (err) {
      console.warn('grouping failed', group, err);
      failed++;
    }
  }
  return { applied, failed };
}

/** Ungroups tabs from a previous run, but only those still in the group we put them in. */
export async function ungroupMoves(moves: { tabId: number; groupId: number }[]): Promise<number> {
  const tabs = await Promise.all(moves.map((m) => chrome.tabs.get(m.tabId).catch(() => null)));
  const ids = moves
    .filter((m, k) => tabs[k]?.groupId === m.groupId)
    .map((m) => m.tabId);
  if (ids.length) await chrome.tabs.ungroup(ids as [number, ...number[]]);
  return ids.length;
}
