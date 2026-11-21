/* The three polished simulations, plus the state machine around them.
   The app owns the stage so an interruption, a reconnect or a repeated event
   cannot restart a decision the young person already made. The agent is told
   the stage and reacts; it never has to remember where the scenario got to. */

export const SCENARIOS = [
  {
    id: 'biomedical-engineer',
    careerId: 'biomedical-engineer',
    title: 'Biomedical engineer',
    where: 'Renal ward · Tuesday, 8:40am',
    role: 'You are the biomedical engineer on call.',
    situation:
      'A kidney dialysis machine has been taken out of service overnight. Four patients are booked on it this afternoon. The log says “pressure fault”.',
    stages: [
      {
        id: 'start',
        question: 'Where do you start?',
        options: [
          {
            id: 'open',
            label: 'Open it up and test straight away',
            keywords: ['open it up', 'open', 'strip', 'test', 'take it apart'],
            outcome:
              'Forty minutes later you find a cracked seal. But the service log shows the same fault was flagged two weeks ago and marked “monitor”. You have found a fault. You are less sure it is the fault.',
          },
          {
            id: 'log',
            label: 'Read the service history and error log first',
            keywords: ['read the log', 'service history', 'check the log', 'log', 'history', 'service'],
            outcome:
              'Five minutes, and it is obvious: three pressure faults in a fortnight on this machine, each cleared by recalibration. That is a pattern, not bad luck. The sensor is probably failing.',
          },
          {
            id: 'nurse',
            label: 'Ring the ward nurse and ask what it did',
            keywords: ['ring the nurse', 'ask the nurse', 'call the ward', 'nurse', 'ward'],
            outcome:
              'She says it alarmed mid-treatment and would not reset. The ward has been short of machines all week, so this one has been running almost non-stop. Useful, but it does not tell you whether the sensor or the pump is at fault.',
          },
        ],
      },
      {
        id: 'fix',
        question: 'The machine is needed this afternoon. What do you do?',
        situation:
          'You can recalibrate the pressure sensor in twenty minutes. Or replace it from the store cupboard, which costs the department money and needs a two-hour calibration. The repeat faults suggest the sensor itself is going.',
        options: [
          {
            id: 'recalibrate',
            label: 'Recalibrate it and get four patients treated',
            keywords: ['recalibrate', 'calibrate', 'reset the sensor', 'quick fix'],
            outcome:
              'It passes its checks and goes back on the ward. You will not know until next week whether you fixed it or just reset the clock. That uncertainty is part of the job.',
          },
          {
            id: 'replace',
            label: 'Replace the sensor and take the machine out until one',
            keywords: ['replace the sensor', 'new sensor', 'replace', 'swap'],
            outcome:
              'The ward has to shuffle patients between machines. A nurse who is trying to get through a list is not delighted. The machine is solid afterwards.',
          },
          {
            id: 'both',
            label: 'Ask the ward for time and do both properly',
            keywords: ['do both', 'both properly', 'ask the ward', 'both'],
            outcome:
              'You replace the sensor and calibrate it, which is what a careful engineer might do. It still takes the machine out until one, so the trade-off was real either way. The ward manager agrees, reluctantly.',
          },
        ],
      },
    ],
    debrief: {
      surprise:
        'Most of the job is deciding what not to fix. One person looks after hundreds of machines, and the skill is telling a real fault from noise.',
      hardPart:
        'When a machine goes back on the ward and you are not certain, nobody tells you if you got it right.',
      nextStep:
        'Look up a maintenance-fitting apprenticeship with the HSE or a hospital group near you: QQI level 6, earn while you learn.',
    },
  },
  {
    id: 'game-accessibility-designer',
    careerId: 'game-accessibility-designer',
    title: 'Game accessibility designer',
    where: 'Studio floor · three weeks to launch',
    role: 'You are the accessibility designer on a big action game.',
    situation:
      'Players who cannot react fast are getting stuck in a flooded-basement boss fight. You have one meeting with the lead designer this afternoon and room for one change in the build before launch.',
    stages: [
      {
        id: 'start',
        question: 'What do you ask for?',
        options: [
          {
            id: 'assist',
            label: 'A full assist mode that slows the boss down',
            keywords: ['assist mode', 'slow the boss', 'easy mode'],
            outcome:
              'The lead pushes back straight away: “that is a different fight, not the same game.” It also will not be ready in three weeks. A real lesson: accessibility fights are usually about scope, not intent.',
          },
          {
            id: 'options',
            label: 'A set of options players can toggle themselves',
            keywords: ['set of options', 'options players', 'toggle', 'settings'],
            outcome:
              'Sensible and cheap, and often what ships. But the lead asks the fair question: which options, for which problem? You do not know yet, because you have not found the sticking point.',
          },
          {
            id: 'watch',
            label: 'Watch three recordings of people getting stuck first',
            keywords: ['watch the recordings', 'watch three', 'playtest', 'recordings'],
            outcome:
              'You spot it inside ten minutes. The problem is not reaction speed. The flooded floor is dark and the water hides which tiles are safe, so people fall in and get hit while recovering. It is a clarity bug wearing an accessibility costume.',
          },
        ],
      },
      {
        id: 'pitch',
        question: 'You have twelve minutes with the lead. What do you pitch?',
        situation:
          'The cheap fix is a highlight on the safe tiles. The bigger fix is that highlight plus an option to slow the boss’s second phase. The bigger one risks turning the meeting into an argument about scope.',
        options: [
          {
            id: 'cheap',
            label: 'Pitch the cheap change he will accept',
            keywords: ['cheap change', 'the highlight', 'small fix', 'highlight'],
            outcome:
              'It ships, and most of the problem goes away. That is how a lot of accessibility work actually happens, and it is not a failure.',
          },
          {
            id: 'both',
            label: 'Pitch both, and let him decide the scope',
            keywords: ['pitch both', 'both', 'slow the boss', 'second phase'],
            outcome:
              'He argues, then agrees to the highlight now and the slowdown “if there is time”. A pitch is a negotiation with a schedule, not a wish list.',
          },
          {
            id: 'redesign',
            label: 'Say the real problem is the fight design',
            keywords: ['fight design', 'redesign the fight', 'the real problem'],
            outcome:
              'Honest, and the lead tells you the fight was signed off six weeks ago. Nothing changes before launch. The most useful failure in the scenario: being right is not the same as being useful this week.',
          },
        ],
      },
    ],
    debrief: {
      surprise:
        'Accessibility designers spend most of their time finding out what the actual barrier is. It is usually not what the team assumed.',
      hardPart:
        'You are almost always asking for something late, with no budget, from someone whose launch is in three weeks.',
      nextStep:
        'Play a game you know well with subtitles and remapping on, and write down every place it gets in your way. That document is a portfolio piece.',
    },
  },
  {
    id: 'sound-designer',
    careerId: 'sound-designer',
    title: 'Sound designer',
    where: 'Small studio · one scene, one day',
    role: 'You are the sound designer on a horror-ish adventure game.',
    situation:
      'The player walks through a flooded train tunnel. The producer says the scene is “flat and not scary”. There are no monsters in it and nothing jumps out. You have the rest of the day to fix one scene.',
    stages: [
      {
        id: 'start',
        question: 'Where do you start?',
        options: [
          {
            id: 'layer',
            label: 'Layer in more sounds: dripping, wind, a distant train',
            keywords: ['layer in more', 'more sounds', 'add sounds', 'dripping', 'wind'],
            outcome:
              'The scene gets busier and somehow less tense. The producer calls it “muddy”. Adding sound usually kills tension; that is the honest lesson.',
          },
          {
            id: 'strip',
            label: 'Strip it back and let the footsteps carry it',
            keywords: ['strip it back', 'strip', 'quiet', 'remove', 'subtract'],
            outcome:
              'Suddenly you can hear the player’s breathing and the water. Closer. But it is now empty in a way that reads as unfinished rather than frightening.',
          },
          {
            id: 'record',
            label: 'Go and record a real tunnel and a real pipe',
            keywords: ['go and record', 'record a real', 'record', 'real tunnel', 'field recording'],
            outcome:
              'You spend the morning in a car park underpass with a phone and a contact mic. You come back with a low rumble that is genuinely unpleasant in a good way. Cost: half your day.',
          },
        ],
      },
      {
        id: 'mix',
        question: 'You have a rumble that works. How do you use it?',
        situation:
          'A constant bed creates dread, but players stop noticing it after ninety seconds. Coming and going lets the silences do the scaring, but it needs a trigger, and that means asking a programmer for time they do not have.',
        options: [
          {
            id: 'constant',
            label: 'Keep it under everything the whole time',
            keywords: ['keep it constant', 'constant bed', 'under everything', 'whole time'],
            outcome:
              'Safe, and it ships. The producer says it is “better but not scary”, which is true and useful.',
          },
          {
            id: 'dynamic',
            label: 'Ask the programmer for twenty minutes and place it at three points',
            keywords: ['ask the programmer', 'programmer', 'trigger', 'three points', 'come and go'],
            outcome:
              'The programmer gives you the time because they like the idea. You hand-place the rumble at three points and the silences start doing the work. Contrast, not volume.',
          },
          {
            id: 'unfinished',
            label: 'Try to do both and probably run out of day',
            keywords: ['do both', 'run out of day', 'try everything'],
            outcome:
              'You get halfway through a trigger system, and the scene is a mix of a constant bed and two hand-placed hits. It is better. It is also obviously unfinished, and you have learned how these days are a negotiation with time.',
          },
        ],
      },
    ],
    debrief: {
      surprise:
        'Sound design is mostly subtraction, and the scariest sound in most games is the one that stops.',
      hardPart:
        'Nobody can tell you what is wrong. A producer says “flat” and it is your job to turn that into a decision by the end of the day, on your own.',
      nextStep:
        'Mute a game scene you like and rebuild the sound with free samples. That is a portfolio piece, and it is exactly what a studio will ask to see.',
    },
  },
];

function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function scenarioForCard(card) {
  const haystack = normalize(`${card?.id ?? ''} ${card?.title ?? ''} ${(card?.tags ?? []).join(' ')}`);
  return (
    SCENARIOS.find(
      (scenario) =>
        haystack.includes(normalize(scenario.id)) ||
        haystack.includes(normalize(scenario.title)) ||
        haystack.includes(normalize(scenario.careerId)),
    ) ?? null
  );
}

export function createRun(scenarioId) {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);
  return { scenarioId, stage: 0, choices: [], finished: false };
}

export function currentStage(run) {
  const scenario = SCENARIOS.find((s) => s.id === run.scenarioId);
  return scenario?.stages[run.stage] ?? null;
}

export function choose(run, optionId) {
  if (run.finished) return { run, option: null, outcome: null, done: true };
  const scenario = SCENARIOS.find((s) => s.id === run.scenarioId);
  const stage = scenario?.stages[run.stage];
  const option = stage?.options.find((o) => o.id === optionId);
  if (!option) return { run, option: null, outcome: null, done: false };

  const choices = [...run.choices, { stageId: stage.id, optionId: option.id, label: option.label }];
  const nextStage = run.stage + 1;
  const finished = nextStage >= scenario.stages.length;
  return {
    run: { ...run, stage: nextStage, choices, finished },
    option,
    outcome: option.outcome,
    done: finished,
  };
}

// Free speech is not a menu. Match a spoken answer to an option only when it
// clearly names one; otherwise let the agent respond and leave the decision on
// screen. Two keywords, or one distinctive phrase, before we touch state.
export function matchOption(text, stage) {
  if (!stage) return null;
  const haystack = ` ${normalize(text)} `;
  let best = null;
  for (const option of stage.options) {
    let score = 0;
    for (const keyword of option.keywords) {
      const key = normalize(keyword);
      if (haystack.includes(` ${key} `)) score += key.includes(' ') ? 2 : 1;
    }
    if (score >= 2 && (!best || score > best.score)) best = { option, score };
  }
  return best?.option ?? null;
}

export function reflectionFor(run) {
  const scenario = SCENARIOS.find((s) => s.id === run.scenarioId);
  if (!scenario) return null;
  return {
    title: scenario.title,
    choices: [...run.choices],
    ...scenario.debrief,
  };
}

export function scenarioContext(scenario, run) {
  const stage = currentStage(run);
  if (!stage) return `The simulation of ${scenario.title} is finished. Ask how it felt and offer another career.`;
  return [
    `SIMULATION: ${scenario.title}. ${scenario.role} ${scenario.situation}`,
    `Current decision: ${stage.question}`,
    `Options on screen: ${stage.options.map((o) => o.label).join('; ')}.`,
    'React in one or two short sentences to what they say. Do not restart the scene or repeat the setup. Do not ask them to choose from the list; they may answer in their own words.',
  ].join(' ');
}
