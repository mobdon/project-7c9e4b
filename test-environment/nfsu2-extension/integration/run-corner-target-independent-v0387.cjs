'use strict';
// Run the reviewed matrix unchanged, redirecting its proof to a new peer
// receipt instead of overwriting the author's native test evidence.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const root=path.resolve(__dirname,'..'),file=path.join(root,'native/corner-target.test.cjs');
const originalProof=path.join(root,'native/corner-target-tests.json');
const peerProof=path.join(root,'integration/native-corner-target-independent-behavior-v0387.json');
const before=fs.readFileSync(originalProof),source=fs.readFileSync(file,'utf8');
const run=new Module(file,module);run.filename=file;run.paths=Module._nodeModulePaths(path.dirname(file));
const realRequire=run.require.bind(run);
run.require=name=>name==='node:fs'?{...fs,writeFileSync(target,data){
 assert.equal(path.resolve(target),originalProof);assert.deepEqual(fs.readFileSync(originalProof),before);
 fs.writeFileSync(peerProof,data,{flag:'wx'});
}}:realRequire(name);
process.on('exit',()=>{assert.deepEqual(fs.readFileSync(originalProof),before);assert.equal(fs.readFileSync(file,'utf8'),source);});
run._compile(source,file);
