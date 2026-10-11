# Chrome Web Store Listing — AI Tab Grouper

> Last Updated: 2026-10-11

Everything to paste into the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole). Keep it in sync with `manifest.json` and `PRIVACY.md`.

## Store Listing

**Extension Name**
AI Tab Grouper

**Short Description** (manifest `description`, 71/132 chars)
Uses Claude to sort your open tabs into named Chrome tab groups by topic.

**Detailed Description** (plain text, paste as-is)

```
Sort a window full of tabs into named, colored tab groups with one click. AI Tab Grouper sends the titles and addresses of your ungrouped tabs to Claude, which groups them by topic, project or task, not just by website.

FEATURES
• One-click grouping: creates new groups with short titles and colors, or adds tabs to groups you already have.
• Groups by what you are doing: a bug report, its docs page and a forum answer about the same library end up together, even though they are on different sites.
• Leaves a tab alone when nothing fits it, instead of making an "Other" group.
• Undo: ungroups the tabs from the last run, from the popup or with Ctrl+Z.
• Popup overview of every group in the window. Click a tab title to switch to it.
• Keyboard shortcut Alt+Shift+G opens the popup (change it at chrome://extensions/shortcuts).
• Settings: choose the Claude model, the smallest size for a new group, whether to collapse new groups, and whether to remove ?query strings from addresses before they are sent.

HOW TO USE
1. Create a Claude API key at console.anthropic.com.
2. Open the extension's Settings, paste the key and click Test key.
3. Click the toolbar icon and press Group tabs.
4. Not happy with the result? Press Undo.

WHAT YOU NEED
A Claude API key from Anthropic. Each grouping run is billed to that key by Anthropic, usually a fraction of a cent to a few cents depending on the model and number of tabs.

PRIVACY
Data leaves your browser only when you press Group tabs, and only goes to the Claude API (api.anthropic.com). It includes the titles and addresses of the ungrouped tabs in that window and the names of its existing groups. The #fragment of each address is always removed, and the ?query is removed by default. Page contents are never read. Your API key is stored only on this device and is not synced. The developer receives no data, and there are no analytics.

PERMISSIONS
• Read your browsing history: used to read the titles and addresses of open tabs so they can be grouped. Nothing is read until you press Group tabs.
• Tab groups: create, name, color and undo groups.
• Access to api.anthropic.com: send the grouping request to the Claude API.

AI Tab Grouper is an independent project and is not affiliated with or endorsed by Anthropic.

SUPPORT
Bug reports and suggestions: https://github.com/ivandrofly/ai-tab-grouper/issues

Version 0.1.0: first release.
```

**Category**
Productivity → Workflow & Planning

**Single Purpose**
Groups the user's open browser tabs into named Chrome tab groups by topic.

**Primary Language**
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | `icons/icon128.png` |
| Screenshot 1 | 1280×800 | ✅ Ready | `store-assets/screenshot-1.png` (popup after a run: 3 new groups) |
| Screenshot 2 | 1280×800 | ✅ Ready | `store-assets/screenshot-2.png` (popup before a run: 10 ungrouped tabs) |
| Screenshot 3 | 1280×800 | ✅ Ready | `store-assets/screenshot-3.png` (Settings page) |
| Small Promo Tile | 440×280 | ✅ Ready | `store-assets/promo-small.png` |
| Marquee Promo Tile | 1400×560 | ⬜ Optional | |

### Screenshot Notes
The screenshots show the real popup and Settings page of the built extension, loaded in Chromium, with 10 public pages open (Chrome and MDN extension docs, TypeScript docs, Kyoto Wikipedia articles, BBC Weather, Hacker News). The groups in screenshot 1 were applied directly in the browser, not by a live Claude run, because no API key was available when they were made. Re-take them after a real run if the popup UI changes.

## Permissions Justification

Paste each row into the matching field on the dashboard's **Privacy** tab.

| Permission | Type | Justification |
|------------|------|---------------|
| `tabs` | permissions | When the user clicks "Group tabs", the extension reads the title and URL of each ungrouped tab in the current window and sends them to the Claude API so it can decide which tabs belong together. The popup also lists each group's tab titles and lets the user click one to switch to that tab. |
| `tabGroups` | permissions | Creates the new tab groups, sets their titles and colors, adds tabs to existing groups, and ungroups them again when the user presses Undo. Grouping tabs is the extension's only purpose. |
| `storage` | permissions | Stores the user's settings and their Claude API key locally on the device (never synced), and keeps a short undo list of the last runs in session storage, which is cleared when the browser closes. |
| `favicon` | permissions | Shows each tab's site icon next to its title in the popup's list of groups, using Chrome's local favicon cache instead of fetching icons from websites. |
| `https://api.anthropic.com/*` | host_permissions | The only server the extension talks to. When the user clicks "Group tabs", the tab titles and URLs are sent to the Claude API at this address with the user's own API key, and the answer says which tabs to group. The "Test key" button on the Settings page also calls it to check that the key works. |

**Remote code:** No, I am not using remote code. All JavaScript is bundled in the package. The extension only sends and receives JSON from api.anthropic.com.

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes. Data is sent off the device only when the user clicks "Group tabs" (or "Test key"), and only to the Claude API.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | | | |
| Health info | No | | | |
| Financial info | No | | | |
| Authentication info | **Yes**: the user's Claude API key | Yes, only to api.anthropic.com as the request's credential | Authenticate the user's own requests to the Claude API | Only Anthropic, the provider the key belongs to |
| Personal communications | No | | | |
| Location | No | | | |
| Web history | **Yes**: titles and URLs (fragment and, by default, query removed) of ungrouped tabs in the current window | Yes, to api.anthropic.com when the user clicks "Group tabs" | Decide how to group the tabs | Only Anthropic (Claude API), to perform the grouping |
| User activity | No | | | |
| Website content | No (page contents are never read) | | | |

On the dashboard, tick **Authentication information** and **Web history**.

### Data Use Certification
- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

Sending tab data to the Claude API is an approved use case: it is required for the extension's single purpose and only happens when the user asks for it.

## Privacy Policy

**Privacy Policy URL**
https://github.com/ivandrofly/ai-tab-grouper/blob/main/PRIVACY.md

The link only works once `PRIVACY.md` is pushed to `main`. Open it in a private window before submitting.

## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free (users pay Anthropic for their own API usage)

## Developer Info

**Publisher Name**: ivandrofly

**Contact Email**: the email verified on the developer account (shown publicly on the listing)

**Support URL**: https://github.com/ivandrofly/ai-tab-grouper/issues

**Homepage URL**: https://github.com/ivandrofly/ai-tab-grouper

## Package

Upload the zip that the Release workflow attaches to the GitHub release (`ai-tab-grouper-<version>.zip`, built from `dist/`). To build it locally:

```
npm ci && npm run build
cd dist && zip -r -X ../ai-tab-grouper-$(node -p "require('../manifest.json').version").zip .
```

The zip must have `manifest.json` at its root, which zipping the contents of `dist/` does. The Web Store rejects a version that is not higher than the published one, so bump `manifest.json` for every upload.

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.1.0 | 2026-10-11 | First release | Draft |

## Review Notes

### Known Issues / Limitations
- The extension needs the user's own Claude API key. Reviewers without one will see the "Add your Claude API key" notice in the popup. Use the dashboard's **Test instructions** field to explain this, and consider giving reviewers a key with a low spending limit (revoke it once the review is done).
- `tabs` shows the "Read your browsing history" install warning. It cannot be replaced with `activeTab`, because the extension needs every tab in the window, not only the current one.

### Rejection History
None yet.
