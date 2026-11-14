(function(root){
'use strict';
const DEFAULT=root.__NFSU2_FORWARD_NATIVE_CONFIG__||(typeof require==='function'?require('./forward-native-config.js'):null);
const PIN='ed47e9bdd94a336d8d6bd52bebcc6f130b40ffb6d692f0fc728b8785db02178c';
const select=hash=>DEFAULT?.select?.(hash)||(hash===DEFAULT?.moduleHash?DEFAULT:null);
const equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const join=parts=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let p=0;for(const part of parts){out.set(part,p);p+=part.length;}return out;};
const leb=n=>{const a=[];do{const b=n&127;n>>>=7;a.push(b|(n?128:0));}while(n);return Uint8Array.from(a);};
function read(bytes,start=0){let p=start,n=0,shift=0;for(let i=0;i<5;i++){if(p>=bytes.length)throw Error('Truncated Wasm integer');const b=bytes[p++];n+=(b&127)*2**shift;if(!(b&128)){if(n>0xffffffff)throw Error('Oversized Wasm integer');return{value:n>>>0,end:p};}shift+=7;}throw Error('Oversized Wasm integer');}
const from64=s=>{if(typeof atob==='function')return Uint8Array.from(atob(s),v=>v.charCodeAt(0));return Uint8Array.from(Buffer.from(s,'base64'));};
async function hash(bytes){const crypto=root.crypto||require('node:crypto').webcrypto;return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
function parse(input){const bytes=input instanceof Uint8Array?input:new Uint8Array(input);if(!equal(bytes.subarray(0,8),Uint8Array.from([0,97,115,109,1,0,0,0])))throw Error('Unsupported Wasm header');
 const sections=[],seen=new Set();let p=8;while(p<bytes.length){const start=p,id=bytes[p++],size=read(bytes,p);p=size.end;const end=p+size.value;if(end>bytes.length)throw Error('Truncated Wasm section');if(id&&seen.has(id))throw Error('Duplicate Wasm section');if(id)seen.add(id);sections.push({id,start,end,bytes:bytes.subarray(start,end),data:bytes.subarray(p,end)});p=end;}return{bytes,sections};}
const section=(id,data)=>join([Uint8Array.of(id),leb(data.length),data]);
function entries(data){const count=read(data),items=[];let p=count.end;for(let i=0;i<count.value;i++){const n=read(data,p);p=n.end;if(p+n.value>data.length)throw Error('Truncated function body');items.push(data.subarray(p,p+n.value));p+=n.value;}if(p!==data.length)throw Error('Trailing function bytes');return items;}
function patchBody(body,hook){const start=hook.originalLocalsEnd;if(start<1||start>=body.length||body.at(-1)!==11)throw Error('Native local/body boundary changed');const parts=[hook.locals?from64(hook.locals):body.subarray(0,start),from64(hook.entry)];let at=start;
 for(const insertion of hook.insertions){if(!Number.isSafeInteger(insertion.offset)||insertion.offset<at||insertion.offset>=body.length)throw Error('Invalid hook insertion');parts.push(body.subarray(at,insertion.offset),from64(insertion.bytes));at=insertion.offset;}parts.push(body.subarray(at));return join(parts);}
async function patchModule(input,{config=null,verifiedOriginalHash}={}){
 const m=parse(input),byId=new Map(m.sections.map(s=>[s.id,s]));
 // The existing loader may already have applied its independently verified AI
 // edits. Its exact ORIGINAL module hash must then be supplied explicitly.
 const originalHash=verifiedOriginalHash===undefined?await hash(m.bytes):verifiedOriginalHash,approved=select(originalHash);
 if(!approved)throw Error('Exact reviewed native module hash did not match');
 if(config!==null&&config!==approved)throw Error('Only the immutable exact-build registry configuration is permitted');
 config=approved;
 if(config.schema!=='nfsu2-forward-native-patch-v1'||config.moduleHash!==originalHash)throw Error('Exact-build forward native configuration is unavailable');
 for(const id of Object.keys(config.sectionHashes).map(Number))if(!byId.has(id)||await hash(byId.get(id).data)!==config.sectionHashes[id])throw Error('Pinned native section changed: '+id);
 const functionCount=read(byId.get(3).data),code=entries(byId.get(10).data);if(functionCount.value!==config.definedFunctions||code.length!==config.definedFunctions)throw Error('Native function count changed');
 if(read(byId.get(1).data).value!==config.originalTypes||read(byId.get(6).data).value!==config.originalGlobals)throw Error('Native type/global count changed');
 for(const pin of config.requiredBodies){const body=code[pin.index-config.importFunctions];if(!body||body.length!==pin.length||await hash(body)!==pin.hash)throw Error('Pinned native query closure changed: '+pin.index);}
 const replacements=new Map();for(const hook of config.hooks){const slot=hook.index-config.importFunctions,body=code[slot];if(!body||body.length!==hook.originalLength||await hash(body)!==hook.originalHash)throw Error('Pinned native hook body changed: '+hook.index);replacements.set(slot,patchBody(body,hook));}
 const parts=[m.bytes.subarray(0,8)];for(const s of m.sections){
  if(s.id===1){const n=read(s.data);parts.push(section(1,join([leb(n.value+config.types.count),s.data.subarray(n.end),from64(config.types.bytes)])));}
  else if(s.id===3){const n=read(s.data);parts.push(section(3,join([leb(n.value+config.helpers.length),s.data.subarray(n.end),...config.helpers.map(h=>leb(h.type))])));}
  else if(s.id===6){const n=read(s.data);parts.push(section(6,join([leb(n.value+config.globals.count),s.data.subarray(n.end),from64(config.globals.bytes)])));}
  else if(s.id===10){const bodies=code.map((body,i)=>replacements.get(i)||body).concat(config.helpers.map(h=>from64(h.body)));parts.push(section(10,join([leb(bodies.length),...bodies.flatMap(body=>[leb(body.length),body])])));}
  else parts.push(s.bytes);
 }
 const output=join(parts);if(!WebAssembly.validate(output))throw Error('Forward native patched module failed Wasm validation');return output;
}
const api={patchModule,PIN,select,supports:hash=>!!select(hash),parse,read,patchBody};if(typeof module==='object'&&module.exports)module.exports=api;else root.__NFSU2_FORWARD_NATIVE_PATCHER__=api;
})(globalThis);
