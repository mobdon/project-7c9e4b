# v0.25 combined saved settings profiles

Outcome: implemented, fully regression-tested and independently reviewed as a local candidate. No live user game was modified.

## Deliverable

`NFSU2-Driving-Tools-v0.25-Combined-Saved-Profiles.zip`, 214,596 bytes.

SHA-256: `8166d0332eadcd7abe2b4fc9ecfc0fa5e17c76548c286e940deb4e6c0b617cc6`.

Library ID: `libfile_fde3_f-aef17fee22fc8191bc4594c7fd9ea0d4_8b516292de4881919d77c9d94b12acf3`.

## User workflow

Disable older Driving Tools extension copies, load this extracted extension folder, reload the game and verify the panel says 0.25.0. Choose the desired tools, open Saved tool profiles, enter a name, optionally check Restore network settings, then Save as new. Enable Load on startup for the selected saved profile if automatic restoration is wanted. Otherwise Load selected restores it on demand. Update selected replaces its stored choices; updating a startup profile disables that startup choice until explicitly enabled again.

F9 clears active driving/network tools and persistently pauses startup loading while preserving saved profiles. Manual Load resumes current selections; explicitly enabling Load on startup resumes future automatic restoration. Network restoration requires the saved per-profile consent. Existing module, identity and context restrictions still apply. The Drag heat toggle still only protects a current eligible unblown local engine; no repeated-NOS or race-win claim.

## Storage and safety

Strict bounded schema: 16 named profiles, 48-character names, 32 KiB encoded storage cap. Values are allowlisted and typed/range checked; unknown, hostile, malformed or unsupported records do not load. DOM names use text, not HTML. Profiles hold extension toggles/numbers and tuner enable/search preference, not game setups, drafts, car data or logs. No automatic search, Stage, Restore or game save.

Browser Web Locks serialize production profile mutations. Queued actions capture click intent and revision and are invalidated by Stop, restored-page lifecycle and remote Stop changes; queued startup authorization also checks the durable Stop token. Missing/denied locking disables edits, not manual Load. Storage events refresh lists without activating profiles. Delayed mount revalidates startup choices and permissions. Unreadable storage suppresses stale legacy driving restores. If Stop cannot persist, UI warns to restore storage and press F9/Stop again before reload. Separate drift/tester semantics remain; no new native drift operation is issued on Stop.

## Verification

- Aggregate: **1,688 passed, zero failures/skips/cancellations**, `all-tests-final.txt`.
- Final packaging tests: 3 passed after documentation updates, `package-tests-final.txt`.
- Independent storage + VM/DOM review: **44 passed**, including two-tab writes, queued targets, lost-update prevention, interrupted startup, consent, F9, storage recovery, pending dyno/drift and unchanged staged drafts. See `research/settings-profiles-v025/`.
- All 17 protected native/runtime scripts and native builders/WASM byte-identical to v0.24. No Street X, heat, NOS, steering, tuner stage/restore, corner/braking or collision payload changed. Native grip/downforce remains unverified and disabled. No Lap Knockout experiment.
- `integrated-v025.patch` applies to frozen `combined-v024-integration` without conflicts. Three builders reproduce all 12 changed files and the byte-identical final ZIP. See `reproduce.py` and `reproduction-results.json`.

A local Chromium fixture launch was blocked by denied Unix socket creation, including its reviewed retry. No alternate route around the restriction was attempted. Browser appearance, actual extension installation, live game reload/automatic restoration, race outcomes and game-save persistence remain unverified. VM/DOM tests are not browser/live-game tests. No live actions or user data transmission occurred beyond uploading the requested release artifact.
