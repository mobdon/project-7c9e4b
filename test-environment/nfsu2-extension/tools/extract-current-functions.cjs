/* Local research utility. Extracts current downloaded game routines in memory
 * for tests; never include this utility, game bytes or extracts in releases. */
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const modulePath=path.resolve(__dirname,'../../research/compatibility-v011/game.wasm');
const wabtFactory=require(process.env.WABT_MODULE||path.resolve(__dirname,'../../research/compatibility-v011/node_modules/wabt'));
module.exports=async function extract(selected){
 const bytes=fs.readFileSync(modulePath);
 if(crypto.createHash('sha256').update(bytes).digest('hex')!=='5e33ad2cb4c4cc6893dee7cbd4d6e9bfb0f59a349d218fddbb5e3331ca69bc34')throw Error('Current research module hash mismatch');
 let p=8;const u=()=>{let n=0,s=0,x;do{x=bytes[p++];n|=(x&127)<<s;s+=7}while(x&128);return n>>>0};
 const enc=n=>{const a=[];do{let x=n&127;n>>>=7;if(n)x|=128;a.push(x)}while(n);return Buffer.from(a)};
 const sections=[bytes.subarray(0,8)];
 while(p<bytes.length){const id=bytes[p++],size=u(),start=p,end=p+size;let payload=bytes.subarray(start,end);
  if(id===10){const count=u(),parts=[enc(count)];for(let i=0;i<count;i++){const len=u(),b=selected.includes(i+37)?bytes.subarray(p,p+len):Buffer.from([0,0,11]);parts.push(enc(b.length),b);p+=len;}payload=Buffer.concat(parts);}
  if(![0,7,8,9,11,12].includes(id))sections.push(Buffer.from([id]),enc(payload.length),payload);p=end;
 }
 const wabt=await wabtFactory(),mod=wabt.readWasm(Buffer.concat(sections),{threads:true,simd:true,exceptions:true,tail_call:true,readDebugNames:false});mod.generateNames();mod.applyNames();
 const wat=mod.toText({foldExprs:false,inlineExport:false});
 const functions=new Map();for(const i of selected){const m=wat.match(new RegExp('^  \\(func \\$f'+i+'\\b[\\s\\S]*?(?=^  \\(func|^  \\(table)','m'));if(!m)throw Error('Missing current function '+i);functions.set(i,m[0].replace(/\(type \$t\d+\) ?/,''));}
 return {wabt,functions};
};
