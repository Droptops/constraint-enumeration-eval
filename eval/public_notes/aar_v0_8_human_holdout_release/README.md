# AAR v0.8 Human-Adjudicated Holdout Release Package

This folder contains the curated public/internal AAR v0.8 human-adjudicated holdout release package.

**What is included:**
- Release memo and final evidence index
- Two-adjudicator reconciliation memo
- h019 EXECUTE-boundary rubric clarification
- h019 boundary regression set specification, first adjudication, and second adjudication (including CSV files)
- h019 final closure memo

**What is NOT included:**
- Raw model responses (intentionally excluded)
- Run manifests (intentionally excluded)
- Quarantined scorer-invalid outputs (intentionally excluded)
- Local machine metadata or API credentials

**Admissible claim:**
AAR v0.8 passed a Windows-native blind holdout under human adjudication using the exclusion scenario: 38/39 scored cases passed (97.4%), all four pre-registered gates cleared (B-OverEnum=0, hallucinated_tool_io=0, PrimitiveMatch≥85%, checklist_exposed≤1).

**This is NOT an automated benchmark pass.** The regex scorer was quarantined during the evaluation and remains unrepaired pending scorer parity work.

**Open observations (not addressed by this package):**
- EX-R02: tool-refusal + unsolicited MAKE_PLAN checklist
- EX-R06: STATE_BLOCKER-vs-ASK form mismatch

See `AAR_v0_8_final_evidence_index.md` for full artifact inventory with SHA-256 values.
