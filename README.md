# constraint-enumeration-eval

**What is conjunction collapse?**

LLMs consistently fail multi-constraint problems by collapsing them to a single constraint. Classic example: *"I need to wash my car. The car wash is 50m away. Should I walk or drive?"* A model optimizing "fastest way to cover 50m" says walk — and silently drops the constraint that the car must end up at the car wash. The correct answer is drive. This failure mode — satisfying the foregrounded criterion while losing the implicit goal state — is conjunction collapse.

It shows up everywhere: scheduling ("when should I start the sauce?"), errand stacking, pricing negotiations, routing with constraints, hiring decisions. The model's output looks fluent and confident. It's wrong.

**SKILL.md — the fix**

`SKILL.md` at the root of this repo is a portable prompting skill. Drop it into any Claude context (Claude Code `~/.claude/skills/`, a Claude Project, or any system prompt) and it forces the model to:

1. Enumerate all constraints explicitly before answering — optimization criteria, goal-state requirements, and implicit world-knowledge constraints
2. State the conjunction: the answer must satisfy ALL of them, not just the foregrounded one
3. Evaluate candidates against the full set and name which constraint would have been silently dropped

**`/eval` — the test harness**

`/eval` is a Next.js app that scores the skill against HOB-pattern test cases: multi-constraint scenarios with known ground-truth answers. It calls Claude with and without the skill loaded and measures accuracy on cases where conjunction collapse is the expected failure mode.

See [`eval/README.md`](eval/README.md) for setup and how to run it.

**Quick install**

```bash
# Claude Code
cp SKILL.md ~/.claude/skills/constraint-enumeration/SKILL.md

# Run the eval
cd eval && npm install && npm run dev
```
