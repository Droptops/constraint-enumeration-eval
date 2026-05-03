# Constraint Enumeration Eval

Tests whether a "constraint enumeration" skill (forces explicit conjunction-checking
before answering) actually improves Claude's accuracy on Heuristic Override Benchmark
(HOB) shaped test cases. Real API calls, LLM-judge scoring.

## Run locally

```
npm install
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env.local
npm run dev
```

Then visit http://localhost:3000 and click "Run evaluation".

## Run on Vercel

```
vercel
vercel env add ANTHROPIC_API_KEY
vercel --prod
```

## Notes on the architecture

- **API key never reaches the browser.** All Anthropic calls go through
  `/api/claude` (a Next.js API route). The browser only talks to that route.
- **Required headers set explicitly:** `x-api-key`, `anthropic-version: 2023-06-01`,
  `content-type: application/json`.
- **System prompt is sent at the top level**, not prepended to the user message.
  This matches the Messages API contract and is what determines whether the model
  treats the skill as a system instruction vs. a user-supplied note.
- **Model pinned to `claude-sonnet-4-6`.** The previous Sonnet 4.0 identifier
  (`claude-sonnet-4-20250514` / `claude-sonnet-4-0`) is being deprecated June 15,
  2026. Update this when newer Sonnets ship.
- **ASCII only.** No smart quotes, em dashes, or non-ASCII characters in source
  files. Keeps shell pipelines, transit layers, and JSON parsing clean.
- **No markdown fences in code.** Judge model is instructed to return raw JSON;
  parser uses balanced-brace extraction rather than fence stripping.

## Eval design

8 test cases across 4 conjunction-collapse patterns:
- **Presence**: object/agent must be physically at a location (car wash, mailing
  a gift, dog supervision, out-of-gas car)
- **Timing**: naive arithmetic misses a buffer (roast resting, airport pickup)
- **Second-order**: foregrounded outcome drops downstream effects (deal discount
  precedent)
- **Coordination**: parallel scheduling collapsed into serial (cooking timing)

Each case is run twice on Sonnet 4.6 (baseline / with skill in `system`), then
scored by a separate Sonnet 4.6 judge call against a strict pass criterion. The
judge being same-family as the responder introduces real bias, but it is
symmetric across conditions, so the **lift** between baseline and skill
conditions remains meaningful even if absolute pass rates are inflated.

## What this is not

- Not statistically significant (n=8). Treat as directional.
- Not the literal HOB dataset (not publicly released as of May 2026). These cases
  follow the same pattern but were constructed independently.
- Not a fair comparison across labs. Single model (Sonnet 4.6) only.

## Extending it

Add cases to `TEST_CASES` in `pages/index.jsx`. Each needs `id`, `label`,
`pattern`, `prompt`, and `judge_criterion`. The criterion is the most important
field: it determines what "pass" means and should be specific enough that the
judge cannot dodge with a generic answer.
