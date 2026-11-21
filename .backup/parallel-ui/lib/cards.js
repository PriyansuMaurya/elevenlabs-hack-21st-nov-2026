/* Career-card validation. Tool output is model output: untrusted input.
   Everything here either returns a card that can be rendered or drops it. */

export const CARD_LIMITS = { cards: 5, oneLiner: 20, fitReason: 15 };

export function words(text) {
  return String(text ?? '').trim().split(/\s+/).filter(Boolean);
}

export function clip(text, max) {
  const parts = words(text);
  return parts.length > max ? `${parts.slice(0, max).join(' ')}…` : parts.join(' ');
}

function asList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

export function slugify(text, index = 0) {
  const slug = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `card-${index}`;
}

// Returns { cards, rejected }. `cards` is always renderable; `rejected` holds
// short reasons, for the log and the agent's retry line, never for the screen.
export function validateCards(input) {
  let raw = input;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }
  if (raw && !Array.isArray(raw) && Array.isArray(raw.cards)) raw = raw.cards;
  if (!Array.isArray(raw)) return { cards: [], rejected: ['not-a-list'] };

  const seen = new Set();
  const cards = [];
  const rejected = [];

  for (const [index, candidate] of raw.entries()) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      rejected.push('not-a-card');
      continue;
    }
    const title = String(candidate.title ?? candidate.name ?? '').trim();
    if (!title) {
      rejected.push('no-title');
      continue;
    }
    const id = String(candidate.id ?? slugify(title, index)).trim();
    if (seen.has(id)) {
      rejected.push('duplicate');
      continue;
    }
    const routes = asList(candidate.routes ?? candidate.route ?? candidate.how_to_get_in);
    if (!routes.length) {
      rejected.push('no-routes');
      continue;
    }
    seen.add(id);
    cards.push({
      id,
      title,
      oneLiner: clip(
        candidate.oneLiner ?? candidate.one_liner ?? candidate.what ?? '',
        CARD_LIMITS.oneLiner,
      ),
      fitReason: clip(
        candidate.fitReason ?? candidate.fit_reason ?? candidate.why ?? '',
        CARD_LIMITS.fitReason,
      ),
      routes,
      tags: asList(candidate.tags),
    });
    if (cards.length === CARD_LIMITS.cards) break;
  }

  return { cards, rejected: cards.length ? rejected : rejected.length ? rejected : ['empty'] };
}

export function cardsSignature(cards) {
  return cards.map((c) => `${c.id}:${c.title}:${c.oneLiner}`).join('|');
}
