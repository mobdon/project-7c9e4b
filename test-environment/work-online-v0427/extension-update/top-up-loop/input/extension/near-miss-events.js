(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.__NFSU2_NEAR_MISS_EVENTS__ = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
'use strict';
// OFFLINE LAB ONLY. Read-only observations at native18088 entry/exit and at
// native17146 entry while that18088 invocation is active. Outer deltas alone
// cannot establish which pending pair the inner producer actually consumed.
// Address identity in this bounded fixture does not prove production lifetime,
// exclusion against physical acquisition, or a callable extension worker bridge.
function assert(condition, message) { if (!condition) throw new TypeError(message); }

const STATUS = Object.freeze({
  VERIFIED: 'VERIFIED',
  NATIVE_GATE: 'NATIVE_GATE',
  EVENT_MISMATCH: 'EVENT_MISMATCH',
  EVENT_UNVERIFIED: 'EVENT_UNVERIFIED'
});
const TARGET = Object.freeze(['token', 'generation', 'car', 'race', 'racer', 'manager', 'style']);
const NATIVE = Object.freeze(['cpu', 'manager', 'style', 'pairA', 'pairB']);

function uint32(value, label, allowZero = false) {
  assert(Number.isInteger(value) && value >= (allowZero ? 0 : 1) && value <= 0xffffffff,
    'Invalid uint32 ' + label);
  return value;
}
function target(value) {
  assert(value && typeof value === 'object', 'Missing target identity');
  return Object.freeze(Object.fromEntries(TARGET.map(key => [key, uint32(value[key], 'target.' + key)])));
}
function request(value) {
  assert(value && typeof value === 'object', 'Missing request identity');
  return Object.freeze({
    id: uint32(value.id, 'request.id'),
    epoch: uint32(value.epoch, 'request.epoch', true),
    target: target(value.target)
  });
}
function sameTarget(a, b) { return TARGET.every(key => a[key] === b[key]); }
function sameRequest(a, b) { return a.id === b.id && a.epoch === b.epoch && sameTarget(a.target, b.target); }
function requestKey(r) { return [r.id, r.epoch, ...TARGET.map(key => r.target[key])].join(':'); }
function nativeIdentity(value, allowZeroPair = false) {
  assert(value && typeof value === 'object', 'Missing native observation');
  return Object.fromEntries(NATIVE.map(key => [key,
    uint32(value[key], 'native.' + key, allowZeroPair && (key === 'pairA' || key === 'pairB'))]));
}
function observation(value, isEntry) {
  const native = nativeIdentity(value, !isEntry);
  const pendingState = uint32(value.pendingState, 'native.pendingState', true);
  assert(pendingState <= 0xff, 'Invalid native pending byte');
  assert(Number.isFinite(value.stylePending), 'Invalid native pending style points');
  const styleCount = uint32(value.styleCount, 'native.styleCount', true);
  return Object.freeze({ ...native, pendingState, stylePending: value.stylePending, styleCount,
    ...(isEntry ? { target: target(value.target) } : {}) });
}
function signedDelta(value, label) {
  assert(Number.isInteger(value) && value >= -0x80000000 && value <= 0x7fffffff,
    'Invalid signed int32 ' + label);
  return value;
}

class EventWitness {
  constructor() {
    this.active = null;
    this.finished = new Set();
  }

  queue(value, expected) {
    const r = request(value), identity = nativeIdentity(expected);
    assert(identity.manager === r.target.manager && identity.style === r.target.style,
      'Queued manager/style must match request ownership');
    assert(identity.pairA !== identity.pairB, 'Queued pair must contain distinct native objects');
    assert(!this.active, 'An event witness is already pending');
    assert(!this.finished.has(requestKey(r)), 'A finished event witness cannot be replayed');
    this.active = { request: r, expected: Object.freeze(identity), entries: [], stack: [], issues: [] };
    return Object.freeze({ request: r, expected: this.active.expected });
  }

  beforeNative(value) {
    const a = this.active;
    if (!a) return false;
    try {
      const before = observation(value, true), entry = { before, after: null, consumptions: [] };
      a.entries.push(entry);
      a.stack.push(entry);
      if (a.entries.length !== 1) a.issues.push('multiple-native-invocations');
      if (!sameTarget(before.target, a.request.target)) a.issues.push('entry-session-mismatch');
      if (!NATIVE.every(key => before[key] === a.expected[key])) a.issues.push('consumed-event-mismatch');
      if (before.pendingState === 0) a.issues.push('no-pending-event-at-entry');
      return true;
    } catch (error) {
      a.issues.push('invalid-entry-observation');
      return false;
    }
  }

  observeConsumption(value) {
    const a = this.active;
    if (!a) return false;
    const entry = a.stack[a.stack.length - 1];
    if (!entry) { a.issues.push('consumption-outside-native-invocation'); return false; }
    try {
      // Original17146 uses CPU+4 as its style receiver. Requiring that actual
      // register distinguishes this producer from another native style call.
      const sample = Object.freeze({ ...observation(value, true),
        receiver: uint32(value.receiver, 'native.producerReceiver') });
      entry.consumptions.push(sample);
      if (a.entries.reduce((count, event) => count + event.consumptions.length, 0) !== 1) {
        a.issues.push('multiple-native-consumptions');
      }
      if (!sameTarget(sample.target, a.request.target)) a.issues.push('consumption-session-mismatch');
      if (!NATIVE.every(key => sample[key] === a.expected[key])) a.issues.push('consumed-event-mismatch');
      if (sample.receiver !== a.expected.style) a.issues.push('native-producer-receiver-mismatch');
      if (sample.pendingState !== 2) a.issues.push('unexpected-pending-state-at-consumption');
      if (sample.stylePending !== entry.before.stylePending || sample.styleCount !== entry.before.styleCount) {
        a.issues.push('pre-consumption-style-change');
      }
      return true;
    } catch (error) {
      a.issues.push('invalid-consumption-observation');
      return false;
    }
  }

  afterNative(value) {
    const a = this.active;
    if (!a) return false;
    const entry = a.stack.pop();
    if (!entry) { a.issues.push('exit-without-entry'); return false; }
    try {
      const after = observation(value, false);
      entry.after = after;
      if (['cpu', 'manager', 'style'].some(key => after[key] !== entry.before[key])) {
        a.issues.push('native-return-identity-mismatch');
      }
      return true;
    } catch (error) {
      a.issues.push('invalid-exit-observation');
      return false;
    }
  }

  abandon(value) {
    const r = request(value), a = this.active;
    if (!a) return Object.freeze({ abandoned: false, reason: 'no-pending-ticket' });
    if (!sameRequest(r, a.request)) return Object.freeze({ abandoned: false, reason: 'request-mismatch' });
    this.active = null;
    this.finished.add(requestKey(a.request));
    return Object.freeze({ abandoned: true, status: STATUS.EVENT_UNVERIFIED,
      reason: 'abandoned-ticket', request: a.request });
  }

  finish(value, outcome) {
    const r = request(value);
    const points = signedDelta(outcome.points, 'tick points'), nos = signedDelta(outcome.nos, 'tick NOS');
    // Completion reads live ownership: a car/session disappearing can produce
    // null pointers. That is a failed observation, not an invalid new ticket.
    // It must still close the old ticket without escaping the native callback.
    let currentTarget = null;
    try { currentTarget = target(outcome.target); } catch (error) {}
    const a = this.active;
    if (!a) return Object.freeze({ status: STATUS.EVENT_UNVERIFIED, reason: 'no-pending-ticket', points, nos,
      producerPendingPoints: null, nativePendingPoints: null, nativeStyleCount: null, nativeInvocations: 0,
      nativeConsumptions: 0, tickDeltasAreEventSpecific: false, pairIdentityIsAddressOnly: true });

    // Close even failed/incomplete observations. A missing witness never retries
    // an already consumed native event; mailbox durability is a separate layer.
    this.active = null;
    this.finished.add(requestKey(a.request));
    const issues = a.issues.slice();
    if (!sameRequest(r, a.request)) issues.push('completion-request-mismatch');
    if (!currentTarget) issues.push('invalid-completion-target');
    else if (!sameTarget(currentTarget, a.request.target)) issues.push('completion-session-mismatch');
    const entry = a.entries.length === 1 ? a.entries[0] : null;
    const complete = !!entry && !!entry.after && a.stack.length === 0;
    let nativePendingPoints = null, producerPendingPoints = null, nativeStyleCount = null;
    const nativeConsumptions = a.entries.reduce((count, event) => count + event.consumptions.length, 0);
    if (complete) {
      nativePendingPoints = entry.after.stylePending - entry.before.stylePending;
      nativeStyleCount = entry.after.styleCount - entry.before.styleCount;
      if (!Number.isFinite(nativePendingPoints)) issues.push('invalid-native-style-delta');
      if (entry.after.pendingState !== 0 || entry.after.pairA !== 0 || entry.after.pairB !== 0) {
        issues.push('pending-event-not-cleared');
      }
      if (nativePendingPoints < 0 || nativeStyleCount < 0) issues.push('native-style-regressed');
      if (nativePendingPoints === 0 && nativeStyleCount !== 0) issues.push('no-native-style-advance');
      if (entry.consumptions.length === 1) {
        producerPendingPoints = entry.after.stylePending - entry.consumptions[0].stylePending;
      } else if (nativePendingPoints === 0 && nativeStyleCount === 0 && nativeConsumptions === 0) {
        producerPendingPoints = 0;
      }
      if (nativePendingPoints > 0 && nativeConsumptions !== 1) issues.push('missing-consumption-witness');
    } else issues.push('missing-complete-native-invocation');

    const mismatch = issues.find(issue => issue.endsWith('-mismatch'));
    const status = mismatch ? STATUS.EVENT_MISMATCH : issues.length ? STATUS.EVENT_UNVERIFIED
      : nativePendingPoints > 0 ? STATUS.VERIFIED : STATUS.NATIVE_GATE;
    return Object.freeze({ status, reason: mismatch || issues[0] || (status === STATUS.NATIVE_GATE
      ? 'matching-native-event-no-style-advance' : 'matching-native-event-style-advance'),
      points, nos, producerPendingPoints, nativePendingPoints, nativeStyleCount,
      nativeInvocations: a.entries.length, nativeConsumptions,
      request: a.request, expected: a.expected,
      observations: Object.freeze(a.entries.map(event => Object.freeze({ ...event,
        consumptions: Object.freeze(event.consumptions.slice()) }))),
      issues: Object.freeze(issues),
      // Whole5598 tick deltas are reported intact; this witness correlates the
      // queued event with17146 pending-style production, not all later NOS credit.
      tickDeltasAreEventSpecific: false, pairIdentityIsAddressOnly: true });
  }
}

return Object.freeze({ EventWitness, STATUS, TARGET, productionSupported: false,
  productionBlocker: 'Only bounded test callbacks observe native18088/native17146; production object lifetime, event arbitration, owned mailbox allocation and extension worker access remain unverified.' });
});
