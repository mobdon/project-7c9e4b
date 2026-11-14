'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { compilePinnedLocalModule } = require('./local-loader.cjs');

const MANIFEST_SHA256 = '6b4905efb513687582e5861a9c81eeafbd53d07cbbd93d16ca90eb41a823bb99';
const ORIGINAL_SHA256 = '81d2e32d7ee67bb93a8fafee4dbc17570f8d4980be238d7434e15c791904b945';
const IDS = [21267, 21268, 21269, 21270, 21271, 21272, 22882, 22883];
const DIRECT_IMPORTS = Object.freeze({
  21267: [], 21268: [],
  21269: ['f21265', 'f21266', 'f21270', 'f21774', 'f23875', 'f24525'],
  21270: ['f21197', 'f24508'],
  21271: [], 21272: [], 22882: ['f22860'], 22883: ['f22860'],
});

// Fixed addresses are required by the original isolated bodies. No game image is loaded.
const FIXTURE = Object.freeze({
  raceActive: 673985284, roamActive: 673985288, snapshotPointers: 673985296,
  snapshotBytes: 673985328, developerMarker: 673985840,
  raceStats: 673985844, roamStats: 673985860, diagnosticsActive: 672536788,
  syntheticDescriptors: 671559008,
  car: 131072, companion: 196608, changedOffset: 16,
  output: 262144, client: 1048576, payload: 4194304,
});

const LIMITATIONS = Object.freeze([
  'Only eight tiny isolated native helper bodies are instantiated; the full game is never loaded.',
  'Contexts, session identifiers and one watched-region descriptor are synthetic, not production game state.',
  'Envelope-builder cases stop before encoding: inputs are captured locally and the replacement returns zero. Optional encoder replay is a separate case.',
  'Captures are pre-encoding native structures, not wire packets or evidence of server receipt or sanctions.',
  'These fixtures do not establish extension compatibility, detection thresholds or a complete race-report pipeline.',
]);

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function validateNativeModuleImports(module, id) {
  const direct = DIRECT_IMPORTS[id];
  if (!direct) throw new Error(`Unapproved native fixture ${id}`);
  const expected = new Map([
    ['env.memory', 'memory'], ...direct.map(name => [`isolated.direct.${name}`, 'function']),
  ]);
  const seen = new Set();
  for (const entry of WebAssembly.Module.imports(module)) {
    const key = `${entry.module}.${entry.name}`;
    if (seen.has(key) || expected.get(key) !== entry.kind) {
      throw new Error(`Denied native fixture import: ${key} (${entry.kind})`);
    }
    seen.add(key);
  }
  if (seen.size !== expected.size) throw new Error(`Missing expected imports in fixture ${id}`);
  const exports = WebAssembly.Module.exports(module);
  if (exports.length !== 1 || exports[0].name !== `f${id}` || exports[0].kind !== 'function') {
    throw new Error(`Unexpected native fixture exports: ${id}`);
  }
  return [...seen];
}

async function loadFixtures(fixtureDir) {
  const manifestBytes = await fs.readFile(path.join(fixtureDir, 'manifest.json'));
  if (sha256(manifestBytes) !== MANIFEST_SHA256) throw new Error('Native fixture manifest hash mismatch');
  const manifest = JSON.parse(manifestBytes);
  if (manifest.originalModuleSha256 !== ORIGINAL_SHA256 || manifest.functions.length !== IDS.length) {
    throw new Error('Native fixture provenance mismatch');
  }
  const modules = new Map();
  for (const entry of manifest.functions) {
    if (!IDS.includes(entry.id) || modules.has(entry.id)) throw new Error('Unexpected native fixture identity');
    const verified = {};
    for (const [filename, expected] of Object.entries(entry.files)) {
      if (path.basename(filename) !== filename) throw new Error('Invalid fixture filename');
      const bytes = await fs.readFile(path.join(fixtureDir, filename));
      if (bytes.length !== expected.bytes || sha256(bytes) !== expected.sha256) {
        throw new Error(`Native fixture hash mismatch: ${filename}`);
      }
      verified[filename] = bytes;
    }
    const { module } = await compilePinnedLocalModule({
      bytes: verified[`f${entry.id}.wasm`],
      expectedSha256: entry.files[`f${entry.id}.wasm`].sha256,
      label: `Isolated f${entry.id}`,
    });
    const allowedImports = validateNativeModuleImports(module, entry.id);
    modules.set(entry.id, { module, entry, allowedImports });
  }
  return { modules, manifest };
}

async function runNativeScenarios({ workspaceRoot, fixtureDir } = {}) {
  const root = path.resolve(workspaceRoot || path.join(__dirname, '../..'));
  const directory = fixtureDir ? path.resolve(root, fixtureDir) : path.resolve(__dirname, '../fixtures/native');
  const { modules, manifest } = await loadFixtures(directory);
  // Original memory import minimum: 11264 pages. Shared memory is sparse/lazily touched.
  const memory = new WebAssembly.Memory({ initial: 11264, maximum: 65536, shared: true });
  const bytes = new Uint8Array(memory.buffer);
  const view = new DataView(memory.buffer);
  const put32 = (at, value) => view.setUint32(at, value >>> 0, true);
  const get32 = at => view.getUint32(at, true);
  const exported = new Map();
  const logged = [];
  const captures = [];
  let encoderCalls = 0;
  let activeEnvelope = null;
  let syntheticCarAvailable = true;

  const imports = {
    f21197: () => 42,
    f24508: () => { logged.push('Native diagnostic logger invoked locally.'); return 0; },
    f21265: () => syntheticCarAvailable ? FIXTURE.car : 0,
    f21266: (_car, destination) => {
      put32(destination, syntheticCarAvailable ? FIXTURE.car : 0);
      put32(destination + 4, syntheticCarAvailable ? FIXTURE.companion : 0);
      put32(destination + 8, 0); put32(destination + 12, 0);
    },
    f21774: () => {}, // Controlled developer-guard context; not the game's implementation.
    f23875: (left, right, length) => {
      if (length < 0 || left < 0 || right < 0 || left + length > bytes.length || right + length > bytes.length) {
        throw new Error('Synthetic comparison outside fixture memory');
      }
      for (let i = 0; i < length; i++) if (bytes[left + i] !== bytes[right + i]) return 1;
      return 0;
    },
    f24525: destination => { bytes[destination] = 0; return 0; },
    f21270: (...args) => exported.get(21270)(...args),
    f22860: (input, _output, _capacity) => {
      if (!activeEnvelope) throw new Error('Unexpected native encoder call');
      const snapshot = Buffer.from(bytes.subarray(input, input + 1640));
      encoderCalls++;
      captures.push({
        stage: 'pre-encoding', channel: activeEnvelope,
        bytes: snapshot.length, hex: snapshot.toString('hex'),
        description: 'Actual native envelope-builder input to encoder; synthetic session/context. Encoder returned zero; no encoding or transport occurred.',
      });
      return 0; // Mandatory stop. Original helper exits before its indirect sender call.
    },
  };
  for (const id of [21270, 21267, 21268, 21271, 21272, 21269, 22882, 22883]) {
    const { module } = modules.get(id);
    const direct = Object.fromEntries(DIRECT_IMPORTS[id].map(name => [name, imports[name]]));
    const instance = await WebAssembly.instantiate(module, { env: { memory }, 'isolated.direct': direct });
    exported.set(id, instance.exports[`f${id}`]);
  }

  const readStats = id => {
    bytes.fill(0, FIXTURE.output, FIXTURE.output + 16);
    exported.get(id)(FIXTURE.output);
    return {
      sampledFrames: get32(FIXTURE.output), changedFrames: get32(FIXTURE.output + 4),
      developerEvents: get32(FIXTURE.output + 8), observationFlags: bytes[FIXTURE.output + 12],
    };
  };
  const statistics = () => ({ race: readStats(21271), freeRoam: readStats(21272) });
  const evidence = ids => ({
    originalModuleSha256: ORIGINAL_SHA256, revision: '60946132',
    fixtureManifestSha256: MANIFEST_SHA256,
    functions: ids.map(id => ({ id, originalBodySha256: modules.get(id).entry.originalBodySha256,
      isolatedWasmSha256: modules.get(id).entry.files[`f${id}.wasm`].sha256 })),
    fixtureDirectory: directory,
  });
  function configure({ race, freeRoam, changed, developer, available = true }) {
    bytes.fill(0, FIXTURE.raceStats, FIXTURE.roamStats + 16);
    put32(FIXTURE.raceActive, race ? 1 : 0); put32(FIXTURE.roamActive, freeRoam ? 1 : 0);
    put32(FIXTURE.diagnosticsActive, 0);
    syntheticCarAvailable = available;
    bytes.fill(0, FIXTURE.snapshotPointers, FIXTURE.snapshotPointers + 16);
    if (available) {
      put32(FIXTURE.snapshotPointers, FIXTURE.car);
      put32(FIXTURE.snapshotPointers + 4, FIXTURE.companion);
    }
    // One artificial four-byte region; this deliberately does not reproduce the game's watch map.
    bytes.fill(0, FIXTURE.syntheticDescriptors, FIXTURE.syntheticDescriptors + 96);
    view.setUint16(FIXTURE.syntheticDescriptors + 2, FIXTURE.changedOffset, true);
    view.setUint16(FIXTURE.syntheticDescriptors + 4, 4, true);
    bytes[FIXTURE.syntheticDescriptors + 6] = 1;
    const baseline = [17, 34, 51, 68];
    bytes.set(baseline, FIXTURE.snapshotBytes);
    bytes.set(changed ? [17, 34, 99, 68] : baseline, FIXTURE.car + FIXTURE.changedOffset);
    bytes[FIXTURE.developerMarker] = 0;
    if (developer) exported.get(21268)();
  }
  const cases = [];
  const scenarios = [
    ['native-clean', 'Clean synthetic race frame', { race: true, freeRoam: false, changed: false, developer: false }],
    ['native-race-change', 'Changed synthetic race frame', { race: true, freeRoam: false, changed: true, developer: false }],
    ['native-freeroam-change', 'Changed synthetic free-roam frame', { race: false, freeRoam: true, changed: true, developer: false }],
    ['native-developer-event', 'Synthetic developer event in both accumulator contexts', { race: true, freeRoam: true, changed: false, developer: true }],
    ['native-no-context', 'Changed frame with both accumulators inactive', { race: false, freeRoam: false, changed: true, developer: true }],
    ['native-missing-snapshot', 'Developer marker without a matching synthetic snapshot', { race: true, freeRoam: true, changed: false, developer: true, available: false }],
  ];
  for (const [id, label, input] of scenarios) {
    configure(input); exported.get(21269)();
    cases.push({ id, label, kind: 'native-fixture', input: { ...input, watchedRegion: 'one artificial four-byte region' },
      observed: { ...statistics(), developerMarkerConsumed: bytes[FIXTURE.developerMarker] === 0 },
      captures: [], interpretation: 'Original native compare/accumulator/export helpers applied to controlled local fixture data.',
      limitations: [...LIMITATIONS], evidence: evidence([21268, 21269, 21270, 21271, 21272]) });
  }
  configure({ race: true, freeRoam: true, changed: true, developer: true });
  exported.get(21269)();
  const beforeReset = statistics(); exported.get(21267)();
  cases.push({ id: 'native-race-reset', label: 'Native race reset preserves the separate free-roam record', kind: 'native-fixture',
    input: { contexts: 'both', changed: true, developer: true }, observed: { before: beforeReset, after: statistics() },
    captures: [], interpretation: 'The original reset helper clears the race record; the separate free-roam record is retained.',
    limitations: [...LIMITATIONS], evidence: evidence([21267, 21269, 21270, 21271, 21272]) });

  async function envelopeCase(id, nativeId, label, ready) {
    configure({ race: true, freeRoam: true, changed: true, developer: true }); exported.get(21269)();
    const sourceStats = statistics();
    bytes.fill(0, FIXTURE.client, FIXTURE.client + 1441568);
    bytes.fill(0, FIXTURE.payload, FIXTURE.payload + 32);
    put32(FIXTURE.client, 0x10203040); put32(FIXTURE.client + 96, ready ? 1 : 0);
    view.setBigUint64(FIXTURE.client + 1441560, ready ? 1n : 0n, true);
    put32(FIXTURE.client + 140, 1); // Nonzero slot, but the isolated table has no sender implementation.
    const statId = nativeId === 22882 ? 21271 : 21272;
    const statOffset = nativeId === 22882 ? 8 : 0;
    if (statOffset) { put32(FIXTURE.payload, 0x55667788); put32(FIXTURE.payload + 4, 1); }
    exported.get(statId)(FIXTURE.payload + statOffset);
    const firstCapture = captures.length; const callsBefore = encoderCalls;
    activeEnvelope = nativeId === 22882 ? 'synthetic-race-envelope' : 'synthetic-free-roam-envelope';
    let returned;
    try { returned = exported.get(nativeId)(FIXTURE.client, FIXTURE.payload); }
    finally { activeEnvelope = null; }
    cases.push({ id, label, kind: 'native-fixture', input: { ready, session: 'synthetic', sourceStatistics: sourceStats },
      observed: { helperReturn: returned, encoderCalls: encoderCalls - callsBefore,
        sentCount: get32(FIXTURE.client + 1441396), sentBytes: get32(FIXTURE.client + 1441400),
        encoderResult: 0, wireEncodingPerformed: false, senderImplementationPresent: false },
      captures: captures.slice(firstCapture), interpretation: ready
        ? 'Original native helper constructed a pre-encoding envelope. Local interception returned zero, so native transport was not reached.'
        : 'Original helper rejected the synthetic unready context before encoder interception.',
      limitations: [...LIMITATIONS], evidence: evidence([nativeId, statId]) });
  }
  await envelopeCase('native-race-capture', 22882, 'Race helper: local pre-encoding capture', true);
  await envelopeCase('native-freeroam-capture', 22883, 'Free-roam helper: local pre-encoding capture', true);
  await envelopeCase('native-unready-envelope', 22883, 'Unready synthetic session: no capture', false);

  return { cases, evidence: [{ ...evidence(IDS), method: manifest.method,
    memory: { shared: true, minimumPages: 11264, touched: 'small fixture regions only' },
    importPolicy: 'Exact pinned import sets only; no transport, network, process, filesystem or clock access is supplied to native imports.',
    loggerInvocations: logged.length, encoderCalls }], limitations: [...LIMITATIONS] };
}

module.exports = { runNativeScenarios, validateNativeModuleImports };
