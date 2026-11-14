'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { compilePinnedLocalModule } = require('./local-loader.cjs');

const MANIFEST_SHA256 = '63c9e1bfcc3c382e881079ac8c0de6ce7cb618dee4c85944b48353c27a3408c9';
const ORIGINAL_SHA256 = '81d2e32d7ee67bb93a8fafee4dbc17570f8d4980be238d7434e15c791904b945';
const ENCODER = 22860;
const LEAVES = [22832, 22854, 22855, 22861, 22862, 22863, 24560];
const IDS = [ENCODER, ...LEAVES];
const INPUT = 1048576;
const OUTPUT = 2097152;
const GUARD = 32;
const CANARY = 0xa5;
const SOURCE_BYTES = 1640;
const LIMITATIONS = [
  'The actual bounded encoder runs with seven original leaf helpers linked; individual paths may not invoke every helper. No full game or transport is instantiated.',
  'Inputs are the two known synthetic native-envelope snapshots from the offline native scenarios.',
  'These report branches contain inline values, so no original game data, external pointers or passive data segments are supplied.',
  'Encoded bytes stay in local fixture memory and the generated report. No socket, sender callback or network capability exists.',
  'Successful encoding and CRC verification do not establish server acceptance, account decisions or compatibility with other message schemas.',
];
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function validateEncoderModuleImports(module, id) {
  if (!IDS.includes(id)) throw new Error(`Unapproved encoder fixture ${id}`);
  const expected = new Map([['env.memory', 'memory']]);
  if (id === ENCODER) for (const leaf of LEAVES) expected.set(`isolated.direct.f${leaf}`, 'function');
  const seen = new Set();
  for (const item of WebAssembly.Module.imports(module)) {
    const key = `${item.module}.${item.name}`;
    if (seen.has(key) || expected.get(key) !== item.kind) throw new Error(`Denied encoder import: ${key}`);
    seen.add(key);
  }
  if (seen.size !== expected.size) throw new Error(`Missing expected encoder imports: ${id}`);
  const exports = WebAssembly.Module.exports(module);
  if (exports.length !== 1 || exports[0].name !== `f${id}` || exports[0].kind !== 'function') {
    throw new Error(`Unexpected encoder fixture exports: ${id}`);
  }
  return [...seen];
}

async function loadEncoderFixtures(directory) {
  const source = await fs.readFile(path.join(directory, 'manifest.json'));
  if (sha256(source) !== MANIFEST_SHA256) throw new Error('Encoder fixture manifest hash mismatch');
  const manifest = JSON.parse(source);
  if (manifest.originalModuleSha256 !== ORIGINAL_SHA256 || manifest.functions.length !== IDS.length) {
    throw new Error('Encoder fixture provenance mismatch');
  }
  const verified = new Map();
  // Verify all source/context/binary files before any fixture is instantiated.
  for (const entry of manifest.functions) {
    if (!IDS.includes(entry.id) || verified.has(entry.id)) throw new Error('Unexpected encoder fixture identity');
    const files = {};
    for (const [filename, expected] of Object.entries(entry.files)) {
      if (path.basename(filename) !== filename) throw new Error('Invalid encoder fixture filename');
      const bytes = await fs.readFile(path.join(directory, filename));
      if (bytes.length !== expected.bytes || sha256(bytes) !== expected.sha256) {
        throw new Error(`Encoder fixture hash mismatch: ${filename}`);
      }
      files[filename] = bytes;
    }
    verified.set(entry.id, { entry, files });
  }
  const loaded = new Map();
  for (const id of IDS) {
    const { entry, files } = verified.get(id);
    const compiled = await compilePinnedLocalModule({ bytes: files[`f${id}.wasm`],
      expectedSha256: entry.files[`f${id}.wasm`].sha256, label: `Actual isolated encoder f${id}` });
    const imports = validateEncoderModuleImports(compiled.module, id);
    loaded.set(id, { entry, module: compiled.module, imports });
  }
  return { loaded, manifest };
}

// Independent JavaScript calculation; the native encoder computes its own checksum.
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function checksum(frame) {
  if (frame.length < 4) return { valid: false, stored: null, computed: null };
  const stored = frame.readUInt32LE(frame.length - 4);
  const computed = crc32(frame.subarray(0, frame.length - 4));
  return { valid: stored === computed, stored, computed };
}

function selectInputs(sourceCases) {
  if (!Array.isArray(sourceCases)) throw new TypeError('sourceCases must be the offline native scenario cases');
  return [
    ['native-race-capture', 'synthetic-race-envelope', 21, 'race'],
    ['native-freeroam-capture', 'synthetic-free-roam-envelope', 22, 'freeroam'],
  ].map(([id, channel, type, label]) => {
    const candidates = sourceCases.filter(item => item.id === id);
    if (candidates.length !== 1) throw new Error(`Missing or duplicate source native case: ${id}`);
    const source = candidates[0];
    if (source.kind !== 'native-fixture' || source.evidence?.originalModuleSha256 !== ORIGINAL_SHA256) {
      throw new Error(`Source native provenance mismatch: ${id}`);
    }
    const captures = source.captures?.filter(item => item.stage === 'pre-encoding' && item.channel === channel);
    if (captures?.length !== 1) throw new Error(`Missing unique pre-encoding source capture: ${id}`);
    const capture = captures[0];
    if (capture.bytes !== SOURCE_BYTES || typeof capture.hex !== 'string' ||
        !new RegExp(`^[0-9a-f]{${SOURCE_BYTES * 2}}$`, 'i').test(capture.hex)) {
      throw new Error(`Invalid bounded source capture: ${id}`);
    }
    const input = Buffer.from(capture.hex, 'hex');
    if (input[1] !== type) throw new Error(`Unsupported source message type: ${id}`);
    return { source, capture, input, type, label };
  });
}

async function runEncoderScenarios({ sourceCases, fixtureDir } = {}) {
  const inputs = selectInputs(sourceCases);
  const directory = fixtureDir ? path.resolve(fixtureDir) : path.resolve(__dirname, '../fixtures/encoder');
  const { loaded, manifest } = await loadEncoderFixtures(directory);
  const memory = new WebAssembly.Memory({ initial: 11264, maximum: 65536, shared: true });
  const bytes = new Uint8Array(memory.buffer);
  const leaves = {};
  for (const id of LEAVES) {
    const instance = await WebAssembly.instantiate(loaded.get(id).module, { env: { memory } });
    leaves[`f${id}`] = instance.exports[`f${id}`];
  }
  const instance = await WebAssembly.instantiate(loaded.get(ENCODER).module,
    { env: { memory }, 'isolated.direct': leaves });
  const encode = instance.exports.f22860;
  const provenance = {
    originalModuleSha256: ORIGINAL_SHA256, revision: '60946132', fixtureManifestSha256: MANIFEST_SHA256,
    fixtureDirectory: directory,
    functions: IDS.map(id => ({ id, originalBodySha256: loaded.get(id).entry.originalBodySha256,
      isolatedWasmSha256: loaded.get(id).entry.files[`f${id}.wasm`].sha256 })),
  };

  function execute(input, capacity) {
    bytes.set(input, INPUT);
    bytes.fill(CANARY, OUTPUT - GUARD, OUTPUT + capacity + GUARD);
    const encoderResult = encode(INPUT, OUTPUT, capacity);
    const left = bytes.subarray(OUTPUT - GUARD, OUTPUT);
    const right = bytes.subarray(OUTPUT + capacity, OUTPUT + capacity + GUARD);
    const redZonesIntact = left.every(byte => byte === CANARY) && right.every(byte => byte === CANARY);
    if (encoderResult > capacity) throw new Error('Native encoder returned a length larger than its supplied buffer');
    const output = encoderResult > 0 ? Buffer.from(bytes.subarray(OUTPUT, OUTPUT + encoderResult)) : Buffer.alloc(0);
    return { encoderResult, output, redZonesIntact,
      inputUnchanged: Buffer.from(bytes.subarray(INPUT, INPUT + input.length)).equals(input) };
  }

  function makeCase(id, label, source, capacity, interpretation) {
    const result = execute(source.input, capacity);
    const crc = checksum(result.output);
    let corruptedFrameRejectedByCrc = null;
    if (result.output.length > 4) {
      const corrupted = Buffer.from(result.output); corrupted[0] ^= 1;
      corruptedFrameRejectedByCrc = !checksum(corrupted).valid;
    }
    const header = result.output.length >= 6 ? {
      signature: result.output.subarray(0, 4).toString('ascii'),
      version: result.output[4], type: result.output[5],
    } : null;
    return {
      id, label, kind: 'native-fixture',
      input: { sourceCaseId: source.source.id, sourceType: source.type, sourceCaptureBytes: source.input.length,
        capacity, statistics: source.source.input?.sourceStatistics, context: 'synthetic and local only' },
      observed: {
        encoderResult: result.encoderResult, sourceType: source.type, sourceCaptureBytes: source.input.length,
        encodedBytes: result.output.length, capacity, redZonesIntact: result.redZonesIntact,
        inputUnchanged: result.inputUnchanged, crcValid: crc.valid,
        crcStoredHex: crc.stored === null ? null : crc.stored.toString(16).padStart(8, '0'),
        crcCalculatedHex: crc.computed === null ? null : crc.computed.toString(16).padStart(8, '0'),
        corruptedFrameRejectedByCrc, decodedHeader: header,
        sourceStatistics: source.source.input?.sourceStatistics,
        wireSent: false, transportImports: 0,
      },
      captures: result.output.length ? [{ stage: 'encoded', channel: `${source.capture.channel}:encoded`,
        bytes: result.output.length, hex: result.output.toString('hex'),
        description: 'Actual original native encoder output from a synthetic offline envelope. Retained locally; no sender or live session exists.' }] : [],
      interpretation, limitations: [...LIMITATIONS],
      evidence: { ...provenance, sourceCaseId: source.source.id, sourceCaptureSha256: sha256(source.input) },
    };
  }

  const cases = inputs.map(source => makeCase(`encoder-${source.label}`,
    `Actual native encoder: synthetic ${source.label === 'race' ? 'race' : 'free-roam'} report`, source, 1200,
    'The original encoder ran with seven original leaf helpers linked and produced this local binary frame; JavaScript independently checked its CRC.'));
  const source = inputs[0];
  const encodedLength = cases[0].observed.encodedBytes;
  if (encodedLength < 1) throw new Error(`Known synthetic race input was rejected by the native encoder: ${cases[0].observed.encoderResult}`);
  cases.push(makeCase('encoder-exact-capacity', 'Actual encoder: exactly sized output buffer', source, encodedLength,
    'The output buffer exactly matches the successful native frame length. Red zones detect writes outside the permitted range.'));
  cases.push(makeCase('encoder-short-buffer', 'Actual encoder: one byte less than the successful frame', source, encodedLength - 1,
    'A failed call may write a prefix inside its supplied buffer. No successful frame is captured; red zones check the external boundary.'));
  cases.push(makeCase('encoder-zero-capacity', 'Actual encoder: zero output capacity', source, 0,
    'Zero output capacity tests the native failure path while preserving both adjacent red zones.'));

  return { cases, evidence: [{ ...provenance, method: manifest.method,
    actualEncoderExecuted: true, realLeafHelpers: LEAVES.length,
    externalCapabilities: ['shared local fixture memory only'], senderImplementations: 0,
    globalAPIsChanged: false, crcCheck: 'Independent JavaScript reflected CRC-32; altered-copy negative check.' }],
  limitations: [...LIMITATIONS] };
}

module.exports = { runEncoderScenarios, validateEncoderModuleImports };
