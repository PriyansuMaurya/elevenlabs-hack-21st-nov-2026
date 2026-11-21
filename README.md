# NEXT STEP

A voice-first careers conversation for 15 to 18 year olds in Ireland who are expected to choose a
future without knowing what jobs exist.

Sam talks with them for about two minutes about what they actually do, what they avoid, and what
would get in the way. That becomes a short profile they can correct, then three to five career cards
— at least three reachable without a degree, at least one they have probably never heard of. They
pick one and **try a day of it**: a normal working situation, two or three decisions with no
obviously right answer, and a plain debrief.

Voice is the front door. Typing is a full path through the same conversation, not a stub.

## Run it

```bash
npm install
cp .env.example .env.local     # add ELEVENLABS_API_KEY
npm run setup-agent            # creates the agent, writes ELEVENLABS_AGENT_ID
npm start                      # http://localhost:5173
```

`npm run setup-agent` is idempotent: re-run it after editing the prompt and it patches the same
agent. It reads `.env.local` first, then `.env`, and writes the agent id back to the file it used.

For voice you need a microphone and `localhost` or HTTPS, because WebRTC requires a secure context.
Headphones stop the agent hearing itself. If the microphone is blocked, the page offers the text
path instead.

## The conversation

| Stage | What happens |
| --- | --- |
| Welcome | Says what this is, that Sam is AI, and that they can stop. Captions can be turned off. |
| Discover | Five or six adaptive questions, one at a time. Sam calls `show_profile` and reads the profile back. |
| Profile | Concrete chips they can remove. Confirming it is what moves the conversation on. |
| Map | Three to five cards from `show_career_cards`, each with a reason tied to something they said. |
| Detail | What a day looks like, skills, school subjects, Irish routes in, related work, and an AI-generated label. |
| Simulate | An authored scenario for the three polished careers, or a scene Sam builds for anything else. Choices change what happens next. |
| Debrief | What surprised people, one honest hard part, one thing to try this week. Then another career or stop. |
| Ended | Nothing is saved. Coming back starts fresh. |

## What's where

| Path | What it is |
| --- | --- |
| `agent/system-prompt.md` | Persona, phases, tool rules, turn limits, safeguarding. Pushed by `setup-agent`. |
| `agent/scenarios.md` | The three authored simulations, spliced into the prompt at `{{SCENARIOS}}`. |
| `scripts/setup-agent.mjs` | Pushes prompt, first message, voice settings and client tools; saves the agent id. |
| `server.mjs` | Static server plus `/api/session`, which mints a conversation token or signed URL so the API key stays server-side. |
| `public/index.html`, `public/styles.css`, `public/app.js` | The page, the state machine, the session and the accessibility behavior. |
| `public/lib/cards.js` | Card payload validation, clipping, dedupe and limits. |
| `public/lib/safety.js` | Phrase-level safeguarding classifier and Irish helplines. |
| `public/lib/careers.js` | Curated career details, caches, and the context sent to Sam when a card opens. |
| `public/lib/scenarios.js` | Authored scenario runs, option matching, reflections. |
| `tests/lib.test.mjs` | 21 unit tests for all four modules. |
| `tests/e2e-personas.mjs` | Three personas through the real page and live agent over text. |
| `tests/e2e-safety.mjs` | All 15 disclosures at three points in the journey. |

## Client tools

- `show_profile({ summary, interests, preferences, barriers })` — shows the profile for correction.
  The app refuses an empty or repeated profile.
- `show_career_cards({ cards: [{ id, title, oneLiner, fitReason, routes, tags }] })` — one call per
  set. Limits: 5 cards, 20-word one-liner, 15-word fit reason, at least one route.
- `show_helpline()` — a second safety layer. It stops careers and shows the support card. The app
  does not wait for it: the local classifier stops the session before a disclosure is even sent.

## Safeguarding

Every typed or transcribed user message is checked locally before it reaches the agent. A disclosure
closes the career sheet, ends the careers flow, moves focus to a support card, and lists Emergency
(112 or 999), Childline (1800 66 66 66) and Samaritans (116 123) as callable links. Closing the card
lands on the ended screen; "Talk to Sam" reopens support rather than restarting careers. The same
check runs after a reconnect, so a dropped connection cannot lose it.

This is a floor, not a clinical service. The prompt tells Sam to stay calm, not ask for details, not
promise confidentiality, and point to a trusted adult.

## Tests

```bash
npm test                    # unit tests, no network
npm run test:e2e            # needs npm start and a configured agent
npm run test:safety         # needs npm start; no agent session required
```

The browser suites use Chrome over CDP, with no test dependencies. Set `BASE_URL` or `PORT` if the
server is not on `localhost:5173`. `test:safety` drives the form at the welcome, detail and simulation
screens and checks the support card, focus, closed sheet and all three helplines for every phrase.

Last run: 21/21 unit, 35/35 persona checks, 77/77 safety checks, no page exceptions.

## Demo and manual QA

- [`docs/DEMO.md`](docs/DEMO.md) — a five-minute script, including what to say and what to point at.
- [`docs/QA.md`](docs/QA.md) — the manual pass, including microphone, reconnect and accessibility.

## Constraints held to

No accounts, database, analytics, pathway knowledge base, or Irish-language pass. One agent, one
prompt, three authored simulations, and an honest fallback when a career has no authored scene. No
salaries, laws, exact qualifications or invented course names. Nothing is stored.
