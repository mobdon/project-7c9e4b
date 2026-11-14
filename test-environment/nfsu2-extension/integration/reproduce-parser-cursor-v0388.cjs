'use strict';
// Read-only isolated probe. Explicit offsets are independent of the historical
// closure-mutated parser and never alter the input bytes or imported helpers.
const assert=require('node:assert/strict'),P=require('../../work-aa-profile/tools/native-proof.cjs');
const Build=require('../native/build-plans.cjs'),RB=require('../native/native-rubberband.js');
const Corner=require('../native/native-corner-target.js'),Maker=require('../native/build-corner-target.cjs');
const {PROFILES}=require('../native/profile-config.cjs');
function unsigned(bytes,offset){
 let value=0,shift=0,cursor=offset;
 for(let count=0;count<5;count++){
  assert(cursor<bytes.length);const byte=bytes[cursor];cursor+=1;value+=(byte&127)*2**shift;
  if(!(byte&128))return {value:value>>>0,end:cursor};shift+=7;
 }
 throw Error('Invalid unsigned LEB');
}
function sections(bytes){
 let cursor=8;const result=[];
 while(cursor<bytes.length){
  const start=cursor,id=bytes[cursor];cursor+=1;
  const decoded=unsigned(bytes,cursor),payload=decoded.end,end=decoded.end+decoded.value;
  assert(end<=bytes.length);result.push({id,start,payload,end,data:bytes.subarray(payload,end)});cursor=end;
 }
 assert.equal(cursor,bytes.length);return result;
}
function inspect(bytes,parsed){
 const exact=sections(bytes),actual=parsed.sections,issues=[];
 for(let n=0;n<Math.max(exact.length,actual.length);n++){
  const a=actual[n],e=exact[n];
  if(!a||!e||a.id!==e.id||a.start!==e.start||a.payload!==e.payload||a.end!==e.end||!a.data.equals(e.data))issues.push({section:n,expected:e&&{id:e.id,start:e.start,payload:e.payload,end:e.end,head:e.data.subarray(0,12).toString('hex'),hash:P.hash(e.data)},actual:a&&{id:a.id,start:a.start,payload:a.payload,end:a.end,head:a.data.subarray(0,12).toString('hex'),hash:P.hash(a.data)}});
 }
 return {expectedSectionCount:exact.length,actualSectionCount:actual.length,issues};
}
(async()=>{
 await Maker.fragments();
 const products=await Promise.all(PROFILES.map(async profile=>{const {full}=await Build.composed(profile),before=Buffer.from(await RB.patchModule(full,{verifiedOriginalHash:profile.native.hash})),after=Buffer.from(await Corner.patchModule(before,{verifiedOriginalHash:profile.native.hash}));return{profile,before,after};}));
 const output=[],repeat=process.argv.includes('--stress')?40:1;
 for(const {profile,before,after}of products){
  const pins=[P.hash(before),P.hash(after)],a=P.parse(before),b=P.parse(after);
  assert(WebAssembly.validate(after));await WebAssembly.compile(after);
  assert.deepEqual([P.hash(before),P.hash(after)],pins,'Compile must not mutate either complete input');
  const strictBefore=sections(before).filter(s=>s.id!==10),strictAfter=sections(after).filter(s=>s.id!==10);
  assert.deepEqual(strictBefore.map(s=>[s.id,s.data]),strictAfter.map(s=>[s.id,s.data]),'Explicit-offset inspection proves all non-code bytes equal');
  const repeatedIssues=[];
  for(let iteration=1;iteration<repeat;iteration++){
   const left=inspect(before,P.parse(before)),right=inspect(after,P.parse(after));
   if(left.issues.length||right.issues.length)repeatedIssues.push({iteration,before:left,after:right});
  }
  output.push({revision:profile.revision,beforeSha256:pins[0],afterSha256:pins[1],strictNonCodeEqual:true,before:inspect(before,a),after:inspect(after,b),repeatedMismatches:repeatedIssues.length,firstRepeatedMismatch:repeatedIssues[0]||null});
 }
 console.log(JSON.stringify({node:process.version,execArgv:process.execArgv,bytesUnchanged:true,parserRunsPerBuffer:repeat,modules:output},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
