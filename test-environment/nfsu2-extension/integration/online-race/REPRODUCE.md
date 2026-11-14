# Reproduce the held v0.21 candidate

This is a local candidate. Do not install or deliver until the parent resolves the outstanding online collision/Drag research and grip/downforce blocker. No Lap Knockout work is included.

1. Copy the frozen `nfsu2-extension/full-tuner-v018` directory to a new sibling directory. Do not overwrite that source or its v0.20 ZIP. Keep the `research -> ../research` symlink for local tests; research is never packaged.
2. From the copy, apply `patch -p1 < <absolute path>/combined-v021-integration/integration/online-race/integrated-v021.patch`. This exact delta includes source, generated authored hook payloads, documentation and tests. It does not alter game assets or profile bridges.
3. Run `node tools/build-corner-hook.cjs` and `node tools/build-braking-hook.cjs`. Those two builders reproduce the committed authored hook bytes. Do not run profile/main-bridge builders for this integration.
4. Run `node --test tests/*.test.cjs`. Expected final result:1,607 passed,0 failed/skipped/cancelled. Extra native corner checks use `NFS_PROFILE=current` and `NFS_PROFILE=next`; legacy needs `tests/corner-native.test.cjs`. Native braking tests already execute all four reviewed profiles.
5. Run `python3 tools/package-release.py --output <new unused output.zip>`. Exclusive creation deliberately refuses to overwrite any existing ZIP. Canonical timestamps/permissions, fixed entry order and fixed deflate level make identical final source bytes produce the same archive bytes in this toolchain.
6. Compare archive SHA-256 against `release-result.json` and verify every uncompressed entry against extension source. Only23 files are packaged; no research/native game binaries/tests are included.

The aggregate tests and package are offline evidence. They do not certify live online cornering, peer/server behavior, user-save persistence or browser layout. The full tuner remains a 41-field editor with isolated measurements and limited measured optimization, not automatic fastest-race handling.
