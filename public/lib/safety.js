/* Safeguarding detection.
   Checks typed messages before sending and voice transcripts when received.
   Voice audio has already reached the provider by the time a transcript arrives.
   Phrase matching is a limited safety floor, not a guarantee of detection.

   Deliberately phrase-level rather than single words: "this essay is killing
   me" must not stop the session, "I want to kill myself" must. */

const RULES = [
  {
    category: 'self-harm',
    urgent: false,
    patterns: [
      /\b(kill|killing|hurt|hurting|harm|harming)\s+myself\b/i,
      /\bself[-\s]?harm(ing|ed)?\b/i,
      /\bcut(ting)?\s+myself\b/i,
      /\bend(ing)?\s+(it|things|my\s+life)\b/i,
      /\b(better\s+off)\s+(dead|without\s+me|if\s+i\s+(wasn'?t|weren'?t)\s+here)\b/i,
      /\bwant\s+to\s+(die|disappear|not\s+be\s+here)\b/i,
      /\bdon'?t\s+want\s+to\s+(be\s+here|live|exist)\b/i,
      /\b(no|what'?s\s+the)\s+(point|reason)\s+(in|to|of)\s+(any\s+of\s+this|living|going\s+on|it\s+all)\b/i,
      /\b(suicid(e|al))\b/i,
      /\bplan(ned|ning)?\s+to\s+(end|kill)\b/i,
      /\bhate\s+my\s+life\b/i,
    ],
  },
  {
    category: 'abuse',
    urgent: false,
    patterns: [
      /\b(hits?|hitting|beat|beats|beating|hurts?|hurting|abuses?|abusing)\s+me\b/i,
      /\b(abuse|abusive)\b/i,
      /\b(touched|molested|touching)\s+me\b/i,
      /\b(scared|afraid|frightened)\s+(of|at)\s+(home|him|her|them|my\s+\w+)\b/i,
      /\bnot\s+safe\b/i,
      /\b(don'?t|do\s+not|not)\s+feel\s+safe\b/i,
      /\bscreams?\s+at\s+me\b.*\b(scared|afraid)\b/i,
      /\b(scared|afraid)\b.*\bscreams?\s+at\s+me\b/i,
    ],
  },
  {
    category: 'bullying',
    urgent: false,
    patterns: [
      /\b(bullied|bullying)\b/i,
      /\b(being|getting)\s+(bullied|jumped|threatened)\b/i,
      /\b(got|been)\s+jumped\b/i,
      /\b(threaten(ed|ing)?|jumped|jump)\s+me\b/i,
      /\bbeat\s+me\s+up\b/i,
    ],
  },
  {
    category: 'danger',
    urgent: true,
    patterns: [
      /\b(someone|a\s+man|a\s+guy|he|she)\b.{0,25}\b(trying|tried)\s+(the|to)\s+(door|get\s+in)\b/i,
      /\b(break(ing)?\s+in|broken\s+in)\b/i,
      /\b(going|gonna|will|wants?\s+to)\s+(kill|hurt)\s+me\b/i,
      /\b(he|she|they)\s+(has|have|got)\s+a\s+(knife|gun|weapon)\b/i,
      /\b(following|followed)\s+me\b/i,
      /\bwaiting\s+outside\b/i,
      /\bsomeone'?s\s+in\s+(the|my)\s+(house|flat|room)\b/i,
      /\bi'?m\s+in\s+danger\b/i,
    ],
  },
  {
    category: 'friend',
    urgent: false,
    patterns: [
      /\b(my|a)\s+(friend|mate|girlfriend|boyfriend|sister|brother|cousin)\b.{0,40}\b(hurting\s+(her|him)self|self[-\s]?harm|suicidal|wants?\s+to\s+die|being\s+abused|hits\s+(her|him)|bullied)\b/i,
      /\b(hurting|hurts)\s+(her|him)self\b/i,
    ],
  },
];

export function classifySafety(text) {
  const value = String(text ?? '');
  if (!value.trim()) return { triggered: false, category: null, urgent: false };
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(value)) {
        return { triggered: true, category: rule.category, urgent: rule.urgent };
      }
    }
  }
  return { triggered: false, category: null, urgent: false };
}

// A calm, non-clinical line shown by the app itself. The agent says its own
// version; this is what is on screen if the connection has dropped.
export const SUPPORT_HEADLINE = "We've stopped the careers chat. You're not in trouble, and you're not on your own.";

export const HELPLINES = [
  { name: 'Emergency', numbers: '112 or 999', note: 'if you or someone else is in danger, right now' },
  { name: 'Childline', numbers: '1800 66 66 66', note: 'free, any time, for children and young people up to age 18' },
  { name: 'Samaritans', numbers: '116 123', note: 'free, 24 hours, any age' },
];
