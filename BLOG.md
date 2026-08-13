# How Far Is SL5, Really?

Almost everyone in AI security agrees that protecting model weights from a top-tier state
intelligence service is very hard, and almost nobody says how hard, in what units, or by when. That
is an awkward thing to leave undefined, because the answer determines whether a lab should be
starting a four-year construction project this year.

So: how much would it cost, and how long would it take, to make an AI lab's model weights genuinely
hard for a state intelligence service to steal? I could not find that written down anywhere, which
is how I ended up building something to estimate it.

🔗 **[SL5 Explorable →](https://nitzpo.github.io/sl5/)** · 📖 **[Or start with the 5-minute
introduction →](https://nitzpo.github.io/sl5/intro/)**

There is a security standard for AI labs, called SL5, that describes what holding off that kind of
attacker would involve, and it comes with a 1-to-5 scale. The short version of what I found: a lab
that starts early, spends about $2.6 billion, chooses sensibly and finishes what it starts reaches
roughly 3.5 on that scale by 2030, with an insider-driven attack path still succeeding about once in
six. That is the best of the four scenarios in the tool, and the other three are more instructive.

## Where this came from

I led security architecture at a government organization running a large number of highly
operational, highly secured networks. Each had its own operational requirements and its own threat
model, and all of them faced state-level adversaries or better.

Two things about that work are relevant here. The first is that knowing which controls exist was
never the easy part. The knowledge existed, scattered, but not organized into anything practical or
standardized, so a lot of what we used we worked out ourselves, with some very good people and a
set of peers to compare notes with. The second is that these controls are hard to implement and
harder to reason about together. You can justify each one on its own and still not be able to say
whether the resulting set forms a coherent architecture or a list of individually sensible
decisions. With limited resources, the question was always which ones to implement, and when.

RAND's report and the SL5 Standard took knowledge that existed in scattered form and turned it into
a catalog the field can argue from, in the open. Having it in that form is what makes something like
this buildable at all.

What it leaves open is the second problem. A catalog of 47 measures, each with a cost range, a lead
time, dependencies and an effectiveness that shifts over time, is not something you can hold in your
head. You cannot read it and see what a particular selection of 30 of them amounts to in 2030, or
what being two years late costs.

I started working on this after the AI Security Bootcamp in Singapore in April 2026, without a
clear idea of what it would become. Initially I wanted to see the whole catalog at once and watch
how the standard behaved rather than just read it, and to find out whether any of what I knew from
my own work applied here. Some of it did not. The scoring, the scenarios and most of what the tool
now says came later, as the questions got sharper. What it does now: you assemble a posture from the
blocks, set your assumptions about budget, AI progress, adversary capability and how much help you
get from government and vendors, and watch the breach probability and the security level respond. It
runs in the browser, with nothing to install.

## What the standard is measuring

The weights are the model. Not a description of it or a recipe for building it, but the working
artifact. A copy gives you the capability without the training run that produced it, and without
whatever guardrails were applied in the serving layer, since those are not in the file.

The standard rates attackers from OC1 to OC5. OC5 is a top-tier state intelligence service willing
to spend years and on the order of a billion dollars on one target. The steps between tiers are
qualitative rather than budgetary, so a defense that comfortably handles OC3 can fail completely
against OC4. Defenses are rated on a matching 1-to-5 scale, and SL5 means holding against OC5. Most
labs today are some way below SL4.

Two things then work against each other. Defenses take time to stand up: about a third of the
catalog needs three years or more, including secure facility construction, hardware root-of-trust,
chip-level tamper protection and custom silicon, and the median item takes two years. And they do
not all age the same way. As attackers get better at using AI, hard stops like air gaps, encryption
and memory isolation mostly keep working, while monitoring, vetting and human review get steadily
less effective. Structural controls hold their value better without being absolute.

One thing the tool does not do is start you from nothing. Labs already run some of these controls,
so the map opens on a researched starting posture of about 1.4 rather than a bare field, and it
grows over time: a scenario set in 2024 begins with fifteen controls partly in place, one set in
2026 with twenty-one. Everything below is measured against that floor rather than against zero.

## Four programs

The **proactive program** starts in 2024, spends about $2.6 billion of a $2.8 billion budget, begins
the long-lead items immediately and matures all 33 of its programs. It reaches 3.5. Its remaining
risk is not spread thinly across everything it skipped; it sits almost entirely in the personnel
category. One attack path in the model is made entirely of personnel failures, and two of the four
controls that stop it were left out on purpose: the plan implements insider monitoring and
post-employment restrictions but skips two-person control and background vetting. Closing all four
brings the breach probability down sharply.

Over half of that budget is one line item: the building. Not the datacenter itself — a lab builds
that regardless — but the premium for constructing the 50–100MW enclave that holds the weights to
classified standards, and shielding it, over what a commercial build costs. That premium alone runs
more than every other control in the program put together — and it is the number I got most wrong
the first time. I had priced it as a room when the thing being described is a facility, which
understated that one line four or five times over and roughly doubled the whole program.

The **reactive program** waits for incidents. A network probe, an insider scare, a breach attempt,
and each time it responds correctly and starts the appropriate project several years after it needed
to. The air gap begins in 2026 and is not operational until mid-2028. The AI-specific controls
begin in 2028 and never finish. It ends around 2 against the proactive program's 3.5, having spent
$1.7 billion — about two-thirds as much for a little over half the result. The difficulty is rarely
the money. It is that each of these controls is genuinely hard to stand up, that a collection of
them does not automatically become a coherent whole, and that a facility started in 2026 is not
finished by 2030 no matter what it cost.

The **constrained program** has $200 million and spends it sensibly: highest-impact items first,
prerequisites funded, nothing stranded half-built. Its breach probability falls for about two years,
bottoms out around the halfway mark, and then creeps back up for the rest of the decade. That was
the result I did not expect. At that budget the only affordable controls are the ones that erode, so
after the initial gains the program is adding monitoring and vetting at roughly the rate improving
attackers devalue them. Every structural defense that would have held is out of reach at that cap.

The **do-nothing** scenario is not a flat line either, and that is the point of including it. For
the first two years it actually improves without anyone deciding anything, as controls the labs had
already started keep arriving. The last of those lands in 2026, and the rest of the decade is a
slow slide: by 2030 the same posture is meaningfully more exposed than at its best, purely because
the attackers improved.

## On urgency

Everyone working in AI says the window is closing, which has made the claim close to worthless. It
usually turns out to support a conclusion the writer had already reached, and there is rarely a way
for the reader to check it.

I would rather not argue about timelines. What the tool makes concrete is narrower and duller: a
secure facility takes up to four years to build and accredit, and a custom accelerator can take
longer still, so what a lab has in place in 2030 is mostly determined by what it starts in the next
year or two. That holds whatever you believe about how fast AI improves. The reactive scenario
says the same thing from the other end, where every individual decision is correct, all of them
are late, and the money spent does not buy the time back.

## Who it is for

Policy people, to see what a state-scale defensive program achieves and where more money stops
helping. Lab security leads, to argue about what to implement and when against a fixed cap.
Researchers and red-teamers, to disagree with it specifically, by adding the attack path they think
is missing and seeing what it does to the numbers.

Two things it is not. It will not tell you what your organization should implement, because the
numbers are a model for developing intuition rather than figures you would take into a budget
meeting. And it is not a scorecard for any real lab.

Some of the numbers came from AI and some are my own judgment. None were ever meant to be
authoritative, and I would rather have them corrected than defended. It is [MIT licensed and on
GitHub](https://github.com/nitzpo/sl5), the block data and attack paths are JSON with published
schemas, and the scoring is documented and tested, so disagreeing with a specific number is usually
a one-file change. The repository also keeps a list of what the model does not do yet.

I went back over all of it recently against public sources, and the exercise was worth the
embarrassment. Three entries claimed no lab had deployed something a lab had publicly described
deploying. The performance overhead of confidential computing was overstated several times over, in
the direction that made it look harder than it is. Two entries were the same control counted
twice. And the facility, the single largest line in the whole model, had been priced as a room.
Most of the corrections made the picture *better* than the version I had been carrying around,
which is a useful reminder that a model drifts pessimistic as easily as optimistic once you stop
checking it.

The finding that survived all of that is the one at the top, and it survived its largest line item
multiplying in price without moving: an early, serious, well-funded and well-executed program gets
to somewhere around 3.5. Anything more realistic does noticeably worse, and the cheap version does
not merely fall short of the expensive one; after an initial improvement it starts losing ground.

🔗 **[Try it →](https://nitzpo.github.io/sl5/)** · 📖
**[Introduction →](https://nitzpo.github.io/sl5/intro/)**

<!-- ============================================================
OPTIONAL SECTION. Self-contained: to include the mechanics, paste
everything between the BEGIN/END markers below directly above the
"## Who it is for" heading. To leave it out, delete this block.
The post reads correctly either way.
============================================================ -->

<!-- BEGIN OPTIONAL: mechanics -->

## How the numbers work

Two decisions in the engine are worth describing, because they are what make the unexpected results
believable rather than suspicious.

Improving a defense can never make the outcome worse. An attack path's probability is a product of
terms representing the chance of getting past each defense, and those terms fall as a defense
matures. Underneath sits a floor representing the insider nobody catches and the vulnerability
nobody finds. That monotonic behavior is asserted in the test suite, so when the constrained
program gets worse over time, it is coming from the assumptions rather than from an error in the
arithmetic.

No control is worth the whole of what its name suggests. This came from watching the introduction's
practice exercise teach the wrong lesson: the air gap was the best single choice at every budget I
tried, which told players that one structural decision is most of security. It is not. An air gap
stops remote exploitation immediately, but if there is no sanctioned way to move data across it then
people carry drives, and if the management interface is still reachable then there is still a route
in. So 20 blocks now name companion measures that complete them. The air gap on its own counts for a
little over half of an air gap, and data diodes, hardware-enforced bandwidth caps and taking remote
management off the box account for the rest. Nothing is blocked or capped by this; the control is simply not priced
as more than it is.

<!-- END OPTIONAL: mechanics -->
