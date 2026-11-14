# Reproduce held v0.22 integration

1. Copy frozen `combined-v021-integration` to a new sibling directory under `nfsu2-extension`. Preserve its `research -> ../research` symlink for offline checks; research is never packaged.
2. Apply `patch -p1 < <absolute path>/combined-v022-integration/integration/online-race-cars/integrated-v022.patch` inside that copy. The patch includes authored source and text-generated payloads. It excludes the binary `tests/cars-next.wasm`, regenerated next.
3. Run `node tools/build-next-profile.cjs`. The adapted builder first verifies the old64-local base bridge is identical, then retains/recomposes the existing full-tuner170-local prefix and capability. It refuses an unexpected base change rather than dropping the tuner. All existing online corner/braking code remains untouched.
4. Run `node --test --test-concurrency=1 tests/*.test.cjs`: expected1,619 passed,0 failed/skipped/cancelled. Profile rebuild tests also prove a mismatched base is refused without overwriting the profile.
5. Run `python3 tools/package-release.py --output <new unused path.zip>`. Canonical metadata, source order and compression reproduce the held archive byte-for-byte in this toolchain. Existing ZIPs cannot be overwritten.
6. SHA-256 must match `release-result.json`. `reproduction-results.json` records a fresh-copy reproduction, including all21 changed files and the regenerated car fixture.

Delivery is held. This is local contact filtering, not a promise about remote peers, server acceptance or live multiplayer behavior. Pending Drag evidence and unverified native grip/downforce are not included. No Lap Knockout experiment is merged.
