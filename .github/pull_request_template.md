## Summary

Describe the change and the evaluation/research boundary it affects.

## Freeze / evidence impact

- [ ] No frozen case set, scorer, threshold, or published result was silently changed in place
- [ ] Follow-on behavior is versioned as a new experiment/round where required
- [ ] Raw outputs and metadata needed to reproduce public tables are retained
- [ ] Exploratory metrics remain labeled exploratory

## Validation

- [ ] `cd eval && npm ci && npm run ci`
- [ ] Relevant case-set checks passed
- [ ] No credentials, private session URLs, transcripts, or proprietary data added

List any additional experiment-specific commands and deviations below.
