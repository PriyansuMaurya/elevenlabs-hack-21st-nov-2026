/* NEXT STEP — one screen, and the screen follows the conversation.
 *
 * Stages, in order: intro, discover, map, detail (a card opened), simulate,
 * debrief, ended. Nothing advances because a button says "next"; stages move
 * on what Sam and the young person actually say, plus the two client tools.
 */

const { Conversation } = window.ElevenLabsClient;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// One place for the numbers. Check them against the official pages before a demo.
const HELP_LINES = [
  { name: 'Childline', number: '1800 66 66 66', href: 'tel:1800666666' },
  { name: 'Samaritans', number: '116 123', href: 'tel:116123' },
];

const MAX_RECONNECTS = 2;

const els = {
  app: document.getElementById('app'),
  banner: document.getElementById('banner'),
  bannerText: document.getElementById('banner-text'),
  bannerAction: document.getElementById('banner-action'),
  orb: document.getElementById('orb'),
  voice: document.getElementById('voice'),
  barState: document.getElementById('bar-state'),
  captionSam: document.getElementById('caption-sam'),
  captionUser: document.getElementById('caption-user'),
  supportLink: document.getElementById('support-link'),
  srStatus: document.getElementById('sr-status'),
  surface: document.getElementById('surface'),
  cardField: document.getElementById('card-field'),
  cardsNote: document.getElementById('cards-note'),
  cardsEmpty: document.getElementById('cards-empty'),
  sceneMark: document.getElementById('scene-mark'),
  sceneText: document.getElementById('scene-text'),
  debriefTitle: document.getElementById('debrief-title'),
  debriefQuote: document.getElementById('debrief-quote'),
  feelChips: document.getElementById('feel-chips'),
  tryAnother: document.getElementById('try-another'),
  stopNow: document.getElementById('stop-now'),
  talkAgain: document.getElementById('talk-again'),
  askDiscover: document.getElementById('ask-discover'),
  askDiscoverInput: document.getElementById('ask-discover-input'),
  askMove: document.getElementById('ask-move'),
  askMoveInput: document.getElementById('ask-move-input'),
  askSheet: document.getElementById('ask-sheet'),
  askSheetInput: document.getElementById('ask-sheet-input'),
  sheet: document.getElementById('sheet'),
  sheetScrim: document.getElementById('sheet-scrim'),
  sheetTitle: document.getElementById('sheet-title'),
  sheetTags: document.getElementById('sheet-tags'),
  sheetBody: document.getElementById('sheet-body'),
  sheetClose: document.getElementById('sheet-close'),
  tryDay: document.getElementById('try-day'),
  support: document.getElementById('support'),
  supportCard: document.getElementById('support-card'),
  supportLines: document.getElementById('support-lines'),
  supportDismiss: document.getElementById('support-dismiss'),
};

const S = {
  stage: 'intro',
  voice: 'ready',
  connected: false,
  cards: [],
  openId: null,
  chosenId: null,
  decision: 1,
  simTurns: 0,
  pendingSim: false,
  sceneText: '',
  debriefText: '',
  messages: [],
};

let conversation = null;
let starting = false;
let stopping = false;
let reconnectAttempts = 0;
let reconnectTimer = null;
let thinkingTimer = null;
let bannerAction = null;
let returnFocus = null;
const localSends = [];

/* ---------------- tokens ---------------- */

function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/* ---------------- orb ---------------- */

const orb = window.FluidOrb
  ? new window.FluidOrb(els.orb, { color: token('--color-primary') })
  : null;

const VOICE = {
  ready: {
    token: '--color-primary',
    label: 'Talk to Sam',
    sub: 'Two minutes, then try a day of the work.',
    speed: 0,
  },
  connecting: {
    token: '--color-primary',
    label: 'Getting Sam',
    sub: 'This takes a moment.',
    speed: 0.5,
  },
  listening: {
    token: '--color-secondary',
    label: 'Listening',
    sub: 'Speak normally. You can interrupt any time.',
    speed: 1,
  },
  thinking: {
    token: '--color-primary',
    label: 'Thinking',
    sub: 'Sam is working out what to ask next.',
    speed: 0.45,
  },
  speaking: {
    token: '--color-primary',
    label: "Sam's talking, tap to jump in",
    sub: 'Tap to jump in, or just start talking.',
    speed: 1.7,
  },
  reconnecting: {
    token: '--color-on-surface-muted',
    label: 'Reconnecting',
    sub: 'Your cards stay on screen.',
    speed: 0.12,
  },
  blocked: {
    token: '--color-on-surface-muted',
    label: 'The microphone is blocked',
    sub: 'Allow the microphone in your browser, then try again.',
    speed: 0,
  },
  ended: {
    token: '--color-on-surface-muted',
    label: 'Done for now',
    sub: 'Come back whenever you want.',
    speed: 0,
  },
};

function setVoice(name) {
  const next = VOICE[name] ? name : 'ready';
  S.voice = next;
  const voice = VOICE[next];
  els.app.dataset.voice = next;
  els.barState.textContent = voice.label;
  els.voice.setAttribute('aria-label', voice.label);
  els.voice.setAttribute(
    'aria-pressed',
    String(S.connected && next !== 'ended' && next !== 'blocked'),
  );
  els.orb.style.setProperty('--orb-scale', next === 'thinking' ? '0.88' : '1');

  if (next !== 'listening' && next !== 'speaking') {
    els.orb.style.setProperty('--pulse', '1');
  }
  if (orb) {
    orb.setColor(token(voice.token));
    orb.setSpeed(reduceMotion ? 0 : voice.speed);
  }
}

function pumpLevel() {
  requestAnimationFrame(pumpLevel);
  if (!conversation || reduceMotion) return;
  if (S.voice !== 'listening' && S.voice !== 'speaking') return;

  let level = 0;
  try {
    level =
      S.voice === 'speaking' ? conversation.getOutputVolume() : conversation.getInputVolume();
  } catch {
    return;
  }
  level = Math.max(0, Math.min(1, Number(level) || 0));
  els.orb.style.setProperty('--pulse', (1 + level * 0.05).toFixed(3));
  if (orb) orb.setSpeed(VOICE[S.voice].speed * (0.4 + level * 1.5));
}

/* ---------------- banner ---------------- */

function showBanner(text, actionLabel, action) {
  els.bannerText.textContent = text;
  els.banner.hidden = false;
  bannerAction = action || null;
  els.bannerAction.hidden = !action;
  if (action) els.bannerAction.textContent = actionLabel || 'Try again';
}

function clearBanner() {
  els.banner.hidden = true;
  bannerAction = null;
  els.bannerAction.hidden = true;
}

els.bannerAction.addEventListener('click', () => {
  const action = bannerAction;
  clearBanner();
  if (action) action();
});

/* ---------------- announcements ---------------- */

const STAGE_SAYS = {
  intro: 'Talk to Sam when you are ready.',
  discover: 'Sam is listening.',
  map: 'Career cards are on screen.',
  detail: '',
  simulate: 'The work trial has started.',
  debrief: 'The trial is over. Say how it felt.',
  ended: 'Conversation ended. Nothing is saved.',
};

function announce(text) {
  if (!text) return;
  els.srStatus.textContent = '';
  window.setTimeout(() => {
    els.srStatus.textContent = text;
  }, 40);
}

/* ---------------- captions ---------------- */

function renderCaptions() {
  let lastAgent = null;
  let lastUser = null;
  for (let i = S.messages.length - 1; i >= 0; i -= 1) {
    const message = S.messages[i];
    if (!lastAgent && message.role === 'agent') lastAgent = message;
    if (!lastUser && message.role === 'user') lastUser = message;
    if (lastAgent && lastUser) break;
  }

  els.captionSam.textContent =
    lastAgent?.text ?? (S.stage === 'intro' ? '' : 'Sam will show up here as you talk.');
  els.captionUser.textContent = lastUser?.text ?? '';
  els.captionUser.hidden = !lastUser;
}

function addMessage(role, text) {
  const clean = String(text ?? '').trim();
  if (!clean) return;
  const last = S.messages[S.messages.length - 1];

  if (last && last.role === role) {
    if (last.text === clean) return;
    // Live transcripts revise themselves: "I like" then "I like fixing bikes".
    if (clean.startsWith(last.text)) {
      last.text = clean;
      renderCaptions();
      return;
    }
    if (last.text.startsWith(clean)) return;
  }

  S.messages.push({ role, text: clean });
  if (S.messages.length > 12) S.messages.splice(0, S.messages.length - 12);
  renderCaptions();
}

function lastAgentText() {
  for (let i = S.messages.length - 1; i >= 0; i -= 1) {
    if (S.messages[i].role === 'agent') return S.messages[i].text;
  }
  return '';
}

/* ---------------- stage ---------------- */

function setStage(next) {
  if (S.stage === next) {
    renderCaptions();
    return;
  }

  const previous = S.stage;
  S.stage = next;
  els.app.dataset.stage = next;

  if (next !== 'detail' && !els.sheet.hidden) {
    els.sheet.hidden = true;
    els.sheetScrim.hidden = true;
    S.openId = null;
  }

  if (next === 'simulate' && previous !== 'simulate') {
    S.decision = Math.max(1, S.decision);
    renderScene();
    els.askMoveInput.value = '';
  }
  if (next === 'debrief') renderDebrief();

  els.surface.scrollTop = 0;
  renderCaptions();
  announce(STAGE_SAYS[next]);
}

/* ---------------- card payload ---------------- */

// The tool payload is model output, so it is treated as untrusted: JSON or a
// string, missing fields, repeats. Everything below either renders a card or
// drops it and logs why. Nothing throws.
const CARD_LIMITS = { cards: 5, oneLiner: 20, fitReason: 15 };

const FIELD_HINTS = {
  outdoors: [
    'animal', 'outdoor', 'farm', 'hortic', 'garden', 'tree', 'nature', 'environ',
    'vet', 'wildlife', 'sport', 'landscap', 'forest', 'maritime', 'fishing', 'conserv',
  ],
  people: [
    'help', 'care', 'nurse', 'teach', 'youth', 'support', 'social', 'therap', 'health',
    'counsel', 'assist', 'community', 'child', 'disabil', 'coach', 'train', 'people',
  ],
  tech: [
    'code', 'software', 'data', 'tech', 'game', 'cyber', 'robot', 'network', 'it ',
    'digital', 'qa', 'test', 'computer', 'engineer', 'electric',
  ],
  creative: [
    'design', 'art', 'sound', 'film', 'music', 'animat', 'media', 'fashion', 'photo',
    'craft', 'illustrat', 'writer', 'theatre', 'video', 'edit', 'content',
  ],
  making: [
    'build', 'fix', 'repair', 'weld', 'fabricat', 'construct', 'plumb', 'carpent',
    'mechanic', 'manufactur', 'machin', 'tool', 'assembly', 'maker', 'install',
  ],
};

const FIELD_ORDER = ['outdoors', 'people', 'tech', 'creative', 'making'];

function fieldFor(card) {
  // The job's own words decide first. The one-liner is the tie-breaker, so a
  // sound designer who works on games stays creative rather than tech.
  const own = `${card.title} ${(card.tags || []).join(' ')}`.toLowerCase();
  for (const field of FIELD_ORDER) {
    if (FIELD_HINTS[field].some((hint) => own.includes(hint))) return field;
  }

  const blurb = String(card.oneLiner || '').toLowerCase();
  for (const field of FIELD_ORDER) {
    if (FIELD_HINTS[field].some((hint) => blurb.includes(hint))) return field;
  }
  return 'making';
}

function words(text) {
  return String(text ?? '').trim().split(/\s+/).filter(Boolean);
}

function clip(text, max) {
  const parts = words(text);
  return parts.length > max ? `${parts.slice(0, max).join(' ')}…` : parts.join(' ');
}

function asList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function slugify(text, index) {
  const slug = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `card-${index}`;
}

function validateCards(input) {
  let raw = input;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }
  if (raw && !Array.isArray(raw) && Array.isArray(raw.cards)) raw = raw.cards;
  if (!Array.isArray(raw)) return { cards: [], rejected: ['not-a-list'] };

  const seen = new Set();
  const cards = [];
  const rejected = [];

  for (const [index, candidate] of raw.entries()) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      rejected.push('not-a-card');
      continue;
    }
    const title = String(candidate.title ?? candidate.name ?? '').trim();
    if (!title) {
      rejected.push('no-title');
      continue;
    }
    const id = String(candidate.id ?? slugify(title, index)).trim();
    if (seen.has(id)) {
      rejected.push('duplicate');
      continue;
    }
    const routes = asList(candidate.routes ?? candidate.route ?? candidate.how_to_get_in);
    if (!routes.length) {
      rejected.push('no-routes');
      continue;
    }
    seen.add(id);

    const card = {
      id,
      title,
      oneLiner: clip(
        candidate.oneLiner ?? candidate.one_liner ?? candidate.what ?? '',
        CARD_LIMITS.oneLiner,
      ),
      fitReason: clip(
        candidate.fitReason ?? candidate.fit_reason ?? candidate.why ?? '',
        CARD_LIMITS.fitReason,
      ),
      routes,
      tags: asList(candidate.tags).slice(0, 3),
    };
    card.field = fieldFor(card);
    cards.push(card);
    if (cards.length === CARD_LIMITS.cards) break;
  }

  if (!cards.length) console.warn('[next-step] cards rejected:', rejected.join(',') || 'empty');
  return { cards, rejected };
}

/* ---------------- cards ---------------- */

function chunk(parent, className, text) {
  const node = document.createElement('span');
  node.className = className;
  if (text) node.textContent = text;
  parent.append(node);
  return node;
}

function renderCards() {
  els.cardField.replaceChildren();
  els.cardsEmpty.hidden = S.cards.length > 0;

  S.cards.forEach((card, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'career';
    button.dataset.field = card.field;
    button.dataset.id = card.id;
    button.style.setProperty('--i', String(index));
    button.style.setProperty('--tilt', index === 0 ? '0deg' : index % 2 ? '0.7deg' : '-0.6deg');

    chunk(button, 'career-title', card.title);
    if (card.oneLiner) chunk(button, 'career-what', card.oneLiner);

    const chips = document.createElement('span');
    chips.className = 'career-chips';
    if (card.fitReason) chunk(chips, 'chip chip-fit', card.fitReason);
    if (card.routes[0]) chunk(chips, 'chip chip-route', card.routes[0]);
    button.append(chips);

    button.addEventListener('click', () => openCard(card.id));
    els.cardField.append(button);
  });
}

function showCards(payload) {
  const { cards, rejected } = validateCards(payload?.cards ?? payload);

  if (!cards.length) {
    els.cardField.replaceChildren();
    els.cardsEmpty.hidden = false;
    els.cardsNote.textContent = 'Ask Sam for another set.';
    return `No cards rendered (${rejected.join(', ') || 'empty'}). Each needs a title and one route.`;
  }

  S.cards = cards;
  S.openId = null;
  S.chosenId = null;
  S.pendingSim = false;
  S.simTurns = 0;
  S.decision = 1;
  S.sceneText = '';
  S.debriefText = '';

  els.cardsEmpty.hidden = true;
  els.cardsNote.textContent = 'Tap one, or ask about it out loud.';
  renderCards();
  setStage('map');

  return `Cards are on screen: ${cards.map((card) => card.title).join(', ')}.`;
}

/* ---------------- detail sheet ---------------- */

function describeCard(card) {
  return [
    `${card.title}.`,
    `What they do: ${card.oneLiner || 'not given'}.`,
    `Why it came up: ${card.fitReason || 'not given'}.`,
    `Ways in: ${card.routes.join('; ')}.`,
  ].join(' ');
}

function sheetSection(title, text) {
  const section = document.createElement('section');
  section.className = 'sheet-section';
  const heading = document.createElement('h3');
  heading.textContent = title;
  const body = document.createElement('p');
  body.textContent = text;
  section.append(heading, body);
  return section;
}

function openCard(id) {
  const card = S.cards.find((candidate) => candidate.id === id);
  if (!card) return;

  S.openId = id;
  els.sheet.dataset.field = card.field;
  els.sheetTitle.textContent = card.title;
  els.sheetTags.replaceChildren();
  card.tags.forEach((tag) => chunk(els.sheetTags, 'chip', tag));

  els.sheetBody.replaceChildren();
  if (card.oneLiner) els.sheetBody.append(sheetSection('What you actually do', card.oneLiner));
  if (card.fitReason) els.sheetBody.append(sheetSection('Why this came up', card.fitReason));

  if (card.routes.length) {
    const section = document.createElement('section');
    section.className = 'sheet-section';
    const heading = document.createElement('h3');
    heading.textContent = 'Ways in';
    const list = document.createElement('ul');
    list.className = 'sheet-list';
    card.routes.forEach((route) => {
      const item = document.createElement('li');
      item.textContent = route;
      list.append(item);
    });
    section.append(heading, list);
    els.sheetBody.append(section);
  }

  const others = S.cards.filter((candidate) => candidate.id !== id);
  if (others.length) {
    const section = document.createElement('section');
    section.className = 'sheet-section';
    const heading = document.createElement('h3');
    heading.textContent = 'Related careers';
    const chips = document.createElement('div');
    chips.className = 'chips';
    others.forEach((other) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chip-feel';
      button.textContent = other.title;
      button.addEventListener('click', () => openCard(other.id));
      chips.append(button);
    });
    section.append(heading, chips);
    els.sheetBody.append(section);
  }

  els.sheetBody.scrollTop = 0;
  els.askSheetInput.value = '';
  els.sheet.hidden = false;
  els.sheetScrim.hidden = false;
  setStage('detail');
  els.sheetClose.focus({ preventScroll: true });

  if (conversation) conversation.sendContextualUpdate(`User opened: ${describeCard(card)}`);
  announce(`${card.title} opened.`);
}

function closeSheet() {
  if (els.sheet.hidden && S.stage !== 'detail') return;
  const previousId = S.openId;
  if (S.stage === 'detail') setStage('map');
  else {
    els.sheet.hidden = true;
    els.sheetScrim.hidden = true;
    S.openId = null;
  }
  if (previousId) {
    const card = els.cardField.querySelector(`[data-id="${CSS.escape(previousId)}"]`);
    card?.focus({ preventScroll: true });
  }
}

/* ---------------- simulation and debrief ---------------- */

function renderScene() {
  els.sceneText.textContent = S.sceneText || 'Sam is setting the scene.';
  els.sceneMark.textContent = `Decision ${Math.min(3, S.decision)} of 3`;
}

function withArticle(title) {
  return `${/^[aeiou]/i.test(title) ? 'an' : 'a'} ${title}`;
}

function renderDebrief() {
  const card = S.cards.find((candidate) => candidate.id === S.chosenId);
  els.debriefTitle.textContent = card
    ? `That was a day as ${withArticle(card.title)}.`
    : 'That was a day at work.';
  els.debriefQuote.textContent = S.debriefText || S.sceneText || '';
  els.feelChips.querySelectorAll('[data-feel]').forEach((chip) => {
    chip.setAttribute('aria-pressed', 'false');
  });
}

/* ---------------- conversation signals ---------------- */

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'your', 'you', 'that', 'this', 'from', 'into', 'about',
]);

function significant(text) {
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));
}

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth'];

function consumeLocalEcho(text) {
  const clean = text.trim().toLowerCase();
  const now = Date.now();
  const index = localSends.findIndex((sent) => {
    if (now - sent.at > 20000) return false;
    const value = sent.text.toLowerCase();
    return clean === value || clean.startsWith(value) || value.startsWith(clean);
  });
  if (index < 0) return false;
  localSends.splice(index, 1);
  return true;
}

function noteUserTurn(text, local = false) {
  const clean = String(text ?? '').trim();
  if (!clean) return;
  if (!local && consumeLocalEcho(clean)) return;
  if (local) {
    localSends.push({ text: clean, at: Date.now() });
    if (localSends.length > 3) localSends.shift();
  }

  const lower = clean.toLowerCase();
  const isQuestion =
    /\?/.test(clean) ||
    /^(what|who|where|when|why|how|is|are|can|could|do|does|did|would|should|tell)\b/.test(lower);

  if (S.stage === 'map' || S.stage === 'detail') {
    const named = S.cards.find((card) =>
      significant(card.title).some((word) => lower.includes(word)),
    );
    const ordinal = ORDINALS.findIndex((word) => new RegExp(`\\b${word}\\b`).test(lower));
    const affirmative =
      /\b(yes|yeah|yep|yup|sure|okay|ok|grand|go on|sounds good|that one|the first|the second|the third|the last one|last one|i'll try|ill try|let's do|lets do|try it|why not)\b/.test(
        lower,
      );

    if (!isQuestion && (named || ordinal >= 0 || affirmative)) {
      S.chosenId =
        named?.id ??
        (ordinal >= 0 ? S.cards[ordinal]?.id : null) ??
        S.chosenId ??
        S.cards.at(-1)?.id ??
        null;
      S.pendingSim = true;
    }
  }

  if (S.stage === 'simulate') {
    S.simTurns += 1;
    S.decision = Math.min(3, S.decision + 1);
    renderScene();
  }
}

function sceneCue(text) {
  const value = String(text ?? '').trim();
  return (
    /^(you're|you are|it's|it is|you've|you have|you just)\b/i.test(value) ||
    /\byou're (in|at|on|the)\b/i.test(value) ||
    /\bdecision\b/i.test(value)
  );
}

function debriefCue(text) {
  return /\b(most people|what surprises|hard part|next step|this week|how did that feel|how did it feel|felt like)\b/i.test(
    text,
  );
}

function noteAgentTurn(text) {
  if (S.stage === 'simulate') {
    if (debriefCue(text) && S.simTurns >= 1) {
      S.debriefText = text;
      setStage('debrief');
      return;
    }
    S.sceneText = text;
    renderScene();
    return;
  }

  if ((S.stage === 'map' || S.stage === 'detail') && S.pendingSim && sceneCue(text)) {
    S.sceneText = text;
    S.decision = 1;
    S.simTurns = 0;
    S.pendingSim = false;
    setStage('simulate');
  }
}

/* ---------------- sending ---------------- */

function sendAsUser(raw) {
  const text = String(raw ?? '').trim();
  if (!text || !conversation) return;

  addMessage('user', text);
  noteUserTurn(text, true);
  conversation.sendUserMessage(text);
  setVoice('thinking');
  clearTimeout(thinkingTimer);
  thinkingTimer = window.setTimeout(() => {
    if (S.voice === 'thinking' && conversation) setVoice('listening');
  }, 8000);
}

function submitAsk(event, input) {
  event.preventDefault();
  const value = input.value.trim();
  if (!value) return;
  if (!conversation) {
    showBanner('Sam is not connected yet. Tap the orb to start.', null);
    return;
  }
  input.value = '';
  sendAsUser(value);
}

/* ---------------- session ---------------- */

function resetForSession() {
  S.messages = [];
  S.cards = [];
  S.openId = null;
  S.chosenId = null;
  S.decision = 1;
  S.simTurns = 0;
  S.pendingSim = false;
  S.sceneText = '';
  S.debriefText = '';
  localSends.length = 0;
  els.cardField.replaceChildren();
  els.cardsEmpty.hidden = true;
  els.sheet.hidden = true;
  els.sheetScrim.hidden = true;
  els.cardsNote.textContent = 'Tap one, or ask about it out loud.';
  renderCaptions();
}

function micMessage(error) {
  const name = error?.name ?? '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'The microphone is blocked. Tap the lock icon in your browser bar, allow the microphone, then try again.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No microphone found. You can still type to Sam below.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Another app is using the microphone. Close it, then try again.';
  }
  return 'The microphone did not start. Check your browser settings, then try again.';
}

async function start({ reconnect = false } = {}) {
  if (starting || conversation) return;
  starting = true;
  clearBanner();
  setVoice('connecting');
  els.voice.disabled = true;

  try {
    const response = await fetch('/api/session');
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Could not start a session.');
    if (body.warning) showBanner(body.warning, null);

    // Ask for the mic first, so a denied prompt is a clear message. Release it
    // straight away: the SDK opens its own stream.
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());

    if (!reconnect) {
      resetForSession();
      setStage('intro');
    }

    conversation = await Conversation.startSession({
      ...(body.conversationToken
        ? { conversationToken: body.conversationToken }
        : body.signedUrl
          ? { signedUrl: body.signedUrl, connectionType: 'websocket' }
          : { agentId: body.agentId }),

      clientTools: {
        show_career_cards: (params) => showCards(params?.cards ?? params),
        show_helpline: () => {
          showSupport();
          return 'A support card with helpline numbers is on screen.';
        },
      },

      onConnect: () => {
        reconnectAttempts = 0;
        S.connected = true;
        setVoice('listening');
        if (!reconnect) setStage('discover');
        else if (!S.openId) setStage(S.cards.length ? 'map' : 'discover');
        els.voice.disabled = false;
      },

      onDisconnect: handleDisconnect,

      onStatusChange: () => {},

      onMessage: (payload) => {
        const text = String(payload?.message ?? '').trim();
        if (!text) return;
        const isUser = payload.role === 'user' || payload.source === 'user';
        addMessage(isUser ? 'user' : 'agent', text);
        if (isUser) noteUserTurn(text);
        else noteAgentTurn(text);
      },

      onModeChange: ({ mode }) => {
        if (!conversation) return;
        if (mode === 'speaking') {
          setVoice('speaking');
          if ((S.stage === 'map' || S.stage === 'detail') && S.pendingSim) {
            S.pendingSim = false;
            S.decision = 1;
            S.simTurns = 0;
            S.sceneText = lastAgentText();
            setStage('simulate');
          }
          return;
        }
        if (S.voice !== 'blocked' && S.stage !== 'ended') setVoice('listening');
      },

      onAgentTyping: () => {
        if (conversation && S.stage !== 'ended') setVoice('thinking');
      },

      onInterruption: () => {
        setVoice('listening');
      },

      onVadScore: () => {},

      onError: (message) => {
        console.error('[elevenlabs]', message);
        if (conversation) setVoice('listening');
        showBanner(String(message), null);
      },
    });

    if (!body.warning) clearBanner();
  } catch (error) {
    console.error(error);
    conversation = null;
    S.connected = false;
    starting = false;
    els.voice.disabled = false;

    const denied =
      error?.name === 'NotAllowedError' ||
      error?.name === 'SecurityError' ||
      error?.name === 'NotFoundError';
    setVoice(denied ? 'blocked' : 'ready');
    showBanner(
      denied ? micMessage(error) : error?.message ? String(error.message) : 'Could not connect.',
      'Try again',
      () => start(),
    );
    announce('Sam could not start. There is a message on screen.');
    return;
  }

  starting = false;
  els.voice.disabled = false;
}

function scheduleReconnect() {
  reconnectAttempts += 1;
  clearTimeout(reconnectTimer);
  setVoice('reconnecting');
  reconnectTimer = window.setTimeout(() => start({ reconnect: true }), 800 * reconnectAttempts);
}

function handleDisconnect(details) {
  conversation = null;
  S.connected = false;
  els.voice.disabled = false;

  if (stopping || S.stage === 'ended') return;

  if (details?.reason === 'error' && reconnectAttempts < MAX_RECONNECTS) {
    scheduleReconnect();
    return;
  }

  setVoice('blocked');
  showBanner('The connection dropped. Check your signal, then try again.', 'Reconnect', () =>
    start({ reconnect: true }),
  );
  announce('The connection dropped. Cards and captions are still on screen.');
}

async function stop() {
  clearTimeout(reconnectTimer);
  clearTimeout(thinkingTimer);
  stopping = true;
  const session = conversation;
  conversation = null;
  S.connected = false;
  setVoice('ended');
  setStage('ended');
  if (session) {
    try {
      await session.endSession();
    } catch (error) {
      console.warn('endSession failed', error);
    }
  }
  stopping = false;
}

/* ---------------- support ---------------- */

function renderSupportLines() {
  if (els.supportLines.childElementCount) return;
  HELP_LINES.forEach((line) => {
    const link = document.createElement('a');
    link.className = 'support-call';
    link.href = line.href;
    const name = document.createElement('span');
    name.textContent = line.name;
    const number = document.createElement('strong');
    number.textContent = line.number;
    link.append(name, number);
    els.supportLines.append(link);
  });
}

function showSupport() {
  renderSupportLines();
  returnFocus = document.activeElement;
  els.support.hidden = false;
  els.supportLink.hidden = false;
  const first = els.support.querySelector('a, button');
  first?.focus({ preventScroll: true });
  announce('Support numbers are on screen. You are not in trouble.');
}

function hideSupport() {
  els.support.hidden = true;
  if (returnFocus && typeof returnFocus.focus === 'function') {
    returnFocus.focus({ preventScroll: true });
  }
  returnFocus = null;
}

/* ---------------- focus traps ---------------- */

function trapFocus(container, event) {
  if (event.key !== 'Tab') return;
  const items = [
    ...container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((element) => element.offsetParent !== null);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/* ---------------- wiring ---------------- */

els.voice.addEventListener('click', () => {
  if (conversation) {
    if (S.voice === 'speaking') {
      conversation.sendUserActivity();
      setVoice('listening');
    }
    return;
  }
  if (!starting) start();
});

els.supportLink.addEventListener('click', showSupport);
els.supportDismiss.addEventListener('click', hideSupport);

els.askDiscover.addEventListener('submit', (event) => submitAsk(event, els.askDiscoverInput));
els.askMove.addEventListener('submit', (event) => submitAsk(event, els.askMoveInput));
els.askSheet.addEventListener('submit', (event) => submitAsk(event, els.askSheetInput));

els.sheetClose.addEventListener('click', closeSheet);
els.sheetScrim.addEventListener('click', closeSheet);

els.tryDay.addEventListener('click', () => {
  const card = S.cards.find((candidate) => candidate.id === S.openId);
  if (!card) return;
  S.chosenId = card.id;
  S.decision = 1;
  S.simTurns = 0;
  S.pendingSim = false;
  S.sceneText = '';
  setStage('simulate');
  sendAsUser(`I'd like to try a day as a ${card.title.toLowerCase()}.`);
  // Asking to try it is not the first decision of the day.
  S.simTurns = 0;
  S.decision = 1;
  renderScene();
});

els.tryAnother.addEventListener('click', () => {
  S.chosenId = null;
  S.pendingSim = false;
  S.decision = 1;
  S.simTurns = 0;
  S.sceneText = '';
  S.debriefText = '';
  setStage('map');
  if (conversation) {
    conversation.sendContextualUpdate(
      'User wants to try another career. Wait for them to pick one of the cards on screen.',
    );
  }
});

els.stopNow.addEventListener('click', () => stop());

els.talkAgain.addEventListener('click', () => {
  if (conversation) {
    setStage('discover');
    return;
  }
  start();
});

els.feelChips.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-feel]');
  if (!chip) return;
  els.feelChips
    .querySelectorAll('[data-feel]')
    .forEach((other) => other.setAttribute('aria-pressed', String(other === chip)));
  sendAsUser(chip.dataset.feel);
});

els.sheet.addEventListener('keydown', (event) => trapFocus(els.sheet, event));
els.support.addEventListener('keydown', (event) => trapFocus(els.supportCard, event));

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!els.support.hidden) {
    hideSupport();
    return;
  }
  if (!els.sheet.hidden) closeSheet();
});

/* ---------------- rehearsal aids ---------------- */

window.__nextStep = {
  showCards: (payload) => showCards(payload),
  showHelpline: showSupport,
  stage: (name) => setStage(name),
  cards: () => S.cards,
  mic: () => (conversation ? Number(conversation.getInputVolume().toFixed(4)) : null),
  events: () => S.messages,
  simulateDrop: () => handleDisconnect({ reason: 'error', message: 'simulated drop' }),
};

/* ---------------- boot ---------------- */

setVoice('ready');
renderCaptions();
pumpLevel();

els.support.hidden = true;
els.sheet.hidden = true;
els.sheetScrim.hidden = true;

fetch('/api/health')
  .then((response) => response.json())
  .then((health) => {
    if (!health.hasAgentId) {
      showBanner('No agent is set up yet. Run npm run setup-agent, then reload.', null);
    }
  })
  .catch(() => {});
