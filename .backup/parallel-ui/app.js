/* NEXT STEP — one conversation, five screens, one state machine.
   Voice is the front door; text is a full fallback, not a stub. The app owns
   screen state, the career run and the support path, so a reconnect or a
   replayed event cannot reset a decision or lose a disclosure. */

import { validateCards, cardsSignature } from './lib/cards.js';
import { classifySafety, HELPLINES } from './lib/safety.js';
import { buildCareerDetail, detailToContext, routeTypeLabel } from './lib/careers.js';
import {
  scenarioForCard,
  createRun,
  currentStage,
  choose,
  matchOption,
  reflectionFor,
  scenarioContext,
} from './lib/scenarios.js';

const { Conversation } = window.ElevenLabsClient;

const $ = (id) => document.getElementById(id);

const els = {
  status: $('status'),
  statusText: $('status-text'),
  steps: $('steps'),
  screens: {
    welcome: $('screen-welcome'),
    discover: $('screen-discover'),
    profile: $('screen-profile'),
    map: $('screen-map'),
    detail: $('screen-detail'),
    simulation: $('screen-simulation'),
    reflection: $('screen-reflection'),
    support: $('screen-support'),
  },
  startVoice: $('start-voice'),
  startText: $('start-text'),
  orb: $('orb'),
  orbLabel: $('orb-label'),
  transcript: $('transcript'),
  transcriptEmpty: $('transcript-empty'),
  profileSummary: $('profile-summary'),
  profileGroups: $('profile-groups'),
  profileHint: $('profile-hint'),
  profileConfirm: $('profile-confirm'),
  profileCorrect: $('profile-correct'),
  cards: $('cards'),
  mapSub: $('map-sub'),
  detailBack: $('detail-back'),
  detailEyebrow: $('detail-eyebrow'),
  detailTitle: $('detail-title'),
  detailOneLiner: $('detail-oneliner'),
  detailFit: $('detail-fit'),
  detailDaily: $('detail-daily'),
  detailSkills: $('detail-skills'),
  detailSubjects: $('detail-subjects'),
  detailRoutes: $('detail-routes'),
  detailRelated: $('detail-related'),
  detailNote: $('detail-note'),
  detailTry: $('detail-try'),
  detailAsk: $('detail-ask'),
  simWhere: $('sim-where'),
  simTitle: $('sim-title'),
  simRole: $('sim-role'),
  simSituation: $('sim-situation'),
  simProgress: $('sim-progress'),
  simDecision: $('sim-decision'),
  simQuestion: $('sim-question'),
  simOptions: $('sim-options'),
  simOutcome: $('sim-outcome'),
  simOutcomeText: $('sim-outcome-text'),
  simNext: $('sim-next'),
  simExit: $('sim-exit'),
  simRestart: $('sim-restart'),
  simTimer: $('sim-timer'),
  reflectTitle: $('reflect-title'),
  reflectWhat: $('reflect-what'),
  reflectChoices: $('reflect-choices'),
  reflectHard: $('reflect-hard'),
  reflectNext: $('reflect-next'),
  reflectAgain: $('reflect-again'),
  reflectMore: $('reflect-more'),
  supportList: $('support-list'),
  supportClose: $('support-close'),
  dock: $('dock'),
  mic: $('mic'),
  micLabel: $('mic-label'),
  typeForm: $('type-form'),
  typeInput: $('type-input'),
  send: $('send'),
  hint: $('hint'),
  liveCaption: $('live-caption'),
  announcer: $('announcer'),
  helpline: $('helpline'),
  helplineList: $('helpline-list'),
  helplineDismiss: $('helpline-dismiss'),
};

const state = {
  screen: 'welcome',
  mode: null, // voice | text
  conversation: null,
  starting: false,
  safetyStop: false,
  profile: null,
  cards: [],
  selectedCard: null,
  detail: null,
  run: null,
  scenario: null,
  awaitingNext: false,
  freeform: false,
  simStartedAt: 0,
  reconnectAttempts: 0,
  lastCardsSignature: '',
  lastProfileSignature: '',
};

const MAX_RECONNECTS = 2;
let reconnectTimer = null;
let simTicker = null;
const recentMessages = new Map();
const eventLog = [];
const sessionStart = performance.now();

/* ---------------- logging ---------------- */

function logEvent(type, detail = {}) {
  const entry = { at: Math.round(performance.now() - sessionStart), type, ...detail };
  eventLog.push(entry);
  if (eventLog.length > 1500) eventLog.shift();
  console.debug(`[next-step ${entry.at}ms] ${type}`, detail);
  return entry;
}

/* ---------------- status and screen ---------------- */

function setStatus(status, text) {
  els.status.dataset.state = status;
  els.statusText.textContent = text;
}

function setHint(text, isError = false) {
  els.hint.textContent = text;
  els.hint.classList.toggle('is-error', isError);
}

function announce(text) {
  els.announcer.textContent = '';
  requestAnimationFrame(() => {
    els.announcer.textContent = text;
  });
}

const STEP_FOR_SCREEN = {
  discover: 'discover',
  profile: 'profile',
  map: 'map',
  detail: 'map',
  simulation: 'simulate',
  reflection: 'simulate',
};

function showScreen(name) {
  if (!els.screens[name]) return;
  state.screen = name;
  for (const [key, el] of Object.entries(els.screens)) el.hidden = key !== name;

  const step = STEP_FOR_SCREEN[name];
  els.steps.hidden = !step;
  if (step) {
    const order = ['discover', 'profile', 'map', 'simulate'];
    const activeIndex = order.indexOf(step);
    els.steps.querySelectorAll('.step').forEach((el) => {
      const index = order.indexOf(el.dataset.step);
      el.classList.toggle('is-active', index === activeIndex);
      el.classList.toggle('is-done', index < activeIndex);
      if (index === activeIndex) el.setAttribute('aria-current', 'step');
      else el.removeAttribute('aria-current');
    });
  }

  els.dock.hidden = name === 'welcome';
  els.liveCaption.hidden = name === 'discover' || name === 'welcome' || name === 'support';
  if (name !== 'discover') els.liveCaption.textContent = '';

  const screen = els.screens[name];
  const heading = screen.querySelector('h1, h2');
  if (heading) {
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    // Wait for the section to be visible before moving focus.
    requestAnimationFrame(() => heading.focus({ preventScroll: true }));
  }
  logEvent('screen', { name });
}

function updateOrb(mode) {
  els.orb.dataset.state = mode;
  els.orbLabel.textContent = {
    idle: 'Tap the mic and say anything',
    listening: 'Listening. Take your time.',
    speaking: 'Sam is talking. Interrupt any time.',
    thinking: 'Thinking…',
    muted: 'Mic off. Type instead if you like.',
    off: 'Conversation ended',
  }[mode] ?? '';
}

function updateDock() {
  const text = state.mode === 'text';
  els.mic.hidden = text || state.screen === 'welcome';
  els.micLabel.textContent = state.conversation ? 'End' : 'Start';
  els.typeInput.placeholder = text ? 'Type to Sam…' : 'Or type instead…';
}

/* ---------------- transcript ---------------- */

let transcriptTouched = false;

function clearEmptyState() {
  if (transcriptTouched) return;
  transcriptTouched = true;
  els.transcriptEmpty?.remove();
}

function addLine(role, text) {
  clearEmptyState();
  const line = document.createElement('div');
  line.className = `line is-${role}`;
  const who = document.createElement('div');
  who.className = 'who';
  who.textContent = role === 'user' ? 'You' : 'Sam';
  const what = document.createElement('div');
  what.className = 'what';
  what.textContent = text;
  line.append(who, what);
  els.transcript.append(line);
  els.transcript.scrollTop = els.transcript.scrollHeight;
  if (state.screen !== 'discover' && role === 'agent') {
    els.liveCaption.hidden = state.screen === 'support' || state.screen === 'welcome';
    els.liveCaption.textContent = text;
  }
}

// Reconnects replay. Identical text within two seconds is a replay, not a
// person saying "okay" twice.
function isDuplicate(key) {
  const now = performance.now();
  const last = recentMessages.get(key);
  recentMessages.set(key, now);
  if (recentMessages.size > 300) {
    for (const [k, at] of recentMessages) if (now - at > 120_000) recentMessages.delete(k);
  }
  return typeof last === 'number' && now - last < 2000;
}

function handleMessage(payload) {
  const text = String(payload?.message ?? '').trim();
  if (!text) return;
  const isUser = payload.role === 'user' || payload.source === 'user';
  const eventId = payload.event_id ?? payload.eventId;
  const key = eventId ? `e:${eventId}` : `${isUser ? 'u' : 'a'}:${text}`;
  if (isDuplicate(key)) {
    logEvent('message-replay-ignored', { role: isUser ? 'user' : 'agent', text: text.slice(0, 60) });
    return;
  }
  logEvent(isUser ? 'user-said' : 'agent-said', { text: text.slice(0, 90) });
  addLine(isUser ? 'user' : 'agent', text);

  if (isUser) {
    if (handleSafety(text)) return;
    if (state.run && !state.awaitingNext && !text.includes('?')) maybeChooseByVoice(text);
  }
}

/* ---------------- safeguarding ---------------- */

function renderHelplines(listEl) {
  listEl.replaceChildren(
    ...HELPLINES.map((item) => {
      const li = document.createElement('li');
      const name = document.createElement('strong');
      name.textContent = item.name;
      const numbers = document.createElement('span');
      numbers.textContent = item.numbers;
      const note = document.createElement('small');
      note.textContent = item.note;
      li.append(name, numbers, note);
      return li;
    }),
  );
}

function showHelpline() {
  els.helpline.hidden = false;
  requestAnimationFrame(() => els.helplineDismiss.focus());
}

function handleSafety(text) {
  if (state.safetyStop) return false;
  const result = classifySafety(text);
  if (!result.triggered) return false;

  state.safetyStop = true;
  state.run = null;
  state.awaitingNext = false;
  stopSimTicker();
  logEvent('safety-stop', { category: result.category, urgent: result.urgent });
  setStatus('support', 'Careers stopped');
  setHint('We have stopped the careers chat. Support is on screen.', false);
  renderHelplines(els.supportList);
  showScreen('support');
  showHelpline();
  updateOrb('off');
  announce('We have stopped the careers chat. Support details are on screen.');

  // The agent is told rather than sent the disclosure as a fresh user turn, so
  // it cannot mistake the disclosure for an answer and carry on with careers.
  sendContextualUpdate(
    `SAFEGUARDING: the young person just said: "${text}". Stop the careers conversation completely and do not return to it. Respond calmly in one or two short sentences. Do not ask for details or promise confidentiality. Point them to a trusted adult and the Childline number on the support card, and say the card is on screen. If there is any risk of immediate danger, tell them to call 112 or 999. Stay with them.`,
  );
  // The disclosure still has to reach the conversation, or Sam has nothing to
  // reply to. It is sent once, with the instruction above already in context.
  if (state.conversation?.sendUserMessage) {
    try {
      state.conversation.sendUserMessage(text);
    } catch {
      // The support card is already on screen; a dead socket must not hide it.
    }
  }
  return true;
}

/* ---------------- session ---------------- */

function sendContextualUpdate(text) {
  if (!state.conversation?.sendContextualUpdate) {
    logEvent('context-skipped', { reason: 'no-session' });
    return false;
  }
  try {
    state.conversation.sendContextualUpdate(text);
    logEvent('context-sent', { text: text.slice(0, 70) });
    return true;
  } catch (error) {
    logEvent('context-failed', { message: String(error) });
    return false;
  }
}

function sendUserText(text) {
  if (!state.conversation?.sendUserMessage) return false;
  try {
    state.conversation.sendUserMessage(text);
    logEvent('user-typed', { text: text.slice(0, 90) });
    return true;
  } catch (error) {
    logEvent('send-failed', { message: String(error) });
    setHint('Could not send that. Check the connection.', true);
    return false;
  }
}

function connectionOptions(body, textOnly, reconnect) {
  if (textOnly) {
    if (body.signedUrl) return { signedUrl: body.signedUrl, connectionType: 'websocket' };
    return { agentId: body.agentId };
  }
  if (body.conversationToken) return { conversationToken: body.conversationToken };
  if (body.signedUrl) return { signedUrl: body.signedUrl, connectionType: 'websocket' };
  return { agentId: body.agentId };
}

async function startSession({ textOnly = false, reconnect = false } = {}) {
  if (state.starting || state.conversation) return null;
  if (state.safetyStop) return null;
  state.starting = true;
  els.startVoice.disabled = true;
  els.startText.disabled = true;
  setStatus('connecting', reconnect ? 'Reconnecting…' : 'Connecting…');
  if (!reconnect) setHint(textOnly ? 'Starting in text mode.' : 'Allow the microphone if your browser asks.');

  try {
    const response = await fetch(`/api/session${textOnly ? '?transport=text' : ''}`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Could not start a session.');
    if (body.warning && !textOnly) setHint(body.warning, true);

    if (!textOnly) {
      try {
        const permission = await navigator.mediaDevices.getUserMedia({ audio: true });
        permission.getTracks().forEach((track) => track.stop());
      } catch (error) {
        logEvent('mic-denied', { message: String(error?.name ?? error) });
        state.starting = false;
        els.startVoice.disabled = false;
        els.startText.disabled = false;
        setHint('Microphone blocked. Switching to text so you can still do this.', true);
        return startSession({ textOnly: true });
      }
    }

    const conversation = await Conversation.startSession({
      ...connectionOptions(body, textOnly, reconnect),
      textOnly,
      clientTools: {
        show_career_cards: (params) => {
          const { cards, rejected } = validateCards(params?.cards ?? params);
          logEvent('cards-received', { count: cards.length, rejected: rejected.join(',') || null });
          const rendered = renderCards(cards);
          return rendered
            ? `Cards are on screen: ${cards.map((c) => c.title).join(', ')}.`
            : `No new cards rendered (${rejected.join(', ') || 'repeat'}). Each card needs an id, title, oneLiner, fitReason, at least one route, and tags.`;
        },
        show_profile: (params) => {
          const rendered = renderProfile(params ?? {});
          return rendered
            ? 'The profile is on screen for them to check.'
            : 'The profile was empty or repeated. Ask one more question, then try again with interests, preferences, barriers and a one-sentence summary.';
        },
        show_helpline: () => {
          state.safetyStop = true;
          state.run = null;
          stopSimTicker();
          renderHelplines(els.supportList);
          setStatus('support', 'Careers stopped');
          showScreen('support');
          showHelpline();
          return 'A support card with Irish helpline numbers is on screen. Careers have stopped.';
        },
      },

      onConnect: ({ conversationId }) => {
        logEvent('connect', { conversationId, textOnly, reconnect });
        state.reconnectAttempts = 0;
        state.mode = textOnly ? 'text' : 'voice';
        setStatus('connected', textOnly ? 'Connected · text' : 'Listening');
        updateOrb(textOnly ? 'idle' : 'listening');
        updateDock();
        if (!reconnect) showScreen('discover');
        setHint(textOnly ? 'Type anything to start.' : 'Speak normally. Interrupt any time.');
      },
      onDisconnect: handleDisconnect,
      onMessage: handleMessage,
      onModeChange: ({ mode }) => {
        const speaking = mode === 'speaking';
        els.mic.classList.toggle('is-speaking', speaking);
        if (speaking) {
          setStatus('connected', 'Sam is talking');
          if (!state.safetyStop) updateOrb('speaking');
        } else {
          setStatus('connected', state.mode === 'text' ? 'Connected · text' : 'Listening');
          if (!state.safetyStop) updateOrb(state.mode === 'text' ? 'idle' : 'listening');
        }
      },
      onInterruption: () => {
        logEvent('interruption');
        updateOrb('listening');
      },
      onError: (message) => {
        logEvent('error', { message: String(message) });
        console.error('[elevenlabs]', message);
        setHint(String(message), true);
        setStatus('error', 'Something went wrong');
      },
    });

    state.conversation = conversation;
    state.starting = false;
    els.startVoice.disabled = false;
    els.startText.disabled = false;
    updateDock();
    setStatus('connected', textOnly ? 'Connected · text' : 'Listening');
    return conversation;
  } catch (error) {
    console.error(error);
    state.starting = false;
    state.conversation = null;
    els.startVoice.disabled = false;
    els.startText.disabled = false;
    setStatus('error', 'Not connected');
    setHint(error?.message ? String(error.message) : 'Could not connect.', true);
    updateOrb('off');
    return null;
  }
}

function handleDisconnect(details) {
  logEvent('disconnect', {
    reason: details?.reason,
    message: details?.message,
    closeCode: details?.closeCode,
  });
  state.conversation = null;
  state.starting = false;
  els.mic.classList.remove('is-speaking');
  updateOrb('off');
  setStatus('idle', 'Disconnected');
  updateDock();

  if (state.safetyStop) {
    setHint('The voice connection ended. The support numbers are still on screen.', true);
    return;
  }
  if (details?.reason === 'error' && state.reconnectAttempts < MAX_RECONNECTS) {
    scheduleReconnect();
    return;
  }
  setHint('Connection ended. Start again when you are ready.', true);
}

function scheduleReconnect() {
  state.reconnectAttempts += 1;
  clearTimeout(reconnectTimer);
  setStatus('connecting', 'Reconnecting…');
  setHint('Connection dropped. Keeping your place…', true);
  logEvent('reconnect-scheduled', { attempt: state.reconnectAttempts });
  reconnectTimer = setTimeout(() => {
    startSession({ textOnly: state.mode === 'text', reconnect: true });
  }, 800 * state.reconnectAttempts);
}

async function stopSession() {
  clearTimeout(reconnectTimer);
  state.reconnectAttempts = MAX_RECONNECTS;
  const session = state.conversation;
  state.conversation = null;
  updateDock();
  updateOrb('off');
  setStatus('idle', 'Ready when you are');
  if (session) {
    try {
      await session.endSession();
    } catch (error) {
      console.warn('endSession failed', error);
    }
  }
}

/* ---------------- profile ---------------- */

function asList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[,;]/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function renderProfile(params) {
  const profile = {
    summary: String(params.summary ?? params.sentence ?? '').trim(),
    interests: asList(params.interests ?? params.likes ?? params.into),
    preferences: asList(params.preferences ?? params.environment ?? params.settings),
    barriers: asList(params.barriers ?? params.blockers ?? params.gets_in_the_way),
  };
  const signature = JSON.stringify(profile);
  if (!profile.interests.length && !profile.preferences.length && !profile.barriers.length && !profile.summary) {
    logEvent('profile-rejected', { reason: 'empty' });
    return false;
  }
  if (signature === state.lastProfileSignature) {
    logEvent('profile-repeat-ignored');
    return false;
  }
  state.lastProfileSignature = signature;
  state.profile = profile;
  els.profileSummary.textContent =
    profile.summary || 'Here is what I picked up about you. Check it before I suggest anything.';
  els.profileGroups.replaceChildren();

  const group = (label, values) => {
    if (!values.length) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'profile-group';
    const heading = document.createElement('h3');
    heading.textContent = label;
    const chips = document.createElement('div');
    chips.className = 'chips';
    values.forEach((value) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      const text = document.createElement('span');
      text.textContent = value;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${value}`);
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        chip.remove();
        state.profile[label] = state.profile[label].filter((v) => v !== value);
        sendContextualUpdate(`Correction: "${value}" is wrong for ${label}. Do not use it again.`);
        logEvent('profile-correction', { label, value });
      });
      chip.append(text, remove);
      chips.append(chip);
    });
    wrapper.append(heading, chips);
    els.profileGroups.append(wrapper);
  };

  group('interests', profile.interests);
  group('preferences', profile.preferences);
  group('barriers', profile.barriers);
  els.profileHint.textContent = 'Wrong? Tap × to remove it, or tell Sam in your own words.';
  showScreen('profile');
  return true;
}

function confirmProfile() {
  sendContextualUpdate(
    'They checked the profile on screen and confirmed it. Move to the Map phase now: call show_career_cards once with three to five careers grounded in that profile, then name up to three out loud.',
  );
  setHint('Getting your careers…');
  logEvent('profile-confirmed');
  els.profileConfirm.disabled = true;
  setTimeout(() => {
    els.profileConfirm.disabled = false;
  }, 4000);
}

/* ---------------- career cards ---------------- */

function renderCards(cards) {
  if (!cards.length) {
    els.mapSub.textContent = 'Could not read those cards. Ask Sam for another set.';
    return false;
  }
  const signature = cardsSignature(cards);
  if (signature === state.lastCardsSignature) {
    logEvent('cards-repeat-ignored', { count: cards.length });
    return false;
  }
  state.lastCardsSignature = signature;
  state.cards = cards;
  els.cards.replaceChildren();
  els.mapSub.textContent = 'Tap a card, or ask about one out loud.';

  cards.forEach((card, index) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'card';
    el.style.animationDelay = `${index * 60}ms`;
    el.setAttribute('aria-label', `Open ${card.title}. ${card.oneLiner}`);

    const title = document.createElement('h3');
    title.textContent = card.title;
    el.append(title);

    if (card.oneLiner) {
      const what = document.createElement('p');
      what.className = 'why';
      what.textContent = card.oneLiner;
      el.append(what);
    }
    if (card.fitReason) {
      const fit = document.createElement('p');
      fit.className = 'fit';
      fit.textContent = `Why it came up: ${card.fitReason}`;
      el.append(fit);
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    if (card.routes.length) {
      const route = document.createElement('div');
      route.className = 'meta-row';
      const dt = document.createElement('dt');
      dt.textContent = 'Route';
      const dd = document.createElement('dd');
      dd.textContent = card.routes.join(' · ');
      route.append(dt, dd);
      meta.append(route);
    }
    if (card.tags.length) {
      const tags = document.createElement('div');
      tags.className = 'tags';
      card.tags.forEach((tag) => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = tag;
        tags.append(span);
      });
      meta.append(tags);
    }
    if (meta.children.length) el.append(meta);

    el.addEventListener('click', () => openDetail(card));
    els.cards.append(el);
  });

  showScreen('map');
  return true;
}

/* ---------------- detail ---------------- */

function fillList(el, values) {
  el.replaceChildren(
    ...values.map((value) => {
      const li = document.createElement('li');
      li.textContent = value;
      return li;
    }),
  );
}

function openDetail(card) {
  const detail = buildCareerDetail(card);
  state.selectedCard = card;
  state.detail = detail;
  logEvent('card-opened', { id: card.id });

  els.detailEyebrow.textContent = card.tags.length ? card.tags.join(' · ') : 'Career detail';
  els.detailTitle.textContent = detail.title;
  els.detailOneLiner.textContent = detail.whatYouDo;
  els.detailFit.textContent = card.fitReason ? `Why it came up: ${card.fitReason}` : '';
  fillList(els.detailDaily, detail.daily);
  fillList(els.detailSkills, detail.skills);
  els.detailSubjects.textContent = detail.subjects.join(' · ');
  els.detailRelated.textContent = detail.related.join(' · ');
  els.detailRoutes.replaceChildren(
    ...detail.routes.map((route) => {
      const li = document.createElement('li');
      const type = document.createElement('span');
      type.className = 'route-type';
      type.textContent = routeTypeLabel(route.type);
      const text = document.createElement('span');
      text.textContent = route.detail;
      li.append(type, text);
      return li;
    }),
  );
  els.detailNote.textContent = detail.note
    ? `${detail.note} AI-generated information. Check with a careers advisor.`
    : 'AI-generated information. Check with a careers advisor.';

  showScreen('detail');
  sendContextualUpdate(
    `${detailToContext(detail)} They have just opened this card. Say one short line about it, then answer their questions.`,
  );
}

/* ---------------- simulation ---------------- */

function stopSimTicker() {
  clearInterval(simTicker);
  simTicker = null;
}

function startSimTicker() {
  stopSimTicker();
  state.simStartedAt = Date.now();
  simTicker = setInterval(() => {
    const seconds = Math.round((Date.now() - state.simStartedAt) / 1000);
    const left = Math.max(0, 180 - seconds);
    els.simTimer.textContent =
      left > 0 ? `About ${Math.max(1, Math.round(left / 60))} min left` : 'Time’s about up';
  }, 5000);
}

function renderSimProgress() {
  if (!state.scenario) {
    els.simProgress.replaceChildren();
    return;
  }
  els.simProgress.replaceChildren(
    ...state.scenario.stages.map((stage, index) => {
      const li = document.createElement('li');
      const choice = state.run?.choices[index];
      li.textContent = choice ? choice.label : `Decision ${index + 1}`;
      li.classList.toggle('is-done', Boolean(choice));
      return li;
    }),
  );
}

function renderSimStage() {
  const stage = currentStage(state.run);
  if (!stage) return renderReflection();
  state.awaitingNext = false;
  els.simDecision.hidden = false;
  els.simOutcome.hidden = true;
  els.simSituation.textContent = stage.situation ?? state.scenario.situation;
  els.simQuestion.textContent = stage.question;
  els.simOptions.replaceChildren(
    ...stage.options.map((option, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'option';
      const idx = document.createElement('span');
      idx.className = 'option-index';
      idx.textContent = String.fromCharCode(65 + index);
      const label = document.createElement('span');
      label.textContent = option.label;
      button.append(idx, label);
      button.addEventListener('click', () => takeDecision(option.id));
      return button;
    }),
  );
  renderSimProgress();
  sendContextualUpdate(
    scenarioContext(state.scenario, state.run) +
      ' Do not read the options out as a list. Let them answer in their own words, or tap one.',
  );
  requestAnimationFrame(() => els.simQuestion.scrollIntoView({ block: 'nearest' }));
}

function takeDecision(optionId, viaVoice = false) {
  if (!state.run || state.awaitingNext) return;
  const result = choose(state.run, optionId);
  if (!result.option) return;
  state.run = result.run;
  state.awaitingNext = true;
  logEvent('sim-choice', { optionId, viaVoice, done: result.done });
  els.simOutcomeText.textContent = result.outcome;
  els.simOutcome.hidden = false;
  els.simDecision.hidden = true;
  els.simNext.textContent = result.done ? 'See what it was like' : 'Next decision';
  renderSimProgress();
  announce(result.outcome);
  sendContextualUpdate(
    `They chose: "${result.option.label}". What happens: ${result.outcome} React in one or two short sentences, in character. Do not restart the scene or summarise the whole scenario.`,
  );
  els.simNext.focus();
}

function maybeChooseByVoice(text) {
  const stage = currentStage(state.run);
  if (!state.scenario || !stage) return;
  const option = matchOption(text, stage);
  if (option) takeDecision(option.id, true);
}

function startSimulation() {
  if (!state.selectedCard) return;
  state.scenario = scenarioForCard(state.selectedCard);
  state.freeform = !state.scenario;
  if (state.scenario) {
    state.run = createRun(state.scenario.id);
    els.simWhere.textContent = `${state.scenario.where} · simulation`;
    els.simTitle.textContent = state.scenario.title;
    els.simRole.textContent = state.scenario.role;
    els.simSituation.textContent = state.scenario.situation;
    els.simProgress.hidden = false;
    els.simDecision.hidden = false;
    els.simOutcome.hidden = true;
    els.simNext.textContent = 'Next decision';
    showScreen('simulation');
    startSimTicker();
    renderSimStage();
  } else {
    startFreeformSimulation();
  }
}

function startFreeformSimulation() {
  const detail = state.detail;
  els.simWhere.textContent = 'Simulation · about 3 minutes';
  els.simTitle.textContent = detail.title;
  els.simRole.textContent = 'Sam will drop you into one ordinary morning of this job.';
  els.simSituation.textContent =
    'You are at work. Something needs a decision before lunch, and there is no obviously right answer.';
  els.simProgress.hidden = true;
  els.simDecision.hidden = false;
  els.simOutcome.hidden = true;
  els.simQuestion.textContent = 'Talk it through with Sam.';
  els.simOptions.replaceChildren();
  const finish = document.createElement('button');
  finish.type = 'button';
  finish.className = 'option';
  finish.innerHTML = '<span class="option-index">→</span><span>Finish and look back on it</span>';
  finish.addEventListener('click', () => renderReflection(true));
  els.simOptions.append(finish);
  showScreen('simulation');
  startSimTicker();
  sendContextualUpdate(
    `SIMULATION for ${detail.title}. ${detailToContext(detail)} Build a three-minute scene now: one ordinary morning, one concrete problem, two or three decisions. Set it in one or two sentences, then ask the first decision. Do not quiz them on facts.`,
  );
}

function renderReflection(freeform = false) {
  stopSimTicker();
  const detail = state.detail;
  const debrief = state.scenario && state.run ? reflectionFor(state.run) : null;

  els.reflectTitle.textContent = debrief ? `That was a ${debrief.title.toLowerCase()} morning.` : 'That’s a wrap.';
  els.reflectWhat.textContent = detail?.whatYouDo ?? 'You just tried a slice of the actual work.';
  els.reflectChoices.replaceChildren(
    ...(state.run?.choices ?? []).map((choice) => {
      const li = document.createElement('li');
      li.textContent = choice.label;
      return li;
    }),
  );
  if (!state.run?.choices.length) {
    const li = document.createElement('li');
    li.textContent = 'You talked it through with Sam and made the calls in your own words.';
    els.reflectChoices.append(li);
  }
  els.reflectHard.textContent =
    debrief?.hardPart ??
    'No one can tell you whether you got it right. You find out later, or you never do.';
  els.reflectNext.textContent =
    debrief?.nextStep ??
    'Ask one person who does this job what their worst Tuesday looks like. That tells you more than a job description.';
  showScreen('reflection');
  sendContextualUpdate(
    `The simulation is finished. Ask one short question about how it felt. Then offer to try another career from their cards, or to stop. Do not pitch.`,
  );
  setStatus('connected', 'Reflecting');
}

function exitSimulation() {
  stopSimTicker();
  state.run = null;
  state.scenario = null;
  state.awaitingNext = false;
  if (state.detail) {
    showScreen('detail');
    sendContextualUpdate('They stepped out of the simulation. Wait for them.');
  } else {
    showScreen('map');
  }
}

/* ---------------- text input ---------------- */

async function submitTyped(text) {
  if (!text) return;
  if (state.safetyStop) return;
  addLine('user', text);

  if (handleSafety(text)) return;

  if (!state.conversation) {
    const conversation = await startSession({ textOnly: true });
    if (!conversation) return;
  }
  if (!sendUserText(text)) {
    addLine('agent', 'I could not send that. Try again in a moment.');
  }
}

/* ---------------- wiring ---------------- */

els.startVoice.addEventListener('click', () => {
  state.mode = 'voice';
  showScreen('discover');
  updateDock();
  startSession({ textOnly: false });
});

els.startText.addEventListener('click', () => {
  state.mode = 'text';
  showScreen('discover');
  updateDock();
  startSession({ textOnly: true });
});

els.mic.addEventListener('click', () => {
  if (state.conversation || state.starting) stopSession();
  else startSession({ textOnly: state.mode === 'text' });
});

els.typeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = els.typeInput.value.trim();
  if (!text) return;
  els.typeInput.value = '';
  submitTyped(text);
});

els.profileConfirm.addEventListener('click', confirmProfile);
els.profileCorrect.addEventListener('click', () => {
  els.typeInput.focus();
  setHint('Tell Sam what to change. One sentence is plenty.');
});

els.detailBack.addEventListener('click', () => {
  showScreen('map');
  sendContextualUpdate('They went back to the career cards. Wait for them to pick one.');
});
els.detailTry.addEventListener('click', startSimulation);
els.detailAsk.addEventListener('click', () => {
  els.typeInput.focus();
  setHint(state.mode === 'text' ? 'Ask about this job.' : 'Ask out loud, or type it here.');
});

els.simNext.addEventListener('click', () => {
  if (state.run?.finished) renderReflection();
  else renderSimStage();
});
els.simExit.addEventListener('click', exitSimulation);
els.simRestart.addEventListener('click', () => {
  if (!state.scenario) return startFreeformSimulation();
  state.run = createRun(state.scenario.id);
  state.awaitingNext = false;
  startSimTicker();
  renderSimStage();
  sendContextualUpdate('They restarted the scene. Set it again in one sentence, then ask the first decision.');
});

els.reflectAgain.addEventListener('click', () => {
  if (state.scenario) {
    state.run = createRun(state.scenario.id);
    state.awaitingNext = false;
    startSimTicker();
    renderSimStage();
    showScreen('simulation');
  } else {
    startFreeformSimulation();
  }
});
els.reflectMore.addEventListener('click', () => {
  showScreen('map');
  setStatus('connected', state.mode === 'text' ? 'Connected · text' : 'Listening');
  sendContextualUpdate('They want to look at the other careers again. Wait for them to choose.');
});

els.helplineDismiss.addEventListener('click', () => {
  els.helpline.hidden = true;
  if (state.safetyStop) els.supportClose.focus();
});
els.supportClose.addEventListener('click', () => {
  announce('Careers are still stopped. Reload the page to start a new conversation.');
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !els.helpline.hidden) {
    els.helpline.hidden = true;
    if (state.safetyStop) els.supportClose.focus();
  }
});

/* ---------------- preflight ---------------- */

fetch('/api/health')
  .then((r) => r.json())
  .then((health) => {
    if (!health.hasAgentId) {
      setStatus('error', 'No agent configured');
      setHint('Run `npm run setup-agent` to create the agent, then reload.', true);
    }
  })
  .catch(() => {});

renderHelplines(els.helplineList);
updateDock();

/* Rehearsal and test hooks. No state is reachable that the UI cannot reach. */
window.__nextStep = {
  showCards: (payload) => renderCards(validateCards(payload).cards),
  showProfile: (payload) => renderProfile(payload),
  showHelpline,
  safetyCheck: (text) => handleSafety(text),
  openCard: (payload) => {
    const { cards } = validateCards(payload);
    if (!cards.length) return false;
    renderCards(cards);
    openDetail(cards[0]);
    return true;
  },
  startSimulation,
  takeDecision,
  reflection: renderReflection,
  state: () => ({
    screen: state.screen,
    mode: state.mode,
    safetyStop: state.safetyStop,
    cards: state.cards.map((c) => c.id),
    run: state.run,
    awaitingNext: state.awaitingNext,
    microphones: Boolean(state.conversation),
  }),
  events: () => eventLog,
  mic: () => (state.conversation ? Number(state.conversation.getInputVolume().toFixed(4)) : null),
};
