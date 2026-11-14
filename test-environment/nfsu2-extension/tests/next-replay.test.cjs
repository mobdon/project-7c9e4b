'use strict';
// Runs existing state-machine suites against the production PACE payload with
// its actual function-index ABI and the generated next-build bridge fixture.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const raw=Uint8Array.from(require('../extension/next-profile.js').pace.bridge);
const leb=n=>{const a=[];do{const b=n&127;n>>>=7;a.push(b|(n?128:0));}while(n);return a;};
const str=s=>[...leb(Buffer.byteLength(s)),...Buffer.from(s)];
const section=(id,a)=>[id,...leb(a.length),...a];
const imports=[...leb(21264),...str('env'),...str('memory'),2,3,...leb(256),...leb(65536)];
for(let i=0;i<21263;i++)imports.push(...str(i===16154||i===21262?'env':'unused'),...str(i===16154?'original':i===21262?'catchup':String(i)),0,0);
const bytes=Buffer.from([0,97,115,109,1,0,0,0,...section(1,[1,96,1,127,0]),...section(2,imports),...section(3,[1,0]),...section(7,[1,...str('step'),0,...leb(21263)]),...section(10,[1,...leb(raw.length),...raw])]);
assert.equal(WebAssembly.validate(bytes),true);
globalThis.__NEXT_PACE_MODULE__=new WebAssembly.Module(bytes);
globalThis.__NEXT_PACE_UNUSED__=new Proxy({}, {get:()=>()=>{throw Error('PACE invoked an unexpected function index');}});
for(const file of ['pace.test.cjs','ai.test.cjs','dyno-bridge.test.cjs']){
 let s=fs.readFileSync(path.join(root,'tests',file),'utf8');
 s=s.replaceAll("__dirname+'/ai-bridge.wasm'","__dirname+'/ai-next-bridge.wasm'");
 s=s.replace("new WebAssembly.Module(fs.readFileSync(__dirname+'/ai-pace.wasm'))",'globalThis.__NEXT_PACE_MODULE__');
 s=s.replace('new WebAssembly.Instance(paceModule,{env:', 'new WebAssembly.Instance(paceModule,{unused:globalThis.__NEXT_PACE_UNUSED__,env:');
 // Replay every state machine against the next bridge and capability profile.
 s=s.replaceAll("__dirname+'/ai-swap-probe.wasm'","__dirname+'/ai-next-swap-probe.wasm'");
 s=s.replaceAll('/../research/game.wasm','/../research/compatibility-93af6ccb/game.wasm');
 s=s.replace('original.length,37839055','original.length,38205596');
 s=s.replace('[4497,4653,21213,21262,22720]','[2459,3174,4497,4653,7395,8871,17404,19197,19277,21213,21263,22508]');
 if(file==='dyno-bridge.test.cjs')s=s.replace('new Controller(memory,true)',"new Controller(memory,true,'93af6ccb')");
 else s=s.replaceAll('new Controller(memory,true)',"new Controller(memory,true,require('../extension/next-profile.js').capabilities)");
 const m=new Module(path.join(root,'tests','next-replay-'+file),module);m.filename=path.join(root,'tests','next-replay-'+file);m.paths=Module._nodeModulePaths(path.join(root,'tests'));m._compile(s,m.filename);
}
