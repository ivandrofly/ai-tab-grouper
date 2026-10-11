// Settings live in chrome.storage.local (never sync) so the API key stays on this device.

export const MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (best grouping)' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (cheaper)' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (cheapest)' },
] as const;

export interface Settings {
  apiKey: string;
  model: string;
  minGroupSize: number;
  stripQuery: boolean;
  collapseNew: boolean;
}

export const DEFAULTS: Settings = {
  apiKey: '',
  model: 'claude-opus-5-5',
  minGroupSize: 2,
  stripQuery: true,
  collapseNew: false,
};

const KEY = 'settings';

export async function loadSettings(): Promise<Settings> {
  const { [KEY]: saved } = await chrome.storage.local.get(KEY);
  return { ...DEFAULTS, ...(saved as Partial<Settings> | undefined) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await loadSettings()), ...patch };
  await chrome.storage.local.set({ [KEY]: next });
  return next;
}

export function onSettingsChanged(listener: (settings: Settings) => void): void {
  chrome.storage.local.onChanged.addListener((changes) => {
    if (KEY in changes) listener({ ...DEFAULTS, ...(changes[KEY]?.newValue as Partial<Settings>) });
  });
}
