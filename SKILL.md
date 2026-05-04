---
name: constraint-enumeration
description: Use this skill when the user's prompt implies a real-world action or decision with multiple constraints — especially when one constraint is foregrounded (optimization criteria like fastest/cheapest/easiest/best) and another is implicit (goal-state requirements like "the X must end up at Y"). Forces explicit enumeration of all constraints before answering to prevent conjunction collapse — a failure mode where the model satisfies the foregrounded constraint fluently and silently drops the others. Trigger on "should I" decision questions, optimization framings, multi-process coordination, scheduling, errand stacking, pricing/negotiation, and any prompt where world-knowledge constraints might be implicit.
---

# Constraint Enumeration

## When to invoke

Trigger this skill when ANY of the following are true about the user's prompt:

- The prompt involves a real-world action or decision (not pure information retrieval).
- The prompt foregrounds an optimization (fastest / cheapest / easiest / best / most efficient).
- The prompt implies a goal state that must hold at the end (an object must end up at a location, a person must arrive at an event, a system must be in state X).
- The prompt involves coordination of two or more processes or agents (cooking multiple dishes, running multiple errands, scheduling parallel tasks).
- The prompt contains "should I" plus a comparison of options.
- The prompt is in a domain where decisions have second-order effects (pricing, negotiation, hiring, allocation).

**Don't trigger when:**

- The prompt is a purely informational lookup ("what year was the Eiffel Tower built", "who wrote Hamlet").
- The prompt has only one operative constraint and no implicit goal state ("what's the fastest 0–60 sedan under $40k").
- The prompt is trivia-style or hypothetical where constraint collapse can't occur ("should I learn Rust or Go" — a preference question, not a coordinated action with a hidden conjunction).

If unsure, invoke. The cost of enumeration is cheap. The cost of conjunction collapse is a wrong answer delivered confidently.

## What to do

Before producing any answer:

1. **Enumerate constraints explicitly.** List every requirement the prompt implies. Separate them into three buckets:
   - **Optimization criteria** — what is being minimized or maximized.
   - **Goal-state requirements** — what must be true at the end of the action.
   - **Implicit world-knowledge constraints** — physical, social, temporal, or domain facts the user is taking for granted.

   For each constraint, mark it as **hard** (must be satisfied — violation means the answer is wrong) or **soft** (a preference or weight). When two hard constraints conflict, surface the tradeoff to the user instead of silently picking one. When soft constraints conflict, make the default assumption explicit ("assuming cost matters more than speed here — say if not").

   Stop enumerating once additional constraints would no longer change which candidate you'd select. The point is to cover the discriminating constraints, not to be exhaustive.

2. **State the conjunction.** Write out: "The answer must satisfy ALL of: [list]. Satisfying only [foregrounded criterion] is not sufficient."

3. **Evaluate candidate answers against the full set.** For each plausible answer, check whether it satisfies every constraint. If a candidate satisfies the optimization but violates a goal-state requirement, reject it. If evaluation surfaces a constraint you didn't capture in step 1, loop back and re-enumerate before concluding — don't paper over it.

4. **Surface the dropped constraint when it matters.** If the constraint that would have been dropped is non-obvious, or the user is walking through a reasoning trace and benefits from seeing the work, briefly name it. Skip this when the constraint is obvious from context — don't surface it mechanically on every invocation.

5. **Then answer.** Lead with the recommendation. Keep enumeration visible but compact.

## Failure mode this prevents

**Conjunction collapse:** The model collapses a multi-constraint problem into a single-constraint optimization. It satisfies the foregrounded constraint fluently and silently drops the others. The output looks plausible and confident but is globally wrong.

Canonical example: *"I need to wash my car. The car wash is 50m away. Should I walk or drive?"* A model that drops the conjunction optimizes "fastest way to traverse 50m" (walking) and loses the constraint that the car must physically end up at the car wash. Correct answer: drive, because walking satisfies the optimization but violates the goal state.

Conflicting-constraint example: *"I need this feature shipped by Friday. Should I use the new framework or the one we already know?"* Hard constraint: ships by Friday. Soft constraint: long-term maintainability favors the new framework. These conflict. The right move isn't to silently pick — it's to name the tradeoff: "If Friday is firm, use the known framework; the new one risks the deadline for a maintainability win that pays back later. Is the date hard?" Surfacing the conflict lets the user resolve it; collapsing it picks for them.

## Conjunction-collapse-prone prompt patterns

- **Scheduling**: "When should I start the sauce?" (drops parallel-completion with pasta)
- **Errand stacking**: "What's the closest coffee shop to my house?" in errand context (drops path-not-origin)
- **Pricing**: "What discount closes this deal?" (drops renewal precedent, rep comp, portfolio signaling)
- **Routing with passengers**: "Highway or surface streets?" with carsick passenger context (drops comfort)
- **Engineering**: "How do I optimize this query?" when correctness is the real issue (drops correctness for speed)
- **Hiring**: "Best candidate for the role?" (drops team fit, ramp time, comp band)
- **Investment**: "Highest expected return?" (drops risk tolerance, liquidity, tax treatment)

## What NOT to do

- Do NOT enumerate constraints for purely informational queries ("what year was the Eiffel Tower built").
- Do NOT enumerate for genuinely single-objective tasks ("translate this to Spanish").
- Do NOT pad enumeration with irrelevant constraints to look thorough. Only list constraints the prompt actually implies.
- Do NOT enumerate and then ignore. The enumeration must drive the final answer. If your conclusion contradicts your enumeration, the enumeration was wrong or the conclusion is.
- Do NOT use this as a delay tactic. The point is correctness, not theater.

## Output format

```
Constraints:
- [Optimization]: ...
- [Goal-state]: ...
- [Implicit]: ...

Conjunction check: [which candidate would drop which constraint]

Recommendation: [direct answer]
```
