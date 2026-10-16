import { describe, it, expect } from 'vitest';
import { buildPrompt, GROUP_SAMPLE, SYSTEM_PROMPT } from '../src/lib/prompt';
import type { TabItem } from '../src/lib/tabs';

const items: TabItem[] = [
  { i: 0, id: 100, title: 'React docs –\n Hooks', url: 'https://react.dev/reference', promptUrl: 'react.dev/reference' },
  { i: 1, id: 101, title: '', url: 'https://x.com/', promptUrl: 'x.com' },
];

describe('buildPrompt', () => {
  it('lists existing groups and tabs by index, one per line', () => {
    const text = buildPrompt(items, [{ id: 7, title: 'Work', color: 'blue', size: 1, tabs: [] }], 2);
    expect(text).toContain('at least 2 tabs');
    expect(text).toContain('id=7 | Work | blue | 1 tab\n');
    expect(text).toContain('0 | React docs – Hooks | react.dev/reference');
    expect(text).toContain('1 | (untitled) | x.com');
    expect(text).not.toContain('100');
  });

  it('shows a sample of the tabs in each existing group', () => {
    const tabs = Array.from({ length: GROUP_SAMPLE + 2 }, (_, k) => ({ title: `Doc ${k}`, promptUrl: `d.com/${k}` }));
    const text = buildPrompt(items, [{ id: 3, title: '', color: 'red', size: tabs.length, tabs }], 2);
    expect(text).toContain(`id=3 | (untitled) | red | ${tabs.length} tabs\n  - Doc 0 | d.com/0\n`);
    expect(text).toContain(`  - Doc ${GROUP_SAMPLE - 1} | d.com/${GROUP_SAMPLE - 1}\n  - …and 2 more\n`);
    expect(text).not.toContain(`Doc ${GROUP_SAMPLE} `);
  });

  it('says when there are no existing groups', () => {
    expect(buildPrompt(items, [], 3)).toMatch(/<existing_groups>\n\(none\)\n<\/existing_groups>/);
  });
});

describe('SYSTEM_PROMPT', () => {
  it('names every Chrome group color and treats tab text as data', () => {
    for (const c of ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']) {
      expect(SYSTEM_PROMPT).toContain(c);
    }
    expect(SYSTEM_PROMPT).toMatch(/not instructions/);
  });
});
