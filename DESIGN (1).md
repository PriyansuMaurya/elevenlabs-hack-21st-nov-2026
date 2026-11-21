---
version: alpha
name: NEXT STEP
description: Voice-first career discovery for 15 to 18 year olds in Ireland. Bright, flat and mobile-first, with a living voice shape at the centre and colour-coded career cards around it.
colors:
  primary: "#FF7A45"
  on-primary: "#2A2670"
  secondary: "#5B5BF0"
  on-secondary: "#FFFFFF"
  tertiary: "#0F6B5C"
  on-tertiary: "#FFFFFF"
  surface: "#F6F5FB"
  surface-card: "#FFFFFF"
  on-surface: "#2A2670"
  on-surface-muted: "#5A5680"
  outline: "#D9D6EC"
  error: "#C2273D"
  on-error: "#FFFFFF"
  field-making: "#FFD25A"
  field-people: "#FF9FB5"
  field-outdoors: "#8FD99B"
  field-tech: "#8EC5FF"
  field-creative: "#C7A8FF"
  on-field: "#2A2670"
typography:
  display:
    fontFamily: Bricolage Grotesque
    fontSize: 40px
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Bricolage Grotesque
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.2
  body-lg:
    fontFamily: Figtree
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.45
  body-md:
    fontFamily: Figtree
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Figtree
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.45
  label-md:
    fontFamily: Figtree
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.2
  label-sm:
    fontFamily: Figtree
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.2
rounded:
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  page-margin: 16px
  gutter: 16px
  touch-target: 48px
motion:
  state-change:
    duration: 120ms
    delay: 0ms
    timingFunction: ease-out
  surface-enter:
    duration: 260ms
    delay: 0ms
    timingFunction: cubic-bezier(0.2, 0, 0, 1)
  surface-exit:
    duration: 160ms
    delay: 0ms
    timingFunction: cubic-bezier(0.3, 0, 1, 1)
  card-deal:
    duration: 420ms
    delay: 0ms
    timingFunction: cubic-bezier(0.2, 0, 0, 1)
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 52px
    padding: 24px
  button-secondary:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 52px
    padding: 24px
  voice-button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    size: 96px
  voice-button-listening:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    rounded: "{rounded.full}"
    size: 96px
  caption-sam:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-lg}"
  caption-user:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-md}"
  career-card-making:
    backgroundColor: "{colors.field-making}"
    textColor: "{colors.on-field}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 20px
  career-card-people:
    backgroundColor: "{colors.field-people}"
    textColor: "{colors.on-field}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 20px
  career-card-outdoors:
    backgroundColor: "{colors.field-outdoors}"
    textColor: "{colors.on-field}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 20px
  career-card-tech:
    backgroundColor: "{colors.field-tech}"
    textColor: "{colors.on-field}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 20px
  career-card-creative:
    backgroundColor: "{colors.field-creative}"
    textColor: "{colors.on-field}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 20px
  chip-fit:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    height: 32px
    padding: 12px
  chip-route:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.surface-card}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    height: 32px
    padding: 12px
  input-ask:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 56px
    padding: 16px
  scene-card:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.xl}"
    padding: 24px
  support-card:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.lg}"
    padding: 24px
  error-banner:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-error}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 16px
---

# NEXT STEP design system

## Overview

NEXT STEP is for 15 to 18 year olds in Ireland who have been told what to be but never shown what exists. Many are not academically confident, don't want university, or have been boxed in by a careers quiz. The interface must never feel like school, a quiz, or a corporate dashboard.

Think of a voice-message thread with a friendly older sibling, plus a sticker sheet of jobs they have never heard of. Bright, flat, slightly playful, and calm when it matters. The product is voice-first: the screen supports the conversation, it never competes with it.

The one memorable element is the **Voice Shape**, a soft organic blob at the centre of the screen that visibly listens, thinks and speaks. Everything else stays quiet and disciplined around it. Spend boldness there and nowhere else.

Audience rules: 15 to 18, phone in hand, often one-handed, often on patchy mobile data. Mobile first at 375px wide. Light theme only for now; dark mode is out of scope.

## Colors

A cool, pale base with a deep indigo ink, one hot action colour, and five soft field colours that tell you what kind of work a card is about. No gradients anywhere.

- **Flare (#FF7A45, primary):** the single action colour. Used for the voice button, the main button on a screen, and the Voice Shape while Sam speaks. One Flare element per screen is the goal.
- **Deep indigo (#2A2670, on-surface and ink):** all text, and the text on Flare and field colours. Never use pure black.
- **Wave (#5B5BF0, secondary):** the Voice Shape while it listens, the simulation scene card, and focus rings.
- **Calm teal (#0F6B5C, tertiary):** support and safety only, such as the helpline card. Never used for decoration, so it reads as "different, take a breath".
- **Mist (#F6F5FB, surface and neutral):** the page background. White (#FFFFFF, surface-card) is used for inputs, chips and sheets sitting on Mist.
- **Muted ink (#5A5680):** secondary text, the user's own caption, helper lines.
- **Outline (#D9D6EC):** hairline dividers and input borders.
- **Field colours:** making and fixing (#FFD25A), helping people (#FF9FB5), animals and outdoors (#8FD99B), tech and screens (#8EC5FF), creative (#C7A8FF). Only used as career card backgrounds and their detail-sheet header. Always carry deep indigo text.
- **Error (#C2273D):** connection or microphone problems only. Never used for safeguarding moments.

Every text and background pairing here meets WCAG AA (4.5:1 for normal text). Colour never carries meaning alone: voice states also change the label and the shape's motion.

## Typography

Two families, clearly different. **Bricolage Grotesque** (Google Fonts, weights 700 and 800) is the personality: headlines, career titles, the screen's one big line. **Figtree** (Google Fonts, weights 400, 500, 600) is for everything you read: captions, descriptions, labels.

- **Display:** 40px, once per screen at most (the welcome line, the debrief title). Grows to 56px at 1024px and wider.
- **Headline large and medium:** career titles, section titles in the detail sheet. Headline large grows to 36px at 1024px and wider.
- **Body large (20px, weight 500):** Sam's live captions. These are the main reading content in the app, so they are bigger than normal body text.
- **Body medium (16px):** card descriptions, detail content, the user's captions.
- **Labels:** chips, buttons, tab names. Sentence case always.

Keep lines under 60 characters on mobile. Never use all caps, never put a tiny label above a heading, never use a monospace face. Fonts load with `font-display: swap`, with `system-ui, sans-serif` as the fallback so the voice screen is never blocked by font loading.

## Layout

Mobile first, single column, 16px page margin and 16px gutters. Spacing follows an 8px scale with 4px half-steps. Every tap target is at least 48px.

On a phone the screen is split in two: the **voice stage** takes roughly the top 45% (Voice Shape, then captions), and the **cards area** sits below and scrolls. The voice stage never scrolls away, so Sam is always visible and can always be interrupted.

At 1024px and wider the layout becomes two columns with a 1120px max width: voice stage sticky on the left (40%), cards and detail on the right (60%). Content is left-aligned throughout. Only the Voice Shape and the voice button are centred.

The detail view for a career opens as a full-height sheet rising from the bottom on mobile, and replaces the right column on desktop with a clear back button. The voice stage stays visible and active behind or beside it.

## Elevation & Depth

Flat. Depth comes from tonal layers, not shadows: Mist page, then white inputs and sheets, then coloured career cards. Sheets sit over a 40% deep-indigo scrim. There are no drop shadows and no blurs. Focus is shown with a 3px Wave ring offset by 2px, always visible for keyboard users.

## Shapes

Shape varies on purpose, so hierarchy reads without shadows.

- Buttons, chips and the voice button: full pills and circles.
- Career cards and the support card: 24px radius.
- Scene card and sheet top corners: 32px.
- Inputs: 16px.
- The Voice Shape is not a circle. It is a soft blob whose corner radii are uneven (for example 58% 42% 55% 45% over 46% 54% 44% 56%). It morphs between a few radius sets while Sam speaks, driven by audio volume where the SDK provides it.

## Motion & Micro-interaction

Motion answers what the user or Sam is doing. It is never decoration.

- The Voice Shape is the only continuous motion in the app. At rest it is perfectly still. While listening it breathes with the mic level, while speaking it ripples with Sam's output level, while thinking it shrinks slightly and wobbles slowly.
- When career cards first appear they are "dealt" in with a short stagger of about 80ms between cards. This happens once per card set and is the single orchestrated entrance in the app.
- Sheets rise in with `surface-enter` and drop away with `surface-exit`. Buttons and chips respond with `state-change` (a 0.97 scale when pressed).
- No hover animations on cards, no entrance effects on text, nothing loops while the app is idle.
- Honour `prefers-reduced-motion`: the Voice Shape stops morphing and only changes size and colour, cards fade in together, and sheets appear without sliding. State is always also shown in text.
- Animate `transform` and `opacity` only.

## Voice & Content Strategy

The interface sounds like Sam: a supportive older sibling. Plain words, short, specific. Sentence case everywhere. No exclamation-mark pile-ups, no emoji in system text, no "→" added to buttons.

- **Terminology:** "career" and "job", never "pathway" or "sector". "Ways in", never "entry requirements". "Sam" for the voice, and a clear "AI voice" label in the intro. "Try a day as this" for the simulation, never "start simulation".
- **Button labels** name the outcome: "Talk to Sam", "Try a day as this", "Show me different ones", "Stop for now".
- **Intro screen:** says Sam is an AI voice, that they can stop any time, and why the microphone is needed, before the browser asks for it. It never asks for name, school or age.
- **Empty state:** "Nothing here yet. Tell Sam what you're into and ideas will show up here."
- **Loading:** "Sam's picking some ideas." Never a generic spinner with no words.
- **Errors say what happened and what to do:** "The microphone is blocked. Tap the lock icon in your browser bar, allow the microphone, then try again." Errors do not apologise or blame the user.
- **Detail view disclaimer**, small and always present: "Written by AI. Check careersportal.ie before you decide anything."
- **Safeguarding copy** is calm and short, never alarming. See the support card below.
- **Numbers:** use euro with no cents if money is ever shown, and avoid showing salaries or exact entry requirements unless supplied by real data.

## Components

Tokens for every component are in the front matter. Anatomy and behaviour:

**Voice Shape and voice button.** The blob sits above the captions with the 96px voice button on top of or directly beneath it. Colour and label per state: ready (Flare, "Talk to Sam"), connecting (Flare, still, "Getting Sam"), listening (Wave, "Listening"), thinking (Flare, small, "Thinking"), speaking (Flare, rippling, "Sam's talking, tap to jump in"). Tapping while Sam speaks interrupts instantly.

**Captions.** Sam's current sentence in body large, at most two lines visible, older lines fading to muted. The user's words appear below in body medium and muted ink. A captions toggle exists but defaults to on.

**Career card.** A colour-blocked card by field. Top to bottom: title (headline medium), one plain sentence on what the person actually does (body medium), a fit chip quoting the user's own words ("You said: messing with bikes"), and a route chip (for example "Apprenticeship", "PLC course", "Degree", "Teach yourself"). The whole card is one tap target. Show 3 to 5 cards, at least three with non-degree routes.

**Career detail sheet.** Header in the card's field colour. Sections in order: "What you actually do", "A normal Tuesday", "What helps" (skills and school subjects, in plain words), "Ways in" (Irish routes: Leaving Cert, QQI, PLC at an ETB college, apprenticeship, portfolio), "Related careers" (chips that open other cards). Then the primary button "Try a day as this", the ask input, and the AI disclaimer.

**Ask input.** "Ask Sam about this" with a microphone option and typed text. Opening the sheet also tells Sam which career is open (see build instructions). Answers appear as captions, not as a chat history.

**Scene card (simulation).** A Wave card with white text carrying one or two sentences of the current scene, a small "Decision 1 of 3" marker (this is a true sequence), and up to three optional tap-to-answer chips. Users can always answer by voice in their own words. No timer is shown, so there is no pressure.

**Debrief.** Three short blocks: "What surprises most people", "The hard part", "Your next step this week". Then a single "How did that feel?" row with chips (Loved it, Not for me, Not sure) and two buttons: "Try another career" and "Stop for now".

**Support card.** Calm teal, centred, over a scrim, with focus moved to it. It shows a plain line ("You're not in trouble and you're not alone. Talking to an adult you trust is a good next step."), the Childline number as a large tap-to-call button, Samaritans as a second button, and a line for emergencies ("If you are in danger now, call 112 or 999."). It appears instantly with no animation beyond a fade. Careers content is hidden behind it. It is dismissible but a small "Support" link stays visible afterwards.

**Error banner.** Used for microphone and connection problems only, with a clear next action button.

## Do's and Don'ts

- Do keep Sam visible and interruptible on every screen, including the detail sheet.
- Do use one Flare element per screen, so the next action is obvious.
- Do use field colours only to tell careers apart, and keep indigo text on them.
- Do show state in words and motion as well as colour.
- Do write in the user's register: short, plain, specific.
- Do make support easy to reach from any screen after it has appeared once.
- Don't use gradients, drop shadows, glass blur, or glowing neon effects.
- Don't use dark cinematic backgrounds. This is a bright, human app.
- Don't use all caps, eyebrow labels, monospace labels, or numbered markers unless the content is a real sequence.
- Don't render one identical card style for everything. Colour, radius and size carry hierarchy.
- Don't read like a quiz: no progress bars for discovery, no scores, no personality labels.
- Don't show salaries, points or entry requirements unless they come from real data.
- Don't use red or warning styling for safeguarding. Red is for technical errors only.
- Don't add a timer to the simulation.

## Screens and voice states

| State | Voice Shape | Label | Notes |
|---|---|---|---|
| Intro | Still, Flare | Talk to Sam | AI disclosure, "stop any time", mic explanation |
| Connecting | Still, slow scale | Getting Sam | Show a timeout message after about 8 seconds |
| Listening | Wave, breathes with mic level | Listening | Captions show the user's words as they speak |
| Thinking | Small, slow wobble | Thinking | Keep it short; no extra filler text |
| Speaking | Flare, ripples with output level | Sam's talking, tap to jump in | Tap or speak to interrupt |
| Interrupted | Snaps to Listening | Listening | Sam's caption fades out immediately |
| Reconnecting | Still, muted | Reconnecting | Keep captions and cards on screen |
| Mic blocked | Still, muted | Microphone is blocked | Error banner with the fix steps |
| Support | Hidden | None | Support card replaces everything else |
| Ended | Still, muted | Done for now | Offer "Talk to Sam" again, no pitch |

## Build instructions for the agent

When building or changing UI for this project:

1. Read this file fully before writing any UI code. Use the tokens as CSS custom properties (for example `--color-primary`, `--space-md`) and never hardcode hex values in components.
2. Keep the existing stack and the existing voice-agent and backend logic. Change presentation only. Do not touch agent prompts, tool contracts, or keys.
3. Build in this order: tokens and fonts, Voice Shape with all states, captions, career cards and detail sheet, ask input, scene card and debrief, support card, error and empty states.
4. Wire the career cards to the `show_career_cards` client tool. Each card has `title`, `what` (one plain sentence), `why` (tied to the user's words), `route`, and `day`. Map the field to one of the five field colours, defaulting to making if unknown. Validate the payload and show a friendly fallback if it is invalid.
5. When a card is opened, send the agent a context message starting with `User opened:` followed by that career's details. Check the SDK documentation for the exact method before implementing.
6. Wire the support card to the `show_helpline` client tool. Keep the helpline numbers in one config constant, and verify them against Childline and Samaritans official pages before any demo.
7. Map the SDK's connection status, speaking and listening modes, and audio levels to the voice states table. Check the SDK documentation for the exact callback names.
8. Quality floor: usable at 375px, 48px tap targets, visible focus, captions on by default, `prefers-reduced-motion` respected, AA contrast, screen-reader labels on the voice button and state changes, and the support card announced as an alert with focus moved into it.
9. Do not add accounts, databases, analytics, or new services.
