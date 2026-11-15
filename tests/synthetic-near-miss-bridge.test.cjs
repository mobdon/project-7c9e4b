'use strict';
// Service/ownership contract tests only. Registration is exercised with a
// minimal compiled module as a local identity token; these checks do not claim
// that token contains a native helper or that any native award has executed.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Native = require('../extension/native-synthetic-near-miss-609.js');
const RAW = '81d2e32d7ee67bb93a8fafee4dbc17570f8d4980be238d7434e15c791904b945';
const BASE = 0xd0cf00, SIZE = 256;
const F = Native.mailbox.offsets;
const emptyModule = () => new WebAssembly.Module(Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0));

function fixture({ register = true, generation = 1, initialized = true, prepare = () => {} } = {}) {
  // Exact609's high online-context globals require its real memory minimum.
  // Only small owner/mailbox ranges are touched or copied by these tests.
  const memory = new WebAssembly.Memory({ initial: 11264, maximum: 65536, shared: true });
  const view = new DataView(memory.buffer), moduleIdentity = emptyModule();
  const player = 0xe00000, car = 0xe01000, race = 0xe03000, racer = 0xe05000,
    ds = 0xe06000, manager = 0xe07000, style = 0xe08000, metadata = 0xe09000;
  const put = (at, value) => view.setUint32(at, value, true), get = at => view.getUint32(at, true);
  function initialize() {
    put(0x8654a4, 6); put(0x850078, 0); put(0xd00030, 1);
    put(0xd00000, player); put(player + 4, car); put(0x890118, race); put(race, 4);
    put(race + 0x24, 1); put(race + 0xbd0, racer); put(car + 0x1c, racer);
    put(racer, car); put(racer + 468, ds); put(racer + 476, manager);
    put(manager, racer); put(manager + 4, ds); put(ds + 84, style);
    put(style + 8, metadata); put(style + 12, 21); view.setUint8(style + 16, 1); put(metadata, 0xe3fa9491);
  }
  if (initialized) initialize();
  const protectedRanges = [[BASE - 16, SIZE + 32], [player, 8], [car, 0xa00], [race, 0xc44],
    [racer, 480], [ds, 156], [manager, 48], [style, 88], [metadata, 48],
    ...[0x8654a4, 0x850078, 0xd00000, 0xd00030, 0x890118, 0x866a14, 0x8669f4, 0x89cf69,
      704993496, 707422704, 707407324].map(at => [at, 4])];
  const f = { memory, view, moduleIdentity, generation, player, car, race, racer, ds, manager, style, metadata, put, get, initialize,
    mailboxBytes: () => Buffer.from(new Uint8Array(memory.buffer, BASE, SIZE)),
    protectedBytes: () => Buffer.concat(protectedRanges.map(([at, size]) => Buffer.from(new Uint8Array(memory.buffer, at, size)))) };
  prepare(f);
  if (register) Native.registerInstalledModule(moduleIdentity, { outputModuleHash: Native.outputModuleHash });
  f.service = Native.createBridge(memory, { moduleIdentity, moduleHash: RAW, generation });
  f.request = (id = 1, extra = {}) => f.service.request({ id, generation, car, race, allowNetwork: false, ...extra });
  return f;
}

function syntheticTerminalReceipt(f, r, { result = Native.RESULT.APPLIED, points = 100, nos = 333, pending = 100, state = 3 } = {}) {
  // This deliberately writes a SYNTHETIC protocol record to test decoding and
  // ownership checks. It is not native execution or evidence of an award.
  const values = { CONSUMED: r.id, CONSUMED_EPOCH: r.epoch, CONSUMED_TOKEN: r.token,
    CONSUMED_GENERATION: r.generation, OWNED_CAR: r.car, OWNED_RACE: r.race,
    OWNED_RACER: r.racer, OWNED_MANAGER: r.manager, OWNED_STYLE: r.style,
    RESULT: result, AWARD_RESULT: result, POINTS: points, NOS: nos, STATE: state, CALLS: 1,
    ACK_EPOCH: r.epoch, ACK_TOKEN: r.token, ACK_GENERATION: r.generation, ACK: r.id };
  for (const [key, value] of Object.entries(values)) f.put(BASE + F[key] * 4, value);
  f.view.setFloat32(BASE + F.PENDING_BEFORE * 4, 0, true);
  f.view.setFloat32(BASE + F.PENDING_AFTER * 4, pending, true);
  f.view.setFloat32(BASE + F.PENDING_DELTA * 4, pending, true);
}

test('only the pinned raw609 build is supported and unregistered modules leave memory untouched', () => {
  assert.equal(Native.supports(RAW), true); assert.equal(Native.supports('0'.repeat(64)), false);
  const f = fixture({ register: false }); assert.equal(f.service, null);
  assert.deepEqual(f.mailboxBytes(), Buffer.alloc(SIZE));
});

test('wrong module hash and unavailable compiled identity cannot claim mailbox bytes', () => {
  const f = fixture({ register: false }), before = f.protectedBytes();
  Native.registerInstalledModule(f.moduleIdentity, { outputModuleHash: Native.outputModuleHash });
  assert.equal(Native.createBridge(f.memory, { moduleIdentity: f.moduleIdentity, moduleHash: '0'.repeat(64), generation: 1 }), null);
  assert.equal(Native.createBridge(f.memory, { moduleIdentity: emptyModule(), moduleHash: RAW, generation: 1 }), null);
  assert.deepEqual(f.protectedBytes(), before);
});

test('wrong output pin cannot register a compiled module or grant a native service', () => {
  const f = fixture({ register: false }), before = f.protectedBytes();
  assert.equal(Native.registerInstalledModule(f.moduleIdentity, { outputModuleHash: '0'.repeat(64) }), false);
  assert.equal(Native.createBridge(f.memory, { moduleIdentity: f.moduleIdentity, moduleHash: RAW, generation: 1 }), null);
  assert.deepEqual(f.protectedBytes(), before);
});

test('startup refuses a blank or incomplete driving graph before any reservation write and can bind once initialized', () => {
  const blank = fixture({ initialized: false }); assert.equal(blank.service, null);
  assert.deepEqual(blank.mailboxBytes(), Buffer.alloc(SIZE));
  const before = blank.protectedBytes();
  assert.equal(Native.createBridge(blank.memory, { moduleIdentity: blank.moduleIdentity, moduleHash: RAW, generation: 1 }), null);
  assert.deepEqual(blank.protectedBytes(), before);
  blank.initialize();
  assert(Native.createBridge(blank.memory, { moduleIdentity: blank.moduleIdentity, moduleHash: RAW, generation: 1 }));
  for (const invalidate of [f => f.put(0x8654a4, 0), f => f.put(0xd00000, 0),
    f => f.put(f.player + 4, 0), f => f.put(0x890118, 0), f => f.put(f.race, 6), f => f.put(f.car + 0x1c, 0)]) {
    const f = fixture({ register: false });
    Native.registerInstalledModule(f.moduleIdentity, { outputModuleHash: Native.outputModuleHash });
    invalidate(f); const guarded = f.protectedBytes();
    assert.equal(Native.createBridge(f.memory, { moduleIdentity: f.moduleIdentity, moduleHash: RAW, generation: 1 }), null);
    assert.deepEqual(f.protectedBytes(), guarded); assert.deepEqual(f.mailboxBytes(), Buffer.alloc(SIZE));
  }
});

test('an occupied or partial reservation is preserved byte-for-byte when bridge creation is refused', () => {
  for (const offset of [0, 4, 8, 32, 128, 252, 255]) {
    let before;
    const f = fixture({ prepare(value) { new Uint8Array(value.memory.buffer)[BASE + offset] = 0x5a; before = value.protectedBytes(); } });
    assert.equal(f.service, null, 'Occupied byte ' + offset); assert.deepEqual(f.protectedBytes(), before);
  }
});

test('a registered peer or valid-looking foreign header cannot take over an existing reservation', () => {
  const f = fixture(); assert(f.service); const before = f.protectedBytes(), otherModule = emptyModule();
  Native.registerInstalledModule(otherModule, { outputModuleHash: Native.outputModuleHash });
  assert.equal(Native.createBridge(f.memory, { moduleIdentity: otherModule, moduleHash: RAW, generation: 2 }), null);
  assert.deepEqual(f.protectedBytes(), before);
  const header = f.mailboxBytes(); let foreignBefore;
  const foreign = fixture({ prepare(value) {
    new Uint8Array(value.memory.buffer, BASE, SIZE).set(header); foreignBefore = value.protectedBytes();
  } });
  assert.equal(foreign.service, null); assert.deepEqual(foreign.protectedBytes(), foreignBefore);
});

test('invalid generation cannot initialize or claim guest memory', () => {
  for (const generation of [0, -1, .5, '1', NaN, Infinity, 0x100000000]) {
    const f = fixture({ register: false }), before = f.protectedBytes();
    Native.registerInstalledModule(f.moduleIdentity, { outputModuleHash: Native.outputModuleHash });
    assert.equal(Native.createBridge(f.memory, { moduleIdentity: f.moduleIdentity, moduleHash: RAW, generation }), null);
    assert.deepEqual(f.protectedBytes(), before);
  }
});

test('request publication rejects stale generation or foreign car/race without modifying bytes', () => {
  for (const extra of [{ generation: 2 }, { generation: 0 }, { car: 0xe01004 }, { race: 0xe03004 },
    { id: 0 }, { id: -1 }, { id: .5 }, { id: 0x100000000 }]) {
    const f = fixture(); assert(f.service); const before = f.protectedBytes();
    assert.equal(f.request(1, extra).published, false); assert.deepEqual(f.protectedBytes(), before);
  }
});

test('live owner graph changes are rechecked before request publication', () => {
  const changes = [f => f.put(0xd00000, 0), f => f.put(f.player + 4, f.car + 4),
    f => f.put(0x890118, f.race + 4), f => f.put(f.race, 6), f => f.put(f.car + 0x1c, 0),
    f => f.put(f.racer, f.car + 4), f => f.put(f.racer + 468, 0), f => f.put(f.racer + 476, 0),
    f => f.put(f.manager, f.racer + 4), f => f.put(f.manager + 4, f.ds + 4), f => f.put(f.ds + 84, 0),
    f => f.put(f.style + 12, 27), f => f.put(f.metadata, 0)];
  for (const change of changes) {
    const f = fixture(); assert(f.service); change(f); const before = f.protectedBytes();
    assert.equal(f.request().published, false); assert.deepEqual(f.protectedBytes(), before);
  }
});

test('one pending request cannot be duplicated, silently replaced or completed by polling', () => {
  const f = fixture(); assert(f.service); const first = f.request(); assert.equal(first.published, true);
  const before = f.mailboxBytes();
  assert.equal(f.request().published, false); assert.equal(f.request(2).published, false);
  for (let i = 0; i < 10; i++) assert.notEqual(f.service.poll(first.request)?.acknowledged, true);
  assert.deepEqual(f.mailboxBytes(), before);
});

test('foreign cancellation identities preserve the owned request exactly', () => {
  const f = fixture(); assert(f.service); const published = f.request(); assert.equal(published.published, true);
  const before = f.mailboxBytes();
  for (const key of ['id', 'epoch', 'token', 'generation', 'car', 'race', 'racer', 'manager', 'style']) {
    f.service.cancel({ ...published.request, [key]: published.request[key] + 1 });
    assert.deepEqual(f.mailboxBytes(), before, 'Foreign cancel ' + key);
    assert.notEqual(f.service.poll({ ...published.request, [key]: published.request[key] + 1 })?.acknowledged, true);
  }
});

test('the exact reservation initializes with native work off and adjacent bytes untouched', () => {
  const f = fixture({ prepare(value) {
    value.view.setUint8(BASE - 1, 0xa5); value.view.setUint8(BASE + SIZE, 0x5a);
  } });
  assert(f.service); assert.equal(Native.mailbox.base, BASE); assert.equal(Native.mailbox.size, SIZE);
  assert.equal(f.view.getUint8(BASE - 1), 0xa5); assert.equal(f.view.getUint8(BASE + SIZE), 0x5a);
  assert.equal(f.get(BASE + F.MAGIC * 4), Native.mailbox.magic);
  assert.equal(f.get(BASE + F.END * 4), Native.mailbox.endMarker);
  for (const field of ['ENABLED', 'REQUEST', 'CANCEL', 'CONSUMED', 'STATE', 'CALLS']) {
    assert.equal(f.get(BASE + F[field] * 4), 0, 'Default-off ' + field);
  }
  const before = f.mailboxBytes(); assert.notEqual(f.service.poll({})?.acknowledged, true);
  assert.deepEqual(f.mailboxBytes(), before);
});

test('memory below exact609 minimum or nonshared memory cannot expose a service', () => {
  const moduleIdentity = emptyModule(); Native.registerInstalledModule(moduleIdentity, { outputModuleHash: Native.outputModuleHash });
  for (const memory of [new WebAssembly.Memory({ initial: 256, maximum: 256, shared: true }),
    new WebAssembly.Memory({ initial: 256 })]) {
    const before = Buffer.from(new Uint8Array(memory.buffer, BASE, SIZE));
    assert.equal(Native.createBridge(memory, { moduleIdentity, moduleHash: RAW, generation: 1 }), null);
    assert.deepEqual(Buffer.from(new Uint8Array(memory.buffer, BASE, SIZE)), before);
  }
});

test('only literal true grants online permission and truthy offline inputs never set the consent word', () => {
  for (const allowNetwork of [false, 1, 'true', 'false', {}, null, undefined]) {
    const f = fixture(); assert(f.service); f.put(0x850078, 8); const before = f.mailboxBytes();
    assert.equal(f.request(1, { allowNetwork }).published, false); assert.deepEqual(f.mailboxBytes(), before);
  }
  const f = fixture(); f.put(0x850078, 8); assert.equal(f.request(1, { allowNetwork: true }).published, true);
  assert.equal(f.get(BASE + F.ALLOW_NETWORK * 4), 1);
  const g = fixture(); assert.equal(g.request(1, { allowNetwork: 1 }).published, true);
  assert.equal(g.get(BASE + F.ALLOW_NETWORK * 4), 0);
});

test('an unconsumed request remains pending across clock changes and polling never retries native work', () => {
  const f = fixture(), published = f.request(); assert.equal(published.published, true);
  const before = f.mailboxBytes();
  for (const ticks of [1, 3000, 0x7fffffff, 0xffffffff, 0]) {
    f.put(0x86518c, ticks); assert.notEqual(f.service.poll(published.request)?.acknowledged, true);
    assert.equal(f.request(2).published, false); assert.deepEqual(f.mailboxBytes(), before);
  }
  assert.equal(f.get(BASE + F.CALLS * 4), 0, 'No native helper is invoked by the service');
});

test('busy unclaimed cancellation is retryable and then closes a zero-award terminal record', () => {
  const f = fixture(), published = f.request(); assert.equal(published.published, true);
  f.put(BASE + F.LOCK * 4, 1); const locked = f.mailboxBytes();
  assert.equal(f.service.cancel(published.request).requested, false); assert.deepEqual(f.mailboxBytes(), locked);
  f.put(BASE + F.LOCK * 4, 0);
  const result = f.service.cancel(published.request); assert.equal(result.requested, true); assert.equal(result.confirmed, true);
  assert.equal(result.unclaimed, true);
  assert.equal(f.get(BASE + F.ENABLED * 4), 0); assert.equal(f.get(BASE + F.CANCEL * 4), published.request.id);
  assert.equal(f.get(BASE + F.REQUEST * 4), published.request.id); assert.equal(f.get(BASE + F.EPOCH * 4), published.request.epoch);
  const receipt = f.service.poll(published.request); assert.equal(receipt.acknowledged, true);
  assert.equal(receipt.result, Native.RESULT.EVENT_UNVERIFIED); assert.equal(receipt.points, 0); assert.equal(receipt.nos, 0);
  assert.equal(f.get(BASE + F.CALLS * 4), 0); assert.equal(f.request(2).published, true);
});

test('unclaimed old-car cancellation releases its slot without the old racer updating and permits a new explicit target', () => {
  const f = fixture(), first = f.request(); assert.equal(first.published, true);
  const newCar = 0xe10000, newRace = 0xe13000;
  f.put(f.player + 4, newCar); f.put(0x890118, newRace); f.put(newRace, 4);
  f.put(newRace + 0x24, 1); f.put(newRace + 0xbd0, f.racer); f.put(newCar + 0x1c, f.racer); f.put(f.racer, newCar);
  const cancelled = f.service.cancel(first.request);
  assert.equal(cancelled.confirmed, true); assert.equal(cancelled.unclaimed, true);
  const receipt = f.service.poll(first.request); assert.equal(receipt.acknowledged, true);
  assert.equal(receipt.result, Native.RESULT.EVENT_UNVERIFIED); assert.equal(receipt.points, 0); assert.equal(receipt.nos, 0);
  assert.equal(f.get(BASE + F.CALLS * 4), 0);
  const next = f.request(2, { car: newCar, race: newRace }); assert.equal(next.published, true);
  assert.equal(next.request.id, 2); assert.equal(next.request.car, newCar); assert.equal(next.request.race, newRace);
  assert.equal(f.get(BASE + F.CALLS * 4), 0);
});

test('claimed or returned synthetic native state cancellation cannot fabricate a terminal no-award outcome', () => {
  for (const state of [1, 2]) {
    const f = fixture(), published = f.request(); assert.equal(published.published, true);
    for (const [key, value] of Object.entries({ STATE: state, CONSUMED: published.request.id,
      CONSUMED_EPOCH: published.request.epoch, CONSUMED_TOKEN: published.request.token,
      CONSUMED_GENERATION: published.request.generation })) f.put(BASE + F[key] * 4, value);
    const result = f.service.cancel(published.request); assert.equal(result.requested, true); assert.equal(result.confirmed, false);
    assert.equal(f.get(BASE + F.STATE * 4), state); assert.equal(f.get(BASE + F.ACK * 4), 0);
    assert.equal(f.get(BASE + F.POINTS * 4), 0); assert.equal(f.get(BASE + F.NOS * 4), 0);
    assert.notEqual(f.service.poll(published.request)?.acknowledged, true); assert.equal(f.request(2).published, false);
  }
});

test('advancing generation invalidates old service operations without letting a foreign module take ownership', () => {
  const f = fixture(), old = f.service;
  const next = Native.createBridge(f.memory, { moduleIdentity: f.moduleIdentity, moduleHash: RAW, generation: 2 });
  assert(next); assert.notEqual(next, old); const before = f.mailboxBytes();
  assert.equal(f.request().published, false); old.cancel({}); assert.notEqual(old.poll({})?.acknowledged, true);
  assert.deepEqual(f.mailboxBytes(), before);
  assert.equal(next.request({ id: 1, generation: 1, car: f.car, race: f.race }).published, false);
  assert.equal(next.request({ id: 1, generation: 2, car: f.car, race: f.race }).published, true);
});

test('a corrupt owned header disables cached-service creation and every old operation without overwriting it', () => {
  for (const field of ['MAGIC', 'VERSION', 'SIZE', 'END', 'TOKEN', 'GENERATION']) {
    const f = fixture(), published = f.request(); assert.equal(published.published, true);
    f.put(BASE + F[field] * 4, f.get(BASE + F[field] * 4) + 1); const before = f.mailboxBytes();
    assert.equal(Native.createBridge(f.memory, { moduleIdentity: f.moduleIdentity, moduleHash: RAW, generation: 1 }), null, field);
    assert.equal(Native.createBridge(f.memory, { moduleIdentity: f.moduleIdentity, moduleHash: RAW, generation: 2 }), null, 'Rebind ' + field);
    assert.equal(f.request(2).published, false); assert.notEqual(f.service.poll(published.request)?.acknowledged, true);
    assert.equal(f.service.cancel(published.request).requested, false); assert.deepEqual(f.mailboxBytes(), before);
  }
});

test('isCurrent detects hot header/owner loss without writing and distinguishes a legitimate generation advance', () => {
  for (const field of ['MAGIC', 'VERSION', 'SIZE', 'END', 'TOKEN', 'GENERATION']) {
    const f = fixture(); assert.equal(f.service.isCurrent(), true);
    f.put(BASE + F[field] * 4, f.get(BASE + F[field] * 4) + 1); const before = f.mailboxBytes();
    assert.equal(f.service.isCurrent(), false, field); assert.deepEqual(f.mailboxBytes(), before);
  }
  const f = fixture(), old = f.service;
  assert.equal(Native.createBridge(f.memory, { moduleIdentity: f.moduleIdentity, moduleHash: RAW, generation: 1 }), old);
  const next = Native.createBridge(f.memory, { moduleIdentity: f.moduleIdentity, moduleHash: RAW, generation: 2 });
  assert.equal(old.isCurrent(), false); assert.equal(next.isCurrent(), true);
});

test('synthetic terminal records decode signed outcomes and retain the distinction between producer points and tick NOS', () => {
  const f = fixture(), published = f.request(); assert.equal(published.published, true);
  syntheticTerminalReceipt(f, published.request, { result: Native.RESULT.AWARDED_NO_NOS, points: 100, nos: -5 });
  const before = f.mailboxBytes(), receipt = f.service.poll(published.request);
  assert.equal(receipt.acknowledged, true); assert.equal(receipt.points, 100); assert.equal(receipt.nos, -5);
  assert.equal(receipt.event.producerPendingPoints, 100); assert.equal(receipt.event.tickDeltasAreEventSpecific, false);
  assert.equal(receipt.event.status, 'VERIFIED'); assert.deepEqual(f.mailboxBytes(), before);
});

test('synthetic partial or foreign consumed identity cannot be trusted as a native terminal receipt', () => {
  for (const state of [0, 1, 2]) {
    const f = fixture(), published = f.request(); syntheticTerminalReceipt(f, published.request, { state });
    assert.notEqual(f.service.poll(published.request)?.acknowledged, true, 'Partial state ' + state);
  }
  for (const key of ['CONSUMED', 'CONSUMED_EPOCH', 'CONSUMED_TOKEN', 'CONSUMED_GENERATION']) {
    const f = fixture(), published = f.request(); syntheticTerminalReceipt(f, published.request);
    f.put(BASE + F[key] * 4, f.get(BASE + F[key] * 4) + 1); const before = f.mailboxBytes();
    assert.notEqual(f.service.poll(published.request)?.acknowledged, true, 'Foreign ' + key);
    assert.deepEqual(f.mailboxBytes(), before);
  }
});

test('matching ACK fields before final native STATE3 cannot reopen publication for request2', () => {
  for (const state of [0, 1, 2]) {
    const f = fixture(), published = f.request(); syntheticTerminalReceipt(f, published.request, { state });
    const before = f.mailboxBytes(); assert.equal(f.request(2).published, false, 'Premature ACK state ' + state);
    assert.deepEqual(f.mailboxBytes(), before);
    // The final native marker is the publication boundary. This test writes a
    // synthetic marker only; actual end-of5598 contention has separate tests.
    f.put(BASE + F.STATE * 4, 3); assert.equal(f.request(2).published, true);
    assert.equal(f.get(BASE + F.CALLS * 4), 1);
  }
});

test('a foreign synthetic consumed identity cannot release an acknowledged slot for a new request', () => {
  for (const key of ['CONSUMED', 'CONSUMED_EPOCH', 'CONSUMED_TOKEN', 'CONSUMED_GENERATION']) {
    const f = fixture(), published = f.request(); syntheticTerminalReceipt(f, published.request);
    f.put(BASE + F[key] * 4, f.get(BASE + F[key] * 4) + 1); const before = f.mailboxBytes();
    assert.equal(f.request(2).published, false, key); assert.deepEqual(f.mailboxBytes(), before);
  }
});

test('synthetic stale ACK fields never acknowledge a new owned request', () => {
  for (const key of ['ACK', 'ACK_EPOCH', 'ACK_TOKEN', 'ACK_GENERATION']) {
    const f = fixture(), published = f.request(); syntheticTerminalReceipt(f, published.request);
    f.put(BASE + F[key] * 4, f.get(BASE + F[key] * 4) + 1); const before = f.mailboxBytes();
    assert.notEqual(f.service.poll(published.request)?.acknowledged, true); assert.deepEqual(f.mailboxBytes(), before);
  }
});

test('synthetic foreign native owner evidence cannot produce a matching verified event', () => {
  for (const key of ['OWNED_CAR', 'OWNED_RACE', 'OWNED_RACER', 'OWNED_MANAGER', 'OWNED_STYLE']) {
    const f = fixture(), published = f.request(); syntheticTerminalReceipt(f, published.request);
    f.put(BASE + F[key] * 4, f.get(BASE + F[key] * 4) + 4); const before = f.mailboxBytes();
    const receipt = f.service.poll(published.request);
    assert(receipt?.acknowledged !== true || receipt.event?.status !== 'VERIFIED', 'Foreign ' + key);
    assert.deepEqual(f.mailboxBytes(), before);
  }
});

test('a synthetic terminal receipt hidden by a busy lock becomes readable without an award retry', () => {
  const f = fixture(), published = f.request(); assert.equal(published.published, true);
  f.put(BASE + F.LOCK * 4, 1);
  syntheticTerminalReceipt(f, published.request); const busy = f.mailboxBytes();
  assert.notEqual(f.service.poll(published.request)?.acknowledged, true); assert.deepEqual(f.mailboxBytes(), busy);
  f.put(BASE + F.LOCK * 4, 0);
  assert.equal(f.service.poll(published.request).acknowledged, true);
  assert.equal(f.request().published, false); assert.equal(f.get(BASE + F.CALLS * 4), 1);
  assert.equal(f.request(2).published, true); assert.equal(f.get(BASE + F.CALLS * 4), 1);
});

test('published, claimed or returned-but-uncompleted native requests cannot be erased by advancing generation', () => {
  for (const state of [0, 1, 2]) {
    const f = fixture(), published = f.request(); assert.equal(published.published, true);
    f.put(BASE + F.STATE * 4, state); const before = f.mailboxBytes(); let replacement = null;
    try { replacement = Native.createBridge(f.memory, { moduleIdentity: f.moduleIdentity, moduleHash: RAW, generation: 2 }); }
    catch (error) { assert.match(error.message, /pending/); }
    assert.equal(replacement, null); assert.deepEqual(f.mailboxBytes(), before);
    assert.equal(f.get(BASE + F.LOCK * 4), 0);
  }
});

test('incomplete synthetic STATE3 identity refuses generation rebind without overwriting the journal', () => {
  for (const key of ['ACK', 'ACK_EPOCH', 'ACK_TOKEN', 'ACK_GENERATION', 'CONSUMED', 'CONSUMED_EPOCH',
    'CONSUMED_TOKEN', 'CONSUMED_GENERATION']) {
    const f = fixture(), published = f.request(); syntheticTerminalReceipt(f, published.request);
    f.put(BASE + F[key] * 4, f.get(BASE + F[key] * 4) + 1); const before = f.mailboxBytes();
    assert.equal(Native.createBridge(f.memory, { moduleIdentity: f.moduleIdentity, moduleHash: RAW, generation: 2 }), null, key);
    assert.deepEqual(f.mailboxBytes(), before); assert.equal(f.service.isCurrent(), true);
  }
  const f = fixture(); f.put(BASE + F.STATE * 4, 3); const before = f.mailboxBytes();
  assert.equal(Native.createBridge(f.memory, { moduleIdentity: f.moduleIdentity, moduleHash: RAW, generation: 2 }), null);
  assert.deepEqual(f.mailboxBytes(), before);
});

test('a complete unclaimed-cancellation terminal record permits generation rebind and preserves no-retry ownership', () => {
  const f = fixture(), first = f.request(); assert.equal(first.published, true);
  assert.equal(f.service.cancel(first.request).confirmed, true);
  assert.equal(f.service.poll(first.request).acknowledged, true); assert.equal(f.get(BASE + F.CALLS * 4), 0);
  const next = Native.createBridge(f.memory, { moduleIdentity: f.moduleIdentity, moduleHash: RAW, generation: 2 });
  assert(next); assert.equal(f.service.isCurrent(), false); assert.equal(next.isCurrent(), true);
  assert.notEqual(next.poll(first.request)?.acknowledged, true);
  assert.equal(next.request({ id: 1, generation: 2, car: f.car, race: f.race }).published, true);
  assert.equal(f.get(BASE + F.CALLS * 4), 0);
});
