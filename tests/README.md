# Captured a3a9a837 host test sources

These are the byte-exact 410 host tests across 18 files used for the named candidate. The successful bounded run used artificial memory and empty-code identity modules; it did not load or execute game WASM. Metadata fixtures are untrusted data. All 410 passed with zero failures, cancellations, skips or TODOs. The retained 374 cases remain, with only shared package labels/counts updated where required; A3 adds 31 bridge cases and five profile cases.

See [the validation record](../releases/0.43.1-a3a9a837-draft.1/VALIDATION.json) for the exact tested extension identities and receipt hashes. The original private run contracts and frozen outputs remain unchanged. These source copies do not authorize rerunning those frozen conditions; fresh execution must preserve the reviewed isolation contract. The preload dependency is retained at `test-environment/offline-report-lab/lib/network-isolation.cjs`.
