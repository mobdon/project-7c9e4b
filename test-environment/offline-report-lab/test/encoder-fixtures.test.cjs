'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { crc32 } = require('node:zlib');
const { runNativeScenarios } = require('../lib/native-fixtures.cjs');
const { runEncoderScenarios } = require('../lib/encoder-fixtures.cjs');
const { installNetworkIsolation } = require('../lib/network-isolation.cjs');

let source;
let result;
let isolation;
test.before(async () => {
  isolation = installNetworkIsolation();
  source = await runNativeScenarios();
  result = await runEncoderScenarios({ sourceCases: source.cases });
});
test.after(() => isolation?.restore());

const scenario = id => {
  const item = result.cases.find(row => row.id === id);
  assert.ok(item, `Missing encoder scenario ${id}`);
  return item;
};

test('actual native encoder produces complete local race and free-roam frames with independent valid CRCs', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926, 'Independent zlib oracle has the standard CRC-32 result');
  for (const [id, type] of [['encoder-race', 21], ['encoder-freeroam', 22]]) {
    const item = scenario(id);
    const captures = item.captures.filter(capture => capture.stage === 'encoded');
    assert.equal(captures.length, 1);
    const capture = captures[0];
    const frame = Buffer.from(capture.hex, 'hex');
    assert.equal(capture.bytes, frame.length);
    assert.equal(item.observed.encoderResult, frame.length);
    assert.equal(item.observed.encodedBytes, frame.length);
    assert.equal(item.observed.sourceCaptureBytes, 1640);
    assert.ok(frame.length >= 20 && frame.length <= 1200);
    assert.equal(frame.toString('ascii', 0, 4), 'N2FR');
    assert.equal(frame[4], 1, 'Protocol byte observed in the pinned current encoder');
    assert.equal(frame[5], type);
    assert.equal(frame.readUInt16LE(6), frame.length, 'Header length includes the final checksum');
    assert.equal(frame.readUInt32LE(frame.length - 4), crc32(frame.subarray(0, -4)));
    assert.equal(item.observed.crcValid, true);
    assert.equal(item.observed.sourceType, type);
    assert.equal(item.observed.redZonesIntact, true);
    assert.equal(item.observed.inputUnchanged, true);
    assert.equal(item.observed.wireSent, false);
    assert.equal(item.observed.transportImports, 0);
    const sourceId = type === 21 ? 'native-race-capture' : 'native-freeroam-capture';
    const sourceCase = source.cases.find(row => row.id === sourceId);
    const expected = sourceCase.input.sourceStatistics[type === 21 ? 'race' : 'freeRoam'];
    const statsOffset = type === 21 ? 24 : 16;
    assert.equal(frame.readUInt32LE(statsOffset), expected.sampledFrames);
    assert.equal(frame.readUInt32LE(statsOffset + 4), expected.changedFrames);
    assert.equal(frame.readUInt16LE(statsOffset + 8), expected.developerEvents);
    assert.equal(frame[statsOffset + 10], expected.observationFlags);

    const corrupted = Buffer.from(frame);
    corrupted[16] ^= 1;
    assert.notEqual(corrupted.readUInt32LE(corrupted.length - 4), crc32(corrupted.subarray(0, -4)), 'A changed payload fails the independent checksum');
  }
});

test('exact capacity succeeds and a short output buffer fails without touching surrounding memory', () => {
  const exact = scenario('encoder-exact-capacity');
  assert.ok(exact.observed.encoderResult > 0);
  assert.equal(exact.observed.encoderResult, exact.observed.encodedBytes);
  assert.equal(exact.observed.capacity, exact.observed.encodedBytes);
  assert.equal(exact.observed.redZonesIntact, true);
  assert.equal(exact.observed.inputUnchanged, true);
  assert.equal(exact.captures.filter(capture => capture.stage === 'encoded').length, 1);
  assert.equal(exact.captures[0].hex, scenario('encoder-race').captures[0].hex, 'Capacity does not change a valid frame');

  const short = scenario('encoder-short-buffer');
  assert.equal(short.observed.encoderResult, -1);
  assert.equal(short.observed.encodedBytes, 0);
  assert.equal(short.observed.redZonesIntact, true);
  assert.equal(short.observed.inputUnchanged, true);
  assert.equal(short.captures.filter(capture => capture.stage === 'encoded').length, 0);
  // The native writer can leave a partial prefix inside the supplied capacity.
  // The contract is failure plus intact red zones, not an unchanged whole buffer.
  assert.equal(short.observed.wireSent, false);
  const zero = scenario('encoder-zero-capacity');
  assert.equal(zero.observed.encoderResult, -1);
  assert.equal(zero.observed.encodedBytes, 0);
  assert.equal(zero.observed.redZonesIntact, true);
  assert.equal(zero.observed.inputUnchanged, true);
  assert.equal(zero.captures.length, 0);
});

test('corrupted encoder binary and changed provenance are rejected', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'report-lab-encoder-'));
  try {
    await fs.cp(path.resolve(__dirname, '../fixtures/encoder'), temp, { recursive: true });
    const file = path.join(temp, 'f22860.wasm');
    const original = await fs.readFile(file);
    const changed = Buffer.from(original);
    changed[changed.length - 1] ^= 1;
    await fs.writeFile(file, changed);
    await assert.rejects(runEncoderScenarios({ sourceCases: source.cases, fixtureDir: temp }), /hash|integrity|pin/i);
    await fs.writeFile(file, original);
    await fs.appendFile(path.join(temp, 'manifest.json'), '\n');
    await assert.rejects(runEncoderScenarios({ sourceCases: source.cases, fixtureDir: temp }), /hash|integrity|pin/i);
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});

test('encoder fixtures receive no network capability and every scenario remains offline', () => {
  assert.deepEqual(isolation.attempts, []);
  for (const item of result.cases) {
    assert.equal(item.observed.wireSent, false);
    assert.equal(item.observed.transportImports, 0);
    assert.ok(item.limitations.some(text => /synthetic|controlled/i.test(text)));
    assert.ok(item.limitations.some(text => /server|receipt|ban|sanction/i.test(text)));
  }
});
