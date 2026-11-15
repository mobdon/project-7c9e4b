# Captured d739e631 host test sources

These are the byte-exact 374 host tests across 16 files used for the named candidate. The successful bounded run used artificial memory and empty-code identity modules; it did not load or execute game WASM. The metadata fixture is untrusted data. All 374 passed with zero failures, cancellations, skips or TODOs.

See [the validation record](../releases/0.43.0-d739e631-draft.1/VALIDATION.json) for the exact tested extension identities and receipt hashes. The original private run contracts and frozen outputs remain unchanged. These source copies do not authorize rerunning those frozen conditions; fresh execution must preserve the reviewed isolation contract. The preload dependency is retained at `test-environment/offline-report-lab/lib/network-isolation.cjs`.
