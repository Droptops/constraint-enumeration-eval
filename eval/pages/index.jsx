import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [trials, setTrials] = useState(1);
  const [runId, setRunId] = useState("");
  const [caseResults, setCaseResults] = useState({});
  const [evalResult, setEvalResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedToken = window.localStorage.getItem("eval_admin_token") || "";
    setAdminToken(savedToken);

    fetch("/api/cases")
      .then(response => response.json())
      .then(data => {
        setCases(data.cases || []);
        if (data.cases?.length) setSelectedCaseId(data.cases[0].id);
      })
      .catch(err => setError(err.message));
  }, []);

  useEffect(() => {
    if (adminToken) {
      window.localStorage.setItem("eval_admin_token", adminToken);
    }
  }, [adminToken]);

  const selectedCase = useMemo(
    () => cases.find(testCase => testCase.id === selectedCaseId),
    [cases, selectedCaseId]
  );

  async function callApi(path, body) {
    const headers = { "Content-Type": "application/json" };
    if (adminToken) headers.Authorization = `Bearer ${adminToken}`;

    const response = await fetch(path, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.status}`);
    }

    return data;
  }

  async function runSingle(condition) {
    setLoading(true);
    setError("");

    try {
      const result = await callApi("/api/run-case", {
        caseId: selectedCaseId,
        condition
      });

      setCaseResults(prev => ({
        ...prev,
        [condition]: result
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function runFullEval() {
    setLoading(true);
    setError("");
    setEvalResult(null);

    try {
      const body = { trials };
      if (runId.trim()) body.runId = runId.trim();
      const result = await callApi("/api/run-eval", body);
      setEvalResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <section className="hero">
        <p className="eyebrow">Constraint Enumeration Eval</p>
        <h1>Decision-quality benchmark for premature-answer failures</h1>
        <p className="lede">
          Cases flow through model generation, structured judging, an AND-gate scorer,
          metrics, pairwise blinded judging, and saved run artifacts.
        </p>
      </section>

      <section className="panel grid two">
        <div>
          <label>Admin token</label>
          <input
            value={adminToken}
            onChange={event => setAdminToken(event.target.value)}
            placeholder="EVAL_ADMIN_TOKEN"
            type="password"
          />
        </div>
        <div>
          <label>Case</label>
          <select value={selectedCaseId} onChange={event => setSelectedCaseId(event.target.value)}>
            {cases.map(testCase => (
              <option key={testCase.id} value={testCase.id}>
                {testCase.id} - {testCase.category}
              </option>
            ))}
          </select>
        </div>
      </section>

      {selectedCase && (
        <section className="panel">
          <h2>Selected case</h2>
          <p className="prompt">{selectedCase.prompt}</p>
          <div className="actions">
            <button disabled={loading} onClick={() => runSingle("baseline")}>
              Run baseline
            </button>
            <button disabled={loading} onClick={() => runSingle("skill")}>
              Run skill
            </button>
          </div>
        </section>
      )}

      {error && <section className="error">{error}</section>}
      {loading && <section className="panel muted">Running...</section>}

      <section className="grid two">
        <ResultCard title="Baseline" result={caseResults.baseline} />
        <ResultCard title="Skill" result={caseResults.skill} />
      </section>

      <section className="panel">
        <h2>Run full eval</h2>
        <div className="grid two">
          <div>
            <label>Trials</label>
            <input
              type="number"
              min="1"
              max="20"
              value={trials}
              onChange={event => setTrials(Number.parseInt(event.target.value, 10))}
            />
          </div>
          <div>
            <label>Run ID for resume, optional</label>
            <input
              value={runId}
              onChange={event => setRunId(event.target.value)}
              placeholder="existing-run-id"
            />
          </div>
        </div>
        <div className="actions">
          <button disabled={loading} onClick={runFullEval}>Run / resume eval</button>
        </div>
      </section>

      {evalResult && (
        <section className="panel">
          <h2>Run summary</h2>
          <pre>{JSON.stringify(evalResult, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}

function ResultCard({ title, result }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {!result ? (
        <p className="muted">No result yet.</p>
      ) : (
        <>
          <div className={result.score.pass ? "badge pass" : "badge fail"}>
            {result.score.pass ? "PASS" : "FAIL"}
          </div>
          <p className="answer">{result.answer}</p>
          <h3>Score</h3>
          <pre>{JSON.stringify(result.score, null, 2)}</pre>
        </>
      )}
    </section>
  );
}
