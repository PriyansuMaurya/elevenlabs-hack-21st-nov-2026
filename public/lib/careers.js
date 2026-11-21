/* Career details.
   Cards are model-generated. The detail view is built from a small curated
   library plus a generic fallback, generated once per card and cached for the
   session. The same object feeds the screen and the live agent, so the two
   cannot disagree. */

const TYPES = {
  uni: 'University',
  plc: 'PLC / further education',
  app: 'Apprenticeship',
  trainee: 'Traineeship',
  portfolio: 'Portfolio / self-taught',
  work: 'Entry-level job with training',
};

const LIBRARY = [
  {
    id: 'biomedical-engineer',
    title: 'Biomedical engineer',
    aliases: ['biomedical', 'medical engineer', 'clinical engineer', 'medical equipment'],
    whatYouDo:
      'You keep the machines that keep patients alive working, and work out why they fail.',
    daily: [
      'Test and repair monitors, pumps, dialysis and imaging equipment on the wards.',
      'Read fault logs and service histories before opening a machine up.',
      'Calibrate sensors and sign equipment back into clinical use.',
      'Talk to nurses and doctors about what a machine actually did when it failed.',
    ],
    skills: ['Fault-finding methodically', 'Reading technical manuals', 'Safe handling of medical equipment', 'Explaining a fix to a non-technical colleague'],
    subjects: ['Physics', 'Biology', 'Maths', 'Engineering or technology'],
    routes: [
      { type: 'uni', detail: 'Level 8 in biomedical or electronic engineering, then hospital training.' },
      { type: 'app', detail: 'Maintenance-fitting apprenticeship with a hospital group or HSE, QQI level 6, earn while you learn.' },
      { type: 'plc', detail: 'QQI level 5 in engineering or electronics, then apply for a technician post.' },
    ],
    related: ['Medical physicist', 'Electronic technician', 'Lab technician'],
  },
  {
    id: 'game-accessibility-designer',
    title: 'Game accessibility designer',
    aliases: ['accessibility designer', 'game accessibility', 'accessibility tester', 'games accessibility'],
    whatYouDo:
      'You find what stops people playing a game, then get the smallest fix that lets more of them in.',
    daily: [
      'Watch playtest recordings and mark the exact moment players get stuck.',
      'Write options for subtitles, controls, contrast, speed and difficulty.',
      'Pitch a change to designers and producers who are close to launch.',
      'Retest the build and check the fix did not break something else.',
    ],
    skills: ['Watching playtests closely', 'Writing clear change requests', 'Knowing accessibility options', 'Negotiating scope with a team'],
    subjects: ['English', 'Design or technology', 'Computer science', 'Art'],
    routes: [
      { type: 'portfolio', detail: 'Build a document of accessibility fixes for games you play; studios hire from those.' },
      { type: 'uni', detail: 'Level 8 in game design, interaction design or computer science.' },
      { type: 'plc', detail: 'QQI level 5 in games design or software development, then junior QA work.' },
    ],
    related: ['QA tester', 'UX designer', 'Assistive technology technician'],
  },
  {
    id: 'sound-designer',
    title: 'Sound designer',
    aliases: ['sound design', 'audio designer', 'game audio', 'sound engineer'],
    whatYouDo:
      'You make the sounds in games, films and TV, and decide what the player hears and when.',
    daily: [
      'Record real sounds, then cut and layer them into a scene.',
      'Mix dialogue, effects and music so nothing fights for space.',
      'Place sounds against picture and check them on headphones and speakers.',
      'Rework a scene after a producer says it feels flat.',
    ],
    skills: ['Critical listening', 'Recording and editing', 'Using a DAW', 'Taking vague notes and turning them into a decision'],
    subjects: ['Music', 'Media studies', 'Physics', 'Art or design'],
    routes: [
      { type: 'portfolio', detail: 'Rebuild the sound on a muted game or film clip; that reel is the interview.' },
      { type: 'plc', detail: 'QQI level 5 in music production, sound or media, then studio or game work.' },
      { type: 'uni', detail: 'Level 8 in sound design, music technology or film production.' },
    ],
    related: ['Music producer', 'Foley artist', 'Game designer'],
  },
  {
    id: 'assistive-tech-technician',
    title: 'Assistive technology technician',
    aliases: ['assistive technology', 'assistive tech', 'accessibility technician', 'at technician'],
    whatYouDo:
      'You set up and fix the kit that helps disabled people use computers, communicate and get around.',
    daily: [
      'Assess what a person needs and match it to hardware or software.',
      'Install and configure switches, screen readers, mounts and communication aids.',
      'Repair equipment and train the person using it, plus their family or staff.',
      'Keep records for schools, clinics or a charity.',
    ],
    skills: ['Patience and clear explanations', 'Practical repair skills', 'Knowing accessibility software', 'Working with families and staff'],
    subjects: ['Technology', 'Computer science', 'Social care or health studies', 'English'],
    routes: [
      { type: 'app', detail: 'Maintenance or IT apprenticeship with a health or disability service, QQI level 6.' },
      { type: 'plc', detail: 'QQI level 5 in assistive technology or health studies, then apply to a service.' },
      { type: 'uni', detail: 'Level 8 in occupational therapy or assistive technology for a clinical route.' },
    ],
    related: ['Occupational therapist', 'IT support', 'Biomedical engineer'],
  },
  {
    id: 'fabricator',
    title: 'Fabricator / welder',
    aliases: ['fabrication', 'fabricator', 'welder', 'metalwork', 'sheet metal'],
    whatYouDo:
      'You turn drawings into real metal parts and structures, cutting, bending and joining them.',
    daily: [
      'Read a drawing and mark out the metal.',
      'Cut, drill, bend and weld parts to size.',
      'Check measurements and fix anything that is out.',
      'Work safely around heat, sparks and heavy material.',
    ],
    skills: ['Measuring accurately', 'Welding and cutting', 'Reading engineering drawings', 'Working safely at height or with heavy kit'],
    subjects: ['Maths', 'Engineering or technology', 'Technical drawing', 'Physics'],
    routes: [
      { type: 'app', detail: 'Metal fabrication apprenticeship, QQI level 6, paid from day one.' },
      { type: 'plc', detail: 'QQI level 5 in engineering or fabrication, then a workshop job.' },
      { type: 'trainee', detail: 'Short traineeship with a local employer, often through an ETB.' },
    ],
    related: ['Carpenter', 'Mechanic', 'Sheet metal worker'],
  },
  {
    id: 'software-developer',
    title: 'Software developer',
    aliases: ['software developer', 'programmer', 'coder', 'software engineer', 'web developer'],
    whatYouDo:
      'You build and fix the programs and websites people use, mostly by solving small problems all day.',
    daily: [
      'Read a problem, then write and test code that fixes it.',
      'Review someone else’s code and explain what you would change.',
      'Trace a bug through a system that someone else built.',
      'Ship a small change, watch it, and fix the fallout.',
    ],
    skills: ['Breaking a problem into steps', 'One language well', 'Reading other people’s code', 'Writing down what you changed'],
    subjects: ['Maths', 'Computer science', 'English', 'Any science'],
    routes: [
      { type: 'portfolio', detail: 'Build and publish small projects; many employers interview on the work.' },
      { type: 'uni', detail: 'Level 8 in computer science or software engineering.' },
      { type: 'app', detail: 'Software development apprenticeship, QQI level 6, earn while you learn.' },
    ],
    related: ['Data analyst', 'Cybersecurity analyst', 'Game developer'],
  },
  {
    id: 'game-artist',
    title: 'Game artist',
    aliases: ['game artist', 'games artist', 'concept artist', '3d artist', 'animator'],
    whatYouDo:
      'You make the characters, places and objects players see in a game.',
    daily: [
      'Sketch ideas and turn one into a polished piece.',
      'Build 3D models and textures that fit the game’s style.',
      'Take notes from an art director and revise.',
      'Check the work in the engine and fix anything that looks wrong.',
    ],
    skills: ['Drawing and visual judgement', '3D software', 'Taking criticism', 'Meeting a style guide'],
    subjects: ['Art', 'Design', 'English', 'Computer science'],
    routes: [
      { type: 'portfolio', detail: 'A strong portfolio matters more than a degree; build one and post it.' },
      { type: 'plc', detail: 'QQI level 5 in art, animation or games design.' },
      { type: 'uni', detail: 'Level 8 in animation, game art or visual design.' },
    ],
    related: ['Animator', 'Graphic designer', 'Sound designer'],
  },
  {
    id: 'electrician',
    title: 'Electrician',
    aliases: ['electrician', 'electrical', 'spark'],
    whatYouDo:
      'You install, test and repair the wiring and electrical systems in buildings.',
    daily: [
      'Plan a run of cable around a building’s actual walls and ducts.',
      'Install sockets, lights, boards and alarms.',
      'Test circuits and find the fault when something trips.',
      'Explain the work and the cost to a customer.',
    ],
    skills: ['Safe isolation and testing', 'Reading plans', 'Practical problem solving', 'Working in other people’s homes'],
    subjects: ['Maths', 'Physics', 'Engineering or technology', 'Technical drawing'],
    routes: [
      { type: 'app', detail: 'Electrical apprenticeship, four years, QQI level 6, paid throughout.' },
      { type: 'plc', detail: 'QQI level 5 in electrical engineering as a pre-apprenticeship year.' },
      { type: 'trainee', detail: 'Traineeship with a contractor, then apply for apprenticeship phases.' },
    ],
    related: ['Plumber', 'Solar installer', 'Electronic technician'],
  },
  {
    id: 'mechanic',
    title: 'Motor mechanic',
    aliases: ['mechanic', 'motor mechanic', 'car mechanic', 'auto technician'],
    whatYouDo:
      'You work out why a vehicle is not right, then repair it and prove the repair worked.',
    daily: [
      'Listen to the customer and road-test the vehicle.',
      'Plug in diagnostics and test components.',
      'Replace or repair parts, then check the whole system.',
      'Record what was done and talk the customer through it.',
    ],
    skills: ['Systematic fault-finding', 'Using diagnostic tools', 'Safe lifting and handling', 'Explaining a repair honestly'],
    subjects: ['Maths', 'Physics', 'Engineering or technology', 'Technical drawing'],
    routes: [
      { type: 'app', detail: 'Motor mechanic apprenticeship, QQI level 6, earn while you learn.' },
      { type: 'plc', detail: 'QQI level 5 in motor technology, then a garage job.' },
      { type: 'trainee', detail: 'Traineeship at a dealership or fleet operator.' },
    ],
    related: ['Electrician', 'Fabricator', 'Vehicle inspector'],
  },
  {
    id: 'chef',
    title: 'Chef',
    aliases: ['chef', 'cook', 'kitchen', 'culinary'],
    whatYouDo:
      'You run a section of a kitchen and get food out hot, consistent and on time.',
    daily: [
      'Prep ingredients before service starts.',
      'Cook to order during a busy service.',
      'Keep the section clean and the stock rotated.',
      'Change a dish when an ingredient runs out or a customer has an allergy.',
    ],
    skills: ['Working fast under pressure', 'Knife skills', 'Food safety', 'Team communication'],
    subjects: ['Home economics', 'Biology', 'Maths', 'English'],
    routes: [
      { type: 'app', detail: 'Commis chef apprenticeship, QQI level 6, paid in a working kitchen.' },
      { type: 'plc', detail: 'QQI level 5 in culinary arts, then a commis chef job.' },
      { type: 'work', detail: 'Start as a kitchen porter and train on the job; many chefs do.' },
    ],
    related: ['Baker', 'Food technologist', 'Hotel manager'],
  },
  {
    id: 'veterinary-nurse',
    title: 'Veterinary nurse',
    aliases: ['veterinary nurse', 'vet nurse', 'animal care', 'veterinary'],
    whatYouDo:
      'You care for animals in a vet practice, assist in surgery and reassure worried owners.',
    daily: [
      'Hold and calm animals for examinations and procedures.',
      'Prepare theatre, monitor anaesthesia and clean up afterwards.',
      'Run nurse clinics and explain care to owners.',
      'Keep records and manage stock and appointments.',
    ],
    skills: ['Handling animals calmly', 'Noticing small changes', 'Practical clinical tasks', 'Talking to upset people'],
    subjects: ['Biology', 'Chemistry', 'Maths', 'English'],
    routes: [
      { type: 'uni', detail: 'Level 7 or 8 in veterinary nursing, then registration.' },
      { type: 'plc', detail: 'QQI level 5 in animal care, then apply for the degree or a practice assistant role.' },
      { type: 'work', detail: 'Animal care assistant in a practice or shelter, with in-house training.' },
    ],
    related: ['Veterinarian', 'Animal welfare officer', 'Lab technician'],
  },
  {
    id: 'social-care-worker',
    title: 'Social care worker',
    aliases: ['social care', 'care worker', 'youth worker', 'support worker'],
    whatYouDo:
      'You support people through hard periods, helping them with daily life and the systems around them.',
    daily: [
      'Spend time with people and notice what has changed.',
      'Write clear notes and hand over to the next shift.',
      'Work with families, schools, health staff and sometimes courts.',
      'Stay calm when someone is angry, frightened or let down.',
    ],
    skills: ['Listening without judging', 'Keeping boundaries', 'Writing accurate records', 'Staying calm under pressure'],
    subjects: ['Social care', 'Psychology', 'English', 'Health studies'],
    routes: [
      { type: 'uni', detail: 'Level 7 or 8 in social care, then registration with CORU for some roles.' },
      { type: 'plc', detail: 'QQI level 5 in social care or community studies, then support work.' },
      { type: 'app', detail: 'Social care apprenticeship routes are growing; check with an ETB.' },
    ],
    related: ['Youth worker', 'Occupational therapist', 'Addiction counsellor'],
  },
  {
    id: 'graphic-designer',
    title: 'Graphic designer',
    aliases: ['graphic design', 'graphic designer', 'visual designer', 'brand designer'],
    whatYouDo:
      'You turn a message into images, type and layout that people actually read.',
    daily: [
      'Ask what the piece has to achieve and who it is for.',
      'Sketch options, then build one properly on screen.',
      'Take feedback from a client and revise without losing the idea.',
      'Prepare files for print or web and check them.',
    ],
    skills: ['Typography and layout', 'Adobe or free design tools', 'Explaining design choices', 'Meeting a deadline'],
    subjects: ['Art', 'Design', 'English', 'Media studies'],
    routes: [
      { type: 'portfolio', detail: 'A portfolio of real or invented briefs; clients hire on the work.' },
      { type: 'plc', detail: 'QQI level 5 in graphic design, then studio or in-house work.' },
      { type: 'uni', detail: 'Level 8 in visual communication or graphic design.' },
    ],
    related: ['Game artist', 'UX designer', 'Illustrator'],
  },
  {
    id: 'data-analyst',
    title: 'Data analyst',
    aliases: ['data analyst', 'data science', 'analyst', 'statistics'],
    whatYouDo:
      'You find the story in a pile of numbers and explain it to people who have to decide something.',
    daily: [
      'Ask what decision the numbers are meant to support.',
      'Clean a messy dataset and check it makes sense.',
      'Build a query, chart or dashboard.',
      'Explain the result plainly, including what it cannot tell you.',
    ],
    skills: ['Spreadsheets and SQL', 'Spotting a misleading number', 'Clear writing', 'Asking a better question'],
    subjects: ['Maths', 'Economics', 'Computer science', 'English'],
    routes: [
      { type: 'uni', detail: 'Level 8 in data science, statistics, maths or economics.' },
      { type: 'plc', detail: 'QQI level 5 in business or computing, then a junior analyst role.' },
      { type: 'portfolio', detail: 'Publish two analyses of open data; some employers hire on that.' },
    ],
    related: ['Software developer', 'Cybersecurity analyst', 'Market researcher'],
  },
  {
    id: 'cybersecurity-analyst',
    title: 'Cybersecurity analyst',
    aliases: ['cybersecurity', 'security analyst', 'soc analyst', 'ethical hacker'],
    whatYouDo:
      'You watch for attacks, work out how they got in, and close the hole.',
    daily: [
      'Triage alerts and separate noise from a real intrusion.',
      'Trace what an attacker did across logs and systems.',
      'Patch or block the route they used.',
      'Write an incident note that non-technical staff can act on.',
    ],
    skills: ['Pattern-spotting in logs', 'Networking basics', 'Calm under incident pressure', 'Documenting evidence'],
    subjects: ['Computer science', 'Maths', 'Physics', 'English'],
    routes: [
      { type: 'uni', detail: 'Level 8 in cybersecurity or computer science.' },
      { type: 'app', detail: 'Cyber security apprenticeship or traineeship with an employer.' },
      { type: 'portfolio', detail: 'Home lab, capture-the-flag competitions and certifications can open the first door.' },
    ],
    related: ['Software developer', 'Network engineer', 'Data analyst'],
  },
  {
    id: 'carpenter',
    title: 'Carpenter / joiner',
    aliases: ['carpenter', 'joinery', 'woodwork', 'cabinet maker'],
    whatYouDo:
      'You build and fit wooden structures, from roof timbers to kitchens and stairs.',
    daily: [
      'Measure the actual space, not just the drawing.',
      'Cut and assemble timber accurately.',
      'Fit doors, stairs, kitchens or roof structures on site.',
      'Fix mistakes that only appear once something is in place.',
    ],
    skills: ['Measuring and marking', 'Hand and power tools', 'Reading drawings', 'Problem solving on site'],
    subjects: ['Maths', 'Technical drawing', 'Engineering or technology', 'Art'],
    routes: [
      { type: 'app', detail: 'Carpentry and joinery apprenticeship, QQI level 6, paid.' },
      { type: 'plc', detail: 'QQI level 5 in construction or furniture making.' },
      { type: 'trainee', detail: 'Traineeship with a kitchen or joinery workshop.' },
    ],
    related: ['Fabricator', 'Electrician', 'Furniture designer'],
  },
  {
    id: 'film-production',
    title: 'Film and TV production assistant',
    aliases: ['film production', 'tv production', 'production assistant', 'runner', 'film crew'],
    whatYouDo:
      'You keep a shoot moving: people in the right place, kit ready, problems fixed before they spread.',
    daily: [
      'Run errands and move kit between locations.',
      'Keep call sheets, timings and people updated.',
      'Solve small problems before they stop a take.',
      'Stay quiet and alert on set, then help pack down.',
    ],
    skills: ['Organisation', 'Staying calm when plans change', 'Driving or transport', 'Reading a call sheet'],
    subjects: ['Media studies', 'English', 'Art', 'Business'],
    routes: [
      { type: 'portfolio', detail: 'Crew on student films and local shoots; the network is the route.' },
      { type: 'plc', detail: 'QQI level 5 in film and TV production, then runner work.' },
      { type: 'uni', detail: 'Level 8 in film or broadcasting, useful but not required.' },
    ],
    related: ['Sound designer', 'Photographer', 'Event manager'],
  },
  {
    id: 'ux-designer',
    title: 'UX designer',
    aliases: ['ux designer', 'user experience', 'product designer', 'interaction designer'],
    whatYouDo:
      'You watch how people use a product, then change it so the next person finds it easier.',
    daily: [
      'Interview or watch a few users doing a real task.',
      'Sketch and prototype a change.',
      'Test it with people and note where they hesitate.',
      'Hand the design to developers and check what shipped.',
    ],
    skills: ['Watching without leading', 'Sketching and prototyping', 'Writing clear findings', 'Arguing for the user'],
    subjects: ['Design', 'Psychology', 'Computer science', 'English'],
    routes: [
      { type: 'portfolio', detail: 'Redesign an app you use and document the before, after and why.' },
      { type: 'plc', detail: 'QQI level 5 in UX, web design or digital media.' },
      { type: 'uni', detail: 'Level 8 in interaction design, product design or psychology.' },
    ],
    related: ['Graphic designer', 'Game accessibility designer', 'Data analyst'],
  },
  {
    id: 'lab-technician',
    title: 'Lab technician',
    aliases: ['lab technician', 'laboratory', 'science technician', 'biotech'],
    whatYouDo:
      'You run the tests and keep the lab working so scientists can trust their results.',
    daily: [
      'Prepare samples, reagents and equipment for a run.',
      'Follow a method exactly and record every result.',
      'Notice when a control fails and stop before the data is ruined.',
      'Maintain equipment and manage stock safely.',
    ],
    skills: ['Careful recording', 'Following a method', 'Attention to small differences', 'Safe handling of chemicals'],
    subjects: ['Chemistry', 'Biology', 'Maths', 'Physics'],
    routes: [
      { type: 'uni', detail: 'Level 7 or 8 in science or laboratory science.' },
      { type: 'plc', detail: 'QQI level 5 in laboratory techniques, then a technician post.' },
      { type: 'app', detail: 'Laboratory technician apprenticeships exist in pharma and food; check apprenticeships.ie.' },
    ],
    related: ['Biomedical engineer', 'Quality analyst', 'Veterinary nurse'],
  },
  {
    id: 'paramedic',
    title: 'Paramedic',
    aliases: ['paramedic', 'ambulance', 'emergency medical'],
    whatYouDo:
      'You assess and treat people in emergencies and decide where they need to go.',
    daily: [
      'Arrive at an unknown scene and make it safe.',
      'Assess quickly and treat what is life-threatening first.',
      'Decide whether to transport, refer or leave the person at home.',
      'Hand over clearly to hospital staff.',
    ],
    skills: ['Staying calm in chaos', 'Clinical assessment', 'Physical fitness', 'Talking to frightened people'],
    subjects: ['Biology', 'Chemistry', 'Maths', 'English'],
    routes: [
      { type: 'uni', detail: 'Level 8 in paramedic science, then registration with the Pre-Hospital Emergency Care Council.' },
      { type: 'plc', detail: 'QQI level 5 in emergency care or health studies as a stepping stone.' },
      { type: 'work', detail: 'Emergency care assistant or ambulance driver, with in-service training.' },
    ],
    related: ['Nurse', 'Firefighter', 'Social care worker'],
  },
  {
    id: 'sports-coach',
    title: 'Sports coach',
    aliases: ['sports coach', 'coach', 'personal trainer', 'fitness instructor'],
    whatYouDo:
      'You help people get better at something physical, safely and over months, not one session.',
    daily: [
      'Plan sessions that fit the group in front of you.',
      'Demonstrate, watch and correct technique.',
      'Adapt when someone is injured, discouraged or ahead of the group.',
      'Talk to parents, players and other staff.',
    ],
    skills: ['Explaining simply', 'Reading a group', 'Planning over weeks', 'First aid and safety'],
    subjects: ['PE', 'Biology', 'English', 'Business'],
    routes: [
      { type: 'plc', detail: 'QQI level 5 in sport and recreation, then coaching badges.' },
      { type: 'uni', detail: 'Level 8 in sports science or physical education.' },
      { type: 'work', detail: 'Start as an assistant coach with a club and take national governing body courses.' },
    ],
    related: ['Physiotherapist', 'Youth worker', 'Personal trainer'],
  },
  {
    id: 'architect',
    title: 'Architect',
    aliases: ['architect', 'architecture'],
    whatYouDo:
      'You design buildings that work for the people in them and get them built within the rules.',
    daily: [
      'Visit a site and work out what is actually possible.',
      'Draw and model options, then test them against budget and planning.',
      'Coordinate engineers and contractors.',
      'Defend a design to a client or a planning authority.',
    ],
    skills: ['Spatial thinking', 'Drawing and modelling', 'Building regulations', 'Persuading a room'],
    subjects: ['Maths', 'Art', 'Physics', 'Technical drawing'],
    routes: [
      { type: 'uni', detail: 'Level 8 in architecture plus professional practice and registration.' },
      { type: 'plc', detail: 'QQI level 5 in architectural technology, then a technician or degree route.' },
      { type: 'app', detail: 'Architectural technology apprenticeships exist; check with an ETB.' },
    ],
    related: ['Civil engineer', 'Carpenter', 'Urban planner'],
  },
];

const CACHE = new Map();

function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function matches(entry, haystack) {
  const keys = [entry.id, entry.title, ...entry.aliases].map(normalize);
  return keys.some((key) => key.length > 3 && haystack.includes(key));
}

function genericDetail(card) {
  return {
    id: card.id,
    title: card.title,
    whatYouDo: card.oneLiner || `You do the day-to-day work of a ${card.title.toLowerCase()}.`,
    daily: [
      'The daily tasks depend on the employer and specialism; check with someone doing this work.',
      'Ask a careers advisor or someone in the role for examples of a typical working day.',
      'Expect a mix of routine work and whatever problem turns up that day.',
    ],
    skills: ['Skills vary by role and employer; check with a careers advisor.'],
    subjects: ['Relevant subjects vary; check current guidance for this role.'],
    routes: (card.routes ?? []).map((detail) => ({ type: 'other', detail })),
    related: ['Ask a careers advisor about related roles.'],
    note: 'This is a sketch: the card did not match our detailed library, so check the specifics with a careers advisor.',
  };
}

// One detail object per card per session. The cache is keyed by id + title so a
// regenerated card with the same job does not produce a second, different answer.
export function buildCareerDetail(card) {
  const key = `${card.id}|${card.title}`;
  if (CACHE.has(key)) return CACHE.get(key);
  const haystack = normalize(`${card.id} ${card.title}`);
  const entry = LIBRARY.find((candidate) => matches(candidate, haystack));
  const detail = entry
    ? { ...entry, id: card.id, title: card.title, note: null }
    : genericDetail(card);
  CACHE.set(key, detail);
  return detail;
}

export function routeTypeLabel(type) {
  return TYPES[type] ?? 'Other route';
}

export function detailToContext(detail) {
  const routes = detail.routes
    .map((route) => `${routeTypeLabel(route.type)}: ${route.detail}`)
    .join(' ');
  return [
    `They are looking at ${detail.title}.`,
    `What the job is: ${detail.whatYouDo}`,
    `Typical day: ${detail.daily.join(' ')}`,
    `Skills used: ${detail.skills.join(', ')}.`,
    `School subjects that help: ${detail.subjects.join(', ')}.`,
    `Routes in Ireland: ${routes}`,
    `Related work: ${detail.related.join(', ')}.`,
    detail.note ? `Limit: ${detail.note}` : '',
    'Answer only from this. If they ask something not covered, say you are not sure and point them to careersportal.ie.',
  ]
    .filter(Boolean)
    .join(' ');
}

export function clearCareerCache() {
  CACHE.clear();
}

export const CAREER_LIBRARY = LIBRARY;
