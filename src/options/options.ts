import { MODELS, DEFAULTS, loadSettings, saveSettings, type Settings } from '../lib/settings';
import { send } from '../lib/messages';

const SAVED_MS = 2000;

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const els = {
  form: $<HTMLFormElement>('#form'),
  apiKey: $<HTMLInputElement>('#apiKey'),
  reveal: $<HTMLButtonElement>('#reveal'),
  test: $<HTMLButtonElement>('#test'),
  testResult: $('#test-result'),
  model: $<HTMLSelectElement>('#model'),
  minGroupSize: $<HTMLInputElement>('#minGroupSize'),
  stripQuery: $<HTMLInputElement>('#stripQuery'),
  collapseNew: $<HTMLInputElement>('#collapseNew'),
  saved: $('#saved'),
};

for (const m of MODELS) els.model.append(new Option(m.label, m.id));

function fill(s: Settings) {
  els.apiKey.value = s.apiKey;
  // Keep a model id saved by an older version selectable.
  if (![...els.model.options].some((o) => o.value === s.model)) els.model.append(new Option(s.model, s.model));
  els.model.value = s.model;
  els.minGroupSize.value = String(s.minGroupSize);
  els.stripQuery.checked = s.stripQuery;
  els.collapseNew.checked = s.collapseNew;
}

function read(): Settings {
  const min = Math.round(Number(els.minGroupSize.value));
  return {
    apiKey: els.apiKey.value.trim(),
    model: els.model.value,
    minGroupSize: Number.isFinite(min) ? Math.min(10, Math.max(1, min)) : DEFAULTS.minGroupSize,
    stripQuery: els.stripQuery.checked,
    collapseNew: els.collapseNew.checked,
  };
}

let savedTimer: ReturnType<typeof setTimeout> | undefined;
async function save() {
  fill(await saveSettings(read()));
  els.saved.textContent = 'Saved.';
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => { els.saved.textContent = ''; }, SAVED_MS);
}

async function testKey() {
  const { apiKey, model } = read();
  if (!apiKey) {
    showResult('Enter an API key first.', false);
    return;
  }
  els.test.disabled = true;
  showResult('Checking…', null);
  try {
    const { name } = await send({ type: 'testKey', apiKey, model });
    showResult(`Key works with ${name}.`, true);
  } catch (err) {
    showResult((err as Error).message, false);
  } finally {
    els.test.disabled = false;
  }
}

function showResult(text: string, ok: boolean | null) {
  els.testResult.textContent = text;
  els.testResult.classList.toggle('ok', ok === true);
  els.testResult.classList.toggle('error', ok === false);
}

els.form.addEventListener('change', save);
els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  save();
});
els.test.addEventListener('click', testKey);
els.reveal.addEventListener('click', () => {
  const hidden = els.apiKey.type === 'password';
  els.apiKey.type = hidden ? 'text' : 'password';
  els.reveal.textContent = hidden ? 'Hide' : 'Show';
});

loadSettings().then(fill);
