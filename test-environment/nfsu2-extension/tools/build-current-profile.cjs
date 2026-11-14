/* Authored current-build prefixes only. Never packages game function bodies. */
'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const wabtFactory=require(process.env.WABT_MODULE||path.join(root,'research/compatibility-v011/node_modules/wabt'));
(async()=>{
 const wabt=await wabtFactory(),old=fs.readFileSync(path.join(root,'tools/ai-bridge.wat'),'utf8');
 const start=old.indexOf('(block $done');if(start<0)throw Error('AI + dyno source body missing');
 const regions=[{base:0xd0d100,bytes:92,marker:28,magic:0x3749414e},{base:0xd0d180,bytes:40,marker:0,magic:0x38574c4e},{base:0xd0d200,bytes:64,marker:0,magic:0x33524e43},{base:0xd0d300,bytes:512,marker:32,magic:0x384e5944},{base:0xd0d1c0,bytes:40,marker:0,magic:0x3143414e}];
 const guards=regions.map(({base,bytes,marker,magic})=>{const words=Array.from({length:bytes/4},(_,i)=>`(i32.load (i32.const ${base+4*i}))`);const occupied=words.reduce((a,b)=>`(i32.or ${a} ${b})`);return `(if (i32.ne (i32.load (i32.const ${base+marker})) (i32.const ${magic})) (then (br_if $mailboxes ${occupied})))`;}).join('\n');
 // Before publishing any handshake, every command region must be empty or ours.
 let body=old.slice(start).replace(/\)\s*\)\s*$/,'');
 const dyno=regions.find(r=>r.base===0xd0d300),dynoMarker=`(i32.store (i32.const ${dyno.base+32}) (i32.const ${dyno.magic}))`;
 const dynoWords=Array.from({length:128},(_,i)=>`(i32.load (i32.const ${dyno.base+4*i}))`).reduce((a,b)=>`(i32.or ${a} ${b})`);
 const dynoGuard=`(if (i32.ne (i32.load (i32.const ${dyno.base+32})) (i32.const ${dyno.magic})) (then (br_if $dynoDone ${dynoWords})))`;
 if(!body.includes(dynoMarker))throw Error('Dyno handshake missing');body=body.replace(dynoMarker,dynoGuard+dynoMarker);
 const source=old.slice(0,start)+`(block $mailboxes\n(if (i32.ne (i32.load (i32.const ${0xd0d100+28})) (i32.const ${0x3749414e})) (then ${guards}))\n${body})\n))`;
 fs.writeFileSync(path.join(root,'tools/ai-current-bridge.wat'),source);
 const compile=s=>{const m=wabt.parseWat('current-ai-dyno.wat',s,{threads:true,simd:true});m.resolveNames();m.validate({threads:true,simd:true});return Buffer.from(m.toBinary({}).buffer)};
 fs.writeFileSync(path.join(root,'tests/ai-current-bridge.wasm'),compile(source));
 const dummy=(from,to)=>Array.from({length:to-from},(_,i)=>`(import "unused" "${from+i}" (func))`).join('');
 const prod=source.replace('(import "env" "dispatch"',dummy(0,21725)+'(import "env" "dispatch"').replace('(import "env" "gcall"',dummy(21726,21739)+'(import "env" "gcall"');
 const bytes=compile(prod);let p=8;const leb=()=>{let n=0,s=0,x;do{x=bytes[p++];n|=(x&127)<<s;s+=7}while(x&128);return n>>>0;};let prefix;
 while(p<bytes.length){const id=bytes[p++],n=leb(),end=p+n;if(id===10){leb();const size=leb();prefix=bytes.subarray(p,p+size);break;}p=end;}
 if(!prefix)throw Error('Current prefix missing');
 const ai=fs.readFileSync(path.join(root,'extension/ai.js'),'utf8'),paceMatch=ai.match(/const PACE=Uint8Array\.from\((\[[^\n]+\])\)/);if(!paceMatch)throw Error('Authored pace payload missing');
 const wallPath=path.join(root,'tools/contact-current-body.json');const wall=fs.existsSync(wallPath)?{...JSON.parse(fs.readFileSync(path.join(root,'tools/wall-current-config.json'))),bridge:JSON.parse(fs.readFileSync(wallPath))}:null;
 const cars=JSON.parse(fs.readFileSync(path.join(root,'tools/car-current-config.json')));
 const profile={revision:'2f0ddd3b',size:36872934,hash:'5e33ad2cb4c4cc6893dee7cbd4d6e9bfb0f59a349d218fddbb5e3331ca69bc34',target:21213-37,bridge:[...prefix],locals:64,pace:{target:21262-37,bridge:JSON.parse(paceMatch[1])},wall,cars,capabilities:{legacy:true,ai:true,pace:true,corner:!!wall, walls:!!wall,cars:true,dyno:true,dragAI:true}};
 const out=`/* Exact-build compatibility profile. Prefix instructions are authored, not copied game code. */\n(function(root){'use strict';const profile=${JSON.stringify(profile)};const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};freeze(profile);root.__NFSU2_CURRENT_PROFILE__=profile;if(typeof module==='object'&&module.exports)module.exports=profile;})(globalThis);\n`;
 fs.writeFileSync(path.join(root,'extension/current-profile.js'),out);console.log(JSON.stringify({revision:profile.revision,prefixBytes:prefix.length,capabilities:profile.capabilities}));
})().catch(e=>{console.error(e);process.exit(1)});
