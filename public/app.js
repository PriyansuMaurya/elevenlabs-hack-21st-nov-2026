/* NEXT STEP — voice conversation, live captions, career cards. */

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
const MAX_RECONNECTS = 2;
let reconnectTimer = null;
let reconnectAttempts = 0;

/* ---------------- event log ---------------- */

// Every stop of Sam's speech has to be explainable. This keeps a timestamped
// record of mode changes, interruptions and disconnects, and pairs each
// interruption with whatever the user said next, if anything. Memory only, and
// readable from the console: __nextStep.events() / __nextStep.cutouts().
const eventLog = [];
const sessionStart = performance.now();
let speakingSince = 0;
let openInterruption = null;

function logEvent(type, detail = {}) {
  const entry = { at: Math.round(performance.now() - sessionStart), type, ...detail };
  eventLog.push(entry);
  if (eventLog.length > 1000) eventLog.shift();
  console.debug(`[next-step ${entry.at}ms] ${type}`, detail);
  return entry;
}

// A cut-out is an interruption that no user speech explains. The server decides
// to interrupt; the transcript tells us afterwards whether words arrived.
function cutouts() {
  return eventLog.filter((e) => e.type === 'interruption' && !e.heard);
}

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
  who.textContent = role === 'user' ? 'You' : 'Sam';
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
  if (isUser && openInterruption) {
    openInterruption.heard = text;
    openInterruption = null;
  }
  logEvent(isUser ? 'user-said' : 'agent-said', { text: text.slice(0, 80) });
  const key = `${isUser ? 'u' : 'a'}:${text}`;
  if (seenMessages.has(key)) return;
  seenMessages.add(key);
  addLine(isUser ? 'user' : 'agent', text);

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

// A dropped socket is normal on hotel wifi and on a laptop that slept. Retry
// quietly before telling the user anything, and only give up after two tries.
function scheduleReconnect() {
  reconnectAttempts += 1;
  clearTimeout(reconnectTimer);
  setStatus('connecting', 'Reconnecting…');
  setHint('Connection dropped. Reconnecting…', true);
  logEvent('reconnect-scheduled', { attempt: reconnectAttempts });

  reconnectTimer = setTimeout(
    () => {
      start({ reconnect: true });
    },
    800 * reconnectAttempts,
  );
}

function handleDisconnect(details) {
  const reason = details?.reason ?? 'unknown';
  logEvent('disconnect', {
    reason,
    message: details?.message,
    closeCode: details?.closeCode,
  });
  conversation = null;
  starting = false;
  els.mic.disabled = false;
  els.mic.classList.remove('is-speaking');
  setMic(false);

  // A dropped connection is worth retrying silently; the user's own hang-up is
  // not. Nothing alarming is shown until a retry actually fails.
  if (reason === 'error' && reconnectAttempts < MAX_RECONNECTS) {
    scheduleReconnect();
    return;
  }
  setStatus('idle', 'Ready when you are');
  setHint('Best with headphones. Nothing is saved.');
}

async function start({ reconnect = false } = {}) {
  if (starting || conversation) return;
  starting = true;
  els.mic.disabled = true;
  setStatus('connecting', reconnect ? 'Reconnecting…' : 'Connecting…');
  if (!reconnect) setHint('Allow the microphone if your browser asks.');

  try {
    const response = await fetch('/api/session');
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Could not start a session.');

    if (body.warning) setHint(body.warning, true);

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

      onConnect: ({ conversationId }) => {
        logEvent('connect', { conversationId });
        reconnectAttempts = 0;
        openInterruption = null;
        speakingSince = 0;
        setStatus('connected', 'Listening');
        setMic(true);
        setHint('Speak normally. You can interrupt at any point.');
      },
      onDisconnect: handleDisconnect,
      onStatusChange: ({ status }) => {
        logEvent('status', { status });
      },
      onMessage: handleMessage,
      onModeChange: ({ mode }) => {
        const speaking = mode === 'speaking';
        if (speaking) {
          speakingSince = performance.now();
          logEvent('agent-speaking');
        } else if (speakingSince) {
          logEvent('agent-stopped', { spokeMs: Math.round(performance.now() - speakingSince) });
          speakingSince = 0;
        }
        els.mic.classList.toggle('is-speaking', speaking);
        setStatus('connected', speaking ? 'Sam is talking' : 'Listening');
      },
      // Fires when the server cuts Sam off. Whatever the user says next is
      // attached to this entry, so a cut-out with no words is visible as such.
      onInterruption: (props) => {
        speakingSince = 0;
        openInterruption = logEvent('interruption', {
          eventId: props?.event_id,
          heard: null,
        });
      },
      onVadScore: ({ vadScore }) => {
        if (vadScore >= 0.5) {
          const last = eventLog[eventLog.length - 1];
          // Collapse a burst of high VAD frames into one entry.
          if (last?.type === 'vad' && performance.now() - last._t < 500) return;
          logEvent('vad', { vadScore: Number(vadScore.toFixed(2)), _t: performance.now() });
        }
      },
      onError: (message) => {
        logEvent('error', { message: String(message) });
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
  clearTimeout(reconnectTimer);
  reconnectAttempts = MAX_RECONNECTS; // an explicit hang-up is not a drop
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
  // Timestamped session record: speech start/stop, interruptions, disconnects.
  events: () => eventLog,
  cutouts,
  // Rehearsal aid: exercise the dropped-connection path without unplugging
  // wifi. Abandons the live session rather than ending it, so the retry is
  // exactly what a real drop produces.
  simulateDrop: () => handleDisconnect({ reason: 'error', message: 'simulated drop' }),
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
