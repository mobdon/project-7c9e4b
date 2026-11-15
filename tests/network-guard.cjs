'use strict';
// Unit-test preload: no network. Wasm unit doubles remain permitted.
const path=require('node:path'),assert=require('node:assert/strict');
assert(process.env.NFSU2_RESEARCH_ROOT);
const isolation=require(path.join(process.env.NFSU2_RESEARCH_ROOT,'offline-report-lab/lib/network-isolation.cjs')).installNetworkIsolation();
process.on('exit',()=>{if(isolation.attempts.length){process.stderr.write('Unexpected test network attempts: '+JSON.stringify(isolation.attempts)+'\n');process.exitCode=1;}});
