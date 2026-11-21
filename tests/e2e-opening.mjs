// Wave's opening behaviour, over several real text sessions.
//
//   npm start
//   npm run test:opening
//
// Checks that every session starts with a question, that no greeting, name or
// AI disclosure is bolted onto it, that the opening changes between sessions,
// and that the name only appears later as "You can call me Wave".
// Set BASE_URL or PORT to point at a server other than localhost:5173.

import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5173}`;
const PORT = String(9800 + Math.floor(Math.random() * 40));
const profile = mkdtempSync(join(tmpdir(), 'ns-opening-'));
const chrome = spawn(
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--window-size=1200,900',
    'about:blank',
  ],
  { stdio: 'ignore' },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let target = null;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(250);
  try {
    target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(
      (t) => t.type === 'page',
    );
  } catch {}
}
if (!target) throw new Error('Chrome did not start');

const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const exceptions = [];
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message.result);
    pending.delete(message.id);
    return;
  }
  if (message.method === 'Runtime.exceptionThrown') {
    exceptions.push(
      message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text,
    );
  }
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const n = ++id;
    pending.set(n, resolve);
    ws.send(JSON.stringify({ id: n, method, params }));
  });
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  }
  return result.result.value;
};
const waitFor = async (expression, timeout = 30000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await evaluate(expression)) return true;
    await sleep(300);
  }
  return false;
};

await new Promise((resolve) => (ws.onopen = resolve));
await send('Runtime.enable');
await send('Page.enable');

const results = [];
const check = (name, pass, detail = '') =>
  results.push(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ` :: ${detail}` : ''}`);

const startSession = async () => {
  await send('Page.navigate', { url: `${BASE}?opening=${Date.now()}` });
  await waitFor(`typeof window.__nextStep === 'object'`, 15000);
  await evaluate(`window.__nextStep.beginTextMode()`);
  const connected = await waitFor(`window.__nextStep.state().session`, 30000);
  const spoke = await waitFor(
    `window.__nextStep.events().some(e => e.type === 'agent-said' && e.text)`,
    30000,
  );
  const opening = await evaluate(
    `(() => {
      const line = window.__nextStep.events().find(e => e.type === 'agent-said' && e.text);
      return line ? line.text.trim() : '';
    })()`,
  );
  return { connected, spoke, opening };
};

const openings = [];
for (let i = 0; i < 4; i++) {
  const { connected, spoke, opening } = await startSession();
  check(`session ${i + 1} connects`, connected);
  check(`session ${i + 1} speaks first`, spoke);
  if (!opening) continue;
  openings.push(opening);
  check(`session ${i + 1} opens with a question`, opening.includes('?'), opening);
  check(
    `session ${i + 1} has no name or AI disclosure`,
    !/\bSam\b/i.test(opening) &&
      !/\bAI\b/i.test(opening) &&
      !/\bI'?m\b/i.test(opening) &&
      !/\bmy name\b/i.test(opening),
    opening,
  );
  check(
    `session ${i + 1} has no greeting or exit instructions`,
    !/^(hi|hello|hey)\b/i.test(opening) && !/stop any time/i.test(opening),
    opening,
  );
}

check(
  'openings vary between sessions',
  new Set(openings).size >= 2,
  `${new Set(openings).size} distinct of ${openings.length}`,
);

// One longer conversation: the name may appear later, but only organically.
const { connected, opening } = await startSession();
check('name session connects', connected);
if (connected) {
  const input = (text) =>
    evaluate(`(() => {
      const i = document.getElementById('ask-discover-input');
      i.value = ${JSON.stringify(text)};
      document.getElementById('ask-discover').requestSubmit();
      return true;
    })()`);
  await input('I make beats on my laptop and fix bikes with my uncle.');
  await waitFor(`window.__nextStep.events().filter(e => e.type === 'agent-said').length >= 2`, 30000);
  await sleep(800);
  await input('What should I call you?');
  const named = await waitFor(
    `window.__nextStep.events().some(e => e.type === 'agent-said' && /wave/i.test(e.text || ''))`,
    30000,
  );
  const replies = await evaluate(
    `window.__nextStep.events().filter(e => e.type === 'agent-said').map(e => e.text || '')`,
  );
  const all = replies.join(' ');
  check('name appears when asked later', named, all.slice(-160));
  check('name is offered as "You can call me Wave"', /you can call me wave/i.test(all), all.slice(-160));
  check(
    'opening itself never contains the name',
    !/\bwave\b/i.test(opening),
    opening,
  );
}

console.log(results.join('\n'));
console.log(`SUMMARY ${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`);
console.log('page exceptions:', exceptions.length ? exceptions : 'none');
ws.close();
chrome.kill();
process.exit(results.some((r) => r.startsWith('FAIL')) || exceptions.length ? 1 : 0);
