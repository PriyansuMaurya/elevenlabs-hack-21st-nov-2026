// Minimal static server + signed-URL endpoint for the ElevenLabs agent.
// No dependencies: Node's built-in http + fetch.

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname ?? '.');

// .env.local wins over .env when both exist. Both are optional — see .env.example.
const ENV_FILE = ['.env.local', '.env']
  .map((name) => join(ROOT, name))
  .find((path) => existsSync(path));
if (ENV_FILE) {
  try {
    process.loadEnvFile(ENV_FILE);
  } catch {
    // An unreadable env file should not stop the page from serving.
  }
}

const PORT = Number(process.env.PORT || 5173);
const PUBLIC_DIR = join(ROOT, 'public');
const CLIENT_BUNDLE = join(ROOT, 'node_modules/@elevenlabs/client/dist/lib.iife.js');

const API_KEY = process.env.ELEVENLABS_API_KEY?.trim();
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID?.trim();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(payload);
}

async function fetchFromElevenLabs(path) {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/${path}`, {
    headers: { 'xi-api-key': API_KEY },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`${path} -> ${response.status} ${detail.slice(0, 200)}`);
  }
  return response.json();
}

// One endpoint the page calls to get something it can connect with.
// Prefers a WebRTC conversation token (lower latency), falls back to a websocket
// signed URL, then to the bare agent id (fine for public agents and for a demo).
async function handleSession(res, transport = 'voice') {
  if (!AGENT_ID) {
    return sendJson(res, 500, {
      error:
        'ELEVENLABS_AGENT_ID is not set. Run `npm run setup-agent` (with ELEVENLABS_API_KEY in .env) or paste an existing agent id into .env.',
    });
  }

  if (!API_KEY) {
    return sendJson(res, 200, { agentId: AGENT_ID, mode: 'agentId' });
  }

  // WebRTC tokens are voice-only. Text sessions need a websocket signed URL,
  // so the page asks for transport=text and skips the token.
  if (transport !== 'text') {
    try {
      const { token } = await fetchFromElevenLabs(
        `conversation/token?agent_id=${encodeURIComponent(AGENT_ID)}`,
      );
      if (token) return sendJson(res, 200, { conversationToken: token, mode: 'webrtc' });
    } catch (error) {
      console.warn('[session] conversation token failed:', error.message);
    }
  }

  try {
    const { signed_url: signedUrl } = await fetchFromElevenLabs(
      `conversation/get-signed-url?agent_id=${encodeURIComponent(AGENT_ID)}`,
    );
    if (signedUrl) return sendJson(res, 200, { signedUrl, mode: 'websocket' });
  } catch (error) {
    console.warn('[session] signed url failed:', error.message);
  }

  return sendJson(res, 200, {
    agentId: AGENT_ID,
    mode: 'agentId',
    warning:
      'Could not get a token or signed URL; using the agent id directly. The agent must be public for this to work.',
  });
}

function serveFile(res, filePath) {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    return sendJson(res, 404, { error: 'Not found' });
  }
  res.writeHead(200, {
    'content-type': MIME[extname(filePath)] ?? 'application/octet-stream',
    'cache-control': 'no-cache',
  });
  createReadStream(filePath).pipe(res);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  if (url.pathname === '/api/session') {
    return handleSession(res, url.searchParams.get('transport') === 'text' ? 'text' : 'voice');
  }

  if (url.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, hasAgentId: Boolean(AGENT_ID), hasApiKey: Boolean(API_KEY) });
  }

  if (url.pathname === '/vendor/elevenlabs-client.js') return serveFile(res, CLIENT_BUNDLE);

  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = normalize(join(PUBLIC_DIR, requested));
  if (!filePath.startsWith(PUBLIC_DIR)) return sendJson(res, 403, { error: 'Forbidden' });
  return serveFile(res, filePath);
});

server.listen(PORT, () => {
  const agentState = AGENT_ID ? `agent ${AGENT_ID}` : 'no agent id yet';
  const keyState = API_KEY ? 'API key loaded' : 'no API key';
  console.log(`NEXT STEP running at http://localhost:${PORT}  (${agentState}, ${keyState})`);
  if (!AGENT_ID) console.log('Run `npm run setup-agent` once to create the agent from agent/*.md.');
});
