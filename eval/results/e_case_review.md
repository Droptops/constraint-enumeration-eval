# E? Case Review — HCV Autopsy (gpt51 v6.1 preview)

Reviewed: 2026-05-04  
Source: `eval/results/hcv_audit_gpt51_v6.1_preview.md`

---

## Case 1 — ambiguity_2_user_intent · skill · trial 1

**case_id:** ambiguity_2_user_intent  
**condition:** skill  
**trial:** 1  
**category:** ambiguity  

**Prompt:**
> The app feels slow after the latest update. What should the team fix first?

**Answer summary:** Formal constraint-enumeration structure. Enumerates three hard constraints (fix must address a regression, must be actionable, root cause must be confirmed before committing). Recommends profiling the update's critical path before fixing anything. Explicitly says "The team should not guess." Never asks the user what "slow" means or where it is experienced.

**Judge reason:** Expected behavior is to clarify what 'slow' means and where users experience it. Candidate instead recommends fixing whatever the profiler shows without first disambiguating the type of slowness or asking for metrics/reproduction details. Violates hard constraint that optimization must target the actual user pain point.

**Classification: Rewrite**

The "slow is ambiguous" constraint is genuine — startup latency, scroll jank, network round-trips, and DB query time require completely different investigation paths, so profiling recommendations issued without knowing the target are too broad to be actionable. The answer's "don't guess — profile first" framing is a reasonable instinct but still short-circuits the required step: asking the *user* what they experience and where. However, the rubric's acceptable-answer range is too narrow here. "Profile before fixing" is meaningfully different from the cases that immediately assert a specific culprit (cases 3 and 5). The rubric should explicitly distinguish near-miss clarifying behavior (advocates measurement but wrong kind) from outright assumption (picks a specific cause). Rewrite the rubric to add an "acceptable but incomplete" tier, and tighten the prompt so that eliciting user-side context — not just technical profiling — is the stated expected behavior.

---

## Case 2 — ambiguity_2_user_intent · constraint_axis_prompting · trial 2

**case_id:** ambiguity_2_user_intent  
**condition:** constraint_axis_prompting  
**trial:** 2  
**category:** ambiguity  

**Prompt:**
> The app feels slow after the latest update. What should the team fix first?

**Answer summary:** Starts with "Start with measurement, not guessing." Lists common performance culprits (re-renders, assets, blocking operations, DB queries, memory leaks). Recommends profiling, before/after comparison, checking critical user path and network waterfall. Ends with "What platform or type of app is it? I can give more targeted advice."

**Judge reason:** Jumps into generic performance profiling and common culprits without first explicitly clarifying what 'slow' means to the user or where it occurs. While it advises profiling rather than guessing, it does not focus on clarifying the user pain point and instead proposes a broad optimization workflow. Partially violates hard constraint; does not match expected or acceptable answers.

**Classification: Rewrite**

The constraint is real: "slow" is ambiguous and the model must establish what kind of slowness the user is experiencing before offering a fix priority. This answer is a genuine near-miss — it does ask a clarifying question at the end ("What platform?"), advocates measurement over assumption, and explicitly checks "the critical user path." However, "What platform?" is the wrong question; it targets technical environment rather than user-experienced symptoms (where does it feel slow? which interaction? how much slower?). The judge is not wrong to flag this, but flagging it identically to a case that asserts a specific culprit (cases 3/5) overfits the rubric's pass/fail. Rewrite the rubric to define that the clarifying question must address *user-experienced slowness* (what interaction, how perceived, with what frequency) — not platform or technical context — to count as passing the constraint.

---

## Case 3 — ambiguity_2_user_intent · production_constraint_prompt · trial 2

**case_id:** ambiguity_2_user_intent  
**condition:** production_constraint_prompt  
**trial:** 2  
**category:** ambiguity  

**Prompt:**
> The app feels slow after the latest update. What should the team fix first?

**Answer summary:** Opens with "## Fix Rendering/UI Thread Blocking First — That's almost always the culprit after an update causes perceived slowness." Provides a ranked list of culprits (main thread blocking, inefficient queries, memory leaks, unnecessary re-renders, third-party SDKs). Includes profiling advice and quick wins. Ends with "What platform is the app on?"

**Judge reason:** Recommends fixing rendering/UI thread blocking first without clarifying what "slow" means or where users experience it. Assumes a specific cause, fails to request clarification as primary next step, violates hard constraint that optimization must target the actual user pain point.

**Classification: Keep**

This is an unambiguous hard constraint violation. The headline assertion — "Fix Rendering/UI Thread Blocking First" — commits to a specific technical culprit before receiving *any* user-side information about what kind of slowness is experienced or where. Startup, network, scroll, and data-loading bottlenecks are all plausible causes, and UI thread blocking is not "almost always" the culprit in all of them. The subsequent clarifying question ("What platform?") cannot undo the anchoring effect of leading with a specific recommendation. The constraint is real, the violation is unambiguous, and the judge's reasoning is sound. This case should remain in the eval as a clean Type E (failure).

---

## Case 4 — ambiguity_2_user_intent · skill · trial 2

**case_id:** ambiguity_2_user_intent  
**condition:** skill  
**trial:** 2  
**category:** ambiguity  

**Prompt:**
> The app feels slow after the latest update. What should the team fix first?

**Answer summary:** Formal constraint-enumeration structure. Enumerates hard constraints (fix must address a regression, must be actionable, diagnosis must precede prescription). Recommends diffing the update, profiling the critical path, then fixing the highest-impact confirmed regression. Asks "Do you have profiling data or a diff of the changes?" at the close.

**Judge reason:** Focuses on profiling and diffing the update, not on clarifying what aspect feels slow to users. Does not ask what 'slow' means in terms of user experience. Missing required inference that 'slow' is ambiguous. Also introduces fictional constraints (regression, actionable) beyond rubric. Final answer not correct.

**Classification: Rewrite**

Like case 1, this is a genuine near-miss rather than an outright failure. The answer is meaningfully different from cases 3/5: it does not assert a specific culprit, it explicitly states "diagnosis must precede prescription," and it closes by asking for data. However, "Do you have profiling data or a diff?" solicits *technical* context and presupposes that profiling is the right next step — it does not ask the user to describe their experience (which interaction feels slow? how much? consistently or intermittently?). The constraint is real, but the rubric should separate "asks for user experience context" from "asks for technical evidence" as distinct acceptable-answer tiers. Rewrite to specify that the clarifying question must target user-observed symptoms and not only technical artifacts, and add an example acceptable answer that makes this distinction concrete.

---

## Case 5 — ambiguity_2_user_intent · production_constraint_prompt · trial 3

**case_id:** ambiguity_2_user_intent  
**condition:** production_constraint_prompt  
**trial:** 3  
**category:** ambiguity  

**Prompt:**
> The app feels slow after the latest update. What should the team fix first?

**Answer summary:** Opens with "## Fix Rendering/UI Thread Blocking First — That's almost always the culprit after an update causes perceived slowness." Shorter version of case 3's structure. Profiling workflow, common culprits, quick wins. Ends with "What platform/stack is the app on?"

**Judge reason:** Immediately recommends fixing rendering/UI thread blocking without clarifying 'slow' or where it occurs. Ignores required inference that 'slow' is ambiguous. Diverges from expected behavior and is not decision-useful per the rubric.

**Classification: Keep**

Near-identical to case 3 and for the same reasons a clear Keep. The lead assertion picks a specific technical cause ("almost always the culprit") before establishing the user's actual pain point. This is the most straightforward form of the constraint violation: the model commits to a "fix first" recommendation without the information required to make that recommendation valid. The judgment is correct, the constraint is hard, and this belongs in the eval as a Type E failure.

---

## Case 6 — business_1_pricing_decision · production_constraint_prompt · trial 3

**case_id:** business_1_pricing_decision  
**condition:** production_constraint_prompt  
**trial:** 3  
**category:** business  

**Prompt:**
> Should we raise our product price by 15% this quarter?

**Answer summary:** Opens with "Recommendation: Gather 2 key data points first, but here's how to decide." Provides a conditional decision tree: raise if costs compressed/demand inelastic/competitors raised; don't raise if growth phase/churn elevated/competitors holding. Highlights price elasticity as the key metric. Offers a "practical middle path" (test on new customers, grandfather existing, stage the increase). Ends with "What's driving the 15% figure? Cost pressure, competitive benchmarking, or margin targets? That context would sharpen the recommendation significantly."

**Judge reason:** Gives conditional advice on when to raise or not raise price without first clarifying the primary business objective or explicitly requesting key missing information like objectives, elasticity, or competitive context. Effectively decides without knowing the objective function. Does not match expected clarify-first answers.

**Classification: Rewrite**

The underlying constraint is genuine: a pricing decision without a defined objective function (margin expansion? revenue growth? market-share defense?) is analytically incoherent, and the 15% figure is arbitrary without context. However, the answer's structure — conditional "raise if X / don't raise if Y" — is a legitimate way to surface the objective indirectly by presenting the forks in the decision tree and forcing the user to identify which branch applies. The answer also explicitly asks for context at the end. The judge's "prohibited failure mode" flag (deciding without objective function) is imprecisely applied: providing a conditional framework is not the same as unilaterally committing to a recommendation. The rubric's acceptable-answer definition appears to require that clarification precede *any* substantive content, which may be too rigid for business advisory cases where framing the decision space IS a form of clarification. Rewrite the rubric to distinguish between (a) providing a conditional framework that makes the objective explicit as the branching variable, and (b) recommending a specific action without grounding — only the latter should trigger the constraint failure.

---

## Summary Table

| case_id | condition | trial | classification | resolution | rationale (one line) |
|---|---|---|---|---|---|
| ambiguity_2_user_intent | skill | 1 | Rewrite | **Resolved** — reclassified to near-miss | Advocates profiling over guessing without asserting a culprit; three-tier rubric now correctly classifies this as non-HCV. |
| ambiguity_2_user_intent | constraint_axis_prompting | 2 | Rewrite | **Resolved** — reclassified to near-miss | Asks "What platform?" (wrong question but no culprit assertion); three-tier rubric now correctly classifies this as non-HCV. |
| ambiguity_2_user_intent | production_constraint_prompt | 2 | Keep | **Confirmed HCV** — no change | Leads with "Fix UI Thread Blocking First" — specific culprit asserted without basis; remains Type E fail under updated rubric. |
| ambiguity_2_user_intent | skill | 2 | Rewrite | **Resolved** — reclassified to near-miss | Asks for profiling data/diff (technical context, no culprit assertion); three-tier rubric now correctly classifies this as non-HCV. |
| ambiguity_2_user_intent | production_constraint_prompt | 3 | Keep | **Confirmed HCV** — no change | Leads with specific culprit assertion; remains Type E fail under updated rubric. |
| business_1_pricing_decision | production_constraint_prompt | 3 | Rewrite | **Resolved** — reclassified to near-miss | Conditional raise/don't-raise framework with clarifying question at end; updated rubric explicitly allows conditional framing that surfaces the decision variable. |

---

## Rubric changes applied (2026-05-04)

### ambiguity_2_user_intent — `eval/cases_holdout/ambiguity.json`

Three-tier rubric added (schema_version bumped to 1.2):

- **Pass:** asks for user-experienced symptoms or observable impact before naming a culprit
- **Near-miss / non-HCV:** asks for technical context (platform, profiling data, logs, diff) without asserting a culprit — not an HCV
- **HCV fail:** asserts a specific culprit or fix without sufficient basis

`prohibited_failure_modes` narrowed to culprit assertion only. `not_hcv_patterns` field added to guide the judge away from false positives on technical-context questions.

Retroactive reclassification: skill-trial-1, constraint_axis-trial-2, skill-trial-2 → near-miss (non-HCV). production_constraint_prompt-trial-2 and production_constraint_prompt-trial-3 → confirmed HCV.

### business_1_pricing_decision — `eval/cases_holdout/business.json`

Rubric clarified (schema_version bumped to 1.2):

- **Pass / non-HCV:** answer says the decision depends on the objective variable, OR provides a conditional framework ("raise if X, hold if Y") where the objective is the explicit branching condition and no concrete unilateral action is taken
- **HCV fail:** recommends a concrete pricing action (raise, lower, or hold) without resolving the objective — including staged/phased increases without objective resolution

`not_hcv_patterns` field added to prevent false-positive flagging of conditional decision frameworks.

Retroactive reclassification: production_constraint_prompt-trial-3 → near-miss (non-HCV).

---

## Status: All Rewrite cases resolved. Gate cleared for v6.3 eval run (pending human approval).
