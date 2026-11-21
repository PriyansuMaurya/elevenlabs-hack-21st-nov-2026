// Creates (or updates) the NEXT STEP agent on ElevenLabs from agent/*.md.
//
//   ELEVENLABS_API_KEY=... npm run setup-agent
//
// Writes the resulting agent id into the env file as ELEVENLABS_AGENT_ID, so
// the server picks it up on next boot. Re-run it any time you change the
// prompt: if ELEVENLABS_AGENT_ID already exists, the agent is patched in place.

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

// This file lives in scripts/, so the project root is one level up.
const ROOT = resolve(import.meta.dirname ?? '.', '..');

// Same resolution as the server: .env.local wins over .env when both exist.
const ENV_FILE = ['.env.local', '.env']
  .map((name) => join(ROOT, name))
  .find((path) => existsSync(path));
if (ENV_FILE) {
  try {
    process.loadEnvFile(ENV_FILE);
  } catch {
    // Readable-but-malformed env file: fall through to real environment vars.
  }
}
const API_KEY = process.env.ELEVENLABS_API_KEY?.trim();
const EXISTING_AGENT_ID = process.env.ELEVENLABS_AGENT_ID?.trim();
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID?.trim();
const LLM = process.env.AGENT_LLM?.trim();

if (!API_KEY) {
  console.error('Missing ELEVENLABS_API_KEY. Copy .env.example to .env and add your key.');
  process.exit(1);
}

// Says what it is in the first breath, as the brief requires, and states the
// exit. Kept to one clause so it lands as an introduction, not a disclaimer.
const FIRST_MESSAGE =
  "Hi, I'm Sam. I'm an AI, not a person — I'll say that once. Stop any time. What do you do when there's nothing you're supposed to be doing?";

const tools = [
  {
    type: 'client',
    name: 'show_career_cards',
    description:
      "Displays career suggestion cards on the young person's screen. Call this exactly once per set of suggestions, in the Map phase, before you name the careers out loud. Each card's why must reference something the user actually said.",
    expects_response: false,
    parameters: {
      type: 'object',
      properties: {
        cards: {
          type: 'array',
          description:
            'Three to five careers, most promising first. At least three must be reachable without a degree, and at least one should be a job the user has probably never heard of.',
          items: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'The job title as a person would say it, e.g. "Sound designer".',
              },
              why: {
                type: 'string',
                description:
                  'One short sentence connecting this job to something specific the user said. Their words, not ours.',
              },
              route: {
                type: 'string',
                description:
                  'How people actually get in, in Irish terms and plain words. For example "a craft apprenticeship, QQI level 6, earn while you learn" or "a PLC course at your local ETB college". No invented course names.',
              },
              day: {
                type: 'string',
                description: 'One concrete sentence about what a Tuesday in this job looks like.',
              },
            },
            required: ['title', 'why', 'route', 'day'],
          },
        },
      },
      required: ['cards'],
    },
  },
  {
    type: 'client',
    name: 'show_helpline',
    description:
      'Shows a support card with helpline numbers on the user\'s screen. Call this ONLY when the user discloses self-harm, suicidal thoughts, abuse, or that they are unsafe, and call it immediately after you acknowledge them. Never call it for ordinary sadness or career frustration.',
    expects_response: false,
    parameters: { type: 'object', properties: {} },
  },
];

async function loadPrompt() {
  const base = await readFile(join(ROOT, 'agent/system-prompt.md'), 'utf8');
  const scenarios = await readFile(join(ROOT, 'agent/scenarios.md'), 'utf8');
  // Earlier versions of the prompt pulled the scenarios in through a
  // placeholder. The current prompt builds its own, so the placeholder is
  // optional: no placeholder, no injection.
  if (!base.includes('{{SCENARIOS}}')) return base;
  return base.replace('{{SCENARIOS}}', scenarios.trim());
}

function buildBody(prompt, { minimal = false } = {}) {
  const agent = {
    first_message: FIRST_MESSAGE,
    language: 'en',
    // The greeting is the one turn nobody can answer yet. Without this, saying
    // "hey" back cuts Sam off half a sentence in, every single session.
    disable_first_message_interruptions: true,
    prompt: {
      prompt,
      tools,
      ...(LLM ? { llm: LLM } : {}),
      ...(minimal ? {} : { temperature: 0.65 }),
      // Backstop for the thirty-word rule. Not tight enough to enforce it: the
      // model's reasoning tokens count here too, and 80 was low enough that
      // half the test runs came back "all LLM attempts exhausted". This only
      // stops a runaway turn.
      ...(minimal ? {} : { max_tokens: 250 }),
    },
  };

  const conversationConfig = { agent };

  if (!minimal) {
    // Live captions need these events switched on. `audio` must stay in the list:
    // without it the agent still talks server-side, but the WebRTC track is silent.
    conversationConfig.conversation = {
      client_events: [
        'audio',
        'user_transcript',
        'agent_response',
        'agent_response_correction',
        'interruption',
        'client_tool_call',
        'ping',
      ],
    };
    if (VOICE_ID) conversationConfig.tts = { voice_id: VOICE_ID };

    // Turn taking. Without these the agent treats any short noise the mic picks
    // up ("yeah", "okay", a cough) as a finished turn and cuts its own audio
    // mid-sentence, which reads as the agent interrupting itself.
    //
    // The ignore list is taken from real transcripts: these are the exact things
    // users said that cut Sam off mid-sentence. Matching is case-insensitive and
    // exact, so every form needs its own entry.
    conversationConfig.turn = {
      turn_eagerness: 'patient',
      interruption_ignore_terms: [
        'yeah',
        'yep',
        'okay',
        'ok',
        'mm',
        'mm-hmm',
        'mhm',
        'hmm',
        'hm',
        'uh',
        'um',
        'oh',
        'ah',
        'right',
        'alright',
        'sure',
        'cool',
        'nice',
        'hey',
        'hi',
        'hello',
        'thanks',
        'thank you',
        'cheers',
        'gotcha',
        'i',
        'nothing',
        'can you hear me',
        'are you there',
      ],
      interruption_ignore_term_languages: ['en'],
      merge_with_default_ignore_terms: true,
    };
  }

  return {
    name: 'NEXT STEP — Sam',
    tags: ['next-step', 'careers', 'youth'],
    conversation_config: conversationConfig,
  };
}

async function call(method, path, body) {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/${path}`, {
    method,
    headers: { 'xi-api-key': API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`${method} ${path} -> ${response.status}: ${text.slice(0, 600)}`);
    error.status = response.status;
    throw error;
  }
  return text ? JSON.parse(text) : {};
}

async function push(prompt) {
  const method = EXISTING_AGENT_ID ? 'PATCH' : 'POST';
  const path = EXISTING_AGENT_ID ? `agents/${EXISTING_AGENT_ID}` : 'agents/create';

  try {
    return { method, result: await call(method, path, buildBody(prompt)) };
  } catch (error) {
    if (error.status !== 422) throw error;
    console.warn('  full config rejected (422), retrying with the minimal config…');
    console.warn(`  ${error.message}`);
    return { method, result: await call(method, path, buildBody(prompt, { minimal: true })) };
  }
}

async function saveAgentId(agentId) {
  const envPath = ENV_FILE ?? join(ROOT, '.env');
  const line = `ELEVENLABS_AGENT_ID=${agentId}`;
  const existing = existsSync(envPath) ? await readFile(envPath, 'utf8') : '';
  const next = /^ELEVENLABS_AGENT_ID=.*$/m.test(existing)
    ? existing.replace(/^ELEVENLABS_AGENT_ID=.*$/m, line)
    : `${existing.replace(/\s*$/, '')}${existing.trim() ? '\n' : ''}${line}\n`;
  await writeFile(envPath, next, 'utf8');
}

const prompt = await loadPrompt();
console.log(`Agent prompt: ${prompt.length.toLocaleString()} characters`);
console.log(EXISTING_AGENT_ID ? `Updating agent ${EXISTING_AGENT_ID}…` : 'Creating a new agent…');

const { method, result } = await push(prompt);
const agentId = result.agent_id ?? EXISTING_AGENT_ID;
if (!agentId) throw new Error('ElevenLabs did not return an agent id.');

await saveAgentId(agentId);

console.log(`\n${method === 'POST' ? 'Created' : 'Updated'} agent: ${agentId}`);
console.log(`Written to ${ENV_FILE ? ENV_FILE.replace(ROOT, '').replace(/^[\\/]/, '') : '.env'} as ELEVENLABS_AGENT_ID.`);
console.log('\nNext:');
console.log('  1. npm start');
console.log('  2. Open http://localhost:5173');
console.log(`\nIf the agent has authentication enabled, keep ELEVENLABS_API_KEY in ${ENV_FILE ? ENV_FILE.replace(ROOT, '').replace(/^[\\/]/, '') : '.env'} —`);
console.log('the server trades it for a conversation token so the key never reaches the browser.');
