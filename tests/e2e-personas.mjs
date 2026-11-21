// End-to-end persona test, text transport, real agent + real client tools.
//
//   npm start                 # in another terminal, on port 5173
//   node tests/e2e-personas.mjs
//
// Uses Chrome over CDP and no dependencies. Set BASE_URL or PORT to point at a
// different server. Text sessions are used so the test needs no microphone;
// the voice path is exercised separately by tests/browser-journey.mjs.

import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5173}`;
const PORT = String(9730 + Math.floor(Math.random() * 40));
const profile = mkdtempSync(join(tmpdir(), 'ns-e2e-'));
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
    await sleep(400);
  }
  return false;
};

await new Promise((resolve) => (ws.onopen = resolve));
await send('Runtime.enable');
await send('Page.enable');

const personas = [
  {
    name: 'gamer who draws',
    answers: [
      'I play a lot of indie games and I draw characters from them.',
      'I like working out how a game feels, and drawing the characters better than they are.',
      'I hate PE. And presenting in front of the class.',
      'Maybe game design, or something with art. Not coding all day.',
      "Indoors, on a screen, mostly on my own. I don't mind a small team.",
      "My grades are grand but I don't want to move away or get a big loan.",
    ],
    fullJourney: true,
  },
  {
    name: 'passive film and social media',
    answers: [
      'Probably watching films or scrolling, if I am honest.',
      'The edits on TikTok, the fast cuts. I like when a video has a good song over it.',
      'I hate being told what to do and I hate homework.',
      'Films, I guess? Or making videos. I never really looked into it.',
      'On a screen. With a few people, not alone all day.',
      "Money is the main thing. I'd want to earn something soon.",
    ],
  },
  {
    name: 'frequently uncertain',
    answers: [
      'I dunno, just chilling.',
      "Dunno, nothing really.",
      'Maybe making things, or helping people. I cannot decide.',
      "I'm not sure what that means.",
      'Indoors or outdoors, either is fine.',
      "No idea. Grades aren't great.",
    ],
  },
];

const results = [];
const check = (persona, name, pass, detail = '') =>
  results.push(`${pass ? 'PASS' : 'FAIL'} ${persona} · ${name}${detail ? ` :: ${detail}` : ''}`);

for (const persona of personas) {
  await send('Page.navigate', { url: BASE });
  await waitFor(`typeof window.__nextStep === 'object'`, 15000);
  await evaluate(`window.__nextStep.beginTextMode()`);
  const connected = await waitFor(`window.__nextStep.state().session`, 30000);
  check(persona.name, 'text session connects', connected);
  if (!connected) continue;

  let turns = 0;
  const sendAnswer = async (text) => {
    await evaluate(`(() => {
      const input = document.getElementById('ask-discover-input');
      input.value = ${JSON.stringify(text)};
      document.getElementById('ask-discover').requestSubmit();
    })()`);
    turns += 1;
    await waitFor(
      `window.__nextStep.events().filter(e => e.type === 'agent-said').length >= ${turns + 1}`,
      30000,
    );
    await sleep(1200);
  };

  for (const answer of persona.answers) {
    const stage = await evaluate(`window.__nextStep.state().stage`);
    if (stage !== 'discover') break;
    await sendAnswer(answer);
    if (await evaluate(`window.__nextStep.state().stage === 'profile'`)) break;
  }

  let stage = await evaluate(`window.__nextStep.state().stage`);
  if (stage === 'discover') {
    await sendAnswer("That's about it. I'm not sure what else to say.");
    stage = await evaluate(`window.__nextStep.state().stage`);
  }
  check(persona.name, 'profile confirmation appears inside discovery', stage === 'profile', stage);
  if (stage !== 'profile') continue;

  const chips = await evaluate(`document.querySelectorAll('#profile-groups .chip-remove').length`);
  check(persona.name, 'profile has concrete chips', chips >= 3, `${chips} chips`);

  const questions = await evaluate(
    `window.__nextStep.events().filter(e => e.type === 'agent-said').map(e => (e.text || '').trim()).filter(t => t.includes('?'))`,
  );
  const normalized = questions.map((q) =>
    q
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim(),
  );
  const repeated = normalized.filter((q, i) => normalized.indexOf(q) !== i);
  check(persona.name, 'no question is asked twice', repeated.length === 0, repeated.join(' | '));

  await evaluate(`document.getElementById('profile-confirm').click()`);
  const mapped = await waitFor(`window.__nextStep.state().stage === 'map'`, 40000);
  check(persona.name, 'confirmed profile produces the map', mapped);
  if (!mapped) continue;

  const cardCount = await evaluate(`document.querySelectorAll('#card-field .career').length`);
  check(persona.name, 'three to five career cards', cardCount >= 3 && cardCount <= 5, `${cardCount}`);
  const titles = await evaluate(
    `[...document.querySelectorAll('#card-field .career-title')].map(e => e.textContent)`,
  );
  check(persona.name, 'cards are real job titles', titles.every((t) => t.length > 2), titles.join(', '));
  const fitChips = await evaluate(
    `document.querySelectorAll('#card-field .career .chip-fit').length`,
  );
  check(persona.name, 'every card carries a fit reason', fitChips === cardCount);

  await evaluate(`document.querySelector('#card-field .career').click()`);
  await sleep(500);
  check(persona.name, 'a card opens its detail sheet', (await evaluate(`window.__nextStep.state().stage`)) === 'detail');
  const sections = await evaluate(`document.querySelectorAll('#sheet-body .sheet-section').length`);
  check(persona.name, 'detail covers day, skills, routes, related work', sections >= 5, `${sections} sections`);
  check(
    persona.name,
    'detail is labelled AI-generated',
    (await evaluate(`document.getElementById('sheet-body').textContent`)).includes('AI-generated'),
  );

  if (!persona.fullJourney) continue;

  await evaluate(`document.getElementById('try-day').click()`);
  await sleep(600);
  check(persona.name, 'detail transitions into a simulation', (await evaluate(`window.__nextStep.state().stage`)) === 'simulate');
  const options = await evaluate(`document.querySelectorAll('#scene-options .scene-option').length`);
  if (options >= 2) {
    await evaluate(`document.querySelector('#scene-options .scene-option').click()`);
    await sleep(500);
    check(
      persona.name,
      'a decision produces a consequence',
      (await evaluate(`window.__nextStep.state().awaitingNext`)) === true,
    );
    await evaluate(`document.querySelector('#scene-options button').click()`);
    await sleep(500);
    if ((await evaluate(`window.__nextStep.state().awaitingNext`)) === false) {
      await evaluate(`document.querySelector('#scene-options .scene-option').click()`);
      await sleep(500);
      await evaluate(`document.querySelector('#scene-options button').click()`);
      await sleep(500);
    }
  } else {
    await evaluate(`document.querySelector('#scene-options button').click()`);
    await sleep(500);
  }
  check(
    persona.name,
    'the simulation reaches reflection',
    (await evaluate(`window.__nextStep.state().stage`)) === 'debrief',
  );
}

console.log(results.join('\n'));
console.log(`SUMMARY ${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`);
console.log('page exceptions:', exceptions.length ? exceptions : 'none');
ws.close();
chrome.kill();
process.exit(results.some((r) => r.startsWith('FAIL')) || exceptions.length ? 1 : 0);
