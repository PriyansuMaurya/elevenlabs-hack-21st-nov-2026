# Five-minute demo

Have the page open at `http://localhost:5173` before anyone is watching. Voice needs a microphone
and `localhost` or HTTPS. Use headphones so Sam does not hear the room.

## Before you start

1. `npm start`, then load the page and check the orb says **Talk to Sam**.
2. Allow the microphone when asked. Speak one sentence to confirm the level meter moves.
3. If the room is noisy, type in the box under the headline and run the same path by typing. Say
   so out loud; it is a feature, not a fallback apology.
4. Keep `docs/QA.md` nearby for the checks you do not want to do live.

## The script

**0:00 — the problem, in one line.**

> "Most 16-year-olds are asked to pick a future before they have met any of the jobs in it."

**0:15 — start.**

Click the orb. Let Sam introduce itself and ask the first question. Do not talk over it.

Say something concrete and slightly unusual:

> "I edit videos for my cousin's band, and I make sounds on my laptop. I hate presenting."

Let Sam ask two or three follow-ups. Answer in full sentences, not keywords. The point of the demo is
that the questions adapt, so do not read a list.

**1:00 — the profile.**

Sam shows a profile card. Point at the chips, remove one that is wrong, and let Sam correct itself.
Then press **That's me**. This is the moment the product stops feeling like a chatbot: the young
person has editorial control.

> "It checks what it heard before it suggests anything."

**1:30 — the cards.**

Three cards appear. Point at the **fit reason** on one, not the title.

> "Every suggestion has to cite something they actually said. If it cannot, it should not be there."

Open **Sound designer** if it is there. Read one line of the day, then the routes. Note the
AI-generated label at the bottom.

**2:15 — try a day.**

Press **Try a day as this**. Read the scene aloud, then make a real choice. When the consequence
lands, say:

> "There is no right answer. That is the point. Most career tools stop at the job title."

Take the second decision. Let the debrief name one hard part without softening it.

**4:00 — the honest part.**

Ask the room: "Would you have known that job existed at 16?" Then close the sheet and show the
**Try another career** button.

> "The simulation is written for three careers. For anything else, Sam builds the scene live. We
> would rather admit that than fake a script."

**4:30 — safeguarding, only if asked.**

Do not perform a disclosure with an audience. Say what happens instead: a local check runs before
anything is sent, careers stop, and the support card shows Emergency, Childline and Samaritans. Point
at **Support** in the header. Offer to run `npm run test:safety` afterwards.

**5:00 — stop.**

Press **Stop for now**. Say plainly: "No account, no storage, nothing saved."

## If the agent suggests different careers

Use whatever appears. The demo does not depend on the exact three. If no card has an authored
scenario, pressing **Try a day as this** starts a live scene instead; say that is the fallback and
keep going. If the connection drops, the banner offers **Reconnect** and the page keeps its place.

## Do not

- Do not claim the cards are verified careers advice. They are AI-generated and labelled.
- Do not claim Sam is a person or a counsellor.
- Do not demo a real disclosure, and do not ask a young person to supply one.
- Do not quote salaries or exact course requirements. The prompt forbids inventing them.
