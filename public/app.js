/* NEXT STEP — voice conversation, live captions, career cards. */

import { classifySafety } from './lib/safety.js';

const { Conversation } = window.ElevenLabsClient;

const els = {
  mic: document.getElementById('mic'),
  micLabel: document.getElementById('mic-label'),
  hint: document.getElementById('hint'),
  status: document.getElementById('status'),
  statusText: document.getElementById('status-text'),
  transcript: document.getElementById('transcript'),
  transcriptEmpty: document.getElementById('transcript-empty'),
  cards: document.getElementById('cards'),
  panelTitle: document.getElementById('panel-title'),
  panelSub: document.getElementById('panel-sub'),
  steps: document.getElementById('steps'),
  helpline: document.getElementById('helpline'),
  helplineDismiss: document.getElementById('helpline-dismiss'),
};

let conversation = null;
let starting = false;
let cardsShown = false;
let transcriptTouched = false;
const seenMessages = new Set();

/* ---------------- status ---------------- */

function setStatus(state, text) {
  els.status.dataset.state = state;
  els.statusText.textContent = text;
}

function setHint(text, isError = false) {
  els.hint.textContent = text;
  els.hint.classList.toggle('is-error', isError);
}

function setMic(on) {
  els.mic.setAttribute('aria-pressed', String(on));
  els.micLabel.textContent = on ? 'End conversation' : 'Start talking';
}

const STEP_ORDER = ['discover', 'map', 'simulate'];

function setStep(name) {
  const active = STEP_ORDER.indexOf(name);
  els.steps.querySelectorAll('.step').forEach((el, index) => {
    el.classList.toggle('is-active', index === active);
    el.classList.toggle('is-done', index < active);
  });
}

/* ---------------- transcript ---------------- */

function scrollTranscript() {
  els.transcript.scrollTop = els.transcript.scrollHeight;
}

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
  who.textContent = role === 'user' ? 'You' : 'Wave';
  const what = document.createElement('div');
  what.className = 'what';
  what.textContent = text;
  line.append(who, what);
  els.transcript.append(line);
  scrollTranscript();
  return line;
}

// Agent replies arrive as a full sentence. User transcripts arrive per segment.
function handleMessage(payload) {
  const text = (payload.message ?? '').trim();
  if (!text) return;
  const isUser = payload.role === 'user' || payload.source === 'user';
  const key = `${isUser ? 'u' : 'a'}:${text}`;
  if (seenMessages.has(key)) return;
  seenMessages.add(key);
  addLine(isUser ? 'user' : 'agent', text);

  // A disclosure stops the careers conversation locally, before the agent can
  // turn it into another question.
  if (isUser && classifySafety(text).triggered) {
    showHelpline();
    setStatus('support', 'Careers stopped');
    setHint('We have stopped the careers chat. Support is on screen.', false);
    conversation?.endSession?.().catch?.(() => {});
  }

  // After the cards are announced the user's reply starts the simulation.
  if (isUser && cardsShown) setStep('simulate');
}

/* ---------------- career cards ---------------- */

function normaliseCards(input) {
  let cards = input;
  if (typeof cards === 'string') {
    try {
      cards = JSON.parse(cards);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(cards)) return [];
  return cards
    .filter((c) => c && (c.title || c.name))
    .map((c) => ({
      title: String(c.title ?? c.name ?? 'Untitled'),
      why: String(c.why ?? c.why_now ?? ''),
      route: String(c.route ?? c.how_to_get_in ?? ''),
      day: String(c.day ?? c.day_in_the_life ?? c.what_it_looks_like ?? ''),
    }));
}

function renderCards(cards) {
  if (!cards.length) return;

  cardsShown = true;
  setStep('map');
  els.panelTitle.textContent = 'Careers worth a look';
  els.panelSub.textContent = 'Tap one, or ask about it out loud';
  els.cards.innerHTML = '';

  cards.forEach((card, index) => {
    const el = document.createElement('article');
    el.className = 'card';
    el.style.animationDelay = `${index * 70}ms`;

    const title = document.createElement('h3');
    title.textContent = card.title;
    el.append(title);

    if (card.why) {
      const why = document.createElement('p');
      why.className = 'why';
      why.textContent = card.why;
      el.append(why);
    }

    const meta = document.createElement('div');
    meta.className = 'meta';

    const row = (label, value, extraClass) => {
      if (!value) return;
      const rowEl = document.createElement('div');
      rowEl.className = `meta-row${extraClass ? ` ${extraClass}` : ''}`;
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      rowEl.append(dt, dd);
      meta.append(rowEl);
    };

    row('Route', card.route, 'route');
    row('Tuesday', card.day);

    if (meta.children.length) el.append(meta);
    els.cards.append(el);
  });

  els.cards.scrollTop = 0;
}

/* ---------------- input level ---------------- */

// Deliberately no mic gate here. A gate built on conversation.getInputVolume()
// latches shut: muting stops the meter reading, so the level never rises above
// the reopen threshold and the agent goes permanently deaf. Noise is handled
// upstream instead, by the echo cancellation, noise suppression and voice
// isolation constraints the SDK asks for in getUserMedia, plus patient
// turn-taking and interruption ignore terms on the agent.

/* ---------------- helpline ---------------- */

function showHelpline() {
  els.helpline.hidden = false;
  els.helplineDismiss.focus();
}

/* ---------------- session ---------------- */

async function start() {
  if (starting || conversation) return;
  starting = true;
  els.mic.disabled = true;
  setStatus('connecting', 'Connecting…');
  setHint('Allow the microphone if your browser asks.');

  try {
    const response = await fetch('/api/session');
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Could not start a session.');

    if (body.warning) setHint(body.warning, true);
    const firstMessage = body.firstMessage;

    // Ask for the mic before connecting so a denied prompt is a clear message.
    // Release it immediately: the SDK opens its own stream, and a second live
    // mic stream changes browser audio processing and keeps the mic hot.
    const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    permissionStream.getTracks().forEach((track) => track.stop());

    seenMessages.clear();
    cardsShown = false;
    setStep('discover');
    conversation = await Conversation.startSession({
      ...(body.conversationToken
        ? { conversationToken: body.conversationToken }
        : body.signedUrl
          ? { signedUrl: body.signedUrl, connectionType: 'websocket' }
          : { agentId: body.agentId }),
      ...(firstMessage ? { overrides: { agent: { firstMessage } } } : {}),

      clientTools: {
        show_career_cards: (params) => {
          const cards = normaliseCards(params?.cards ?? params);
          renderCards(cards);
          return cards.length
            ? 'Cards are on screen now.'
            : 'No cards rendered — show_career_cards expects a "cards" array of objects.';
        },
        show_helpline: () => {
          showHelpline();
          return 'A support card with helpline numbers is on screen.';
        },
      },

      onConnect: () => {
        setStatus('connected', 'Listening');
        setMic(true);
        setHint('Speak normally. You can interrupt at any point.');
      },
      onDisconnect: () => {
        conversation = null;
        starting = false;
        els.mic.disabled = false;
        setMic(false);
        setStatus('idle', 'Ready when you are');
        setHint('Best with headphones. Nothing is saved.');
      },
      onMessage: handleMessage,
      onModeChange: ({ mode }) => {
        const speaking = mode === 'speaking';
        els.mic.classList.toggle('is-speaking', speaking);
        setStatus('connected', speaking ? 'Wave is talking' : 'Listening');
      },
      onError: (message) => {
        console.error('[elevenlabs]', message);
        setHint(String(message), true);
        setStatus('error', 'Something went wrong');
      },
    });

    starting = false;
    els.mic.disabled = false;
    setMic(true);
    if (!body.warning) setHint('Speak normally. You can interrupt at any point.');
  } catch (error) {
    console.error(error);
    starting = false;
    conversation = null;
    els.mic.disabled = false;
    setMic(false);
    setStatus('error', 'Not connected');
    setHint(error?.message ? String(error.message) : 'Could not connect.', true);
  }
}

async function stop() {
  const session = conversation;
  conversation = null;
  setMic(false);
  setHint('Best with headphones. Nothing is saved.');
  if (session) {
    try {
      await session.endSession();
    } catch (error) {
      console.warn('endSession failed', error);
    }
  }
}

els.mic.addEventListener('click', () => {
  if (conversation || starting) stop();
  else start();
});

els.helplineDismiss.addEventListener('click', () => {
  els.helpline.hidden = true;
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !els.helpline.hidden) els.helpline.hidden = true;
});

// Rehearsal aid: render cards or the helpline without burning conversation minutes.
// e.g. __nextStep.showCards([{title:"Sound designer", why:"you edit clips", route:"portfolio", day:"tuning a tunnel scene"}])
window.__nextStep = {
  showCards: (cards) => renderCards(normaliseCards(cards)),
  showHelpline,
  // Read-only mic level, for checking the input is live without muting anything.
  mic: () => (conversation ? Number(conversation.getInputVolume().toFixed(4)) : null),
};

// Pre-flight the config so a missing agent id shows up before the demo starts.
fetch('/api/health')
  .then((r) => r.json())
  .then((health) => {
    if (!health.hasAgentId) {
      setStatus('error', 'No agent configured');
      setHint('Run `npm run setup-agent` to create the agent, then reload.', true);
    }
  })
  .catch(() => {});
