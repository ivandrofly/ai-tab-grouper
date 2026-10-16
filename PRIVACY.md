# Privacy Policy for AI Tab Grouper

Last updated: 2026-10-16

AI Tab Grouper is a Chrome extension that sorts your open tabs into named tab groups. To decide which tabs belong together, it asks the Claude API, using an API key you provide. This policy explains exactly what that involves.

## What data the extension handles

- **Tab titles and URLs.** When you click **Group tabs**, the extension reads the title and URL of each ungrouped, unpinned tab in that window. Before a URL is sent, its `#fragment` is always removed, and its `?query` string is removed unless you turn that setting off. Long titles and URLs are shortened.
- **Existing tab group names and colors** in that window, and the titles and URLs of up to 8 tabs in each group (shortened the same way), so that new tabs can be added to the group they fit.
- **Your Claude API key**, which you enter on the Settings page.
- **Your settings** (chosen model, smallest group size, the query-string option, the collapse option).
- **Undo information**: which tabs the last few runs moved and into which groups.

The extension never reads the contents of web pages. It does not use cookies, analytics, telemetry or crash reporting.

## When data leaves your device

Data is sent only when you click **Group tabs** (or **Test key** on the Settings page), and only to the Claude API at `api.anthropic.com`:

- **Group tabs** sends the tab titles, shortened URLs and existing group details described above, together with your API key.
- **Test key** sends only your API key and the selected model name. No tab data is sent.

Nothing is sent in the background, on a timer, or when you browse. No data is sent to the developer of this extension or to any other server.

## How data is stored

- Your API key and settings are stored in Chrome's local extension storage on this device. They are not synced to your Google account.
- The undo information and the result of the last run are kept in Chrome's session storage and are cleared when the browser closes.

## Third-party services

Requests go to the Claude API, operated by Anthropic, under the account that owns your API key. Anthropic processes that data under its own terms and privacy policy: <https://www.anthropic.com/legal/privacy>. AI Tab Grouper is an independent project and is not affiliated with or endorsed by Anthropic.

## Data sharing and sale

The developer does not receive, sell or share any of your data. Tab titles and URLs go only to the Claude API, and only to perform the grouping you asked for.

## Data retention and deletion

- To delete your API key, clear it on the Settings page, or remove the extension. Removing the extension deletes all of its stored data.
- Undo information is deleted when you close the browser.
- For data already sent to the Claude API, see Anthropic's privacy policy and the settings of your Anthropic account.

## Changes to this policy

If the extension's data practices change, this policy is updated in the same release and the "Last updated" date above changes. The full history is in this file's commit log on GitHub.

## Contact

Questions or concerns: open an issue at <https://github.com/ivandrofly/ai-tab-grouper/issues>.
