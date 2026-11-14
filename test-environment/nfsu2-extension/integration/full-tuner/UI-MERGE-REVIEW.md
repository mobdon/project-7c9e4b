# Combined full-tuner UI merge review

## Result

The corner status-only patch was independently reviewed and merged into the existing full-tuner candidate. The new Full Controller selection, all preset-editor handlers and styling are preserved. The missing `Tune` binding was added so mode labels and editor rendering can read `__NFSU2_DYNO_CORE__` without a ReferenceError.

The native grip/downforce page-ownership patch was reviewed but **not merged**. It depends on native-tuning transport and controller state absent from this candidate. Importing that preparatory plumbing is neither necessary for the full preset tuner nor evidence that the current host supports it. The parent confirmed this exclusion.

The parent subsequently authorized the combined v0.20.0 release label, so only page.js's diagnostics version literal and visible toolbar version were updated here. Other release metadata remains owned by the parent.

## Exact files changed by this review

- `extension/page.js`: corner status helpers/text/hover evidence; missing `Tune` binding; the two approved page version literals; the later authorized search-result UI changes described below.
- `tests/core.test.cjs`: the three supplied corner status regressions and associated fixture/expectation updates; one old dyno status wording expectation updated to the new UI text.
- `tests/full-tuner-page.test.cjs`: ten new production-page simulated-DOM tests for controller selection, editor interaction and accepted search results.
- `integration/full-tuner/UI-MERGE-REVIEW.md`: this review.

No profiles, core.js, native backend, tuner class, manifest, physics code or native AI body was edited by this review. Patch-tool backup files were moved outside the deliverable before the package check.

## Independent review findings

### Corner status

The existing AI controller already exports bounded route-node and corner-entry counts, route ownership, an unmet-guard bit mask and a native probe stage. The stage is a request-level high-water mark, not the latest failure reason. The merged UI uses only those existing read-only observations and explicitly calls them snapshots, not a proven cause.

An unconfirmed request now distinguishes zero entries in the current owned native plan, incomplete native checks, a reached planner, a limiting curve without final confirmation and waiting for acknowledgment of changed settings. Confirmed applied factors still take precedence. Free-roam and road-race statuses remain separate, with evidence attached only to the matching requested mode. Malformed/out-of-range hover samples render as unknown.

The source patch changes presentation only. Native thresholds, control commands, memory writes, AI acquisition, Street X driving behavior, race pace, event logic and road-race/free-roam eligibility are unchanged by this merge. Tests compare the complete simulated game-memory image before and after status rendering.

### Native grip/downforce ownership patch

`research/host-wiring-v019/page-process-guard.patch` introduces per-process shared-control identity, a worker's one permitted native bootstrap and native binding revocation. Its meaningful restrictions are conditional on `capabilities.nativeTuning`; it also requires `nativeTuning`, `nativeOwner`, `nativeRegistration`, `nativeBindingBlocked`, `nativeGripProfile()` and `stopNativeTuning()` state/helpers from the separate candidate.

The full-tuner candidate has none of that native allocation-registration path. Its frame-command preset tuner does not use the proposed native grip/downforce registration kind. The original module/memory/worker-generation session checks remain unchanged, and their existing stale-worker and secondary-fatal-event regressions pass. This does not certify the separate native transport or its current deployed host compatibility.

### Full tuner preservation

The page still chooses the Full Controller only for a verified profile exposing `fullTuner`, passes the exact module and its prepared native evaluator, and otherwise retains the legacy controller path. New tests verify all 41 field renderings and five mode labels, locked versus unverified controls, draft numeric routing, preview invalidation, explicit stage/restore, no disk-save claim, blur/hidden/busy/F9 control gating and legacy goal restrictions.

These new page tests deliberately use a controller double. Real bridge/controller correctness is covered by the separate controller and end-to-end tests, not inferred from the UI double.

## Disabled capabilities preserved

- No profile enables `nativeTuning`.
- The manifest does not load `native-tuning.js`.
- There is no native live downforce multiplier control or 1–10× grip control.
- Existing legacy extra-grip behavior retains its 1–2× limit.
- Native preset downforce/tire sliders are distinct from the unverified live native multiplier feature.
- No install, deployment, live game interaction or user-browser action was performed.

## Initial merge validation

- JavaScript syntax checks pass for page.js and both changed/new test files.
- Focused page/module-status/diagnostics/controller suite: **133 passed, 0 failed**.
- Initial full Node suite, after the release labels and package cleanup: **1,590 passed, 0 failed, 0 skipped/cancelled**. Both package tests pass; the allowlist was not weakened.
- Independent source reconstruction confirmed the initial merge page was byte-for-byte the handoff page plus the supplied corner patch, the single missing `Tune` declaration and the two approved version replacements. The follow-up below changes only its three identified UI sections.
- Initial merged page SHA-256: `61740ec1c9d2bfdb4cb3417256cffa5837739ec5b21cce485e74c18f9f9d1aee`.
- Handoff page SHA-256: `db06adbba45dfec14f14bcdc22d7bdda9fde7da0f0168ab9e24e9764d2545837`.

Commands:

```sh
node --check extension/page.js
node --check tests/core.test.cjs
node --check tests/full-tuner-page.test.cjs
node --test tests/core.test.cjs tests/full-tuner-page.test.cjs tests/module-status.test.cjs tests/diagnostics-page.test.cjs tests/dyno-full-controller.test.cjs
node --test tests/*.test.cjs
node tests/ui.browser.cjs
```

The isolated Chromium fixture could not launch: Chromium reported `process_singleton_posix.cc:297` / `socket() failed: Operation not permitted`, with read-only crashpad settings errors. It failed before a page opened. Therefore no real-browser layout/CSP assertion or live driving assertion passed here. This is a blocked browser check, not a passing visual check. No denied host source fetch was retried.

Local execution logs are under `/tmp/full-tuner-ui-review/` (`focused-tests.txt`, `all-tests-final.txt`, `browser-test.txt`). These are developer verification artifacts, not release assets. The status patch does not prove a cornering improvement or explain the user's live no-hit report.

## Authorized follow-up: accepted manual seed in search

The native controller worker separately changed Full search to preserve the accepted manual draft as its private search seed while keeping `baseline` and `baselineResult` tied to a fresh original live capture. Its result supplies `changes` and `changed` against the original live setup, plus separate `improved` (versus original) and `improvedFromSeed` (versus the accepted draft) flags.

The page follow-up changes exactly three UI sections:

1. Full Stage eligibility uses `outcome.changed` for manual previews and searches. Legacy search remains `improved`-only. Existing ready/busy/already-staged guards remain unchanged.
2. Full search renders the same accepted field-change list as manual preview, including native adjustment annotations, measured from the original live baseline. It works even if search was run before opening an editor.
3. Search text reports original-to-result metrics and distinguishes improvement versus the original from improvement versus the draft. A retained manual draft with no measured improvement is described explicitly and remains eligible for an explicit Stage action. The text does not claim handling/lap-time improvement or saved data.

Four added page regressions cover constant-metric manual drafts, accepted native differences/adjustments, improvement over a seed that is worse than the original, all five search goals, no accepted changes, and unchanged legacy gating. The simulated game memory remains byte-identical before explicit staging. The controller double proves UI routing only; the separate native controller tests exercise seed/capture/stage/restore behavior.

Street X/AI/event/pace/corner logic, native grip/downforce activation, controller selection, styling and all other page sections are unchanged by this follow-up. Browser validation was not retried after the established startup blocker.

Follow-up focused command (same five test files shown above): **142 passed, 0 failed, 0 skipped/cancelled**. Results are in `/tmp/full-tuner-ui-review/search-ui-focused-tests.txt`; the complete follow-up suite is in `search-ui-all-tests.txt`.

Final follow-up full suite: **1,599 passed, 0 failed, 0 skipped/cancelled**, including both package checks. Final page SHA-256: `6676417a7b2c252cdb38c42d3de8b7e88e3601d744726948bcbdd7b0488928ff`. Full page-test SHA-256: `b2bd9d314e081491201d0f9e2f11f8ae25457eff6d74012a85523ce194d0f7e0`.
