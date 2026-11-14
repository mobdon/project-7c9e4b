'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Engine, A } = require('../extension/core.js');
const profile = require('../extension/609-profile.js');

test('609 state requires its verified host tuple to fit actual memory', () => {
  const memory = new WebAssembly.Memory({ initial: 256, maximum: 300, shared: true });
  const engine = new Engine(memory, 64, profile.hash);
  assert.equal(engine.requireNetworkTuple, true);
  assert.deepEqual([...engine.networkAddresses], [704993496, 707422704, 707407324]);
  assert.deepEqual(engine.state(), { ready: false, reason: 'Waiting for verified network state.' });
  assert.equal(engine.networkState(), true, 'Unavailable host cells must not be interpreted as solo.');
});

test('609 network detection reads only its current tuple and preserves consent gating', () => {
  const memory = new WebAssembly.Memory({ initial: 11264, maximum: 16384, shared: true });
  const view = new DataView(memory.buffer);
  const engine = new Engine(memory, 64, profile.hash);
  const put = (at, value) => view.setUint32(at, value, true);
  const player = 0xe00000, car = 0xe01000, race = 0xe04000;
  put(A.FLOW, 6); put(A.MODE, 1); put(A.PLAYER, player); put(player + 4, car);
  put(A.RACE, race); put(race, 4); put(car + A.GEAR, 3);
  view.setFloat32(car + A.RPM, 6000, true);
  put(car + A.NOS_FULL, 40000); put(A.TICKS, 200000);
  const [host, active, client] = engine.networkAddresses;
  for (let flags = 0; flags < 8; flags++) {
    put(host, flags & 1 ? 1 : 0); view.setUint8(active, flags & 2 ? 1 : 0); put(client, flags & 4 ? 1 : 0);
    const state = engine.state();
    assert.equal(state.ready, true);
    assert.equal(state.network, flags === 7);
  }
  put(car + A.NOS_LEFT, 100); put(car + A.NOS_SINCE, 195000);
  assert.equal(engine.refill(engine.state()), false, 'The native tuple must enforce the existing online opt-in.');
  assert.equal(view.getUint32(car + A.NOS_LEFT, true), 100);
  assert.equal(engine.refill(engine.state(), true), true);
  assert.equal(view.getUint32(car + A.NOS_LEFT, true), 40000);
  for (const address of [host, client]) put(address, 0);
  view.setUint8(active, 0); put(A.MODE, 0x208);
  assert.equal(engine.state().network, true, 'Conventional network indicators remain active.');
});
