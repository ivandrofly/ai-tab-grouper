// Pure helpers (no chrome.* calls) so they can be unit-tested in Node.

/** chrome.tabGroups.TAB_GROUP_ID_NONE, inlined so this module stays chrome-free. */
export const NO_GROUP = -1;

const MAX_TITLE = 120;
const MAX_URL = 160;

export interface TabItem {
  /** Short index used in the prompt instead of the real tab id. */
  i: number;
  id: number;
  title: string;
  /** Full URL, for favicons and display. */
  url: string;
  /** Shortened URL sent to the model. */
  promptUrl: string;
}

export interface TabLike {
  id?: number;
  title?: string;
  url?: string;
  pendingUrl?: string;
  pinned?: boolean;
  groupId?: number;
}

/**
 * Shortens a URL for the prompt: drops the scheme, a leading "www." and the
 * #fragment, and (when stripQuery is set) the ?query, which is mostly tracking
 * noise and can hold tokens or personal data.
 */
export function cleanUrl(url: string, stripQuery = true): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url.slice(0, MAX_URL);
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return `${u.protocol}//${u.host}${u.pathname}`.slice(0, MAX_URL);

  const host = u.host.toLowerCase().replace(/^www\./, '');
  const path = u.pathname === '/' ? '' : u.pathname.replace(/\/+$/, '');
  const query = stripQuery ? '' : u.search;
  return `${host}${path}${query}`.slice(0, MAX_URL);
}

/**
 * Picks the tabs a grouping run should consider: ungrouped, unpinned, with a
 * URL, and not one of the extension's own pages or an empty new tab page.
 */
export function toItems(
  tabs: TabLike[],
  { ignorePrefix = '', stripQuery = true }: { ignorePrefix?: string; stripQuery?: boolean } = {},
): TabItem[] {
  const items: TabItem[] = [];
  for (const tab of tabs) {
    if (tab.id === undefined || tab.pinned || (tab.groupId ?? NO_GROUP) !== NO_GROUP) continue;
    const url = tab.url || tab.pendingUrl || '';
    if (!url || isBlank(url) || (ignorePrefix && url.startsWith(ignorePrefix))) continue;
    items.push({
      i: items.length,
      id: tab.id,
      title: (tab.title || '').trim().slice(0, MAX_TITLE),
      url,
      promptUrl: cleanUrl(url, stripQuery),
    });
  }
  return items;
}

function isBlank(url: string): boolean {
  return url === 'about:blank' || url.startsWith('chrome://newtab') || url.startsWith('chrome://new-tab-page');
}
