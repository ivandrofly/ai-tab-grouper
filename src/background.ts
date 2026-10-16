import { loadSettings } from './lib/settings';
import { toItems, groupTabs } from './lib/tabs';
import { validatePlan } from './lib/schema';
import { suggestGroups, toUserFacing, testKey } from './lib/claude';
import { applyPlan, ungroupMoves } from './lib/apply';
import type { ExistingGroup } from './lib/prompt';
import { RUN_KEY, UNDO_KEY, type Message, type Replies, type RunState, type UndoBatch } from './lib/messages';

// Grouping and undo run here (not in the popup) so they finish even if the
// popup is dismissed while Claude is thinking.

const UNDO_LIMIT = 10;
const OWN_PREFIX = chrome.runtime.getURL('');

// ---------- grouping ----------

const running = new Set<number>();

async function setRun(state: RunState) {
  await chrome.storage.session.set({ [RUN_KEY]: state });
}

async function groupWindow(windowId: number): Promise<Replies['group']> {
  if (running.has(windowId)) throw new Error('Already grouping this window.');
  running.add(windowId);
  try {
    const settings = await loadSettings();
    if (!settings.apiKey) throw new Error('Add your Claude API key in Settings first.');

    const [tabs, tabGroups] = await Promise.all([
      chrome.tabs.query({ windowId }),
      chrome.tabGroups.query({ windowId }),
    ]);
    const items = toItems(tabs, { ignorePrefix: OWN_PREFIX, stripQuery: settings.stripQuery });
    if (items.length === 0) return finish(windowId, 'No ungrouped tabs to sort.', []);

    const groups: ExistingGroup[] = tabGroups.map((g) => ({
      id: g.id,
      title: g.title ?? '',
      color: g.color,
      size: tabs.filter((t) => t.groupId === g.id).length,
      tabs: groupTabs(tabs, g.id, { stripQuery: settings.stripQuery }),
    }));
    if (items.length === 1 && groups.length === 0) return finish(windowId, 'Only one ungrouped tab, nothing to group.', []);

    await setRun({ status: 'running', windowId, at: Date.now(), tabs: items.length });
    const plan = await suggestGroups({
      apiKey: settings.apiKey,
      model: settings.model,
      items,
      groups,
      minGroupSize: settings.minGroupSize,
    });
    const resolved = validatePlan(plan, items, groups, settings.minGroupSize);
    const { applied, failed } = await applyPlan(windowId, resolved, { collapseNew: settings.collapseNew });

    const moves = applied.flatMap((g) => g.tabIds.map((tabId) => ({ tabId, groupId: g.groupId })));
    if (moves.length) await pushUndo({ at: Date.now(), moves });

    const created = applied.filter((g) => g.created).length;
    const joined = applied.length - created;
    const parts = [`Grouped ${moves.length} of ${items.length} tab${items.length === 1 ? '' : 's'}`];
    if (created) parts.push(`${created} new group${created === 1 ? '' : 's'}`);
    if (joined) parts.push(`${joined} existing`);
    let message = moves.length ? `${parts.join(' · ')}.` : 'Claude found nothing worth grouping.';
    if (failed) message += ` ${failed} group${failed === 1 ? '' : 's'} could not be applied.`;
    return finish(windowId, message, applied.map((g) => g.groupId), moves.length);
  } catch (err) {
    const message = toUserFacing(err).message;
    await setRun({ status: 'error', windowId, at: Date.now(), message });
    throw new Error(message);
  } finally {
    running.delete(windowId);
  }
}

async function finish(windowId: number, message: string, groupIds: number[], moved = 0) {
  await setRun({ status: 'done', windowId, at: Date.now(), message, groupIds });
  return { message, moved };
}

// ---------- undo ----------

async function readUndo(): Promise<UndoBatch[]> {
  const { [UNDO_KEY]: stack = [] } = await chrome.storage.session.get(UNDO_KEY);
  return stack as UndoBatch[];
}

async function pushUndo(batch: UndoBatch) {
  const stack = await readUndo();
  stack.push(batch);
  await chrome.storage.session.set({ [UNDO_KEY]: stack.slice(-UNDO_LIMIT) });
}

async function undoLast(): Promise<Replies['undo']> {
  const stack = await readUndo();
  const batch = stack.pop();
  if (!batch) return { ungrouped: 0, total: 0 };
  await chrome.storage.session.set({ [UNDO_KEY]: stack });
  const ungrouped = await ungroupMoves(batch.moves);
  await chrome.storage.session.remove(RUN_KEY);
  return { ungrouped, total: batch.moves.length };
}

// ---------- messages ----------

chrome.runtime.onMessage.addListener((msg: Message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;
  const handlers: Record<Message['type'], () => Promise<unknown>> = {
    group: () => groupWindow((msg as Extract<Message, { type: 'group' }>).windowId),
    undo: () => undoLast(),
    testKey: async () => {
      const { apiKey, model } = msg as Extract<Message, { type: 'testKey' }>;
      return { name: await testKey(apiKey, model) };
    },
  };
  const handler = handlers[msg?.type];
  if (!handler) return false;
  handler().then(sendResponse, (err) => sendResponse({ error: String(err?.message ?? err) }));
  return true; // async response
});

// A run interrupted by a service worker restart would otherwise look stuck forever.
chrome.runtime.onStartup.addListener(() => chrome.storage.session.remove(RUN_KEY));
chrome.storage.session.get(RUN_KEY).then(({ [RUN_KEY]: run }) => {
  if ((run as RunState | undefined)?.status === 'running' && running.size === 0) {
    chrome.storage.session.remove(RUN_KEY);
  }
});
