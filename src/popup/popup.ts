import { loadSettings, onSettingsChanged } from '../lib/settings';
import { RUN_KEY, UNDO_KEY, send, type RunState, type UndoBatch } from '../lib/messages';
import { toItems } from '../lib/tabs';

const TOAST_MS = 6000;
const NO_GROUP = chrome.tabGroups.TAB_GROUP_ID_NONE;
const OWN_PREFIX = chrome.runtime.getURL('');

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const els = {
  summary: $('#summary'),
  undo: $<HTMLButtonElement>('#undo'),
  settings: $('#settings'),
  setup: $('#setup'),
  openSettings: $('#open-settings'),
  group: $<HTMLButtonElement>('#group'),
  groupLabel: $('#group-label'),
  status: $('#status'),
  list: $('#list'),
  toast: $('#toast'),
  toastText: $('#toast-text'),
  toastUndo: $<HTMLButtonElement>('#toast-undo'),
  groupTpl: $<HTMLTemplateElement>('#group-tpl'),
  rowTpl: $<HTMLTemplateElement>('#row-tpl'),
};

const state = {
  windowId: chrome.windows.WINDOW_ID_NONE as number,
  tabs: [] as chrome.tabs.Tab[],
  groups: [] as chrome.tabGroups.TabGroup[],
  hasKey: false,
  run: undefined as RunState | undefined,
  busy: false,
  /** <details> open state survives re-renders. */
  open: new Map<number, boolean>(),
};

// ---------- scanning ----------

async function scan() {
  try {
    const win = await chrome.windows.getCurrent();
    state.windowId = win.id ?? chrome.windows.WINDOW_ID_NONE;
    const [tabs, groups] = await Promise.all([
      chrome.tabs.query({ windowId: state.windowId }),
      chrome.tabGroups.query({ windowId: state.windowId }),
    ]);
    state.tabs = tabs;
    state.groups = groups;
    render();
  } catch (err) {
    console.error(err);
    els.summary.textContent = `Could not read tabs: ${(err as Error).message}`;
  }
}

let rescanTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleScan() {
  clearTimeout(rescanTimer);
  rescanTimer = setTimeout(scan, 150);
}

chrome.tabs.onCreated.addListener(scheduleScan);
chrome.tabs.onRemoved.addListener(scheduleScan);
chrome.tabs.onMoved.addListener(scheduleScan);
chrome.tabs.onAttached.addListener(scheduleScan);
chrome.tabs.onDetached.addListener(scheduleScan);
chrome.tabs.onUpdated.addListener((_id, change) => {
  if ('url' in change || 'title' in change || 'pinned' in change || 'groupId' in change) scheduleScan();
});
chrome.tabGroups.onCreated.addListener(scheduleScan);
chrome.tabGroups.onUpdated.addListener(scheduleScan);
chrome.tabGroups.onRemoved.addListener(scheduleScan);

// ---------- rendering ----------

function ungroupedTabs() {
  return state.tabs.filter((t) => t.groupId === NO_GROUP && !t.pinned);
}

function render() {
  const ungrouped = ungroupedTabs();
  els.summary.replaceChildren(strong(ungrouped.length), ` ungrouped · ${state.groups.length} group${state.groups.length === 1 ? '' : 's'}`);
  // The same filter the worker applies, so the button count matches what gets sent.
  const n = toItems(ungrouped, { ignorePrefix: OWN_PREFIX }).length;

  const run = state.run?.windowId === state.windowId ? state.run : undefined;
  const running = state.busy || run?.status === 'running';
  els.setup.hidden = state.hasKey;
  els.group.disabled = running || !state.hasKey || n === 0;
  els.group.toggleAttribute('aria-busy', running);
  els.groupLabel.textContent = running
    ? `Asking Claude${run?.status === 'running' ? ` about ${run.tabs} tab${run.tabs === 1 ? '' : 's'}` : ''}…`
    : n ? `Group ${n} tab${n === 1 ? '' : 's'}` : 'Group tabs';

  els.status.classList.toggle('error', run?.status === 'error');
  els.status.textContent = run && run.status !== 'running' ? run.message : '';

  const fresh = new Set(run?.status === 'done' ? run.groupIds : []);
  const cards = state.groups.map((g) => renderGroup(
    {
      key: g.id,
      title: g.title || '(untitled group)',
      color: g.color,
      tabs: state.tabs.filter((t) => t.groupId === g.id),
    },
    fresh.has(g.id),
  ));
  if (ungrouped.length) cards.push(renderGroup({ key: NO_GROUP, title: 'Ungrouped', color: '', tabs: ungrouped }, false));

  if (cards.length) {
    els.list.replaceChildren(...cards);
  } else {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No tabs to group in this window.';
    els.list.replaceChildren(empty);
  }
}

function renderGroup(
  group: { key: number; title: string; color: string; tabs: chrome.tabs.Tab[] },
  fresh: boolean,
) {
  const node = els.groupTpl.content.firstElementChild!.cloneNode(true) as HTMLDetailsElement;
  if (group.color) node.classList.add(`c-${group.color}`);
  node.classList.toggle('ungrouped', group.key === NO_GROUP);
  node.classList.toggle('fresh', fresh);
  node.open = state.open.get(group.key) ?? (fresh || group.key === NO_GROUP);
  node.addEventListener('toggle', () => state.open.set(group.key, node.open));

  node.querySelector('.group-title')!.textContent = group.title;
  (node.querySelector('.tag') as HTMLElement).hidden = !fresh;
  node.querySelector('.badge')!.textContent = String(group.tabs.length);
  node.querySelector('.rows')!.append(...group.tabs.map(renderRow));
  return node;
}

function renderRow(tab: chrome.tabs.Tab) {
  const row = els.rowTpl.content.firstElementChild!.cloneNode(true) as HTMLElement;
  const url = tab.url || tab.pendingUrl || '';
  (row.querySelector('.favicon') as HTMLImageElement).src = faviconUrl(url);
  const title = row.querySelector('.title') as HTMLButtonElement;
  title.textContent = tab.title || url || '(untitled)';
  title.title = url;
  title.classList.toggle('untitled', !tab.title);
  title.addEventListener('click', () => switchTo(tab));
  return row;
}

function strong(text: string | number) {
  const el = document.createElement('strong');
  el.textContent = String(text);
  return el;
}

function faviconUrl(pageUrl: string) {
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', pageUrl);
  url.searchParams.set('size', '32');
  return url.toString();
}

async function switchTo(tab: chrome.tabs.Tab) {
  if (tab.id === undefined) return;
  await chrome.tabs.update(tab.id, { active: true });
  window.close();
}

// ---------- group / undo (executed by the service worker) ----------

async function groupTabs() {
  if (state.busy || els.group.disabled) return;
  setBusy(true);
  try {
    const { message, moved } = await send({ type: 'group', windowId: state.windowId });
    showToast(message, moved > 0);
  } catch {
    // The worker also stores the error in RUN_KEY, which render() shows under the button.
  } finally {
    setBusy(false);
  }
}

async function undoLast() {
  if (state.busy || els.undo.hidden) return;
  setBusy(true);
  try {
    const { ungrouped, total } = await send({ type: 'undo' });
    showToast(total ? `Ungrouped ${ungrouped} of ${total} tab${total === 1 ? '' : 's'}.` : 'Nothing to undo.', false);
  } catch (err) {
    showToast(`Undo failed: ${(err as Error).message}`, false);
  } finally {
    setBusy(false);
  }
}

async function refreshSession() {
  const { [UNDO_KEY]: stack = [], [RUN_KEY]: run } = await chrome.storage.session.get([UNDO_KEY, RUN_KEY]);
  const last = (stack as UndoBatch[]).at(-1);
  els.undo.hidden = !last;
  if (last) els.undo.textContent = `Undo (${last.moves.length})`;
  state.run = run as RunState | undefined;
  render();
}

chrome.storage.session.onChanged.addListener((changes) => {
  if (UNDO_KEY in changes || RUN_KEY in changes) refreshSession();
});

let toastTimer: ReturnType<typeof setTimeout> | undefined;
function showToast(message: string, canUndo: boolean) {
  els.toastText.textContent = message;
  els.toastUndo.hidden = !canUndo;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.toast.hidden = true; }, TOAST_MS);
}

function setBusy(busy: boolean) {
  state.busy = busy;
  document.body.toggleAttribute('aria-busy', busy);
  els.undo.disabled = busy;
  els.toastUndo.disabled = busy;
  render();
}

// ---------- controls ----------

els.group.addEventListener('click', groupTabs);
els.undo.addEventListener('click', undoLast);
els.toastUndo.addEventListener('click', undoLast);
els.settings.addEventListener('click', () => chrome.runtime.openOptionsPage());
els.openSettings.addEventListener('click', () => chrome.runtime.openOptionsPage());

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    undoLast();
  }
});

onSettingsChanged((s) => {
  state.hasKey = !!s.apiKey;
  render();
});

loadSettings().then((s) => {
  state.hasKey = !!s.apiKey;
  return Promise.all([scan(), refreshSession()]);
});
