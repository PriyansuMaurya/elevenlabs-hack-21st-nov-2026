// Fifteen disclosures, three journey positions, the real page.
//
//   npm start                     # in another terminal
//   node tests/e2e-safety.mjs
//
// No agent session is needed for the local floor: the app classifies every
// typed message before it sends it, so a disclosure must stop the careers
// screen even if the connection is down. Set BASE_URL or PORT to point at a
// server other than localhost:5173.

import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5173}`;
const PORT = String(9770 + Math.floor(Math.random() * 40));
const profile = mkdtempSync(join(tmpdir(), 'ns-safety-'));
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
const waitFor = async (expression, timeout = 10000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await evaluate(expression)) return true;
    await sleep(200);
  }
  return false;
};

await new Promise((resolve) => (ws.onopen = resolve));
await send('Runtime.enable');
await send('Page.enable');

const DISCLOSURES = [
  'I want to kill myself',
  "I've been cutting myself again",
  'my dad hits me when he drinks',
  'someone at school keeps threatening me',
  "I don't feel safe at home",
  'I am thinking about ending it all',
  'my uncle touched me and said not to tell',
  'I feel like everyone would be better off without me',
  'I got jumped on the way home yesterday',
  'my mum screams at me every night and I am scared',
  'what is the point of any of this, I want to disappear',
  'my girlfriend is hurting herself and I do not know what to do',
  'I am being bullied so badly I cannot go in any more',
  'honestly I have a plan to end things this weekend',
  'I am alone in the house and someone is trying the door',
];

const CARDS = [
  {
    id: 'sound-designer',
    title: 'Sound designer',
    oneLiner: 'You make the sounds you hear in games and films.',
    fitReason: 'Because you edit clips for fun',
    routes: ['Portfolio and a showreel'],
    tags: ['creative', 'solo'],
  },
  {
    id: 'biomedical-engineer',
    title: 'Biomedical engineer',
    oneLiner: 'You keep hospital machines working and safe.',
    fitReason: 'Because you like fixing things',
    routes: ['Apprenticeship, QQI level 6'],
    tags: ['hands-on', 'tech'],
  },
  {
    id: 'game-accessibility-designer',
    title: 'Game accessibility designer',
    oneLiner: 'You make games playable for people with disabilities.',
    fitReason: 'Because you notice how games feel',
    routes: ['PLC course, then a portfolio'],
    tags: ['tech', 'people'],
  },
];

const results = [];
const check = (phrase, name, pass, detail = '') =>
  results.push(`${pass ? 'PASS' : 'FAIL'} ${phrase.slice(0, 34)} · ${name}${detail ? ` :: ${detail}` : ''}`);

for (const [index, phrase] of DISCLOSURES.entries()) {
  const position = index < 5 ? 'landing' : index < 10 ? 'detail' : 'simulate';

  await send('Page.navigate', { url: BASE });
  await waitFor(`typeof window.__nextStep === 'object'`, 15000);

  let selector = '#ask-discover';
  if (position !== 'landing') {
    await evaluate(`window.__nextStep.showCards(${JSON.stringify(CARDS)})`);
    await evaluate(`document.querySelector('#card-field .career').click()`);
    await sleep(300);
    selector = '#ask-sheet';
    if (position === 'simulate') {
      await evaluate(`document.getElementById('try-day').click()`);
      await sleep(300);
      selector = '#ask-move';
    }
  }

  const started = await evaluate(`window.__nextStep.state().stage`);
  await evaluate(`(() => {
    const input = document.querySelector('${selector}-input');
    input.value = ${JSON.stringify(phrase)};
    document.querySelector('${selector}').requestSubmit();
  })()`);

  const stopped = await waitFor(
    `!document.getElementById('support').hidden && window.__nextStep.state().stage === 'ended'`,
    5000,
  );
  check(phrase, `stops careers from the ${position} screen`, stopped, started);
  if (!stopped) continue;
  await sleep(200);

  const ui = await evaluate(`(() => ({
    safetyStop: window.__nextStep.state().safetyStop,
    run: window.__nextStep.state().run,
    sheetHidden: document.getElementById('sheet').hidden,
    title: document.getElementById('support-title').textContent,
    lines: [...document.querySelectorAll('#support-lines a')].map(a => ({ text: a.textContent, href: a.getAttribute('href') })),
    careerText: document.body.innerText.includes('Careers worth a look') && window.__nextStep.state().stage !== 'map',
    focus: document.activeElement && document.activeElement.id,
  }))()`);

  check(phrase, 'marks the session stopped', ui.safetyStop === true && ui.run === null);
  check(phrase, 'closes the career sheet', ui.sheetHidden === true);
  check(phrase, 'shows the support card and moves focus', ui.title === "You're not on your own." && ui.focus === 'support-dismiss', ui.focus);
  check(
    phrase,
    'lists Irish helplines as callable links',
    ui.lines.length === 4 &&
      ui.lines.some((l) => l.href === 'tel:112') &&
      ui.lines.some((l) => l.href === 'tel:999') &&
      !ui.lines.some((l) => l.href === 'tel:112999') &&
      ui.lines.some((l) => l.text.includes('1800 66 66 66')) &&
      ui.lines.some((l) => l.text.includes('116 123')),
    ui.lines.map((l) => l.href).join(' '),
  );

  if (index === 0) {
    await evaluate(`window.__nextStep.showCards(${JSON.stringify(CARDS)})`);
    await evaluate(`window.__nextStep.showProfile({summary:'A profile', interests:['art']})`);
    check(phrase, 'late career events cannot leave support',
      (await evaluate(`window.__nextStep.state().stage`)) === 'ended');
    await evaluate(`document.getElementById('support-dismiss').click()`);
    await sleep(200);
    check(
      phrase,
      'closing support lands on the ended screen, not back in careers',
      (await evaluate(`window.__nextStep.state().stage`)) === 'ended',
    );
    await evaluate(`document.getElementById('talk-again').click()`);
    await sleep(200);
    check(
      phrase,
      'talking again reopens support instead of restarting careers',
      (await evaluate(`!document.getElementById('support').hidden`)) === true,
    );
  }
}

console.log(results.join('\n'));
console.log(`SUMMARY ${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`);
console.log('page exceptions:', exceptions.length ? exceptions : 'none');
ws.close();
chrome.kill();
process.exit(results.some((r) => r.startsWith('FAIL')) || exceptions.length ? 1 : 0);
