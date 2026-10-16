# AI Tab Grouper

A Chrome extension (Manifest V3, TypeScript + Vite) that sends the titles and URLs of your ungrouped tabs to Claude, then sorts them into named, colored Chrome tab groups by topic.

It's a sibling of [tab-dedup](https://github.com/ivandrofly/tab-dedup) and [bookmark-dedup](https://github.com/ivandrofly/bookmark-dedup).

## Install (unpacked)

1. Run `npm ci && npm run build`. This writes the extension to `dist/`.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the `dist/` folder. You can also download `ai-tab-grouper-<version>.zip` from [Releases](https://github.com/ivandrofly/ai-tab-grouper/releases), extract it, and select the extracted folder.
4. Open the extension's **Settings**, paste a [Claude API key](https://console.anthropic.com/settings/keys) and click **Test key**.

Open the popup by clicking the icon or with <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>G</kbd>. You can change the shortcut at `chrome://extensions/shortcuts`.

## Using it

- The popup lists the tab groups in the current window, plus an **Ungrouped** card.
- **Group N tabs** asks Claude to sort the ungrouped, unpinned tabs. Claude can:
  - create new groups, each with a short title and a color;
  - add tabs to a group that already exists;
  - leave a tab ungrouped when nothing fits it.
- Groups touched by the last run are marked **new**. Clicking a tab title switches to that tab.
- The run happens in the background. You can close the popup while Claude is thinking, and the result is shown the next time you open it.
- **Undo** (in the toast, the header, or <kbd>Ctrl</kbd>+<kbd>Z</kbd>) ungroups the tabs from the last run. It only ungroups tabs that are still in the group the run put them in. Undo keeps working after the popup closes, until the browser restarts.

### Settings

| Setting | Default | |
| --- | --- | --- |
| Model | Claude Opus 5.5 | Sonnet 5.5 and Haiku 5.5 cost less per run. |
| Smallest new group | 2 | A single tab can still join an existing group. |
| Remove `?query` strings | on | Drops query strings, which are often tracking noise or personal data, before URLs are sent. |
| Collapse new groups | off | |

## Privacy

When you click **Group tabs**, the extension sends this to the Claude API at `api.anthropic.com`, using your API key:

- the title and URL of each ungrouped tab in that window (the `#fragment` is always removed, and the `?query` by default);
- the names and colors of the window's existing groups, plus the titles and URLs of up to 8 tabs in each, so Claude can add new tabs to the group they fit (URLs shortened the same way).

Page contents are never read. Nothing is sent at any other time. The API key is stored in `chrome.storage.local` on this device and is not synced.

Full policy: [PRIVACY.md](PRIVACY.md).

## Permissions

| Permission | Why |
| --- | --- |
| `tabs` | read tab titles and URLs |
| `tabGroups` | create, name and color groups |
| `storage` | settings (local) and the undo stack (session) |
| `favicon` | show site icons from Chrome's favicon cache |
| `https://api.anthropic.com/*` | call the Claude API from the service worker |

## Project layout

```
manifest.json            extension manifest (MV3), copied into dist/
vite.config.ts           builds popup, options and background.js into dist/
src/background.ts        service worker: runs a grouping and undo
src/popup/               the toolbar popup
src/options/             the settings page
src/shared.css           theme tokens and buttons shared by both pages
src/lib/tabs.ts          pure: picks the tabs to send and shortens their URLs
src/lib/prompt.ts        pure: system prompt and request text
src/lib/schema.ts        pure: answer schema (zod) and validatePlan()
src/lib/claude.ts        Claude API call (Anthropic SDK, structured output)
src/lib/apply.ts         chrome.tabs.group / tabGroups.update, ungroup for undo
src/lib/settings.ts      settings in chrome.storage.local
src/lib/messages.ts      message and storage types shared by worker and pages
tests/                   vitest unit tests for the pure lib modules
icons/                   toolbar / store icons
```

## Development

```
npm ci
npm run dev      # rebuild dist/ on change, then reload the extension in chrome://extensions
npm test         # vitest
npm run build    # typecheck + production build
```

CI runs the tests and the build on Node 22 and 24.

## Releasing

1. Bump `version` in `manifest.json` (and `package.json`), then commit and push.
2. Tag and push: `git tag -a vX.Y.Z -m vX.Y.Z && git push origin vX.Y.Z`

The [Release workflow](.github/workflows/release.yml) runs the tests, checks that the tag matches `manifest.json`, builds `dist/`, zips it and publishes the GitHub release. 0.x versions are published as pre-releases.
