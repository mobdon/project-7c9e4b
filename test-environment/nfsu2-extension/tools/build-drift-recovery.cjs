'use strict';
// Compile only the independently authored read-only selector, never native code.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const wabt=await require(path.join(root,'research/compatibility-v011/node_modules/wabt'))();
 const originalTypes=[...Array(4).fill('i32'),...Array(3).fill('f64'),'i32','i32','f32','f32','f32','i32','i32','f32','f64','i32'];
 const source=fs.readFileSync(path.join(__dirname,'drift-yaw-selector.wat'),'utf8');assert(!/\.store|\bcall\b/.test(source));
 const sourceWithLocals=source.replace('(result i32) (local $seq','(result i32) (local '+originalTypes.join(' ')+') (local $seq');assert.notEqual(sourceWithLocals,source);
 const m=wabt.parseWat('authored-drift-recovery.wat',`(module (import "env" "memory" (memory 256 65536 shared)) ${sourceWithLocals} (export "select" (func $select)))`,{threads:true});m.resolveNames();m.validate({threads:true});const bytes=Buffer.from(m.toBinary({}).buffer);
 let p=8;const u=()=>{let n=0,s=0,x;do{x=bytes[p++];n|=(x&127)<<s;s+=7;}while(x&128);return n>>>0;};let config;
 while(p<bytes.length){const id=bytes[p++],n=u(),end=p+n;if(id===10){assert.equal(u(),1);const len=u(),start=p,groups=u();for(let j=0;j<groups;j++){u();p++;}config={target:8871-37,functionIndex:8871,offset:2471,originalLength:8347,bodySha256:'8c98fbfb73acfdda4487b0e16b763892c24ee145a6502b469dac9dc5fb6de86f',originalTypes,header:[...bytes.subarray(start,p)],expression:[...bytes.subarray(p,start+len-1)],needle:[65,200,231,154,4],sliceOffset:2469,slice:[32,0,65,200,231,154,4,54,2,4,32,0,16,153,232,128,128,0]};break;}p=end;}
 assert(config);fs.writeFileSync(path.join(__dirname,'drift-recovery.json'),JSON.stringify(config)+'\n');fs.writeFileSync(path.join(root,'tests/drift-recovery-selector.wasm'),bytes);console.log(JSON.stringify({originalLocals:originalTypes.length,extraLocals:8,expressionBytes:config.expression.length}));
})().catch(e=>{console.error(e);process.exit(1)});
