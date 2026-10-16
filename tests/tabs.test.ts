import { describe, it, expect } from 'vitest';
import { cleanUrl, toItems, groupTabs, NO_GROUP } from '../src/lib/tabs';

describe('cleanUrl', () => {
  it('drops scheme, www., fragment and trailing slash', () => {
    expect(cleanUrl('https://www.Example.com/docs/intro/#setup')).toBe('example.com/docs/intro');
  });

  it('drops the query string by default and keeps it on request', () => {
    expect(cleanUrl('https://youtube.com/watch?v=abc&t=10')).toBe('youtube.com/watch');
    expect(cleanUrl('https://youtube.com/watch?v=abc', false)).toBe('youtube.com/watch?v=abc');
  });

  it('keeps a bare host for the root path', () => {
    expect(cleanUrl('https://github.com/')).toBe('github.com');
  });

  it('keeps non-http URLs readable', () => {
    expect(cleanUrl('chrome://settings/privacy')).toBe('chrome://settings/privacy');
    expect(cleanUrl('file:///C:/notes/todo.txt')).toBe('file:///C:/notes/todo.txt');
  });

  it('returns unparseable input truncated', () => {
    expect(cleanUrl('not a url')).toBe('not a url');
  });

  it('caps very long URLs', () => {
    expect(cleanUrl(`https://a.com/${'x'.repeat(500)}`).length).toBe(160);
  });
});

describe('toItems', () => {
  const tab = (id: number, extra: object = {}) => ({
    id,
    title: `Tab ${id}`,
    url: `https://site${id}.com/page`,
    groupId: NO_GROUP,
    pinned: false,
    ...extra,
  });

  it('keeps only ungrouped, unpinned tabs and numbers them from 0', () => {
    const items = toItems([
      tab(1),
      tab(2, { pinned: true }),
      tab(3, { groupId: 7 }),
      tab(4),
    ]);
    expect(items.map((t) => [t.i, t.id])).toEqual([[0, 1], [1, 4]]);
  });

  it('skips blank pages, own extension pages and tabs without an id or URL', () => {
    const items = toItems([
      tab(1, { url: 'chrome://newtab/' }),
      tab(2, { url: 'about:blank' }),
      tab(3, { url: 'chrome-extension://me/popup.html' }),
      tab(4, { url: '' }),
      { title: 'no id', url: 'https://x.com' },
      tab(5),
    ], { ignorePrefix: 'chrome-extension://me/' });
    expect(items.map((t) => t.id)).toEqual([5]);
  });

  it('falls back to pendingUrl and trims long titles', () => {
    const [item] = toItems([tab(1, { url: undefined, pendingUrl: 'https://load.ing/x', title: `  ${'t'.repeat(300)}  ` })]);
    expect(item?.url).toBe('https://load.ing/x');
    expect(item?.promptUrl).toBe('load.ing/x');
    expect(item?.title.length).toBe(120);
  });

  it('respects stripQuery', () => {
    const [item] = toItems([tab(1, { url: 'https://a.com/s?q=cats' })], { stripQuery: false });
    expect(item?.promptUrl).toBe('a.com/s?q=cats');
  });
});

describe('groupTabs', () => {
  it('describes only the tabs in the given group, with shortened URLs', () => {
    const tabs = [
      { id: 1, title: ' Issue 12 ', url: 'https://github.com/a/b/issues/12?x=1', groupId: 7 },
      { id: 2, title: 'Other', url: 'https://other.com', groupId: 8 },
      { id: 3, title: 'Loading', pendingUrl: 'https://docs.a.dev/', groupId: 7 },
    ];
    expect(groupTabs(tabs, 7)).toEqual([
      { title: 'Issue 12', promptUrl: 'github.com/a/b/issues/12' },
      { title: 'Loading', promptUrl: 'docs.a.dev' },
    ]);
    expect(groupTabs(tabs, 7, { stripQuery: false })[0]?.promptUrl).toBe('github.com/a/b/issues/12?x=1');
  });
});
