'use strict';
// Controller contract checks with a local service double. No game/native run,
// network, browser or extension installation is involved.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Control = require('../extension/near-miss-control.js');
const { EventWitness } = require('../extension/near-miss-events.js');
const KEYS = ['id', 'epoch', 'token', 'generation', 'car', 'race', 'racer', 'manager', 'style'];

function eventFor(request, { points = 100, nos = 333 } = {}) {
  const { id, epoch, ...target } = request;
  const r = { id, epoch, target }, expected = { cpu: 17, manager: target.manager, style: target.style,
    pairA: 0x700, pairB: 0x800 }, w = new EventWitness();
  w.queue(r, expected);
  const before = { ...expected, target, pendingState: 1, stylePending: 0, styleCount: 0 };
  w.beforeNative(before);
  w.observeConsumption({ ...before, pendingState: 2, receiver: target.style });
  w.afterNative({ ...expected, pairA: 0, pairB: 0, pendingState: 0, stylePending: 100, styleCount: 0 });
  return w.finish(r, { target, points, nos });
}
function fixture() {
  const context = { moduleIdentity: {}, moduleHash: 'pinned-module', generation: 1,
    car: 0x100, race: 0x200, safe: true, network: false, allowNetwork: false };
  const calls = { context: 0, request: [], poll: [], cancel: [] };
  let now = 0, receipt = null, lastRequest = null, requestResult = null, requestError = false, pollError = false, cancelBusy = 0;
  const bridge = { verified: true, ownsMailbox: true, witnessedEvents: true, protocolVersion: 4,
    moduleIdentity: context.moduleIdentity, moduleHash: context.moduleHash,
    request(input) {
      calls.request.push({ ...input });
      if (requestError) throw Error('Transport interrupted after publication');
      lastRequest = { id: input.id, epoch: 10 * input.id, token: 11, generation: input.generation,
        car: input.car, race: input.race, racer: 0x300, manager: 0x400, style: 0x500 };
      return requestResult || { published: true, request: lastRequest };
    },
    poll(input) { calls.poll.push(input); if (pollError) throw Error('Receipt unavailable'); return receipt; },
    cancel(input) {
      calls.cancel.push(input);
      if (cancelBusy > 0) { cancelBusy--; return { requested: false, reason: 'busy' }; }
      return { requested: true, confirmed: false };
    }
  };
  let activeBridge = bridge;
  const control = Control.create({ getBridge: () => activeBridge, getContext: () => { calls.context++; return context; },
    clock: () => now, timeoutMs: 100 });
  return { context, calls, bridge, control,
    get lastRequest() { return lastRequest; },
    setBridge(value) { activeBridge = value; }, advance(ms) { now += ms; },
    setRequestResult(value) { requestResult = value; }, throwRequest() { requestError = true; }, throwPoll() { pollError = true; },
    setCancelBusy(count) { cancelBusy = count; },
    setReceipt(value) { receipt = value; },
    receipt(extra = {}) {
      const points = extra.points ?? 100, nos = extra.nos ?? 333;
      const event = Object.prototype.hasOwnProperty.call(extra, 'event') ? extra.event : eventFor(lastRequest, { points, nos });
      return { acknowledged: true, request: { ...lastRequest }, result: 1, points, nos,
        event, ...extra };
    } };
}

test('unavailable service performs zero context/memory reads and no service I/O', () => {
  let contexts = 0;
  const c = Control.create({ getBridge: () => null, getContext: () => { contexts++; throw Error('Memory must not be read'); } });
  assert.equal(c.status().state, 'unavailable'); assert.equal(c.request().published, false);
  c.poll(); c.cancel(); c.invalidate(); assert.equal(contexts, 0);
});

test('missing or nonliteral bridge capabilities and wrong protocol are refused before context reads', () => {
  for (const [key, value] of [['verified', 1], ['verified', 'true'], ['ownsMailbox', false],
    ['witnessedEvents', undefined], ['protocolVersion', 3], ['protocolVersion', '4'], ['request', null], ['poll', null], ['cancel', null]]) {
    const f = fixture(); f.bridge[key] = value;
    assert.equal(f.control.status().available, false); assert.equal(f.control.request().published, false);
    assert.equal(f.calls.context, 0); assert.equal(f.calls.request.length, 0);
  }
});

test('wrong module object or module hash never publishes a request', () => {
  for (const key of ['moduleIdentity', 'moduleHash']) {
    const f = fixture(); f.bridge[key] = key === 'moduleIdentity' ? {} : 'other-module';
    assert.equal(f.control.status().available, false); assert.equal(f.control.request().published, false);
    assert.equal(f.calls.request.length, 0); assert.equal(f.calls.poll.length, 0); assert.equal(f.calls.cancel.length, 0);
  }
});

test('safe driving and literal network permission gate each explicit request', () => {
  for (const value of [false, 1, 'true', {}, null, undefined]) {
    const f = fixture(); f.context.network = true; f.context.allowNetwork = value;
    assert.equal(f.control.status().state, 'permission'); assert.equal(f.control.request().reason, 'permission');
    assert.equal(f.calls.request.length, 0);
  }
  const f = fixture(); f.context.network = true; f.context.allowNetwork = true;
  assert.equal(f.control.request().published, true); assert.equal(f.calls.request[0].allowNetwork, true);
  const g = fixture(); g.context.safe = false;
  assert.equal(g.control.request().reason, 'paused'); assert.equal(g.calls.request.length, 0);
  const h = fixture(); assert.equal(h.control.request().published, true); assert.equal(h.calls.request[0].allowNetwork, false);
});

test('publication is pending until an acknowledged receipt and one explicit request cannot duplicate', () => {
  const f = fixture(), r = f.control.request(); assert.equal(r.published, true); assert.equal(r.confirmed, false);
  assert.equal(f.control.status().state, 'pending'); assert.equal(f.control.request().reason, 'pending');
  f.control.poll(); f.control.poll(); assert.equal(f.calls.request.length, 1);
  assert.equal(Object.isFrozen(r.request), true);
});

test('invalid returned request identities retain unknown ownership and cannot be retried', () => {
  for (const key of KEYS) {
    const f = fixture(), bad = { id: 1, epoch: 10, token: 11, generation: 1, car: 0x100,
      race: 0x200, racer: 0x300, manager: 0x400, style: 0x500, [key]: 0 };
    f.setRequestResult({ published: true, request: bad });
    assert.equal(f.control.request().reason, 'invalid-request-identity');
    assert.equal(f.control.status().state, 'unknown'); assert.equal(f.control.request().reason, 'pending');
    f.control.poll(); f.control.cancel(); assert.equal(f.calls.poll.length, 0); assert.equal(f.calls.cancel.length, 0);
    assert.equal(f.calls.request.length, 1);
  }
  for (const key of ['id', 'generation', 'car', 'race']) {
    const f = fixture(), request = { id: 1, epoch: 10, token: 11, generation: 1, car: 0x100,
      race: 0x200, racer: 0x300, manager: 0x400, style: 0x500 };
    request[key]++; f.setRequestResult({ published: true, request });
    assert.equal(f.control.request().reason, 'invalid-request-identity');
  }
});

test('matching acknowledged receipt with matching helper event confirms style and labels NOS as tick data', () => {
  const f = fixture(); f.control.request(); f.setReceipt(f.receipt());
  const result = f.control.poll(); assert.equal(result.state, 'confirmed'); assert.equal(result.pending, false);
  assert.equal(result.eventPoints, 100); assert.equal(result.points, 100); assert.equal(result.nos, 333);
  assert.match(result.text, /tick style 100 · tick NOS 333/); assert.equal(result.canRequest, true);
  assert.equal(f.control.request().request.id, 2); assert.equal(f.calls.request.length, 2);
});

test('stale ACK identity or missing acknowledgement cannot confirm or clear the active request', () => {
  for (const key of KEYS) {
    const f = fixture(); f.control.request(); const receipt = f.receipt(); receipt.request[key]++;
    f.setReceipt(receipt); assert.equal(f.control.poll().state, 'pending'); assert.equal(f.control.status().pending, true);
    assert.equal(f.control.request().reason, 'pending'); assert.equal(f.calls.request.length, 1);
  }
  const f = fixture(); f.control.request(); f.setReceipt(f.receipt({ acknowledged: false }));
  assert.equal(f.control.poll().state, 'pending');
});

test('a stale or missing native event identity cannot turn a matching ACK into confirmation', () => {
  for (const key of KEYS) {
    const f = fixture(); f.control.request(); const receipt = f.receipt();
    const eventRequest = { ...receipt.event.request, target: { ...receipt.event.request.target } };
    if (key === 'id' || key === 'epoch') eventRequest[key]++; else eventRequest.target[key]++;
    receipt.event = { ...receipt.event, request: eventRequest }; f.setReceipt(receipt);
    assert.equal(f.control.poll().state, 'unconfirmed');
  }
  for (const event of [null, { status: 'VERIFIED', producerPendingPoints: 100 },
    { status: 'EVENT_UNVERIFIED' }, { status: 'VERIFIED', producerPendingPoints: 0 }]) {
    const f = fixture(); f.control.request(); f.setReceipt(f.receipt({ event })); assert.equal(f.control.poll().state, 'unconfirmed');
  }
});

test('native mismatch and no-award gates remain distinct from confirmed style production', () => {
  for (const [result, eventStatus, state] of [[11, 'EVENT_MISMATCH', 'event-mismatch'],
    [12, 'EVENT_UNVERIFIED', 'unconfirmed'], [6, 'NATIVE_GATE', 'native-gate']]) {
    const f = fixture(); f.control.request(); f.setReceipt(f.receipt({ result, points: 0, nos: 0,
      event: { status: eventStatus, producerPendingPoints: 0 } })); assert.equal(f.control.poll().state, state);
  }
});

test('signed whole-tick deltas survive confirmation and invalid numerical outcomes stay pending', () => {
  const f = fixture(); f.control.request(); f.setReceipt(f.receipt({ result: 9, nos: -5 }));
  const result = f.control.poll(); assert.equal(result.state, 'confirmed'); assert.equal(result.nos, -5);
  assert.match(result.text, /tick NOS -5/);
  const g = fixture(); g.control.request(); g.setReceipt(g.receipt({ result: 6, points: -50, nos: -5 }));
  const negative = g.control.poll(); assert.equal(negative.points, -50); assert.equal(negative.nos, -5);
  assert.equal(negative.state, 'unconfirmed');
  for (const value of [NaN, Infinity, -.5, 0x80000000, -0x80000001]) {
    const h = fixture(); h.control.request(); h.setReceipt(h.receipt({ event: null, nos: value }));
    assert.equal(h.control.poll().state, 'unknown'); assert.equal(h.control.status().pending, true);
    assert.equal(h.control.request().reason, 'pending');
  }
});

test('timeout, thrown publication and unavailable confirmation never trigger another request', () => {
  const f = fixture(); f.control.request(); f.advance(101);
  assert.equal(f.control.poll().state, 'unknown'); f.advance(1000); f.control.poll();
  assert.equal(f.control.request().reason, 'pending'); assert.equal(f.calls.request.length, 1);
  const g = fixture(); g.throwRequest(); assert.equal(g.control.request().reason, 'outcome-unknown');
  g.advance(1000); g.control.poll(); assert.equal(g.control.request().reason, 'pending'); assert.equal(g.calls.request.length, 1);
  const h = fixture(); h.control.request(); h.throwPoll(); assert.equal(h.control.poll().state, 'unknown');
  assert.equal(h.control.request().reason, 'pending'); assert.equal(h.calls.request.length, 1);
});

test('cancel sends only the exact current-session request and remains unconfirmed until receipt', () => {
  const f = fixture(); const published = f.control.request(); const result = f.control.cancel();
  assert.equal(f.calls.cancel.length, 1); assert.deepEqual(f.calls.cancel[0], published.request);
  assert.equal(result.state, 'unknown'); assert.equal(result.pending, true); assert.equal(f.control.request().reason, 'pending');
  f.setReceipt(f.receipt({ result: 7, event: null, points: 0, nos: 0 })); assert.equal(f.control.poll().state, 'unconfirmed');
});

test('losing safe state or online consent cancels once and still waits for the actual native receipt', () => {
  for (const transition of ['safe', 'allowNetwork']) {
    const f = fixture(); f.context.network = true; f.context.allowNetwork = true;
    f.control.request(); f.context[transition] = false;
    f.control.poll(); f.control.poll(); f.control.cancel(); f.control.poll();
    assert.equal(f.calls.cancel.length, 1, transition + ' must cancel at most once');
    assert.equal(f.calls.request.length, 1); assert.equal(f.control.status().pending, true);
    assert.equal(f.control.request().published, false);
    // A cancellation request does not manufacture a no-award outcome. The
    // native work may already have completed, so its real receipt still wins.
    f.setReceipt(f.receipt()); f.control.poll(); assert.equal(f.control.status().pending, false);
    f.context[transition] = true;
    assert.equal(f.control.status().state, 'confirmed'); assert.equal(f.control.status().nos, 333);
    assert.equal(f.calls.cancel.length, 1); assert.equal(f.calls.request.length, 1);
  }
});

test('busy withdrawal retries only cancellation until accepted and never queues another award', () => {
  const f = fixture(); f.control.request(); f.setCancelBusy(1);
  f.control.cancel(); assert.equal(f.calls.cancel.length, 1); assert.equal(f.control.status().pending, true);
  f.control.poll(); assert.equal(f.calls.cancel.length, 2);
  f.control.poll(); f.control.cancel(); f.control.poll(); assert.equal(f.calls.cancel.length, 2);
  assert.equal(f.calls.request.length, 1); assert.equal(f.control.request().reason, 'pending');
  f.setReceipt(f.receipt({ result: 7, event: null, points: 0, nos: 0 }));
  assert.equal(f.control.poll().state, 'unconfirmed'); assert.equal(f.control.status().pending, false);
  assert.equal(f.calls.request.length, 1); assert.equal(f.calls.cancel.length, 2);
});

test('module session or bridge replacement invalidates before stale poll/cancel I/O and request IDs remain monotonic', () => {
  for (const operation of ['poll', 'cancel']) {
    for (const key of ['moduleIdentity', 'moduleHash', 'generation']) {
      const f = fixture(); f.control.request(); f.context[key] = key === 'moduleIdentity' ? {} :
        typeof f.context[key] === 'number' ? f.context[key] + 1 : 'next-module';
      f.control[operation](); assert.equal(f.calls[operation].length, 0); assert.equal(f.control.status().pending, false);
    }
    const f = fixture(); f.control.request(); f.setBridge({ ...f.bridge }); f.control[operation]();
    assert.equal(f.calls[operation].length, 0); assert.equal(f.control.status().pending, false);
  }
  const f = fixture(); f.control.request(); f.context.generation++;
  f.control.poll(); assert.equal(f.control.request().request.id, 2);
});

test('same-session car or race changes cancel the exact old request and wait for its terminal receipt before request2', () => {
  for (const key of ['car', 'race']) {
    const f = fixture(), first = f.control.request(), oldRequest = { ...first.request };
    f.context[key] += 0x1000;
    f.control.poll(); f.control.poll(); f.control.cancel();
    assert.equal(f.calls.cancel.length, 1); assert.deepEqual(f.calls.cancel[0], oldRequest);
    assert.equal(f.calls.poll.length, 2); assert.deepEqual(f.calls.poll[0], oldRequest);
    assert.equal(f.control.status().pending, true); assert.equal(f.calls.request.length, 1);
    assert.equal(f.control.request().reason, 'pending');
    f.setReceipt(f.receipt({ result: 12, event: null, points: 0, nos: 0 }));
    const terminal = f.control.poll();
    assert.equal(terminal.state, 'unconfirmed'); assert.equal(terminal.pending, false);
    assert.equal(terminal.points, 0); assert.equal(terminal.nos, 0);
    assert.match(terminal.text, /^Previous car request · /); assert.equal(f.calls.request.length, 1);
    const next = f.control.request(); assert.equal(next.published, true); assert.equal(next.request.id, 2);
    assert.equal(next.request.car, f.context.car); assert.equal(next.request.race, f.context.race);
    assert.equal(f.calls.request.length, 2); assert.equal(f.calls.cancel.length, 1);
  }
});

test('a bridge becoming unavailable or changing its module in place invalidates before any later I/O', () => {
  for (const operation of ['poll', 'cancel']) {
    for (const [key, value] of [['verified', false], ['moduleIdentity', {}], ['moduleHash', 'changed-in-place']]) {
      const f = fixture(); f.control.request(); f.bridge[key] = value;
      f.control[operation](); assert.equal(f.calls[operation].length, 0, operation + ' after ' + key);
      assert.equal(f.control.status().pending, false);
    }
  }
});
