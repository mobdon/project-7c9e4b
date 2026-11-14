'use strict';

// A process-local guard, not an OS firewall. The fixtures also receive no
// networking imports, and the viewer contains no executable JavaScript.
const { syncBuiltinESMExports } = require('node:module');

function installNetworkIsolation() {
  const attempts = [];
  const changes = [];
  let restored = false;

  function patch(target, key, api) {
    if (!target || typeof target[key] !== 'function') return;
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (descriptor && !descriptor.configurable && !descriptor.writable) {
      throw new Error(`Cannot install the offline guard for ${api}.`);
    }
    const original = target[key];
    const denied = function () {
      attempts.push({ api, at: new Date().toISOString() });
      const error = new Error(`${api} is disabled in Report Lab. No request was sent.`);
      error.code = 'OFFLINE_NETWORK_DENIED';
      throw error;
    };
    Object.defineProperty(target, key, {
      configurable: descriptor ? descriptor.configurable : true,
      enumerable: descriptor ? descriptor.enumerable : true,
      value: denied,
      writable: true
    });
    changes.push(() => {
      if (descriptor) Object.defineProperty(target, key, descriptor);
      else {
        delete target[key];
        // Normally only prototype-owned properties take this path.
        if (target[key] !== original && original !== undefined) target[key] = original;
      }
    });
  }

  function methods(target, names, prefix) {
    for (const name of names) patch(target, name, `${prefix}.${name}`);
  }

  try {
    methods(globalThis, ['fetch', 'WebSocket', 'EventSource'], 'global');
    const net = require('node:net');
    methods(net, ['connect', 'createConnection', 'createServer'], 'net');
    methods(net.Socket.prototype, ['connect'], 'net.Socket');
    methods(net.Server.prototype, ['listen'], 'net.Server');
    methods(require('node:http'), ['request', 'get', 'createServer'], 'http');
    methods(require('node:https'), ['request', 'get', 'createServer'], 'https');
    methods(require('node:tls'), ['connect', 'createServer'], 'tls');
    const dgram = require('node:dgram');
    methods(dgram, ['createSocket'], 'dgram');
    methods(dgram.Socket.prototype, ['send', 'bind', 'connect'], 'dgram.Socket');
    const dns = require('node:dns');
    const dnsMethods = [
      'lookup', 'lookupService', 'resolve', 'resolve4', 'resolve6', 'resolveAny',
      'resolveCaa', 'resolveCname', 'resolveMx', 'resolveNaptr', 'resolveNs',
      'resolvePtr', 'resolveSoa', 'resolveSrv', 'resolveTxt', 'resolveTlsa', 'reverse'
    ];
    methods(dns, dnsMethods, 'dns');
    methods(dns.promises, dnsMethods, 'dns.promises');
    methods(require('node:child_process'), [
      'spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork'
    ], 'child_process');
    methods(require('node:worker_threads'), ['Worker'], 'worker_threads');
    syncBuiltinESMExports();
  } catch (error) {
    for (const restore of changes.reverse()) restore();
    syncBuiltinESMExports();
    throw error;
  }

  return {
    attempts,
    restore() {
      if (restored) return;
      for (const restore of changes.reverse()) restore();
      syncBuiltinESMExports();
      restored = true;
    }
  };
}

module.exports = { installNetworkIsolation };
