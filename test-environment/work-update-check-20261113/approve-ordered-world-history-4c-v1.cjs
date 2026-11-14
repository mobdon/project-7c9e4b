'use strict';
// Root static gate for the narrow session-before-World/history-pool unit.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), vm = require('node:vm'), Module = require('node:module');
const ROOT = path.resolve(__dirname, '..'), condition = process.argv[5];
assert(/^current-native-ordered-world-history-4c-v[12]$/.test(condition || ''));
const REL = 'work-update-check-20261113/' + condition + '/';
const read = p => fs.readFileSync(path.resolve(ROOT, p));
const sha = p => crypto.createHash('sha256').update(read(p)).digest('hex');
const [reviewPath, reviewHash, preparationHash] = process.argv.slice(2);
assert(reviewPath); for (const hash of [reviewHash, preparationHash]) assert(/^[a-f0-9]{64}$/.test(hash || ''));
assert.equal(sha(reviewPath), reviewHash); assert.equal(sha(REL + 'source-preparation.json'), preparationHash);
const review = JSON.parse(read(reviewPath)), prep = JSON.parse(read(REL + 'source-preparation.json'));
assert.equal(review.status, 'PASS'); assert.deepEqual(review.findings, []);
assert.equal(prep.condition, condition);
assert.equal(prep.requestedNativeFrames, 0);
assert.equal(prep.sourceHash, '6d93db9aae9308f6b4b51686309de4bcfc4b9d2f698c47099de1083c9621ae23');
for (const [key, value] of Object.entries({ preparedOnly: true, nativeExecuted: false, wasmCompiledOrInstantiated: false, memoryCreated: false, unitOnly: true, boundedMilliseconds: 8000 })) assert.equal(prep[key], value, key);
assert.equal(review.checks.files, Object.keys(prep.files).length); assert.equal(review.checks.pins, Object.keys(prep.sourcePins).length);
for (const [key, value] of Object.entries(review.checks)) if (typeof value === 'boolean') assert.equal(value, true, key);
for (const [file, hash] of Object.entries(prep.sourcePins)) assert.equal(sha(file), hash, file);
for (const [name, spec] of Object.entries(prep.files)) {
  const bytes = read(REL + name); assert.equal(bytes.length, spec.bytes, name); assert.equal(sha(REL + name), spec.sha256, name);
  if (name.endsWith('.cjs')) new vm.Script(Module.wrap(bytes.toString()), { filename: name });
}
const fixtureHash = '05101cdedb8349ae63f9a3453d0f93614d18d57cf1819258ba1d6c7045ba4439';
assert.equal(sha(REL + 'prebuilt-candidate-fixture.wasm'), fixtureHash); assert.equal(prep.fixtureSha256, fixtureHash);
for (const name of ['entry-hooks.json', 'prebuilt-candidate-fixture-metadata.json']) assert.equal(sha(REL + name), sha('work-update-check-20261113/current-native-combined-observer-4c-v2/' + name), name);
const probe = read(REL + 'probe-current-native-ai.cjs').toString();
assert(!probe.includes('RemoteWorld.run('), 'No movement replay in the history-only unit');
assert(!probe.includes('namedObserver.finish('), 'No retained motion getters in the history-only unit');
assert.equal(probe.split('offlinePlatform.initializeLAN(').length - 1, 1);
assert.equal(probe.split('SessionStart.requestStart(').length - 1, 1);
assert.equal(probe.split('Lifecycle.initialize(').length - 1, 1);
assert(probe.indexOf('Lifecycle.initialize(') < probe.indexOf('World.constructWholeWorld('));
for (const name of ['execution-source-contract.json', 'bounded-started.json', ...prep.outputNames]) assert(!fs.existsSync(path.resolve(ROOT, REL + name)), name);
const protectedInputs = require('./protected-observer-inputs-4c-v7.cjs').verify();
assert.equal(protectedInputs.files, 4283); assert.equal(protectedInputs.productionFiles, 112);
const sourcePins = { ...prep.sourcePins, [REL + 'source-preparation.json']: preparationHash, [reviewPath]: reviewHash, [path.relative(ROOT, __filename).replaceAll('\\', '/')]: sha(__filename) };
const contract = {
  kind: 'ROOT-REVIEWED-NATIVE-ORDERED-WORLD-HISTORY-POOL-UNIT', condition: prep.condition, sourceHash: prep.sourceHash,
  rootApprovedForOneBoundedRun: true, unitOnly: true, boundedMilliseconds: 8000, nativeMovementFramesRequested: 0,
  sourcePins, independentReview: { path: reviewPath, sha256: reviewHash },
  rootReview: { preparedFilesVerified: Object.keys(prep.files).length, sourcePinsVerified: Object.keys(prep.sourcePins).length, commonJsSyntaxVerified: true, protectedInputs, exactFrozenV2FixtureReused: true, nativeSessionBeforeWorldOrderingReviewed: true, newlyReachedHistoryPoolBranchReviewed: true, noMovementReplayOrRetainedMotionGetters: true, noNativeHistoryPoolPointerListOrResultWrites: true, remainingStartupPrerequisitesExplicitlyUnresolved: true },
  entryPlan: prep.entryPlan, limits: prep.limits, nativeCodeExecutedAtReview: false
};
fs.writeFileSync(path.resolve(ROOT, REL + 'execution-source-contract.json'), JSON.stringify(contract, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ executionContractSha256: sha(REL + 'execution-source-contract.json'), sourcePins: Object.keys(sourcePins).length, protectedInputs, nativeCodeExecuted: false }));
