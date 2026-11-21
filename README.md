# NEXT STEP

A voice-first careers conversation for young people who are expected to choose a future without
knowing what jobs exist.

Sam talks with them for two minutes about what they enjoy, what they naturally end up doing, what
they care about and what gets in the way. That turns into three to five career cards — at least
three reachable without a degree, at least one job they've never heard of. Then they pick one and
**do it** for three minutes: a small real situation, two or three decisions, and an honest debrief.

## Run it

```bash
npm install
cp .env.example .env.local  # add your ELEVENLABS_API_KEY
npm run setup-agent         # creates the agent, writes ELEVENLABS_AGENT_ID into .env.local
npm start                   # http://localhost:5173
```

`npm run setup-agent` is idempotent: run it again after editing the prompt and it patches the same
agent. The agent id is printed and saved to `.env.local` (or `.env` if that's the only env file;
`.env.local` wins when both exist).

You need a microphone and, for voice, `localhost` or HTTPS (WebRTC requirement). Headphones stop
the agent hearing itself.

## What's where

| File | What it is |
| --- | --- |
| `agent/system-prompt.md` | The whole agent: persona, the three phases, tool rules, safeguarding. `{{SCENARIOS}}` is where the scenarios get spliced in. |
| `agent/scenarios.md` | The three polished simulations: biomedical engineer, game accessibility designer, sound designer. |
| `scripts/setup-agent.mjs` | Pushes prompt + client tools to ElevenLabs, saves the agent id. |
| `server.mjs` | Static server plus `/api/session`, which trades the API key for a WebRTC conversation token so the key never reaches the browser. |
| `public/app.js` | Session, live captions, career cards, helpline card. |
| `public/index.html`, `public/styles.css` | The page. |

## The two client tools

- `show_career_cards({ cards: [{ title, why, route, day }] })` — called once in the Map phase, before
  Sam names the careers out loud. `why` has to reference something the user actually said.
- `show_helpline()` — called only on a safeguarding disclosure. It's in the prompt as an override:
  stop the activity, acknowledge, point at a trusted adult, show the card, stay with them.

## Front-end behavior worth knowing

- Live captions come from the agent's `user_transcript` and `agent_response` client events, which
  `setup-agent` enables. If captions are empty but audio works, check the agent's Advanced settings.
- `audio` must stay in the agent's `client_events` list. Drop it and the agent still answers
  server-side, but the WebRTC track carries silence — the transcript fills while you hear nothing.
- The phase pills advance on their own: cards appear → Map, user replies after cards → Simulate.
- No accounts, no storage, no analytics. Nothing is persisted; the transcript lives in the page.

## Rehearsing without spending minutes

`window.__nextStep.showCards([...])` and `window.__nextStep.showHelpline()` render the UI directly
from the console, so you can check layout and lighting before you go on.

## Demo path

> "I like gaming, drawing and taking things apart."

Sam asks about those, shows cards including something they've never heard of, they pick one, and
spend three minutes inside it making the calls that job actually makes.

## Constraints held to

No accounts, profiles, database, pathway knowledge base, analytics, or Irish-language pass. One
agent, one prompt, one flow, three polished simulations. Sam improvises outside the three.
