/* NEXT STEP — one conversation, eight stages, one state machine.
   Voice is the front door; text is a full fallback, not a stub. The app owns the
   stage, the career run and the support path, so a reconnect or a replayed
   event cannot reset a decision or lose a disclosure. */

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
  app: $('app'),
  surface: $('surface'),
  voice: $('voice'),
  orb: $('orb'),
  voiceState: $('voice-state'),
  voiceSub: $('voice-sub'),
  aura: $('aura'),
  captionSam: $('caption-sam'),
  captionUser: $('caption-user'),
  barState: $('bar-state'),
  captionsToggle: $('captions-toggle'),
  supportLink: $('support-link'),
  banner: $('banner'),
  bannerText: $('banner-text'),
  bannerAction: $('banner-action'),
  srStatus: $('sr-status'),
  panels: {
    discover: $('panel-discover'),
    profile: $('panel-profile'),
    map: $('panel-map'),
    simulate: $('panel-simulate'),
    debrief: $('panel-debrief'),
    ended: $('panel-ended'),
  },
  askDiscover: $('ask-discover'),
  askDiscoverInput: $('ask-discover-input'),
  profileSummary: $('profile-summary'),
  profileGroups: $('profile-groups'),
  profileConfirm: $('profile-confirm'),
  askProfile: $('ask-profile'),
  askProfileInput: $('ask-profile-input'),
  cardField: $('card-field'),
  cardsNote: $('cards-note'),
  cardsEmpty: $('cards-empty'),
  scene: $('scene'),
  sceneMark: $('scene-mark'),
  sceneText: $('scene-text'),
  sceneOptions: $('scene-options'),
  askMove: $('ask-move'),
  askMoveInput: $('ask-move-input'),
  debriefTitle: $('debrief-title'),
  debriefQuote: $('debrief-quote'),
  debriefNext: $('debrief-next'),
  feelChips: $('feel-chips'),
  tryAnother: $('try-another'),
  stopNow: $('stop-now'),
  talkAgain: $('talk-again'),
  sheet: $('sheet'),
  sheetScrim: $('sheet-scrim'),
  sheetClose: $('sheet-close'),
  sheetTitle: $('sheet-title'),
  sheetTags: $('sheet-tags'),
  sheetBody: $('sheet-body'),
  tryDay: $('try-day'),
  askSheet: $('ask-sheet'),
  askSheetInput: $('ask-sheet-input'),
  support: $('support'),
  supportLines: $('support-lines'),
  supportDismiss: $('support-dismiss'),
};

const state = {
  stage: 'intro',
  mode: null, // voice | text
  conversation: null,
  starting: false,
  safetyStop: false,
  profile: null,
  cards: [],
  selectedCard: null,
  detail: null,
  scenario: null,
  run: null,
  freeform: false,
  awaitingNext: false,
  lastCardsSignature: '',
  lastProfileSignature: '',
  reconnectAttempts: 0,
  muted: false,
  lastCardTrigger: null,
};

const MAX_RECONNECTS = 2;
const recentMessages = new Map();
const eventLog = [];
const startedAt = performance.now();
let reconnectTimer = null;
let orb = null;
let bannerHandler = null;
let userCaptionTimer = null;

/* ---------------- log and announce ---------------- */

function log(type, detail = {}) {
  const entry = { at: Math.round(performance.now() - startedAt), type, ...detail };
  eventLog.push(entry);
  if (eventLog.length > 1500) eventLog.shift();
  console.debug(`[next-step ${entry.at}ms] ${type}`, detail);
  return entry;
}

function announce(text) {
  els.srStatus.textContent = '';
  requestAnimationFrame(() => {
    els.srStatus.textContent = text;
  });
}

/* ---------------- voice state and stage ---------------- */

function setVoice(mode, headline, sub) {
  els.app.dataset.voice = mode;
  els.voice.setAttribute('aria-pressed', String(mode === 'muted'));
  els.voiceState.textContent = headline;
  els.voiceSub.textContent = sub;
  const speeds = { ready: 0.18, connecting: 0.6, listening: 0.3, speaking: 1.5, muted: 0.08, disconnected: 0.08, text: 0.2 };
  orb?.setSpeed(speeds[mode] ?? 0.2);
  if (mode === 'speaking') els.barState.textContent = 'Sam is talking';
  else if (mode === 'listening') els.barState.textContent = 'Listening';
  else if (mode === 'muted') els.barState.textContent = 'Mic off';
  else if (mode === 'text') els.barState.textContent = 'Typing';
  else els.barState.textContent = 'Ready';
}

const STAGES = new Set([...Object.keys(els.panels), 'detail']);

function setStage(stage) {
  if (!STAGES.has(stage)) return;
  state.stage = stage;
  els.app.dataset.stage = stage;
  els.surface.scrollTop = 0;
  const panel = stage === 'detail' ? els.sheet : els.panels[stage];
  const heading = panel?.querySelector('h1, h2');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    requestAnimationFrame(() => heading.focus({ preventScroll: true }));
  }
  log('stage', { stage });
}

function setCaption(role, text) {
  if (!text) return;
  if (role === 'user') {
    els.captionUser.textContent = text;
    els.captionUser.hidden = false;
    clearTimeout(userCaptionTimer);
    userCaptionTimer = setTimeout(() => {
      els.captionUser.hidden = true;
    }, 9000);
  } else {
    els.captionSam.textContent = text;
  }
}

/* ---------------- banner ---------------- */

function showBanner(text, actionLabel = null, handler = null) {
  els.bannerText.textContent = text;
  els.banner.hidden = false;
  bannerHandler = handler;
  if (actionLabel && handler) {
    els.bannerAction.textContent = actionLabel;
    els.bannerAction.hidden = false;
  } else {
    els.bannerAction.hidden = true;
  }
}

function hideBanner() {
  els.banner.hidden = true;
  bannerHandler = null;
}

/* ---------------- context and messages ---------------- */

function sendContext(text) {
  if (!state.conversation?.sendContextualUpdate) {
    log('context-skipped', { text: text.slice(0, 90) });
    return false;
  }
  try {
    state.conversation.sendContextualUpdate(text);
    log('context-sent', { text: text.slice(0, 90) });
    return true;
  } catch (error) {
    log('context-failed', { message: String(error) });
    return false;
  }
}

function sendUserMessage(text) {
  if (!state.conversation?.sendUserMessage) return false;
  try {
    state.conversation.sendUserMessage(text);
    log('user-typed', { text: text.slice(0, 90) });
    return true;
  } catch (error) {
    log('send-failed', { message: String(error) });
    showBanner('That did not send. Check your connection and try again.');
    return false;
  }
}

/* ---------------- safeguarding ---------------- */

function renderHelplines() {
  els.supportLines.replaceChildren(
    ...HELPLINES.map((item) => {
      const link = document.createElement('a');
      link.className = 'support-call';
      link.href = `tel:${item.numbers.replace(/[^\d]/g, '')}`;
      const name = document.createElement('span');
      name.textContent = item.name;
      const number = document.createElement('strong');
      number.textContent = item.numbers;
      link.append(name, number);
      return link;
    }),
  );
}

function showSupport() {
  els.support.hidden = false;
  els.supportLink.hidden = false;
  requestAnimationFrame(() => els.supportDismiss.focus());
}

function stopForSafety(text) {
  if (state.safetyStop) return false;
  const result = classifySafety(text);
  if (!result.triggered) return false;

  state.safetyStop = true;
  state.run = null;
  state.awaitingNext = false;
  state.freeform = false;
  closeSheet();
  setStage('ended');
  setVoice('muted', 'Careers stopped', 'Support is on screen. You can still talk to Sam.');
  showSupport();
  log('safety-stop', { category: result.category, urgent: result.urgent });

  sendContext(
    `SAFEGUARDING: they just said: "${text}". Stop the careers conversation completely and do not return to it. Respond calmly in one or two short sentences. Do not ask for details or promise confidentiality. Point them to a trusted adult and the Childline number on the support card, and say the card is on screen. If there is any risk of immediate danger, tell them to call 112 or 999. Stay with them.`,
  );
  if (state.conversation?.sendUserMessage) {
    try {
      state.conversation.sendUserMessage(text);
    } catch {
      // The support card is already on screen.
    }
  }
  announce('Careers stopped. Support details are on screen.');
  return true;
}

/* ---------------- session ---------------- */

function connectionOptions(body, textOnly) {
  if (textOnly) {
    if (body.signedUrl) return { signedUrl: body.signedUrl, connectionType: 'websocket' };
    return { agentId: body.agentId };
  }
  if (body.conversationToken) return { conversationToken: body.conversationToken };
  if (body.signedUrl) return { signedUrl: body.signedUrl, connectionType: 'websocket' };
  return { agentId: body.agentId };
}

async function startSession({ textOnly = false, reconnect = false } = {}) {
  if (state.starting || state.conversation || state.safetyStop) return null;
  state.starting = true;
  hideBanner();
  setVoice('connecting', reconnect ? 'Reconnecting…' : 'Connecting…', reconnect ? 'Keeping your place.' : 'Allow the microphone if asked.');

  try {
    const response = await fetch(`/api/session${textOnly ? '?transport=text' : ''}`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Could not start a session.');

    if (!textOnly) {
      try {
        const permission = await navigator.mediaDevices.getUserMedia({ audio: true });
        permission.getTracks().forEach((track) => track.stop());
      } catch (error) {
        log('mic-denied', { message: String(error?.name ?? error) });
        state.starting = false;
        showBanner('Microphone blocked. You can still do this by typing.', 'Use text', () =>
          beginTextMode(),
        );
        setVoice('ready', 'Talk to Sam', 'Microphone blocked. Try again, or type.');
        return null;
      }
    }

    const conversation = await Conversation.startSession({
      ...connectionOptions(body, textOnly),
      textOnly,
      clientTools: {
        show_career_cards: (params) => {
          const { cards, rejected } = validateCards(params?.cards ?? params);
          log('cards-received', { count: cards.length, rejected: rejected.join(',') || null });
          const rendered = renderCards(cards);
          return rendered
            ? `Cards are on screen: ${cards.map((c) => c.title).join(', ')}.`
            : `No new cards rendered (${rejected.join(', ') || 'repeat'}). Each card needs an id, title, oneLiner, fitReason, at least one route, and tags.`;
        },
        show_profile: (params) => {
          const rendered = renderProfile(params ?? {});
          return rendered
            ? 'The profile is on screen for them to check.'
            : 'The profile was empty or repeated. Ask one more question, then retry with interests, preferences, barriers and a one-sentence summary.';
        },
        show_helpline: () => {
          log('helpline-tool');
          state.safetyStop = true;
          state.run = null;
          closeSheet();
          setStage('ended');
          showSupport();
          setVoice('muted', 'Careers stopped', 'Support is on screen.');
          return 'A support card with Irish helpline numbers is on screen. Careers have stopped.';
        },
      },
      onConnect: ({ conversationId }) => {
        log('connect', { conversationId, textOnly, reconnect });
        state.mode = textOnly ? 'text' : 'voice';
        state.reconnectAttempts = 0;
        state.muted = false;
        hideBanner();
        if (textOnly) {
          setVoice('text', 'Typing to Sam', 'Type in the box under the ideas.');
        } else {
          setVoice('listening', 'Listening', 'Speak normally. Interrupt any time.');
        }
        if (!reconnect) {
          state.cards = [];
          state.profile = null;
          state.lastCardsSignature = '';
          if (state.stage === 'intro' || state.stage === 'ended') setStage('discover');
        }
      },
      onDisconnect: handleDisconnect,
      onMessage: handleMessage,
      onModeChange: ({ mode }) => {
        if (state.safetyStop) return;
        const speaking = mode === 'speaking';
        if (speaking) {
          setVoice(state.muted ? 'muted' : 'speaking', 'Sam is talking', 'Interrupt any time.');
        } else {
          setVoice(state.muted ? 'muted' : state.mode === 'text' ? 'text' : 'listening', state.muted ? 'Mic off' : state.mode === 'text' ? 'Typing to Sam' : 'Listening', state.muted ? 'Tap the voice button to unmute.' : 'Your turn.');
        }
      },
      onInterruption: () => {
        log('interruption');
        setVoice(state.mode === 'text' ? 'text' : 'listening', 'Listening', 'Your turn.');
      },
      onError: (message) => {
        log('error', { message: String(message) });
        console.error('[elevenlabs]', message);
        showBanner(String(message));
        setVoice('disconnected', 'Connection problem', 'Try again when you are ready.');
      },
    });

    state.conversation = conversation;
    state.starting = false;
    if (els.bannerText.textContent.includes('Microphone blocked')) hideBanner();
    return conversation;
  } catch (error) {
    console.error(error);
    state.starting = false;
    state.conversation = null;
    setVoice('disconnected', 'Not connected', 'Check the connection and try again.');
    showBanner(error?.message ? String(error.message) : 'Could not connect.', 'Try again', () =>
      startSession({ textOnly, reconnect: true }),
    );
    return null;
  }
}

async function beginTextMode() {
  hideBanner();
  state.mode = 'text';
  setStage('discover');
  setVoice('text', 'Typing to Sam', 'Type in the box under the ideas.');
  els.askDiscoverInput.focus();
  if (!state.conversation) await startSession({ textOnly: true });
}

function endSession() {
  clearTimeout(reconnectTimer);
  state.reconnectAttempts = MAX_RECONNECTS;
  const session = state.conversation;
  state.conversation = null;
  setVoice('disconnected', 'Conversation ended', 'Tap to start again.');
  if (session) session.endSession().catch((error) => console.warn('endSession failed', error));
}

function handleDisconnect(details) {
  log('disconnect', { reason: details?.reason, message: details?.message, closeCode: details?.closeCode });
  state.conversation = null;
  state.starting = false;
  if (state.safetyStop) {
    setVoice('muted', 'Careers stopped', 'Support is on screen.');
    return;
  }
  if (details?.reason === 'error' && state.reconnectAttempts < MAX_RECONNECTS) {
    state.reconnectAttempts += 1;
    setVoice('connecting', 'Reconnecting…', 'Keeping your place.');
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      startSession({ textOnly: state.mode === 'text', reconnect: true });
    }, 800 * state.reconnectAttempts);
    return;
  }
  setVoice('disconnected', 'Disconnected', 'Start again when you are ready.');
  showBanner('The connection ended. Your place is still here.', 'Reconnect', () =>
    startSession({ textOnly: state.mode === 'text', reconnect: true }),
  );
}

async function toggleMic() {
  if (!state.conversation) {
    if (state.stage === 'intro' || state.stage === 'ended') setStage('discover');
    await startSession({ textOnly: false });
    return;
  }
  if (state.mode === 'text') {
    els.askDiscoverInput.focus();
    return;
  }
  state.muted = !state.muted;
  try {
    state.conversation.setMicMuted(state.muted);
    log('mic-toggle', { muted: state.muted });
  } catch (error) {
    log('mic-toggle-failed', { message: String(error) });
  }
  setVoice(state.muted ? 'muted' : 'listening', state.muted ? 'Mic off' : 'Listening', state.muted ? 'Tap to unmute.' : 'Your turn.');
}

/* ---------------- incoming messages ---------------- */

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
  const id = payload.event_id ?? payload.eventId;
  const key = id ? `e:${id}` : `${isUser ? 'u' : 'a'}:${text}`;
  if (isDuplicate(key)) {
    log('message-replay-ignored', { role: isUser ? 'user' : 'agent' });
    return;
  }
  log(isUser ? 'user-said' : 'agent-said', { text: text.slice(0, 90) });
  setCaption(isUser ? 'user' : 'agent', text);

  if (isUser) {
    if (stopForSafety(text)) return;
    if (state.stage === 'simulate' && state.run && !state.awaitingNext && !text.includes('?')) {
      const stage = currentStage(state.run);
      const option = state.scenario ? matchOption(text, stage) : null;
      if (option) takeDecision(option.id, true);
    }
  }

  // Outside the three authored scenes, Sam builds the simulation, so the scene
  // board follows what Sam actually says.
  if (!isUser && state.stage === 'simulate' && state.freeform) {
    els.sceneText.textContent = text;
  }
}

/* ---------------- typed input ---------------- */

async function submitTyped(text, input) {
  if (!text || state.safetyStop) return;
  if (input) input.value = '';
  setCaption('user', text);
  if (stopForSafety(text)) return;

  if (!state.conversation) {
    if (!state.mode) state.mode = 'text';
    const conversation = await startSession({ textOnly: true });
    if (!conversation) return;
  }
  sendUserMessage(text);
}

/* ---------------- profile ---------------- */

function asList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    return value.split(/[,;]/).map((v) => v.trim()).filter(Boolean);
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
  if (!profile.summary && !profile.interests.length && !profile.preferences.length && !profile.barriers.length) {
    log('profile-rejected', { reason: 'empty' });
    return false;
  }
  if (signature === state.lastProfileSignature) {
    log('profile-repeat-ignored');
    return false;
  }
  state.lastProfileSignature = signature;
  state.profile = profile;
  els.profileSummary.textContent =
    profile.summary || 'Here is what I picked up. Check it before I suggest anything.';
  els.profileGroups.replaceChildren();

  const group = (label, key, values) => {
    if (!values.length) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'profile-group';
    const heading = document.createElement('h3');
    heading.textContent = label;
    const chips = document.createElement('div');
    chips.className = 'chips';
    values.forEach((value) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chip-remove';
      button.setAttribute('aria-label', `Remove ${value}`);
      button.textContent = value;
      const x = document.createElement('span');
      x.textContent = '×';
      x.setAttribute('aria-hidden', 'true');
      button.append(x);
      button.addEventListener('click', () => {
        button.remove();
        state.profile[key] = state.profile[key].filter((v) => v !== value);
        sendContext(`Correction: "${value}" is wrong for ${key}. Do not use it again.`);
        log('profile-correction', { label: key, value });
      });
      chips.append(button);
    });
    wrapper.append(heading, chips);
    els.profileGroups.append(wrapper);
  };

  group('Interests', 'interests', profile.interests);
  group('Where they would like to be', 'preferences', profile.preferences);
  group('What gets in the way', 'barriers', profile.barriers);
  setStage('profile');
  return true;
}

function confirmProfile() {
  sendContext(
    'They checked the profile on screen and confirmed it. Move to the Map phase now: call show_career_cards once with three to five careers grounded in that profile, then name up to three out loud.',
  );
  // A contextual update does not make Sam take a turn. Their confirmation has to
  // arrive as a user message, or the conversation waits forever.
  sendUserMessage("That's right, that's me.");
  log('profile-confirmed');
  els.profileConfirm.disabled = true;
  els.profileConfirm.textContent = 'Getting your careers…';
  setTimeout(() => {
    els.profileConfirm.disabled = false;
    els.profileConfirm.textContent = "That's me";
  }, 7000);
}

/* ---------------- career cards ---------------- */

function fieldFor(card) {
  const tags = (card.tags ?? []).join(' ').toLowerCase();
  if (/outdoor|animal|nature|sport|farm/.test(tags)) return 'outdoors';
  if (/people|care|help|team|talk|social/.test(tags)) return 'people';
  if (/tech|game|code|software|data|digital/.test(tags)) return 'tech';
  if (/creative|art|music|design|film|draw/.test(tags)) return 'creative';
  return 'making';
}

function renderCards(cards) {
  if (!cards.length) {
    els.cardsNote.textContent = 'Sam could not lay those out. Ask for another set.';
    els.cardsEmpty.hidden = false;
    return false;
  }
  const signature = cardsSignature(cards);
  if (signature === state.lastCardsSignature) {
    log('cards-repeat-ignored', { count: cards.length });
    return false;
  }
  state.lastCardsSignature = signature;
  state.cards = cards;
  els.cardField.replaceChildren();
  els.cardsEmpty.hidden = true;
  els.cardsNote.textContent = 'Tap one, or ask about it out loud.';

  cards.forEach((card, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'career';
    button.dataset.field = fieldFor(card);
    button.style.setProperty('--i', String(index));
    button.style.setProperty('--tilt', `${(index % 2 === 0 ? -1 : 1) * (index + 1) * 0.25}deg`);
    button.setAttribute('aria-label', `Open ${card.title}. ${card.oneLiner}`);

    const title = document.createElement('span');
    title.className = 'career-title';
    title.textContent = card.title;
    const what = document.createElement('span');
    what.className = 'career-what';
    what.textContent = card.oneLiner;

    const chips = document.createElement('span');
    chips.className = 'career-chips';
    if (card.fitReason) {
      const fit = document.createElement('span');
      fit.className = 'chip chip-fit';
      fit.textContent = card.fitReason;
      chips.append(fit);
    }
    if (card.routes.length) {
      const route = document.createElement('span');
      route.className = 'chip chip-route';
      route.textContent = card.routes[0];
      chips.append(route);
    }
    button.append(title, what, chips);
    button.addEventListener('click', () => {
      state.lastCardTrigger = button;
      openSheet(card);
    });
    els.cardField.append(button);
  });

  setStage('map');
  return true;
}

/* ---------------- career sheet ---------------- */

function section(title, content) {
  const wrapper = document.createElement('div');
  wrapper.className = 'sheet-section';
  const heading = document.createElement('h3');
  heading.textContent = title;
  wrapper.append(heading);
  if (Array.isArray(content)) {
    const list = document.createElement('ul');
    list.className = 'sheet-list';
    content.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      list.append(li);
    });
    wrapper.append(list);
  } else {
    const p = document.createElement('p');
    p.textContent = content;
    wrapper.append(p);
  }
  return wrapper;
}

function openSheet(card) {
  const detail = buildCareerDetail(card);
  state.selectedCard = card;
  state.detail = detail;
  els.sheet.dataset.field = fieldFor(card);
  els.sheetTitle.textContent = detail.title;
  els.sheetTags.replaceChildren(
    ...(card.tags.length ? card.tags : [detail.whatYouDo]).slice(0, 3).map((tag) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = tag;
      return chip;
    }),
  );
  els.sheetBody.replaceChildren(
    section('What a normal day looks like', detail.daily),
    section('Skills you would use', detail.skills),
    section('School subjects that help', detail.subjects.join(' · ')),
    section(
      'Ways in, in Ireland',
      detail.routes.map((route) => `${routeTypeLabel(route.type)}: ${route.detail}`),
    ),
    section('Related work', detail.related.join(' · ')),
    section(
      'Before you rely on this',
      detail.note
        ? `${detail.note} This is AI-generated. Check with a careers advisor.`
        : 'This is AI-generated information. Check with a careers advisor.',
    ),
  );
  els.sheet.hidden = false;
  els.sheetScrim.hidden = els.app.dataset.stage === 'detail';
  setStage('detail');
  els.sheetClose.focus();
  sendContext(
    `${detailToContext(detail)} They have just opened this card. Say one short line about it, then answer their questions.`,
  );
  log('card-opened', { id: card.id });
}

function closeSheet() {
  if (els.sheet.hidden) return;
  els.sheet.hidden = true;
  els.sheetScrim.hidden = true;
  if (state.stage === 'detail') setStage('map');
  state.lastCardTrigger?.focus();
}

/* ---------------- simulation ---------------- */

function renderStage() {
  const stage = currentStage(state.run);
  if (!stage) return finishSimulation();
  state.awaitingNext = false;
  els.sceneMark.textContent = `${state.scenario.title} · decision ${state.run.stage + 1} of ${state.scenario.stages.length}`;
  els.sceneText.textContent = stage.situation ?? state.scenario.situation;
  els.sceneOptions.replaceChildren();

  const question = document.createElement('p');
  question.className = 'scene-text';
  question.style.marginTop = '12px';
  question.style.fontWeight = '600';
  question.textContent = stage.question;
  els.sceneOptions.append(question);

  stage.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'scene-option';
    const mark = document.createElement('b');
    mark.textContent = String.fromCharCode(65 + index);
    const label = document.createElement('span');
    label.textContent = option.label;
    button.append(mark, label);
    button.addEventListener('click', () => takeDecision(option.id));
    els.sceneOptions.append(button);
  });

  setStage('simulate');
  sendContext(
    `${scenarioContext(state.scenario, state.run)} Do not read the options out as a list. Let them answer in their own words, or tap one.`,
  );
}

function takeDecision(optionId, viaVoice = false) {
  if (!state.run || state.awaitingNext) return;
  const result = choose(state.run, optionId);
  if (!result.option) return;
  state.run = result.run;
  state.awaitingNext = true;
  log('sim-choice', { optionId, viaVoice, done: result.done });
  els.sceneMark.textContent = 'What happens';
  els.sceneText.textContent = result.outcome;
  els.sceneOptions.replaceChildren();
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'button-primary';
  next.textContent = result.done ? 'Look back on it' : 'Next decision';
  next.addEventListener('click', () => {
    if (state.run?.finished) finishSimulation();
    else renderStage();
  });
  els.sceneOptions.append(next);
  announce(result.outcome);
  sendContext(
    `They chose: "${result.option.label}". What happens: ${result.outcome} React in one or two short sentences, in character. Do not restart the scene or summarise the whole scenario.`,
  );
  next.focus();
}

function startSimulation() {
  if (!state.selectedCard) return;
  closeSheet();
  state.scenario = scenarioForCard(state.selectedCard);
  state.freeform = !state.scenario;
  state.awaitingNext = false;
  els.askMove.hidden = false;

  if (state.scenario) {
    state.run = createRun(state.scenario.id);
    els.sceneMark.textContent = state.scenario.title;
    els.sceneText.textContent = state.scenario.situation;
    setStage('simulate');
    renderStage();
  } else {
    state.run = null;
    els.sceneMark.textContent = state.detail.title;
    els.sceneText.textContent = 'You are at work. Something needs a decision before lunch, and there is no obviously right answer.';
    els.sceneOptions.replaceChildren();
    const finish = document.createElement('button');
    finish.type = 'button';
    finish.className = 'button-secondary';
    finish.textContent = 'Finish and look back';
    finish.addEventListener('click', () => finishSimulation());
    els.sceneOptions.append(finish);
    setStage('simulate');
    sendContext(
      `SIMULATION for ${state.detail.title}. ${detailToContext(state.detail)} Build a three-minute scene now: one ordinary morning, one concrete problem, two or three decisions. Set it in one or two sentences, then ask the first decision. Do not quiz them on facts.`,
    );
  }
  log('simulation-started', { id: state.selectedCard.id, authored: Boolean(state.scenario) });
}

function finishSimulation() {
  const detail = state.detail;
  const debrief = state.scenario && state.run ? reflectionFor(state.run) : null;
  const choices = state.run?.choices ?? [];
  els.debriefTitle.textContent = debrief ? `That was a ${debrief.title.toLowerCase()} morning.` : 'That was a day at work.';
  els.debriefQuote.textContent = debrief
    ? `${choices.map((c) => c.label).join(', then ')}. ${debrief.hardPart}`
    : `You talked it through in your own words. No one can tell you whether you got it right; you find out later, or you never do.`;
  els.debriefNext.textContent = debrief?.nextStep
    ? `One thing to try this week: ${debrief.nextStep}`
    : 'One thing to try this week: ask someone who does this job what their worst Tuesday looks like.';
  els.feelChips.querySelectorAll('.chip-feel').forEach((chip) => chip.setAttribute('aria-pressed', 'false'));
  setStage('debrief');
  sendContext('The simulation is finished. Ask one short question about how it felt. Then offer another career, or to stop. Do not pitch.');
  log('simulation-finished', { authored: Boolean(debrief) });
}

function exitSimulation() {
  state.run = null;
  state.scenario = null;
  state.freeform = false;
  state.awaitingNext = false;
  if (state.detail) {
    openSheet(state.selectedCard);
    setStage('detail');
  } else {
    setStage('map');
  }
}

/* ---------------- reset ---------------- */

function resetJourney() {
  state.profile = null;
  state.cards = [];
  state.selectedCard = null;
  state.detail = null;
  state.scenario = null;
  state.run = null;
  state.freeform = false;
  state.awaitingNext = false;
  state.lastCardsSignature = '';
  state.lastProfileSignature = '';
  els.cardField.replaceChildren();
  els.profileGroups.replaceChildren();
  els.captionSam.textContent = '';
  els.captionUser.hidden = true;
  closeSheet();
}

/* ---------------- wiring ---------------- */

els.voice.addEventListener('click', toggleMic);
els.captionsToggle.addEventListener('click', () => {
  const on = els.app.dataset.captions !== 'off';
  els.app.dataset.captions = on ? 'off' : 'on';
  els.captionsToggle.setAttribute('aria-pressed', String(!on));
  els.captionsToggle.textContent = on ? 'Captions off' : 'Captions on';
});
els.supportLink.addEventListener('click', showSupport);
els.supportDismiss.addEventListener('click', () => {
  els.support.hidden = true;
  els.talkAgain.focus();
});
els.bannerAction.addEventListener('click', () => {
  const handler = bannerHandler;
  hideBanner();
  handler?.();
});

els.askDiscover.addEventListener('submit', (event) => {
  event.preventDefault();
  submitTyped(els.askDiscoverInput.value.trim(), els.askDiscoverInput);
});
els.askProfile.addEventListener('submit', (event) => {
  event.preventDefault();
  submitTyped(els.askProfileInput.value.trim(), els.askProfileInput);
});
els.askMove.addEventListener('submit', (event) => {
  event.preventDefault();
  submitTyped(els.askMoveInput.value.trim(), els.askMoveInput);
});
els.askSheet.addEventListener('submit', (event) => {
  event.preventDefault();
  submitTyped(els.askSheetInput.value.trim(), els.askSheetInput);
});

els.profileConfirm.addEventListener('click', confirmProfile);
els.sheetClose.addEventListener('click', closeSheet);
els.sheetScrim.addEventListener('click', closeSheet);
els.tryDay.addEventListener('click', startSimulation);

els.feelChips.addEventListener('click', (event) => {
  const chip = event.target.closest('.chip-feel');
  if (!chip) return;
  els.feelChips.querySelectorAll('.chip-feel').forEach((el) => el.setAttribute('aria-pressed', 'false'));
  chip.setAttribute('aria-pressed', 'true');
  sendUserMessage(`It felt like: ${chip.dataset.feel}`);
  log('feel', { feel: chip.dataset.feel });
});
els.tryAnother.addEventListener('click', () => {
  state.run = null;
  state.scenario = null;
  setStage('map');
  sendContext('They want to look at the other careers again. Wait for them to choose.');
});
els.stopNow.addEventListener('click', () => {
  setStage('ended');
  sendContext('They are done for now. Close warmly in one line, with no pitch.');
});
els.talkAgain.addEventListener('click', async () => {
  if (state.safetyStop) {
    showSupport();
    return;
  }
  resetJourney();
  setStage('discover');
  setVoice('connecting', 'Connecting…', 'Allow the microphone if asked.');
  if (!state.conversation) await startSession({ textOnly: state.mode === 'text' });
  else sendContext('They want to start again. Begin at the beginning, but do not repeat anything they already told you.');
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!els.support.hidden) {
    els.support.hidden = true;
    els.talkAgain.focus();
    return;
  }
  if (!els.sheet.hidden) closeSheet();
});

/* ---------------- preflight ---------------- */

renderHelplines();
els.sheetScrim.hidden = true;
if (window.FluidOrb) {
  orb = new window.FluidOrb(els.orb, { color: '#ff7a45' });
  orb.setSpeed(0.18);
}
setVoice('ready', 'Talk to Sam', 'Two minutes, then try a day of the work.');

fetch('/api/health')
  .then((r) => r.json())
  .then((health) => {
    if (!health.hasAgentId) {
      showBanner('No agent configured. Run `npm run setup-agent`, then reload.');
      setVoice('disconnected', 'Not configured', 'Run setup-agent first.');
    }
  })
  .catch(() => {});

/* Rehearsal and test hooks. Nothing here exposes state the UI cannot reach. */
window.__nextStep = {
  setStage,
  beginTextMode,
  showCards: (payload) => renderCards(validateCards(payload).cards),
  showProfile: (payload) => renderProfile(payload),
  openCard: (payload) => {
    const { cards } = validateCards(payload);
    if (!cards.length) return false;
    renderCards(cards);
    openSheet(cards[0]);
    return true;
  },
  startSimulation,
  takeDecision,
  finishSimulation,
  safetyCheck: (text) => stopForSafety(text),
  state: () => ({
    stage: state.stage,
    mode: state.mode,
    safetyStop: state.safetyStop,
    cards: state.cards.map((c) => c.id),
    run: state.run,
    awaitingNext: state.awaitingNext,
    session: Boolean(state.conversation),
  }),
  events: () => eventLog,
  orbSpeed: () => (orb ? orb.speed : null),
  mic: () => (state.conversation ? Number(state.conversation.getInputVolume().toFixed(4)) : null),
};
