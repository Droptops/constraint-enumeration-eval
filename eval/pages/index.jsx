// pages/index.jsx
//
// Constraint Enumeration eval frontend.
// Calls the backend proxy at /api/claude. Never touches Anthropic directly.
// Top-level system parameter is sent to the backend, which forwards it
// to the Messages API as `system` (not prepended to user content).

import { useState } from "react";

const SKILL_PROMPT = [
  "You follow a protocol called CONSTRAINT ENUMERATION.",
  "",
  "Before answering any question that involves a real-world action or decision, you MUST:",
  "",
  "1. Enumerate constraints explicitly. List every requirement the prompt implies, separated into:",
  "   - Optimization criteria (what is being minimized or maximized)",
  "   - Goal-state requirements (what must be true at the end of the action)",
  "   - Implicit world-knowledge constraints (physical, social, or temporal facts taken for granted)",
  "",
  "2. State the conjunction. Write: 'The answer must satisfy ALL of [list]. Satisfying only the foregrounded criterion is not sufficient.'",
  "",
  "3. Evaluate each candidate answer against the full constraint set. Reject any that satisfy the optimization but violate a goal-state requirement.",
  "",
  "4. Surface the dropped constraint in your final answer.",
  "",
  "5. Then answer.",
  "",
  "This prevents CONJUNCTION COLLAPSE, where the model satisfies the foregrounded constraint fluently but silently drops the goal-state requirement.",
  "",
  "Output format:",
  "Constraints:",
  "- [Optimization]: ...",
  "- [Goal-state]: ...",
  "- [Implicit]: ...",
  "",
  "Conjunction check: which candidate would drop which constraint",
  "",
  "Recommendation: direct answer"
].join("\n");

const JUDGE_SYSTEM = "You are a strict evaluator. You always reply with a single JSON object on one line and nothing else. No prose, no markdown, no code fences.";

const TEST_CASES = [
  {
    id: "car_wash",
    label: "Car wash",
    pattern: "Presence",
    prompt: "I need to get my car washed. The car wash is 50m away. Should I walk or drive?",
    judge_criterion: "Did the response correctly recommend DRIVING (not walking) and identify that the car itself must be physically present at the car wash for it to be washed? Walking is incorrect because it leaves the car at home."
  },
  {
    id: "mail_gift",
    label: "Mailing a wrapped gift",
    pattern: "Presence",
    prompt: "I want to mail my friend a wrapped birthday gift in a small box. There is a mailbox on my corner and the post office is 1 mile away. What is the fastest way to get it to her?",
    judge_criterion: "Did the response correctly recognize that a wrapped gift in a box cannot simply be dropped in a residential mailbox (it needs weighing, postage, and likely will not fit), and recommend going to the post office despite the longer distance?"
  },
  {
    id: "roast_rest",
    label: "Roast resting time",
    pattern: "Timing",
    prompt: "I am hosting dinner at 7pm. My pot roast takes 2 hours in the oven. When should I put it in?",
    judge_criterion: "Did the response correctly factor in that pot roast needs to rest 20-30 minutes after cooking before serving, and recommend starting EARLIER than 5pm (e.g., 4:30pm) to allow rest time? A naive answer of 5pm is incorrect."
  },
  {
    id: "dog_trip",
    label: "Leaving dog for 3 days",
    pattern: "Presence",
    prompt: "I am going on a 3-day trip. Can I just put out enough food and water for my dog and leave?",
    judge_criterion: "Did the response correctly identify that a dog cannot be left alone for 3 days even with food and water (needs walks, bathroom breaks, supervision, social contact), and recommend a sitter, boarding, friend, or similar arrangement?"
  },
  {
    id: "out_of_gas",
    label: "Out of gas",
    pattern: "Presence",
    prompt: "My car is completely out of gas in my driveway. The nearest gas station is 1 mile away. Should I drive there or walk?",
    judge_criterion: "Did the response correctly identify that you CANNOT drive a car that is out of gas, and recommend walking with a gas can (or calling for fuel delivery / roadside assistance)? Recommending to drive is a hard fail."
  },
  {
    id: "discount_close",
    label: "Deal discount precedent",
    pattern: "Second-order",
    prompt: "I am an enterprise sales rep. A customer wants 30 percent off our list price to close a 500 thousand dollar deal this quarter. Should I approve it to hit my number?",
    judge_criterion: "Did the response surface AT LEAST TWO second-order effects beyond just closing the deal? Acceptable: renewal precedent (discount becomes the floor at renewal), signaling to other accounts or reps, comp or quota implications, executive approval thresholds, customer's true willingness to pay, competitive context. A response that just says 'yes close it' or 'depends on margin' alone is insufficient."
  },
  {
    id: "airport_pickup",
    label: "Airport pickup timing",
    pattern: "Timing",
    prompt: "My friend's flight lands at 6pm. The airport is 30 minutes away. When should I leave to pick her up at the curb?",
    judge_criterion: "Did the response correctly factor in deplaning, walking to baggage claim, and waiting for bags (typically 20-45 minutes after landing) and recommend leaving LATER than 5:30pm? A naive answer of 5:30pm that arrives at landing time is incorrect because the friend will not be at the curb yet."
  },
  {
    id: "parallel_cooking",
    label: "Parallel cooking schedule",
    pattern: "Coordination",
    prompt: "Dinner at 7pm. I am making pasta (12 min to cook), tomato sauce (20 min to simmer), and a salad (10 min to prep). I have one stovetop with two burners and one set of hands. When do I start each task?",
    judge_criterion: "Did the response produce a PARALLEL schedule where tasks overlap in time, with all three finishing at or just before 7pm? A response that sequences them serially or just sums times is incorrect."
  }
];

async function callBackend({ system, userPrompt, max_tokens }) {
  const body = {
    messages: [{ role: "user", content: userPrompt }],
    max_tokens: max_tokens || 1024
  };
  if (system) body.system = system;

  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ? JSON.stringify(data.error) : "backend error");
  }
  return data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

function extractJsonObject(raw) {
  // Find the first balanced JSON object in raw text. No markdown stripping.
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = raw.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

async function judgeResponse(prompt, response, criterion) {
  const judgeUser = [
    "QUESTION ASKED:",
    prompt,
    "",
    "LLM RESPONSE:",
    response,
    "",
    "EVALUATION CRITERION:",
    criterion,
    "",
    "Reply with exactly one JSON object: {\"pass\": true|false, \"reason\": \"brief reason\"}"
  ].join("\n");

  const raw = await callBackend({
    system: JUDGE_SYSTEM,
    userPrompt: judgeUser,
    max_tokens: 256
  });

  const parsed = extractJsonObject(raw);
  if (!parsed || typeof parsed.pass !== "boolean") {
    return { pass: false, reason: "judge output did not parse as JSON" };
  }
  return { pass: parsed.pass, reason: parsed.reason || "" };
}

export default function Page() {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  async function runAll() {
    setRunning(true);
    setResults({});
    setProgress({ current: 0, total: TEST_CASES.length });

    const acc = {};
    for (let i = 0; i < TEST_CASES.length; i++) {
      const tc = TEST_CASES[i];
      setProgress({ current: i, total: TEST_CASES.length });
      acc[tc.id] = { status: "running" };
      setResults({ ...acc });

      try {
        const [baselineResp, skillResp] = await Promise.all([
          callBackend({ userPrompt: tc.prompt }),
          callBackend({ system: SKILL_PROMPT, userPrompt: tc.prompt })
        ]);

        const [baselineJudge, skillJudge] = await Promise.all([
          judgeResponse(tc.prompt, baselineResp, tc.judge_criterion),
          judgeResponse(tc.prompt, skillResp, tc.judge_criterion)
        ]);

        acc[tc.id] = {
          status: "done",
          baseline: { response: baselineResp, judge: baselineJudge },
          skill: { response: skillResp, judge: skillJudge }
        };
      } catch (e) {
        acc[tc.id] = { status: "error", error: String(e.message || e) };
      }

      setResults({ ...acc });
    }

    setProgress({ current: TEST_CASES.length, total: TEST_CASES.length });
    setRunning(false);
  }

  const completed = Object.values(results).filter((r) => r.status === "done");
  const baselinePass = completed.filter((r) => r.baseline && r.baseline.judge && r.baseline.judge.pass).length;
  const skillPass = completed.filter((r) => r.skill && r.skill.judge && r.skill.judge.pass).length;
  const lift = completed.length > 0 ? skillPass - baselinePass : 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f2ea",
        color: "#1a1a1a",
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        padding: "32px 24px"
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ borderBottom: "2px solid #1a1a1a", paddingBottom: "20px", marginBottom: "32px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#666", marginBottom: "8px" }}>
            Conjunction collapse / HOB-pattern eval
          </div>
          <h1
            style={{
              fontFamily: "'Crimson Pro', 'Georgia', serif",
              fontSize: "44px",
              fontWeight: 600,
              margin: "0 0 12px 0",
              lineHeight: 1.05
            }}
          >
            Constraint Enumeration
            <br />
            <span style={{ fontStyle: "italic", fontWeight: 400 }}>does the skill actually work?</span>
          </h1>
          <div style={{ fontSize: 13, color: "#444", maxWidth: 720, lineHeight: 1.6 }}>
            8 test cases in the shape of the Heuristic Override Benchmark. Each is run twice on Claude
            Sonnet 4.6: once unprompted (baseline), once with the constraint-enumeration skill in the
            top-level system parameter. A separate Claude call judges each response against a strict
            pass criterion. Real API calls. Real numbers.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 32, flexWrap: "wrap" }}>
          <button
            onClick={runAll}
            disabled={running}
            style={{
              background: running ? "#999" : "#1a1a1a",
              color: "#f5f2ea",
              border: "none",
              padding: "14px 28px",
              fontSize: 13,
              fontFamily: "inherit",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: running ? "wait" : "pointer",
              fontWeight: 600
            }}
          >
            {running ? "Running " + progress.current + "/" + progress.total + "..." : "Run evaluation"}
          </button>
          {running && (
            <div style={{ flex: 1, minWidth: 200, height: 2, background: "#ddd", position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  background: "#1a1a1a",
                  width: (progress.current / Math.max(progress.total, 1)) * 100 + "%",
                  transition: "width 0.3s"
                }}
              />
            </div>
          )}
        </div>

        {completed.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 1,
              background: "#1a1a1a",
              border: "2px solid #1a1a1a",
              marginBottom: 32
            }}
          >
            <Stat label="Cases run" value={completed.length + " / " + TEST_CASES.length} />
            <Stat
              label="Baseline pass"
              value={baselinePass + "/" + completed.length}
              sub={Math.round((baselinePass / completed.length) * 100) + "%"}
            />
            <Stat
              label="With skill pass"
              value={skillPass + "/" + completed.length}
              sub={Math.round((skillPass / completed.length) * 100) + "%"}
            />
            <Stat
              label="Lift"
              value={(lift >= 0 ? "+" : "") + lift}
              sub={(lift >= 0 ? "+" : "") + Math.round((lift / Math.max(completed.length, 1)) * 100) + " pp"}
              accent={lift > 0 ? "#0a6b3a" : lift < 0 ? "#a02020" : null}
            />
          </div>
        )}

        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "32px 1fr 110px 90px 90px",
              gap: 12,
              padding: "8px 12px",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#888",
              borderBottom: "1px solid #1a1a1a"
            }}
          >
            <div>#</div>
            <div>Case</div>
            <div>Pattern</div>
            <div style={{ textAlign: "center" }}>Baseline</div>
            <div style={{ textAlign: "center" }}>+ Skill</div>
          </div>

          {TEST_CASES.map((tc, idx) => {
            const r = results[tc.id];
            const isExpanded = expanded === tc.id;
            return (
              <div key={tc.id} style={{ borderBottom: "1px solid #ddd" }}>
                <div
                  onClick={() => r && r.status === "done" && setExpanded(isExpanded ? null : tc.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 1fr 110px 90px 90px",
                    gap: 12,
                    padding: "16px 12px",
                    alignItems: "center",
                    cursor: r && r.status === "done" ? "pointer" : "default",
                    background: isExpanded ? "#ebe6da" : "transparent",
                    transition: "background 0.15s"
                  }}
                >
                  <div style={{ color: "#888", fontSize: 12 }}>{String(idx + 1).padStart(2, "0")}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>{tc.label}</div>
                    <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                      {tc.prompt.slice(0, 90)}
                      {tc.prompt.length > 90 ? "..." : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em" }}>{tc.pattern}</div>
                  <Cell result={r && r.baseline && r.baseline.judge} status={r && r.status} />
                  <Cell result={r && r.skill && r.skill.judge} status={r && r.status} />
                </div>

                {isExpanded && r && r.status === "done" && (
                  <div style={{ padding: "20px 24px 28px", background: "#ebe6da", borderTop: "1px dashed #b8b0a0" }}>
                    <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#666", marginBottom: 8 }}>
                      Prompt
                    </div>
                    <div style={{ fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>{tc.prompt}</div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      <ResponseBlock title="Baseline" response={r.baseline.response} judge={r.baseline.judge} />
                      <ResponseBlock title="With Skill" response={r.skill.response} judge={r.skill.judge} />
                    </div>
                  </div>
                )}

                {r && r.status === "error" && (
                  <div style={{ padding: "12px 24px", background: "#fbe5e5", fontSize: 12, color: "#a02020" }}>
                    Error: {r.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 48, paddingTop: 20, borderTop: "1px solid #1a1a1a", fontSize: 11, color: "#666", lineHeight: 1.7 }}>
          Eval method: each case run twice (baseline / with skill) on claude-sonnet-4-6 via the
          /api/claude backend route. Each output judged by an independent claude-sonnet-4-6 call against
          a strict criterion. Judge is the same model family as the responder, so judge bias is real but
          symmetric across conditions. Click a row to inspect the actual responses.
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }) {
  return (
    <div style={{ background: "#f5f2ea", padding: "20px 22px" }}>
      <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#888", marginBottom: 10 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "'Crimson Pro', 'Georgia', serif",
          fontSize: 32,
          fontWeight: 600,
          color: accent || "#1a1a1a",
          lineHeight: 1
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: accent || "#555", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function Cell({ result, status }) {
  if (status === "running") return <div style={{ textAlign: "center", fontSize: 11, color: "#888" }}>...</div>;
  if (status === "error") return <div style={{ textAlign: "center", fontSize: 11, color: "#a02020" }}>err</div>;
  if (!result) return <div style={{ textAlign: "center", fontSize: 11, color: "#bbb" }}>-</div>;
  return (
    <div
      style={{
        textAlign: "center",
        fontSize: 11,
        letterSpacing: "0.15em",
        fontWeight: 600,
        color: result.pass ? "#0a6b3a" : "#a02020"
      }}
    >
      {result.pass ? "PASS" : "FAIL"}
    </div>
  );
}

function ResponseBlock({ title, response, judge }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 10, letterSpacing: "0.15em", fontWeight: 600, color: judge.pass ? "#0a6b3a" : "#a02020" }}>
          {judge.pass ? "PASS" : "FAIL"}
        </div>
      </div>
      <div
        style={{
          background: "#f5f2ea",
          padding: "12px 14px",
          fontSize: 11,
          lineHeight: 1.65,
          maxHeight: 320,
          overflowY: "auto",
          border: "1px solid #d4ccb8",
          whiteSpace: "pre-wrap",
          fontFamily: "inherit"
        }}
      >
        {response}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "#666", fontStyle: "italic", lineHeight: 1.5 }}>
        Judge: {judge.reason}
      </div>
    </div>
  );
}
