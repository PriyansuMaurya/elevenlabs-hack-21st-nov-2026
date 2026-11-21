// Evaluates three voice configurations for Wave and writes samples for a human
// listen. Naturalness ratings cannot be produced by a script; this records the
// objective half (pace, sample length) and the reasoning for the chosen config.
//
//   node scripts/eval-voice.mjs
//
// Output: .voice-eval/*.mp3 plus a JSON record. Requires ELEVENLABS_API_KEY and
// ELEVENLABS_VOICE_ID in .env or the environment.

import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname ?? '.', '..');
const ENV_FILE = ['.env.local', '.env']
  .map((name) => join(ROOT, name))
  .find((path) => existsSync(path));
if (ENV_FILE) {
  try {
    process.loadEnvFile(ENV_FILE);
  } catch {}
}

const API_KEY = process.env.ELEVENLABS_API_KEY?.trim();
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID?.trim() || 'cjVigY5qzO86Huf0OWal';
if (!API_KEY) {
  console.error('Missing ELEVENLABS_API_KEY.');
  process.exit(1);
}

const SAMPLE = [
  "So you're the one who fixes things. Is it the taking apart, or getting it working again?",
  'Fair enough. Three that might be new to you: sound designer, assistive tech, fabrication.',
].join(' ');

const CONFIGS = [
  {
    id: 'neutral',
    label: 'Neutral / steady',
    settings: { stability: 0.5, similarity_boost: 0.75, speed: 0.95, style: 0, use_speaker_boost: true },
    note: 'The provider default. Clear, but flat for a one-to-one conversation.',
  },
  {
    id: 'warm',
    label: 'Warm / slightly slower',
    settings: { stability: 0.38, similarity_boost: 0.8, speed: 0.86, style: 0.35, use_speaker_boost: true },
    note: 'More variation within a sentence and a little more thinking time. Closest to an older sibling.',
  },
  {
    id: 'brisk',
    label: 'Brisk / more animated',
    settings: { stability: 0.62, similarity_boost: 0.75, speed: 1, style: 0.55, use_speaker_boost: true },
    note: 'Faster and more pushed. Reads as a presenter or an advert, not a conversation.',
  },
];

const outDir = join(ROOT, '.voice-eval');
await mkdir(outDir, { recursive: true });
const words = SAMPLE.split(/\s+/).length;
const results = [];

for (const config of CONFIGS) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        text: SAMPLE,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: config.settings,
      }),
    },
  );
  if (!response.ok) {
    console.error(config.id, response.status, (await response.text()).slice(0, 300));
    continue;
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const file = join(outDir, `${config.id}.mp3`);
  await writeFile(file, bytes);
  // 128 kbps CBR: bytes * 8 / 128000 seconds.
  const seconds = (bytes.length * 8) / 128_000;
  results.push({
    ...config,
    file: file.replace(ROOT, '').replace(/^[\\/]/, ''),
    seconds: Number(seconds.toFixed(2)),
    wordsPerMinute: Math.round((words / seconds) * 60),
  });
  console.log(
    `${config.id.padEnd(8)} ${seconds.toFixed(2)}s  ${Math.round((words / seconds) * 60)} wpm  ${config.label}`,
  );
}

const selected = results.find((r) => r.id === 'warm') ?? results[0];
const record = {
  evaluatedAt: new Date().toISOString(),
  voiceId: VOICE_ID,
  sample: SAMPLE,
  configs: results,
  selected: selected?.id ?? null,
  reasoning:
    'Warm/slightly slower keeps sentence-level variation without turning into a performance. A slower pace gives a 15 to 18 year old room to answer, and the scripted 30-word ceiling keeps turns short regardless. Teen naturalness ratings are a human test and are not claimed here.',
  unverified: ['Average naturalness rating from five teenage testers'],
};
await writeFile(join(outDir, 'record.json'), JSON.stringify(record, null, 2));
console.log(`\nSelected: ${selected?.id}. Samples and reasoning in .voice-eval/record.json`);
