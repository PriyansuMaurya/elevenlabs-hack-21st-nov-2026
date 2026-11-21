import assert from 'node:assert/strict';
import test from 'node:test';

import { validateCards, CARD_LIMITS } from '../public/lib/cards.js';
import { classifySafety, HELPLINES } from '../public/lib/safety.js';
import { buildCareerDetail, clearCareerCache, detailToContext, routeTypeLabel } from '../public/lib/careers.js';
import {
  SCENARIOS,
  scenarioForCard,
  createRun,
  choose,
  currentStage,
  matchOption,
  reflectionFor,
  scenarioContext,
} from '../public/lib/scenarios.js';

const card = (extra = {}) => ({
  id: 'sound-designer',
  title: 'Sound designer',
  oneLiner: 'You make the sounds in games and films.',
  fitReason: 'Because you edit clips for fun',
  routes: ['Portfolio and a showreel'],
  tags: ['creative', 'solo'],
  ...extra,
});

/* ---------------- cards ---------------- */

test('accepts a valid card list', () => {
  const { cards, rejected } = validateCards({ cards: [card(), card({ id: 'chef', title: 'Chef' })] });
  assert.equal(cards.length, 2);
  assert.deepEqual(rejected, []);
  assert.equal(cards[0].title, 'Sound designer');
});

test('parses a JSON string payload', () => {
  const { cards } = validateCards(JSON.stringify([card()]));
  assert.equal(cards.length, 1);
});

test('rejects junk without throwing', () => {
  for (const input of [null, undefined, 42, 'not json', {}, { cards: 'no' }]) {
    const { cards, rejected } = validateCards(input);
    assert.equal(cards.length, 0);
    assert.ok(rejected.length);
  }
});

test('drops cards with no title or no routes', () => {
  const { cards, rejected } = validateCards([
    card({ id: 'a', title: '' }),
    card({ id: 'b', routes: [] }),
    card({ id: 'c', title: 'Chef' }),
  ]);
  assert.deepEqual(cards.map((c) => c.id), ['c']);
  assert.ok(rejected.includes('no-title'));
  assert.ok(rejected.includes('no-routes'));
});

test('collapses duplicate ids and caps at five', () => {
  const dupes = validateCards([card(), card()]).cards;
  assert.equal(dupes.length, 1);
  const many = Array.from({ length: 8 }, (_, i) =>
    card({ id: `job-${i}`, title: `Job ${i}`, oneLiner: 'x' }),
  );
  assert.equal(validateCards(many).cards.length, CARD_LIMITS.cards);
});

test('clips one-liners and fit reasons to the schema limits', () => {
  const [c] = validateCards([
    card({ oneLiner: 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone' }),
  ]).cards;
  assert.equal(c.oneLiner.split(/\s+/).length, 20);
  assert.ok(c.oneLiner.endsWith('…'));
});

test('accepts the legacy fields the agent used to send', () => {
  const [c] = validateCards([
    { title: 'Fabricator', what: 'Turns drawings into metal.', why: 'You fix bikes', route: 'Apprenticeship', day: 'Tuesday' },
  ]).cards;
  assert.equal(c.oneLiner, 'Turns drawings into metal.');
  assert.deepEqual(c.routes, ['Apprenticeship']);
});

/* ---------------- safeguarding ---------------- */

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

test('all 15 disclosures are caught', () => {
  for (const phrase of DISCLOSURES) {
    const result = classifySafety(phrase);
    assert.equal(result.triggered, true, `missed: ${phrase}`);
    assert.ok(result.category, `no category: ${phrase}`);
  }
});

test('ordinary career talk is not caught', () => {
  for (const phrase of [
    'this essay is killing me',
    "I'd kill for a job like that",
    'I hate exams',
    'I am dying of boredom',
    'my mum wants me to go to university',
    'I got cut from the team',
    'I love horror films',
    'school is stressful but I am okay',
  ]) {
    assert.equal(classifySafety(phrase).triggered, false, `false positive: ${phrase}`);
  }
});

test('immediate danger is marked urgent', () => {
  assert.equal(classifySafety('I am alone in the house and someone is trying the door').urgent, true);
  assert.equal(classifySafety('my dad hits me when he drinks').urgent, false);
});

test('Irish helplines are present and correct', () => {
  assert.deepEqual(
    HELPLINES.map((h) => h.numbers),
    ['112 or 999', '1800 66 66 66', '116 123'],
  );
});

/* ---------------- careers ---------------- */

test('curated details are complete and concrete', () => {
  clearCareerCache();
  const detail = buildCareerDetail(card());
  assert.equal(detail.title, 'Sound designer');
  assert.ok(detail.daily.length >= 3);
  assert.ok(detail.skills.length >= 3);
  assert.ok(detail.subjects.length >= 2);
  assert.ok(detail.routes.some((r) => r.type !== 'uni'));
  assert.ok(detail.related.length >= 2);
});

test('details are cached per card for the session', () => {
  clearCareerCache();
  assert.equal(buildCareerDetail(card()), buildCareerDetail(card()));
});

test('an unknown career gets a usable, labelled sketch', () => {
  const detail = buildCareerDetail(card({ id: 'drone-pilot', title: 'Drone pilot', oneLiner: 'Flies drones to survey land.' }));
  assert.equal(detail.title, 'Drone pilot');
  assert.ok(detail.daily.length >= 3);
  assert.ok(detail.note);
  assert.match(detailToContext(detail), /not sure/i);
});

test('detail context carries routes and subjects', () => {
  const context = detailToContext(buildCareerDetail(card()));
  assert.match(context, /Sound designer/);
  assert.match(context, /Route|Apprenticeship/i);
  assert.match(context, /careersportal\.ie/);
  assert.equal(routeTypeLabel('app'), 'Apprenticeship');
});

/* ---------------- scenarios ---------------- */

test('three polish scenarios exist and map to cards', () => {
  assert.equal(SCENARIOS.length, 3);
  assert.equal(scenarioForCard(card())?.id, 'sound-designer');
  assert.equal(scenarioForCard({ id: 'x', title: 'Biomedical engineer' })?.id, 'biomedical-engineer');
  assert.equal(scenarioForCard({ id: 'x', title: 'Game accessibility designer' })?.id, 'game-accessibility-designer');
  assert.equal(scenarioForCard({ id: 'x', title: 'Chef' }), null);
});

test('a run reaches reflection and records both choices', () => {
  let { run } = choose(createRun('sound-designer'), 'strip');
  assert.equal(run.stage, 1);
  const result = choose(run, 'dynamic');
  run = result.run;
  assert.equal(result.done, true);
  assert.equal(run.finished, true);
  assert.deepEqual(run.choices.map((c) => c.optionId), ['strip', 'dynamic']);
  const reflection = reflectionFor(run);
  assert.match(reflection.hardPart, /nobody can tell you/i);
});

test('two paths produce different consequences', () => {
  const first = choose(createRun('biomedical-engineer'), 'open');
  const second = choose(createRun('biomedical-engineer'), 'log');
  assert.notEqual(first.outcome, second.outcome);
});

test('an interruption does not reset the stage', () => {
  const run = choose(createRun('game-accessibility-designer'), 'watch').run;
  // Simulate a reconnect: the app keeps its own run object.
  assert.equal(currentStage(run).id, 'pitch');
  const context = scenarioContext(SCENARIOS[1], run);
  assert.match(context, /twelve minutes/i);
});

test('spoken choices only match on a clear answer', () => {
  const stage = currentStage(createRun('sound-designer'));
  assert.equal(matchOption('I would strip it back and use the footsteps', stage)?.id, 'strip');
  assert.equal(matchOption('I think I would go and record a real tunnel', stage)?.id, 'record');
  assert.equal(matchOption('dunno, what do you think', stage), null);
});

test('an unknown option does not advance the run', () => {
  const run = createRun('sound-designer');
  const result = choose(run, 'nope');
  assert.equal(result.run.stage, 0);
  assert.equal(result.option, null);
});
