# v0.24 combined online Drag candidate

Outcome: locally validated and independently reviewed. Live online race behavior remains unverified.

## Artifact

`NFSU2-Driving-Tools-v0.24-Combined-Online-Drag-Tuner.zip` is 204,573 bytes. SHA-256: `eaf1745261a9da590890433503fc57460546459e3045c2a5af34fc6731ad4a9e`.

Library ID: `libfile_fde3_f-411d53689838819186fbf7c98ebb709e_8b516292de4881919d77c9d94b12acf3`.

## Changes

- Extends the corrected v0.23 heat-only protection to online/LAN only with literal network permission. The UI requires both Disable Drag engine blowouts and Allow network tools. Independent manual operation remains possible.
- Retains every native ownership, identity, active Drag, full physics, finite/unblown heat, epoch and heartbeat check. High-address runtime CPU validation remains corrected. The only extension write is current local engine heat to the native disabled sentinel.
- All unrelated profile fields/capabilities, full-tuner prefix, contacts, Street X, corner and braking payloads remain unchanged. No Lap Knockout or unverified native grip/downforce activation. Native NOS, shifting, throttle, steering and opponents are unchanged.
- Corrects test snapshots to copy bytes instead of aliasing the same memory.

## Verification

- Final aggregate suite: 1,669 passed, zero failures, skips or cancellations. `all-tests-final.txt`.
- Independent native review: 15 check groups, plus 44 heat tests. `research/drag-overheat-online-v024/REVIEW.md` and its output files.
- Both exact pinned native modules survive 600 online redline frames at low/high runtime CPU addresses. Opt-out resumes native heating and blowout. Rejected online permission, stale, opponent and invalid states match original native behavior.
- Independent frozen ZIP check: 23 entries exactly match final sources; CRC clean; no extra, missing or duplicate entries; manifest 0.24.0 and reviewed runtime hashes unchanged. Final reviewer reran all 44 heat tests.
- Source patch applies to frozen v0.23 without conflicts. Three builders reproduce all 18 changed files and the byte-identical ZIP. See `integrated-v024.patch`, `reproduce.py`, `changed-files.json`, `reproduction-results.json`.

## Limits and operating instructions

Reload with only v0.24 enabled, enable both named toggles before a fresh online Drag race and before damage. Already-blown engines or lost races are not repaired. An enabled checkbox is a request, not proof that native eligibility guards passed. Observe the bounded heat diagnostics in a fresh race for end-to-end confirmation. The reported network=true log explains why solo-only v0.23 would reject the request; it does not prove every native guard passes in the live game.

This is not a repeated-NOS fix, guaranteed win or peer/server behavior guarantee. Follow server rules. No installation, browser/HUD verification, live online race or save/reload test was performed. The full tuner remains a 41-field manual editor and private native preview with measured gearing/ECU/turbo searches, not automatic handling/lap optimization. Game Test Run and Save Profile are still required for physics refresh and persistence; disk save is not confirmed by the extension.
