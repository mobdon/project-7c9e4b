'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// The originals are replaced with inert traps before isolation is installed.
// A regression can therefore fail this test without creating a socket, process,
// worker, or outbound request.
test('network isolation denies common outbound APIs before invoking their originals and restores them', () => {
  const net = require('node:net');
  const http = require('node:http');
  const https = require('node:https');
  const tls = require('node:tls');
  const dgram = require('node:dgram');
  const dns = require('node:dns');
  const child = require('node:child_process');
  const threads = require('node:worker_threads');
  const originals = [];
  const endpoints = [];
  let originalCalls = 0;

  function trap(object, key, label, invoke) {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (!descriptor && !(object === globalThis && ['WebSocket', 'EventSource'].includes(key))) return;
    const replacement = function inertOriginal() { originalCalls++; return undefined; };
    originals.push({ object, key, descriptor, replacement });
    Object.defineProperty(object, key, { configurable: true, writable: true, enumerable: descriptor?.enumerable ?? false, value: replacement });
    endpoints.push({ label, invoke: () => invoke(object[key]) });
  }

  trap(globalThis, 'fetch', 'fetch', fn => fn('https://example.invalid/'));
  trap(globalThis, 'WebSocket', 'WebSocket', fn => new fn('wss://example.invalid/'));
  trap(globalThis, 'EventSource', 'EventSource', fn => new fn('https://example.invalid/'));
  for (const key of ['connect', 'createConnection']) trap(net, key, 'net.' + key, fn => fn({ host: 'example.invalid', port: 443 }));
  trap(net.Socket.prototype, 'connect', 'Socket.connect', fn => fn.call({}, { host: 'example.invalid', port: 443 }));
  for (const [label, object] of [['http', http], ['https', https]]) {
    for (const key of ['request', 'get']) trap(object, key, label + '.' + key, fn => fn('https://example.invalid/'));
  }
  trap(tls, 'connect', 'tls.connect', fn => fn({ host: 'example.invalid', port: 443 }));
  trap(dgram, 'createSocket', 'dgram.createSocket', fn => fn('udp4'));
  for (const key of ['send', 'bind', 'connect']) trap(dgram.Socket.prototype, key, 'dgram.Socket.' + key, fn => fn.call({}, Buffer.from('offline')));
  for (const key of ['lookup', 'resolve', 'resolve4', 'resolve6', 'reverse']) {
    trap(dns, key, 'dns.' + key, fn => fn('example.invalid', () => {}));
    trap(dns.promises, key, 'dns.promises.' + key, fn => fn('example.invalid'));
  }
  for (const key of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) {
    trap(child, key, 'child_process.' + key, fn => fn('unstarted-offline-test'));
  }
  trap(threads, 'Worker', 'worker_threads.Worker', fn => new fn('unstarted-offline-test'));

  let isolation;
  try {
    isolation = require('../lib/network-isolation.cjs').installNetworkIsolation();
    assert.ok(Array.isArray(isolation.attempts));
    for (const endpoint of endpoints) {
      assert.throws(endpoint.invoke, error => error?.code === 'OFFLINE_NETWORK_DENIED', endpoint.label);
    }
    assert.equal(originalCalls, 0, 'No original transport or process entry point may run');
    assert.equal(isolation.attempts.length, endpoints.length, 'Each attempted operation must be recorded');
    for (const entry of isolation.attempts) {
      assert.equal(typeof entry.api, 'string');
      assert.ok(entry.api.length > 0);
      assert.ok(entry.at !== undefined, 'An attempt includes its timestamp');
    }
    isolation.restore();
    isolation = null;
    for (const { object, key, replacement } of originals) assert.equal(object[key], replacement, key + ' restored to pre-install function');
  } finally {
    isolation?.restore();
    for (const { object, key, descriptor } of originals.reverse()) {
      if (descriptor) Object.defineProperty(object, key, descriptor);
      else delete object[key];
    }
  }
});
