# Tuner snapshot rejection diagnostics

## Evidence and scope

The supplied screenshot was downloaded through the supported Space file route and its actual pixels were viewed. It shows v0.25.0 on the solo Dyno Shop main screen, Circuit / Sprint slot 1 of 5. Exact message: “Full tuner snapshot layout is unsupported; no setup changes were made”. Stage and Restore are disabled.

That sentence is returned only after the full-tuner native frame bridge acknowledges status 8. It precedes private evaluator loading. The screenshot proves a rejected native capture; it does not identify the failing pointer, array, ownership check, or count. No runtime memory capture or diagnostic log was supplied. The previous tests used synthetic snapshots and never established that all live car/parts layouts work.

No compatibility guard is weakened. This change makes the next failed attempt diagnosable. It is not a claimed fix for the unknown runtime cause, nor a live-game or save verification.

## Change

- Keep status/ack protocol, ABI 1, 170 locals, first-buffer ownership latch, exactly 16 MiB allocation, and every existing guard.
- Put fixed failure detail at existing mailbox B+104 and optional unsigned count/source-pair enum at B+108, never through a possibly invalid PB.
- Reset details per handled command; unhandled/odd/duplicate/foreign-return commands do not touch them. The page clears them before publishing for older-prefix compatibility.
- Show a component-specific S-code with “No setup changes were made” and an export/reload instruction. Unknown detail codes retain the old conservative message.
- Export only known status/guard enums and relevant integer counts. Source overlaps export one of the ten bounded pair IDs. No raw exception messages, pointer values, game memory or save bytes are retained.
- The next-profile builder accepts either the exact current prefix or one SHA-256-pinned legacy prefix (7,234 bytes, 8e8b6cc0d322e0e5a7c753d384ac2769d2a9aba8f2912d781dd69e6a564be41b, confirmed unchanged in v0.22/v0.25/v0.26). It separately verifies the exact base tail and integer-byte values before comparison/hash. Unknown and coercible malformed changes reject before replacing the profile.

## Guard IDs

1-5: buffer bounds/alignment, magic, version, capacity, ownership.
10-15: screen, record, tune, player, car, ride bounds.
20-24: ride heap, record alias, CPU alias, car alias, player alias.
30/31/32: tuning-rule count, parts catalog count, curve sample count.
40-45: source ranges image, ride, stock, rules, catalog, curve.
50: source overlap; detail is decimal pair ij, sources 1=ride, 2=stock, 3=rules, 4=catalog, 5=curve.
60: curve overlaps installed parts.
70-74: catalog child count, lookup outside catalog, misaligned child, missing child, selector mismatch.

Counts are copied only for 30/31/32/70; pair detail only for 50. Other details are zero. Guard 0 means no recognized detail and does not justify a diagnosis.

## Checks

Focused suite covers native guard IDs and no-setup-write behavior, stale detail reset, ignored requests, legacy acknowledgment fallback, exact 41-field capture/selected Stage/Restore, buffer ownership, controller/page error delivery, private diagnostic export, current/legacy prefix rebuilds, and rejection of changed tails/unknown/malformed prefixes.

Commands:

    node tools/build-full-tuner-bridge.cjs
    node tools/build-next-profile.cjs
    node --test tests/combined-profile-rebuild.test.cjs tests/full-tuner-bridge.test.cjs tests/dyno-full-controller.test.cjs tests/diagnostics.test.cjs tests/full-tuner-page.test.cjs tests/diagnostics-page.test.cjs
    node tests/dyno-full-end-to-end.test.cjs

No native grip transport activation, Drag lane candidate, save action, live game action, or profile-storage changes are included. The final combined integrator must preserve v0.26 Drift pace and rerun its full aggregate suite after source merge and generated-prefix rebuild.
