'use strict';
// Pure adversarial witness checks. No native execution, transport or file writes.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventWitness, STATUS, productionSupported } = require('../extension/near-miss-events.js');

const TARGET = Object.freeze({ token: 11, generation: 1, car: 0x100, race: 0x200,
  racer: 0x300, manager: 0x400, style: 0x500 });
const REQUEST = Object.freeze({ id: 1, epoch: 10, target: TARGET });
const EXPECTED = Object.freeze({ cpu: 0x600, manager: TARGET.manager, style: TARGET.style,
  pairA: 0x700, pairB: 0x800 });
function fixture() {
  const witness = new EventWitness();
  const before = { ...EXPECTED, target: { ...TARGET }, pendingState: 1, stylePending: 0, styleCount: 0 };
  const after = { ...EXPECTED, pairA: 0, pairB: 0, pendingState: 0, stylePending: 100, styleCount: 1 };
  witness.queue(REQUEST, EXPECTED);
  return { witness, before, after,
    enter() { return witness.beforeNative(before); }, exit() { return witness.afterNative(after); },
    consume(change = {}) { return witness.observeConsumption({ ...before, pendingState: 2, receiver: EXPECTED.style, ...change }); },
    finish(extra = {}, r = REQUEST) { return witness.finish(r, { target: { ...TARGET }, points: 100, nos: 333, ...extra }); } };
}

test('one matching complete native event verifies pending style and reports observed tick deltas', () => {
  const f = fixture(); assert.equal(f.enter(), true); assert.equal(f.consume(), true); assert.equal(f.exit(), true);
  const result = f.finish(); assert.equal(result.status, STATUS.VERIFIED);
  assert.equal(result.nativePendingPoints, 100); assert.equal(result.nativeStyleCount, 1);
  assert.equal(result.points, 100); assert.equal(result.nos, 333);
  assert.equal(result.tickDeltasAreEventSpecific, false); assert.equal(productionSupported, false);
});

test('the attribution counterexample rejects a replacement pair despite positive native and tick deltas', () => {
  for (const replacement of [{ pairA: 0x900 }, { pairB: 0xa00 }, { pairA: EXPECTED.pairB, pairB: EXPECTED.pairA }]) {
    const f = fixture(); Object.assign(f.before, replacement); f.enter(); f.consume(); f.exit();
    const result = f.finish(); assert.equal(result.status, STATUS.EVENT_MISMATCH);
    assert.equal(result.reason, 'consumed-event-mismatch'); assert.equal(result.points, 100); assert.equal(result.nos, 333);
    assert.equal(result.nativePendingPoints, 100);
  }
});

test('replacement inside18088 before17146 is mismatched even when outer entry and native deltas match', () => {
  const f = fixture(); f.enter(); f.consume({ pairA: 0x900, pairB: 0xa00 }); f.exit();
  const result = f.finish(); assert.equal(result.status, STATUS.EVENT_MISMATCH);
  assert.equal(result.reason, 'consumed-event-mismatch'); assert.equal(result.producerPendingPoints, 100);
  assert.equal(result.points, 100); assert.equal(result.nos, 333);
});

test('outer18088 entry/exit and positive style deltas without inner consumption evidence remain unverified', () => {
  const f = fixture(); f.enter(); f.exit(); const result = f.finish();
  assert.equal(result.status, STATUS.EVENT_UNVERIFIED); assert.equal(result.reason, 'missing-consumption-witness');
  assert.equal(result.nativePendingPoints, 100); assert.equal(result.producerPendingPoints, null);
});

test('inner producer receiver, session and native identity must match the claimed request', () => {
  for (const key of ['cpu', 'manager', 'style', 'pairA', 'pairB', 'receiver']) {
    const f = fixture(); f.enter(); f.consume({ [key]: (key === 'receiver' ? EXPECTED.style : EXPECTED[key]) + 1 }); f.exit();
    assert.equal(f.finish().status, STATUS.EVENT_MISMATCH);
  }
  for (const key of Object.keys(TARGET)) {
    const f = fixture(); f.enter(); f.consume({ target: { ...TARGET, [key]: TARGET[key] + 1 } }); f.exit();
    assert.equal(f.finish().status, STATUS.EVENT_MISMATCH);
  }
});

test('duplicate, malformed, premature or late consumption observations never verify an award', () => {
  for (const invoke of [f => { f.enter(); f.consume(); f.consume(); f.exit(); },
    f => { f.consume(); f.enter(); f.consume(); f.exit(); },
    f => { f.enter(); f.exit(); f.consume(); },
    f => { f.enter(); f.consume({ receiver: undefined }); f.exit(); },
    f => { f.enter(); f.consume({ pendingState: 1 }); f.exit(); },
    f => { f.enter(); f.consume({ stylePending: 5 }); f.exit(); }]) {
    const f = fixture(); invoke(f); assert.equal(f.finish().status, STATUS.EVENT_UNVERIFIED);
  }
});

test('net tick deltas without a native entry/exit never verify the requested event', () => {
  const f = fixture(), result = f.finish(); assert.equal(result.status, STATUS.EVENT_UNVERIFIED);
  assert.equal(result.nativePendingPoints, null); assert.equal(result.points, 100); assert.equal(result.nos, 333);
  assert.throws(() => f.witness.queue(REQUEST, EXPECTED), /cannot be replayed/);
});

test('missing exit, unmatched exit and multiple or reentrant native calls fail closed', () => {
  for (const invoke of [f => f.enter(), f => f.exit(), f => { f.enter(); f.exit(); f.enter(); f.exit(); },
    f => { f.enter(); f.enter(); f.exit(); f.exit(); }]) {
    const f = fixture(); invoke(f); assert.equal(f.finish().status, STATUS.EVENT_UNVERIFIED);
  }
});

test('CPU, manager, style and session changes at native entry or completion are mismatches', () => {
  for (const key of ['cpu', 'manager', 'style']) {
    const f = fixture(); f.before[key]++; f.enter(); f.consume(); f.exit(); assert.equal(f.finish().status, STATUS.EVENT_MISMATCH);
  }
  for (const key of Object.keys(TARGET)) {
    const f = fixture(); f.before.target[key]++; f.enter(); f.consume(); f.exit(); assert.equal(f.finish().status, STATUS.EVENT_MISMATCH);
    const g = fixture(); g.enter(); g.consume(); g.exit(); assert.equal(g.finish({ target: { ...TARGET, [key]: TARGET[key] + 1 } }).status, STATUS.EVENT_MISMATCH);
  }
  for (const key of ['id', 'epoch']) {
    const f = fixture(); f.enter(); f.consume(); f.exit(); assert.equal(f.finish({}, { ...REQUEST, [key]: REQUEST[key] + 1 }).status, STATUS.EVENT_MISMATCH);
  }
});

test('return identity mismatch cannot verify another native call', () => {
  for (const key of ['cpu', 'manager', 'style']) {
    const f = fixture(); f.enter(); f.consume(); f.after[key]++; f.exit(); assert.equal(f.finish().status, STATUS.EVENT_MISMATCH);
  }
});

test('native style regression or an unconsumed pending pair cannot verify an event', () => {
  for (const change of [{ stylePending: 0 }, { stylePending: -1 }, { pendingState: 1 }, { pairA: EXPECTED.pairA }, { pairB: EXPECTED.pairB }]) {
    const f = fixture(); f.enter(); f.consume(); Object.assign(f.after, change); f.exit(); assert.equal(f.finish().status, STATUS.EVENT_UNVERIFIED);
  }
  const f = fixture(); f.before.pendingState = 0; f.enter(); f.consume(); f.exit(); assert.equal(f.finish().status, STATUS.EVENT_UNVERIFIED);
});

test('invalid native observations fail closed and signed tick deltas remain intact', () => {
  for (const value of [NaN, Infinity, -Infinity, undefined]) {
    const f = fixture(); f.before.stylePending = value; assert.equal(f.enter(), false);
    f.exit(); assert.equal(f.finish().status, STATUS.EVENT_UNVERIFIED);
    const g = fixture(); g.enter(); g.after.stylePending = value; assert.equal(g.exit(), false);
    assert.equal(g.finish().status, STATUS.EVENT_UNVERIFIED);
  }
  const f = fixture(); f.enter(); f.consume(); f.exit(); const result = f.finish({ points: -50, nos: -5 });
  assert.equal(result.status, STATUS.VERIFIED); assert.equal(result.points, -50); assert.equal(result.nos, -5);
  for (const value of [NaN, Infinity, .5, 0x80000000, -0x80000001]) {
    const g = fixture(); assert.throws(() => g.finish({ nos: value }), /signed int32/);
  }
});

test('tickets and observations are copied, and completion cannot be replayed or silently superseded', () => {
  const witness = new EventWitness(), r = { ...REQUEST, target: { ...TARGET } }, expected = { ...EXPECTED };
  const ticket = witness.queue(r, expected); r.target.token++; expected.pairA++;
  assert.equal(ticket.request.target.token, TARGET.token); assert.equal(ticket.expected.pairA, EXPECTED.pairA);
  assert.throws(() => witness.queue({ ...REQUEST, id: 2 }, EXPECTED), /already pending/);
  const before = { ...EXPECTED, target: { ...TARGET }, pendingState: 1, stylePending: 0, styleCount: 0 };
  witness.beforeNative(before);
  witness.observeConsumption({ ...before, pendingState: 2, receiver: EXPECTED.style });
  before.pairA++; before.target.token++;
  witness.afterNative({ ...EXPECTED, pairA: 0, pairB: 0, pendingState: 0, stylePending: 100, styleCount: 1 });
  assert.equal(witness.finish(REQUEST, { target: TARGET, points: 100, nos: 333 }).status, STATUS.VERIFIED);
  assert.equal(witness.finish(REQUEST, { target: TARGET, points: 100, nos: 333 }).status, STATUS.EVENT_UNVERIFIED);
  assert.throws(() => witness.queue(REQUEST, EXPECTED), /cannot be replayed/);
  assert.doesNotThrow(() => witness.queue({ ...REQUEST, id: 2, epoch: 12 }, EXPECTED));
});

test('invalid queue ownership and native pair identities are rejected before publication', () => {
  for (const change of [{ pairA: EXPECTED.pairB }, { pairA: 0 }, { pairB: 0x100000000 }, { manager: TARGET.manager + 1 }, { style: TARGET.style + 1 }]) {
    assert.throws(() => new EventWitness().queue(REQUEST, { ...EXPECTED, ...change }));
  }
});

test('abandon closes only the matching stale request and prevents its replay across late callbacks', () => {
  const f = fixture(); f.enter(); f.consume();
  assert.equal(f.witness.abandon({ ...REQUEST, epoch: REQUEST.epoch + 1 }).abandoned, false);
  assert.equal(f.witness.abandon(REQUEST).abandoned, true);
  assert.equal(f.exit(), false); assert.equal(f.consume(), false);
  assert.equal(f.finish().status, STATUS.EVENT_UNVERIFIED);
  assert.throws(() => f.witness.queue(REQUEST, EXPECTED), /cannot be replayed/);
  assert.doesNotThrow(() => f.witness.queue({ ...REQUEST, id: 2, epoch: 12 }, EXPECTED));
});

test('late null or invalid completion ownership closes the ticket as unverified without escaping the callback', () => {
  const invalidTargets = [null, undefined, {}, ...Object.keys(TARGET).map(key => ({ ...TARGET, [key]: 0 })),
    { ...TARGET, car: NaN }, { ...TARGET, style: 0x100000000 }];
  for (const target of invalidTargets) {
    const f = fixture(); f.enter(); f.consume(); f.exit();
    let result; assert.doesNotThrow(() => { result = f.finish({ target }); });
    assert.equal(result.status, STATUS.EVENT_UNVERIFIED); assert.equal(result.reason, 'invalid-completion-target');
    assert.equal(result.points, 100); assert.equal(result.nos, 333);
    assert.equal(result.producerPendingPoints, 100); assert.equal(f.witness.active, null);
    assert.throws(() => f.witness.queue(REQUEST, EXPECTED), /cannot be replayed/);
    assert.doesNotThrow(() => f.witness.queue({ ...REQUEST, id: 2, epoch: 12 }, EXPECTED));
  }
});

test('a matching complete native gate with unchanged pending style/count is separate from missing evidence', () => {
  const f = fixture(); f.enter(); f.after.stylePending = 0; f.after.styleCount = 0; f.exit();
  const result = f.finish(); assert.equal(result.status, STATUS.NATIVE_GATE);
  assert.equal(result.producerPendingPoints, 0); assert.equal(result.nativeInvocations, 1);
  assert.equal(result.points, 100); assert.equal(result.nos, 333);
  const missing = fixture().finish(); assert.equal(missing.status, STATUS.EVENT_UNVERIFIED);
});

test('browser script publishes its UMD API without a Node dependency or native capability claim', () => {
  const fs = require('node:fs'), vm = require('node:vm');
  const source = fs.readFileSync(require.resolve('../extension/near-miss-events.js'), 'utf8');
  const context = vm.createContext({}); vm.runInContext(source, context);
  const api = context.__NFSU2_NEAR_MISS_EVENTS__;
  assert.equal(typeof api.EventWitness, 'function'); assert.equal(api.productionSupported, false);
  assert.equal(api.STATUS.EVENT_MISMATCH, STATUS.EVENT_MISMATCH);
  assert.equal(Object.isFrozen(api), true);
});
