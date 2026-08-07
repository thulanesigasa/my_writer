# Front and Back Matter Formatting Rules
## *The Power of Instinct* — Packaging Instructions for the LangGraph Agents

> **Intended users:** This file is used exclusively by the Front Matter Agent
> and Back Matter Agent in the LangGraph pipeline. These agents run before and
> after the main narrative body generation respectively.
>
> **Authority:** The formatting specifications in this file are final.
> The agents must follow them exactly. No section may be omitted. No section
> may be merged with another. The order specified here is the order in which
> the sections appear in the final manuscript.
>
> **Tone:** The front and back matter sections must match the voice of the
> main body — authoritative, warm, precise. They are not afterthoughts.
> The prologue in particular is a reader's first encounter with the book's
> voice. The epilogue is the last thing they will read. Both must be crafted
> with the same care as the chapter prose.

---

# PART ONE: Front Matter

The front matter appears before Chapter 1. It must be generated in the
following order, with each section starting on a new page.

---

## Section FM-1: Title Page

**Format:** The title page contains only the following elements, in this
exact order, with appropriate typographic spacing:

```
[Book Title]

[Subtitle]

[Author Name]

[Publisher Name] · [City of Publication] · [Year]
```

**Populated values for this book:**

- **Title:** *The Power of Instinct*
- **Subtitle:** *The New Neuroscience of Gut Feelings, Expert Decisions,
  and What Your Body Already Knows*
- **Author:** [Author name to be supplied by user — placeholder: Author Name]
- **Publisher:** [Publisher to be supplied by user — placeholder: Publisher Name]
- **City:** [City to be supplied by user — placeholder: City]
- **Year:** 2025

**Formatting instructions:**
- The title is rendered in large type — indicate with markdown `# The Power of Instinct`
- The subtitle is rendered in smaller type — indicate with markdown `## The New Neuroscience of Gut Feelings, Expert Decisions, and What Your Body Already Knows`
- All other elements are centred plain text
- No decorative elements, no blurbs, no imagery on the title page

---

## Section FM-2: Copyright Page

**Format:** The copyright page is a small block of legally formatted text.
The agent must generate the following exact structure, substituting values
where indicated:

```
Copyright © 2025 [Author Name]

All rights reserved. No part of this publication may be reproduced,
stored in a retrieval system, or transmitted in any form or by any means,
electronic, mechanical, photocopying, recording, or otherwise, without
the prior written permission of the publisher.

Published by [Publisher Name]
[Publisher Address, if supplied]

First published 2025

ISBN: [To be supplied by publisher]

Cover design: [To be supplied]

The moral right of the author to be identified as the author of this
work has been asserted in accordance with the Copyright, Designs
and Patents Act 1988.

Note on sources: All scientific studies, researchers, and theoretical
frameworks cited in this work are used with care for accuracy.
No studies, findings, or quotations have been fabricated.
Where research is described in general terms, this reflects the
state of the field rather than a specific cited study.
```

**Agent instruction:** The final paragraph ("Note on sources") is mandatory
and must not be omitted. It reflects the hallucination constraints specified
in `system_rules.md` and protects the book's credibility.

---

## Section FM-3: Dedication Page

**Format:** A single, brief dedication. No more than three lines. The agent
must use the following placeholder and flag it for author completion:

```
For [Dedicated to — author to supply]

[Optional second line — author to supply]

[Optional epigraph — if no epigraph is supplied, omit this line]
```

**Suggested epigraph (optional — author may replace):**

> *"The intuitive mind is a sacred gift and the rational mind is a faithful
> servant. We have created a society that honours the servant and has
> forgotten the gift."*
> — Attributed to Albert Einstein (note: this attribution is disputed;
> author should verify or replace)

**Agent instruction:** If the epigraph attribution is disputed or unverifiable,
replace with a verified quotation from Antonio Damasio, Gary Klein, or
Amy Edmondson — all of whom are approved sources under `system_rules.md`.

---

## Section FM-4: Table of Contents

**Format:** The Table of Contents must list every section of the book in
order, with descriptive titles. Do not use chapter numbers alone —
pair each number with its full title.

**Required structure:**

```
TABLE OF CONTENTS

A Note on Neuroscience  .....................................  [page]

Prologue: The Signal You Learned to Ignore  ................  [page]

Chapter 1: The Architecture of Instinct  ...................  [page]
Chapter 2: The Limbic System Myth & Reality  ...............  [page]
Chapter 3: The Evolutionary Importance  ....................  [page]
Chapter 4: The Power to Destroy and Create  ................  [page]
Chapter 5: Harnessing Instinct for Transformation  .........  [page]

Epilogue: The Work Continues  ..............................  [page]
Acknowledgments  ............................................  [page]
Glossary  ...................................................  [page]
Recommended Reading  .......................................  [page]
```

**Agent instruction:** Page numbers will be assigned in final typesetting.
Use `[page]` as a placeholder for all page number references. Do not
invent page numbers.

---

## Section FM-5: A Note on Neuroscience

**Format:** A brief prefatory note, 150–200 words, from the author's
perspective. Tone: warm, intellectually honest, confidence-building.

**Content requirements:**

The note must accomplish three things:

1. **Establish epistemic humility without undermining credibility.**
   Acknowledge that neuroscience is a young and fast-moving field.
   Acknowledge that some of what is presented as established today may
   be refined or revised tomorrow. Frame this as a feature of the field,
   not as a limitation of the book.

2. **State the book's evidentiary standard.**
   This book draws on peer-reviewed research, established theoretical
   frameworks, and documented case studies. It does not invent studies,
   fabricate statistics, or quote researchers out of context.

3. **Invite the reader in.**
   End with a sentence or two that frames the book as a journey into
   one of the most important questions in contemporary science — one
   that the reader is now equipped to explore.

**Word target:** 150–200 words.
**Tone:** Clear, precise, warm.

---

## Section FM-6: Prologue — *The Signal You Learned to Ignore*

**Format:** A narrative prologue, 400–600 words. This is the book's
first sustained piece of prose. It sets the voice, establishes the stakes,
and makes the reader a promise.

**Structural requirements:**

**Opening (100–150 words):** Begin with a specific, vivid moment.
Not the author's biography. Not a general claim about humanity.
A single moment — a decision made without fully understanding why,
a signal noticed and either heeded or overridden — that makes the
book's central question immediately personal.

**The gap (100–150 words):** Name the gap between what we are told
about intuition (distrust it, it is bias, it is not data) and what the
evidence increasingly shows (it is often the fastest path to what
experience has already established). Frame this gap as the book's
animating question.

**The promise (100–150 words):** State, clearly and without hype,
what the book will deliver. Not what the reader will "unlock" or
"discover" — language that is banned by `system_rules.md`. Instead:
what the science shows, what the reader will understand by the end,
and why that understanding changes something practical.

**The close (50–100 words):** End the prologue with a sentence or two
that leans the reader into Chapter 1. The final word of the prologue
should make turning the page feel inevitable.

**Tone:** Personal but not confessional. Authoritative but not cold.
The reader should finish the prologue feeling: "This person knows
something I need to know, and they are going to tell me."

---

# PART TWO: Back Matter

The back matter appears after Chapter 5. It must be generated in the
following order, with each section starting on a new page.

---

## Section BM-1: Epilogue — *The Work Continues*

**Format:** 400–600 words. The epilogue is the book's final act.
It must not summarise the chapters — the reader has just read them.
It must move forward from them.

**Structural requirements:**

**The synthesis (150–200 words):** State the book's core argument
in its most distilled form, now that the reader has the full context
to receive it. This is the argument stated plainly: instinct is not
the enemy of intelligence — it is intelligence's most compressed and
efficient form. The goal is not to choose between gut feeling and
analysis, but to develop the skill of knowing which is appropriate,
and to build the conditions in which both can be heard.

**The open question (100–150 words):** Acknowledge honestly that
the science is not finished. Name one or two specific areas where
the research is actively developing: the mechanisms of epigenetic
inheritance (how many generations? under what conditions?), the
neural correlates of expertise (when exactly does deliberate practice
become unconscious competence?), the design of institutional
environments that enable rather than suppress instinctive intelligence.
The reader should leave with a sense of being on the edge of
something still being discovered — not frustrated by incompleteness,
but energised by it.

**The invitation (100–150 words):** End with a direct address to
the reader. Not an exhortation ("go forth and trust your gut").
An invitation to continued attention. The reader's body has been
sending signals their whole life. Now they have a language for some
of them. The invitation is to pay closer attention — not blindly,
not at the expense of rigour, but with the understanding that the
signal is not noise. It is data.

**Final sentence:** The epilogue's final sentence should be short,
memorable, and quiet. Not a rally cry. A closing chord.

---

## Section BM-2: Acknowledgments

**Format:** 200–400 words. The Acknowledgments page thanks the people
who contributed to the book's development.

**Content requirements:**

The agent must generate a placeholder acknowledgments structure with
the following categories clearly labelled for author completion:

```
ACKNOWLEDGMENTS

[Paragraph thanking academic researchers and scientists whose work
informs the book — particularly Antonio Damasio, Gary Klein,
Amy Edmondson, Mihaly Csikszentmihalyi, and the broader community
of affective neuroscience researchers. Author to personalise.]

[Paragraph thanking editors, agents, and publishing team.
Author to fill with specific names.]

[Paragraph thanking early readers and colleagues who reviewed
drafts and provided feedback. Author to fill with specific names.]

[Optional paragraph thanking family or personal support network.
Author's discretion.]

[Final sentence: A brief acknowledgment that any errors in the book
are the author's responsibility alone.]
```

**Agent instruction:** Generate the first paragraph with warmth and
specificity, referencing the researchers by name and acknowledging
the intellectual debt. Leave the remaining paragraphs as labelled
placeholders for the author to complete.

---

## Section BM-3: Glossary

**Format:** An alphabetically ordered glossary of the book's key
technical terms. Each entry must include:
1. The term in **bold**
2. A plain-English definition (1–3 sentences)
3. Where the term first appears in the book (Chapter reference)

**Mandatory glossary entries (in alphabetical order):**

---

**Anterior Insula**
The region of the cerebral cortex that processes signals from the body's
internal state — heart rate, stomach activity, respiratory rhythm, and
muscle tension — and makes them available to conscious awareness as vague
"feelings." The anterior insula is the primary neural substrate of
interoception and a key component of the somatic marker system.
*First appears: Chapter 2.*

---

**BDNF (Brain-Derived Neurotrophic Factor)**
A protein that supports the growth, maintenance, and connectivity of
neurons. BDNF production is stimulated by physical exercise, social
connection, novelty, and mastery, and is the primary molecular mechanism
by which environmental change produces neurological plasticity.
*First appears: Chapter 5.*

---

**Cortisol**
A steroid hormone produced by the adrenal glands, belonging to the
glucocorticoid class. Cortisol is the body's primary stress hormone,
mobilising energy and heightening alertness in response to acute threats.
Chronically elevated cortisol, caused by sustained unresolvable stress,
is associated with hippocampal damage, immune suppression, and HPA axis
dysregulation.
*First appears: Chapter 3.*

---

**Default Mode Network (DMN)**
A network of brain regions — including the medial prefrontal cortex,
posterior cingulate cortex, and angular gyrus — that activates during
rest, mind-wandering, self-referential thought, and creative absorption.
Originally called the "task-negative network," the DMN is now understood
to support autobiographical memory integration, empathy, theory of mind,
and the generation of creative insight.
*First appears: Chapter 4.*

---

**Epigenetics**
The study of changes in gene expression that do not alter the underlying
DNA sequence. Epigenetic changes are mediated by mechanisms including DNA
methylation (chemical tags that silence or amplify gene activity) and
histone modification (structural changes that affect DNA accessibility).
Epigenetic marks can be influenced by environment and, in some documented
cases, transmitted across generations.
*First appears: Chapter 3.*

---

**Flow State**
A psychological state of complete absorption in a challenging task,
characterised by distorted time perception, reduced self-consciousness,
and the subjective experience of effortless performance. Neurologically
associated with transient hypofrontality — a temporary reduction in
dorsolateral prefrontal cortex activity — which allows trained pattern
recognition to operate without the interference of conscious monitoring.
*First appears: Chapter 4.*

---

**Glucocorticoids**
A class of steroid hormones, produced by the adrenal cortex, that regulate
the body's stress response. Cortisol is the primary human glucocorticoid.
Glucocorticoids influence metabolism, immune function, and, critically,
the activity of the HPA axis. Epigenetic modifications to glucocorticoid
receptor genes are one of the proposed mechanisms by which stress
responses are inherited across generations.
*First appears: Chapter 3.*

---

**HPA Axis (Hypothalamic-Pituitary-Adrenal Axis)**
The body's primary stress-response system, comprising the hypothalamus,
pituitary gland, and adrenal glands. When the brain registers a threat,
the HPA axis activates a hormonal cascade that culminates in the release
of cortisol. Chronic activation of the HPA axis, and the epigenetic
modifications this produces, is a proposed mechanism for the
transgenerational transmission of trauma responses.
*First appears: Chapter 3.*

---

**Oxytocin**
A neuropeptide produced by the hypothalamus and released by the pituitary
gland, involved in social bonding, trust, and childbirth. Often
inaccurately described as the "love hormone," oxytocin more precisely
functions as a social salience signal — it increases in-group affiliation
and trust while simultaneously intensifying out-group wariness and
exclusion. Its role in tribal dynamics is as significant as its role
in bonding.
*First appears: Chapter 4.*

---

**Psychological Safety**
A team-level belief — shared among members — that interpersonal risk-taking
is safe: that speaking up, admitting error, or challenging authority will
not result in punishment or humiliation. Defined and validated by
organisational psychologist Amy Edmondson. Psychological safety is distinct
from comfort or the absence of accountability; the highest-performing teams
combine high psychological safety with high performance standards.
*First appears: Chapter 5.*

---

**Recognition-Primed Decision (RPD) Model**
A model of expert decision-making developed by Gary Klein, based on
naturalistic research with firefighters, military commanders, and other
high-stakes practitioners. In the RPD model, experts identify a course of
action through rapid situation recognition and mental simulation, rather
than through the generation and comparison of multiple options. The model
requires deep domain experience and functions best in high-validity
environments with regular patterns and immediate feedback.
*First appears: Chapter 3.*

---

**Somatic Marker**
A bodily state — physiological tension, warmth, nausea, a quickening of
the heartbeat — that has been learned through experience and linked to a
category of outcome. When a similar situation recurs, the brain rapidly
retrieves the associated somatic state as an evaluative signal, guiding
decision-making before conscious deliberation begins. The Somatic Marker
Hypothesis was developed by Antonio Damasio to explain the decision-making
deficits observed in patients with ventromedial prefrontal cortex damage.
*First appears: Chapter 2.*

---

**Transient Hypofrontality**
A temporary reduction in dorsolateral prefrontal cortex (dlPFC) activity
that occurs during states of intense physical and creative absorption.
The reduced dlPFC activity quiets the inner critic and self-monitoring
function, allowing trained, automatic pattern recognition to operate with
reduced conscious interference. Proposed by neuroscientist Arne Dietrich
as the neural mechanism underlying flow states.
*First appears: Chapter 4.*

---

**vmPFC (Ventromedial Prefrontal Cortex)**
A region of the prefrontal cortex, located at the base and inner surface
of the frontal lobe, that integrates somatic signals with decision-relevant
information. Damage to the vmPFC — as in the cases of Phineas Gage and
the patient known as EVR — impairs the ability to generate somatic markers,
resulting in profound decision-making deficits despite intact intelligence
and analytical capacity. Central to Antonio Damasio's Somatic Marker
Hypothesis.
*First appears: Chapter 2.*

---

## Section BM-4: Recommended Reading

**Format:** A curated list of books for readers who want to go further.
No annotations. The agent must generate the list exactly as follows:

```
RECOMMENDED READING

Bechara, Antoine, Hanna Damasio, Daniel Tranel, and Antonio Damasio.
  "Deciding Advantageously Before Knowing the Advantageous Strategy."
  Science, 1997.

Csikszentmihalyi, Mihaly. Flow: The Psychology of Optimal Experience.
  Harper & Row, 1990.

Damasio, Antonio. Descartes' Error: Emotion, Reason, and the Human Brain.
  Putnam, 1994.

Damasio, Antonio. The Feeling of What Happens: Body and Emotion in the
  Making of Consciousness. Harcourt, 1999.

Edmondson, Amy. The Fearless Organization: Creating Psychological Safety
  in the Workplace for Learning, Innovation, and Growth. Wiley, 2018.

Kahneman, Daniel. Thinking, Fast and Slow. Farrar, Straus and Giroux, 2011.

Klein, Gary. Sources of Power: How People Make Decisions.
  MIT Press, 1998.

Klein, Gary, and Daniel Kahneman. "Conditions for Intuitive Expertise:
  A Failure to Disagree." American Psychologist, 2009.

Porges, Stephen. The Polyvagal Theory: Neurophysiological Foundations
  of Emotions, Attachment, Communication, and Self-Regulation. Norton, 2011.
```

**Agent instruction:** Do not annotate these entries. Do not add
commentary or description. The reader's job is to explore these texts
on their own terms. Present them as a list and nothing more.

---

*End of front_and_back_matter.md. Version 1.0.*
*All front and back matter agents must use this file as their
primary instruction source. Cross-reference: system_rules.md
for voice and formatting standards.*
