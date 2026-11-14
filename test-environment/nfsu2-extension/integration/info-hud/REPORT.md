# v0.30 Info HUD

## Delivered

Compact click-through HUD below the closed upper-right launcher. F6 or the top-level Info HUD switch toggles it. Default on; same-tab display preference is independent from saved driving profiles. Opening the tools panel hides the card. It inherits the existing fullscreen host migration.

Observations: guarded native speed converted to km/h; observed driver and AI handoff state; selected/requested versus matching acknowledged AI pace; selected versus guarded applied power fields; visible governor request/application label when relevant. Zero speed is real zero only; unavailable, paused, stale and unverified observations remain explicit. No measured speed gain or horsepower claim.

## Preservation

All controller, engine, tuner, native profiles, generated patch payloads and saved-profile code are byte-identical to frozen v0.29. diagnostics.js has only its version string changed. Gameplay, network opt-in, Stage/Restore, NOS, Street X, Drift and Drag behavior remain unchanged. v0.29 ZIP checksum remains ea6e85cf4c7cecd4a93a081b84278fb44d4bf07edaf909d24c6d806cf346dba2.

## Verification

- Full final suite: 1,788 passed, zero failures/skips/cancellations.
- Independent reviewer independently ran all 1,788 tests and found no blocking defects.
- 20 focused new HUD tests exercise pure view logic and the production page, native read-only samples, missing/zero/out-of-range/stale speed, request/ack mismatch, current power, network opt-out, invalid identity, F6/F8/F9, blur/hide/resume, manual takeover, game exit/trap, replacement boot, tuner suspension and byte-for-byte memory preservation.
- The independent review found governor status was title-only on the click-through card; corrected with an explicit visible footer.
- Source-only patch dry-runs cleanly against frozen combined-v029-integration. Preservation hashes are in verification/hud-preservation.json.
- Package tests verify canonical reproducible metadata, exact contents and overwrite refusal. Final archive report is verification/hud-final-package.json.

## Unverified

Chromium could not launch due local process socket restrictions, including the permitted elevated retry. The prepared strict-CSP browser fixture did not load a page, so layout, click-through, key repeat and fullscreen behavior are not claimed as browser-tested. No live gameplay, installation, user save or server/network changes occurred.

## Integration

Candidate: info-hud-v030-candidate. Authored patch: integration/info-hud/authored-source.patch. No rebuild of native payloads is needed. Install only the new combined extension, reload the game, confirm 0.30.0. F6 toggles HUD; F8 opens all retained tools.
