'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { runNativeScenarios, validateNativeModuleImports } = require('../lib/native-fixtures.cjs');

const root = path.resolve(__dirname, '../..');
let result;
test.before(async () => { result = await runNativeScenarios({ workspaceRoot: root }); });

function scenario(id) {
  const item = result.cases.find(entry => entry.id === id);
  assert.ok(item, `Missing scenario ${id}`);
  return item;
}

test('original accumulator distinguishes clean, changed and inactive contexts', () => {
  assert.deepEqual(scenario('native-clean').observed.race,
    { sampledFrames: 1, changedFrames: 0, developerEvents: 0, observationFlags: 0 });
  const race = scenario('native-race-change').observed;
  assert.equal(race.race.sampledFrames, 1); assert.equal(race.race.changedFrames, 1);
  assert.equal(race.freeRoam.sampledFrames, 0);
  const roam = scenario('native-freeroam-change').observed;
  assert.equal(roam.freeRoam.sampledFrames, 1); assert.equal(roam.freeRoam.changedFrames, 1);
  assert.equal(roam.race.sampledFrames, 0);
  for (const record of Object.values(scenario('native-no-context').observed).filter(x => typeof x === 'object')) {
    assert.deepEqual(record, { sampledFrames: 0, changedFrames: 0, developerEvents: 0, observationFlags: 0 });
  }
});

test('native developer marker is consumed and race reset retains free-roam record', () => {
  const developer = scenario('native-developer-event').observed;
  assert.equal(developer.race.developerEvents, 1); assert.equal(developer.freeRoam.developerEvents, 1);
  assert.equal(developer.developerMarkerConsumed, true);
  const missing = scenario('native-missing-snapshot').observed;
  assert.equal(missing.race.sampledFrames, 0); assert.equal(missing.race.developerEvents, 1);
  const reset = scenario('native-race-reset').observed;
  assert.deepEqual(reset.after.race, { sampledFrames: 0, changedFrames: 0, developerEvents: 0, observationFlags: 0 });
  assert.deepEqual(reset.after.freeRoam, reset.before.freeRoam);
});

test('native envelopes are captured before encoding and cannot send', () => {
  for (const id of ['native-race-capture', 'native-freeroam-capture']) {
    const item = scenario(id);
    assert.equal(item.captures.length, 1); assert.equal(item.observed.encoderCalls, 1);
    assert.equal(item.observed.helperReturn, 0); assert.equal(item.observed.sentCount, 0);
    assert.equal(item.observed.sentBytes, 0); assert.equal(item.observed.wireEncodingPerformed, false);
    assert.equal(item.observed.senderImplementationPresent, false);
    const capture = item.captures[0];
    assert.equal(capture.stage, 'pre-encoding');
    const data = Buffer.from(capture.hex, 'hex'); assert.equal(data.length, capture.bytes);
    assert.equal(data.length, 1640); assert.match(capture.description, /synthetic/);
    assert.ok(data.some(byte => byte !== 0));
    const source = id === 'native-race-capture' ? item.input.sourceStatistics.race : item.input.sourceStatistics.freeRoam;
    const record = Buffer.alloc(16);
    record.writeUInt32LE(source.sampledFrames, 0); record.writeUInt32LE(source.changedFrames, 4);
    record.writeUInt32LE(source.developerEvents, 8); record[12] = source.observationFlags;
    assert.notEqual(data.indexOf(record), -1, 'Native builder must retain the actual exported statistic record');
  }
  const unready = scenario('native-unready-envelope');
  assert.equal(unready.captures.length, 0); assert.equal(unready.observed.encoderCalls, 0);
});

test('fixture provenance is pinned and modifications are rejected', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'offline-native-fixtures-'));
  try {
    await fs.cp(path.resolve(__dirname, '../fixtures/native'), temp, { recursive: true });
    const file = path.join(temp, 'f21270.wasm'); const bytes = await fs.readFile(file);
    bytes[bytes.length - 1] ^= 1; await fs.writeFile(file, bytes);
    await assert.rejects(runNativeScenarios({ workspaceRoot: root, fixtureDir: temp }), /hash mismatch.*f21270/);
  } finally {
    assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temp).startsWith('offline-native-fixtures-'));
    await fs.rm(temp, { recursive: true, force: true });
  }
});

test('unexpected native imports are denied before instantiation', () => {
  const module = new WebAssembly.Module(Buffer.from([
    0,97,115,109,1,0,0,0, 1,4,1,96,0,0,
    2,12,1,3,110,101,116,4,115,101,110,100,0,0,
  ]));
  assert.throws(() => validateNativeModuleImports(module, 21267), /Denied native fixture import/);
});
