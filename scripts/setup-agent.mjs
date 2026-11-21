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
              id: {
                type: 'string',
                description: 'Short slug for the job, e.g. "sound-designer". Lowercase, hyphens.',
              },
              title: {
                type: 'string',
                description: 'The job title as a person would say it, e.g. "Sound designer".',
              },
              oneLiner: {
                type: 'string',
                description:
                  'What the person actually does all day, max 20 words. The work, not the fit.',
              },
              fitReason: {
                type: 'string',
                description:
                  'Max 15 words connecting this job to something specific the young person said. Their words, not ours.',
              },
              routes: {
                type: 'array',
                items: {
                  type: 'string',
                  description: 'One route in, in plain Irish terms.',
                },
                description:
                  'How people get in, in Irish terms. At least one non-university route: apprenticeship, traineeship, PLC at an ETB college, or portfolio. No invented course names.',
              },
              tags: {
                type: 'array',
                items: {
                  type: 'string',
                  description: 'One short tag, e.g. hands-on.',
                },
                description: 'Two or three plain words, e.g. "hands-on", "solo", "apprenticeship".',
              },
            },
            required: ['id', 'title', 'oneLiner', 'fitReason', 'routes', 'tags'],
          },
        },
      },
      required: ['cards'],
    },
  },
  {
    type: 'client',
    name: 'show_profile',
    description:
      "Shows the young person's profile on screen for them to check, at the end of Discover and before any career cards. Call it once, then ask them to confirm or correct it. Never call show_career_cards until they confirm.",
    expects_response: false,
    parameters: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description:
            'One sentence in their words: what they like, what they avoid, and what they want from work.',
        },
        interests: {
          type: 'array',
          items: { type: 'string', description: 'One concrete interest, in their words.' },
          description: 'Two to four concrete interests or things they actually do.',
        },
        dislikes: {
          type: 'array',
          items: { type: 'string', description: 'One task or environment they want to avoid.' },
          description: 'Only include dislikes the young person actually mentioned.',
        },
        preferences: {
          type: 'array',
          items: { type: 'string', description: 'One preferred setting, in plain words.' },
          description: 'Two or three settings: indoors or outdoors, hands-on or screen, solo or team.',
        },
        barriers: {
          type: 'array',
          items: { type: 'string', description: 'One thing that gets in the way, only if they said it.' },
          description:
            'Anything they said gets in the way: money, grades, travel, family, confidence, access needs. Leave empty rather than guess.',
        },
      },
      required: ['summary', 'interests', 'preferences'],
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
    // Deliberately interruptible. The ignore-terms list below already stops
    // "hey" and "okay" cutting the greeting off, and a first-breath
    // disclosure must never be swallowed just because it arrived early.
    disable_first_message_interruptions: false,
    prompt: {
      prompt,
      tools,
      ...(LLM ? { llm: LLM } : {}),
      // Warm enough that phrasing varies between sessions. The prompt still
      // fixes the goals, safety rules and length caps.
      ...(minimal ? {} : { temperature: 0.8 }),
      // Backstop for the thirty-word rule. Not tight enough to enforce it: the
      // model's reasoning tokens count here too, and 80 was low enough that
      // half the test runs came back "all LLM attempts exhausted". This only
      // stops a runaway turn.
      ...(minimal ? {} : { max_tokens: 700 }),
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
    // Voice settings for a natural, conversational agent.
    conversationConfig.tts = {
      model_id: 'eleven_v4_turbo',
      ...(VOICE_ID ? { voice_id: VOICE_ID } : {}),
      stability: 0.4,
      speed: 1.0,
      similarity_boost: 0.8,
      expressive_mode: true,
    };

    // Allow users to interrupt without ignoring their short responses.
    conversationConfig.turn = {
      turn_eagerness: 'normal',
      interruption_ignore_terms: [],
      interruption_ignore_term_languages: ['en'],
      merge_with_default_ignore_terms: false,
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
