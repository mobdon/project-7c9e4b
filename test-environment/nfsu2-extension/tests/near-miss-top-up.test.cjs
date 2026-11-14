'use strict';
// Scheduler contract tests. The control double represents acknowledged
// outcomes; no native code, guest memory, game or network is executed here.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const TopUp = require('../extension/near-miss-top-up.js');
const HASH = '81d2e32d7ee67bb93a8fafee4dbc17570f8d4980be238d7434e15c791904b945';

function fixture(options = {}) {
  const sample = { moduleIdentity: {}, moduleHash: HASH, generation: 1, car: 0xe01000, race: 0xe03000,
    full: 5000, remaining: 1000, active: false, elapsedTicks: 0 };
  const calls = { request: [], poll: 0, cancel: 0, withdrawal: 0, sample: 0 };
  let now = 0, eligibility = 'idle', pending = false, nextId = 1, outcome = { state: 'idle' }, completion = null;
  let cancelWanted = false, cancelAccepted = false, cancelBusy = 0;
  let sampleError = false, statusError = false, requestError = false, pollError = false, rejectReason = null;
  function status() {
    if (statusError) throw Error('Control status unavailable');
    return { ...outcome, state: eligibility === 'idle' ? outcome.state : eligibility, outcomeState: outcome.state,
      available: eligibility !== 'unavailable', pending, canRequest: eligibility === 'idle' && !pending };
  }
  function withdraw() { calls.withdrawal++; if (cancelBusy > 0) cancelBusy--; else cancelAccepted = true; }
  const control = {
    status,
    request() {
      const request = { id: nextId++, car: sample.car, race: sample.race, generation: sample.generation };
      calls.request.push(request);
      if (requestError) throw Error('Publication interrupted');
      if (rejectReason) {
        outcome = { state: 'unknown' }; pending = true;
        return { published: false, reason: rejectReason };
      }
      pending = true; cancelWanted = false; cancelAccepted = false; outcome = { state: 'pending' };
      return { published: true, confirmed: false, request };
    },
    poll() {
      calls.poll++; if (pollError) throw Error('Confirmation interrupted');
      if (pending && cancelWanted && !cancelAccepted) withdraw();
      if (completion) { outcome = completion; completion = null; pending = false; }
      return status();
    },
    cancel() {
      calls.cancel++;
      if (pending) {
        cancelWanted = true; if (!cancelAccepted) withdraw(); outcome = { state: 'unknown' };
      }
      return status();
    }
  };
  const scheduler = TopUp.create({ control, getSample: () => {
    calls.sample++; if (sampleError) throw Error('Sample unavailable'); return { ...sample };
  }, clock: () => now, intervalMs: 250, timeoutMs: 4000, ...options });
  return { sample, calls, control, scheduler,
    advance(ms) { now += ms; }, setEligibility(value) { eligibility = value; },
    complete(extra = {}) { completion = { state: 'confirmed', result: 1, points: 100, nos: 333, ...extra }; },
    setOutcome(extra = {}, isPending = true) { outcome = { ...extra }; pending = isPending; },
    busyCancellation(count = 1) { cancelBusy = count; },
    failSample() { sampleError = true; }, failStatus() { statusError = true; }, failRequest() { requestError = true; },
    failPoll() { pollError = true; }, rejectPublication(reason = 'outcome-unknown') { rejectReason = reason; } };
}

test('level computes active consumption without clamping native overfill and rejects unusable capacity data', () => {
  const inactive = TopUp.level({ full: 5000, remaining: 5000, active: false });
  assert.equal(inactive.atFull, true); assert.equal(inactive.effective, 5000); assert.equal(inactive.deficit, 0);
  assert.equal(Object.isFrozen(inactive), true);
  const active = TopUp.level({ full: 5000, remaining: 5000, active: true, elapsedTicks: 200 });
  assert.equal(active.effective, 4800); assert.equal(active.deficit, 200); assert.equal(active.atFull, false);
  assert.equal(TopUp.level({ full: 5000, remaining: 1000, active: true, elapsedTicks: 2000 }).effective, 0);
  const over = TopUp.level({ full: 5000, remaining: 6000, active: false });
  assert.equal(over.effective, 6000); assert.equal(over.atFull, true); assert.equal(over.deficit, 0);
  const base = { full: 5000, remaining: 1000, active: false };
  for (const extra of [{ full: 0 }, { full: -1 }, { full: NaN }, { full: Infinity }, { full: 10000000 },
    { remaining: -1 }, { remaining: NaN }, { remaining: 10000000 }, { remaining: 1.5 },
    { active: undefined }, { active: 1 }, { active: true, elapsedTicks: -1 },
    { active: true, elapsedTicks: NaN }, { active: true, elapsedTicks: 0x7fffffff }]) {
    assert.equal(TopUp.level({ ...base, ...extra }), null);
  }
});

test('top-up defaults off and enabling only arms without immediately dispatching', () => {
  const f = fixture(); assert.equal(f.scheduler.status().enabled, false);
  f.scheduler.poll(); f.advance(10000); f.scheduler.poll(); assert.equal(f.calls.request.length, 0);
  f.scheduler.setEnabled(true); assert.equal(f.scheduler.status().enabled, true); assert.equal(f.calls.request.length, 0);
  f.scheduler.poll(); assert.equal(f.calls.request.length, 1);
});

test('full and overfull keep opt-in armed without awards and resume only after fresh consumption', () => {
  for (const remaining of [5000, 6000]) {
    const f = fixture(); f.sample.remaining = remaining; f.scheduler.setEnabled(true);
    f.scheduler.poll(); f.advance(1000); f.scheduler.poll();
    assert.equal(f.scheduler.status().enabled, true); assert.equal(f.scheduler.status().state, 'full');
    assert.equal(f.calls.request.length, 0);
    f.sample.remaining = 4000; f.scheduler.poll(); assert.equal(f.calls.request.length, 1);
  }
});

test('invalid capacity, unavailable service or another pending request cannot arm the scheduler', () => {
  for (const extra of [{ full: 0 }, { full: NaN }, { remaining: undefined }, { active: true, elapsedTicks: -1 }]) {
    const f = fixture(); Object.assign(f.sample, extra); f.scheduler.setEnabled(true); f.scheduler.poll();
    assert.equal(f.scheduler.status().enabled, false); assert.equal(f.calls.request.length, 0);
  }
  for (const reason of ['paused', 'permission', 'unavailable']) {
    const f = fixture(); f.setEligibility(reason); f.scheduler.setEnabled(true); f.scheduler.poll();
    assert.equal(f.scheduler.status().enabled, false); assert.equal(f.calls.request.length, 0);
  }
  const f = fixture(); f.setOutcome({ state: 'pending' }, true); f.scheduler.setEnabled(true); f.scheduler.poll();
  assert.equal(f.scheduler.status().enabled, false); assert.equal(f.calls.request.length, 0); assert.equal(f.calls.cancel, 0);
});

test('underfull dispatch has one outstanding request despite repeated polls and elapsed intervals', () => {
  const f = fixture(); f.scheduler.setEnabled(true); f.scheduler.poll();
  for (let i = 0; i < 5; i++) { f.advance(300); f.scheduler.poll(); }
  assert.equal(f.calls.request.length, 1); assert.equal(f.scheduler.status().pending, true);
});

test('a positive matching outcome starts cooldown at acknowledgement and uses a fresh sample at its boundary', () => {
  const f = fixture(); f.scheduler.setEnabled(true); f.scheduler.poll(); f.advance(1000);
  f.sample.remaining = 3000; f.complete(); f.scheduler.poll(); assert.equal(f.calls.request.length, 1);
  f.advance(249); f.scheduler.poll(); assert.equal(f.calls.request.length, 1);
  f.sample.remaining = 5000; f.advance(1); f.scheduler.poll(); assert.equal(f.calls.request.length, 1);
  assert.equal(f.scheduler.status().enabled, true); assert.equal(f.scheduler.status().state, 'full');
  f.sample.remaining = 4000; f.scheduler.poll(); assert.equal(f.calls.request.length, 2);
  assert.deepEqual(f.calls.request.map(r => r.id), [1, 2]);
});

test('a slow confirmation poll starts the full interval after the receipt becomes observable', () => {
  const f = fixture(); f.scheduler.setEnabled(true); f.scheduler.poll(); f.advance(1000);
  const originalPoll = f.control.poll;
  f.control.poll = () => { f.advance(70); return originalPoll(); };
  f.complete(); f.scheduler.poll();
  assert.equal(f.scheduler.status().nextAt, 1320);
  f.advance(249); f.scheduler.poll(); assert.equal(f.calls.request.length, 1);
  f.advance(1); f.scheduler.poll(); assert.equal(f.calls.request.length, 2);
});

test('becoming full while pending withdraws that request, drains its zero terminal and does not loop while full', () => {
  const f = fixture(); f.scheduler.setEnabled(true); f.scheduler.poll(); f.sample.remaining = 5000;
  f.scheduler.poll(); f.scheduler.poll(); assert.equal(f.calls.withdrawal, 1); assert.equal(f.calls.request.length, 1);
  f.complete({ state: 'unconfirmed', result: 12, points: 0, nos: 0 }); f.scheduler.poll();
  f.advance(1000); f.scheduler.poll(); assert.equal(f.scheduler.status().enabled, true);
  assert.equal(f.calls.request.length, 1); assert.equal(f.scheduler.status().state, 'full');
  f.sample.remaining = 4500; f.scheduler.poll(); assert.equal(f.calls.request.length, 2);
});

test('temporary unsafe or permission pause resumes the same owner only after terminal drain and cooldown', () => {
  for (const reason of ['paused', 'permission']) {
    const f = fixture(); f.scheduler.setEnabled(true); f.scheduler.poll(); f.setEligibility(reason);
    f.scheduler.pause(reason); f.scheduler.poll(); assert.equal(f.calls.withdrawal, 1);
    assert.equal(f.scheduler.status().enabled, true); assert.equal(f.calls.request.length, 1);
    f.complete({ state: 'unconfirmed', result: 12, points: 0, nos: 0 }); f.scheduler.poll();
    f.setEligibility('idle'); f.advance(249); f.scheduler.poll(); assert.equal(f.calls.request.length, 1);
    f.advance(1); f.scheduler.poll(); assert.equal(f.calls.request.length, 2);
  }
});

test('disable cancels owned work, retries only busy withdrawal and a late successful receipt cannot re-enable', () => {
  const f = fixture(); f.scheduler.setEnabled(true); f.scheduler.poll(); f.busyCancellation();
  f.scheduler.setEnabled(false); assert.equal(f.scheduler.status().enabled, false);
  f.scheduler.poll(); f.scheduler.poll(); assert.equal(f.calls.withdrawal, 2); assert.equal(f.calls.request.length, 1);
  f.complete(); f.scheduler.poll(); f.advance(10000); f.scheduler.poll();
  assert.equal(f.scheduler.status().enabled, false); assert.equal(f.calls.request.length, 1);
});

test('identity changes disarm before any automatic award for a different module, generation, car or race', () => {
  for (const key of ['moduleIdentity', 'moduleHash', 'generation', 'car', 'race']) {
    const f = fixture(); f.scheduler.setEnabled(true); f.scheduler.poll();
    f.sample[key] = key === 'moduleIdentity' ? {} : key === 'moduleHash' ? '0'.repeat(64) : f.sample[key] + 1;
    f.scheduler.poll(); assert.equal(f.scheduler.status().enabled, false, key); assert.equal(f.calls.request.length, 1);
    f.complete(); f.scheduler.poll(); f.advance(1000); f.scheduler.poll();
    assert.equal(f.scheduler.status().enabled, false); assert.equal(f.calls.request.length, 1);
  }
});

test('unknown, unconfirmed, native-gated and no-positive-NOS outcomes hard stop rather than farm style points', () => {
  for (const outcome of [{ state: 'unknown' }, { state: 'unconfirmed', result: 12 },
    { state: 'event-mismatch', result: 11 }, { state: 'native-gate', result: 6 },
    { state: 'confirmed', result: 9, nos: 0 }, { state: 'confirmed', result: 9, nos: -5 },
    { state: 'confirmed', result: 1, nos: 0 }]) {
    const f = fixture(); f.scheduler.setEnabled(true); f.scheduler.poll(); f.complete(outcome); f.scheduler.poll();
    assert.equal(f.scheduler.status().enabled, false, JSON.stringify(outcome));
    f.complete(); f.advance(10000); f.scheduler.poll(); f.scheduler.poll(); assert.equal(f.calls.request.length, 1);
  }
});

test('a masked unknown outcome and an outstanding timeout remain hard stopped even after a late ACK', () => {
  const f = fixture(); f.scheduler.setEnabled(true); f.scheduler.poll();
  f.setOutcome({ state: 'unknown' }, true); f.setEligibility('paused'); f.scheduler.poll();
  assert.equal(f.scheduler.status().enabled, false); assert.equal(f.calls.request.length, 1);
  const g = fixture(); g.scheduler.setEnabled(true); g.scheduler.poll(); g.advance(4001); g.scheduler.poll();
  assert.equal(g.scheduler.status().enabled, false); g.complete(); g.scheduler.poll(); g.advance(10000); g.scheduler.poll();
  assert.equal(g.scheduler.status().enabled, false); assert.equal(g.calls.request.length, 1);
});

test('sample, control, publication and confirmation errors cannot cause automatic retries', () => {
  for (const failure of ['failSample', 'failStatus', 'failRequest', 'failPoll', 'rejectPublication']) {
    const f = fixture(); f.scheduler.setEnabled(true);
    if (failure === 'failPoll') f.scheduler.poll();
    f[failure](); assert.doesNotThrow(() => f.scheduler.poll());
    assert.equal(f.scheduler.status().enabled, false, failure);
    const count = f.calls.request.length; f.advance(10000); assert.doesNotThrow(() => f.scheduler.poll());
    assert.equal(f.calls.request.length, count);
  }
});

test('an enabled idle scheduler never steals or cancels an independent manual request', () => {
  const f = fixture(); f.scheduler.setEnabled(true); f.setOutcome({ state: 'pending' }, true);
  f.scheduler.poll(); f.advance(1000); f.scheduler.poll();
  assert.equal(f.calls.request.length, 0); assert.equal(f.calls.cancel, 0); assert.equal(f.calls.poll, 0);
});

test('a foreign request appearing only in the final fresh read disarms without touching that request', () => {
  const f = fixture(); f.scheduler.setEnabled(true);
  const originalStatus = f.control.status; let reads = 0;
  f.control.status = () => {
    if (++reads === 2) f.setOutcome({ state: 'pending' }, true);
    return originalStatus();
  };
  f.scheduler.poll();
  assert.equal(f.scheduler.status().enabled, false);
  assert.equal(f.scheduler.status().reason, 'independent-request');
  assert.equal(f.calls.request.length, 0); assert.equal(f.calls.cancel, 0); assert.equal(f.calls.poll, 0);
  f.setOutcome({ state: 'confirmed', result: 1, nos: 333 }, false);
  f.advance(1000); f.scheduler.poll(); assert.equal(f.calls.request.length, 0);
});
