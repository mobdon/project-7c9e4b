'use strict';
// Repin the frozen authored branch fragment against the reviewed .6 target
// consumers. Compile only; no complete/native game body is saved to disk.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),workspace=path.dirname(root),extension=path.join(root,'extension');
assert(process.argv.slice(2).every(x=>['--final','--geometry'].includes(x)));
const receiptName=process.argv.includes('--geometry')?'shortcut-repin-v0386-geometry.json':process.argv.includes('--final')?'shortcut-repin-v0386-final.json':'shortcut-repin-v0386.json';
const P=require('../../work-aa-profile/tools/native-proof.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const leb=n=>{const out=[];do{const x=n&127;n>>>=7;out.push(x|(n?128:0));}while(n);return Buffer.from(out);};
const section=(id,b)=>Buffer.concat([Buffer.from([id]),leb(b.length),b]);
async function main(){
 const sourcePath=path.join(workspace,'work-race-shortcuts/shortcut-policy.js'),frozen=fs.readFileSync(sourcePath,'utf8');
 assert.equal(hash(Buffer.from(frozen)),'ce726a180387094afbd99c32e0090fc02bf070ba906d6ac1eda7e76e59007b71');
 const match=frozen.match(/const config=(.*);\nconst hash=/);assert(match);
 const plan=JSON.parse(match[1]),c=vm.createContext({console,crypto:crypto.webcrypto,WebAssembly,Uint8Array,Int32Array,Float32Array,DataView,ArrayBuffer,SharedArrayBuffer,performance,atob});
 const manifest=JSON.parse(fs.readFileSync(path.join(extension,'manifest.json'),'utf8'));
 for(const name of manifest.content_scripts[0].js)if(!['page.js','shortcut-policy.js'].includes(name))new vm.Script(fs.readFileSync(path.join(extension,name),'utf8'),{filename:name}).runInContext(c);
 const raw=P.pinned(P.CURRENT),base=await c.__NFSU2_AI__.patchBytes(raw),full=Buffer.from(await c.__NFSU2_FORWARD_NATIVE_PATCHER__.patchModule(base,{verifiedOriginalHash:P.CURRENT.hash}));
 const parsed=P.parse(full),original=parsed.bodies.get(plan.index);assert.equal(hash(original),plan.originalHash);assert.equal(original.length,plan.originalLength);
 const body=Buffer.concat([Buffer.from(plan.newLocals),Buffer.from(plan.entry),original.subarray(plan.originalLocalsEnd,plan.offset),Buffer.from(plan.fragment),original.subarray(plan.offset)]),bodies=new Map(parsed.bodies);bodies.set(plan.index,body);
 const code=Buffer.concat([leb(bodies.size),...[...bodies.values()].map(b=>Buffer.concat([leb(b.length),b]))]),output=Buffer.concat([full.subarray(0,8),...parsed.sections.map(s=>section(s.id,s.id===10?code:s.data))]);
 assert(WebAssembly.validate(output));await WebAssembly.compile(output);
 const after=P.parse(output);for(const[id,b]of parsed.bodies)if(id!==plan.index)assert.deepEqual(after.bodies.get(id),b);
 for(let i=0;i<parsed.sections.length;i++)if(parsed.sections[i].id!==10)assert.deepEqual(parsed.sections[i].bytes,after.sections[i].bytes);
 plan.baseModuleHash=hash(full);plan.expectedOutputHash=hash(output);
 const source=frozen.replace(match[0],'const config='+JSON.stringify(plan)+';\nconst hash=');
 fs.writeFileSync(path.join(extension,'shortcut-policy.js'),source);
 const browser=vm.createContext({crypto:crypto.webcrypto,WebAssembly,Uint8Array,ArrayBuffer});new vm.Script(source).runInContext(browser);
 assert.deepEqual(Buffer.from(await browser.__NFSU2_SHORTCUT_POLICY__.patchModule(full,{verifiedOriginalHash:P.CURRENT.hash})),output);
 if(!manifest.content_scripts[0].js.includes('shortcut-policy.js'))manifest.content_scripts[0].js.splice(manifest.content_scripts[0].js.indexOf('ai.js'),0,'shortcut-policy.js');
 fs.writeFileSync(path.join(extension,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 const receipt={kind:'repinned unchanged authored shortcut fragment against cache-safe target consumers',baseModuleHash:plan.baseModuleHash,outputModuleHash:plan.expectedOutputHash,branchBodyHash:hash(body),frozenAdapterHash:hash(Buffer.from(frozen)),adapterHash:hash(Buffer.from(source)),changedFromTargetConsumerCandidate:[5206],otherBodiesAndNoncodeSectionsPreserved:true,liveVerified:false};
 fs.writeFileSync(path.join(root,'verification',receiptName),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
