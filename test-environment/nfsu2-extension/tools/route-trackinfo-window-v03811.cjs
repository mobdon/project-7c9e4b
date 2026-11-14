'use strict';
// Isolated authored-helper transform. Original game/runtime bodies, dated
// builders, all other forward spans and the verified window helper stay exact.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const Proof=require('../../work-current-profile/tools/native-proof.cjs');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const PINS=Object.freeze({
 '14074507a84d43365610feae3a8fad80f4637b891e2ed03239460b104f986cbd':Object.freeze({revision:'8abf9be8',base:24206,bitmap:695746176,gwin:695778944,context:'5b8c84ece5f1674f27d852addf7f4097788c6ac479e98747afd38c2843d8bd10',policy:'c510bd1ae6614fa799166b85629a5cd83c8c79cb31854b324a71b27ce4f7ba90',span:'8d27160854f528778d6f1ceea6fecc6bc123794b2c90f1baa9c2f2a80e8b9382'}),
 'e03eca29aa8cba3ac4a96836ad3d86dd5eb8258704c0e6260ecc5ef955536a03':Object.freeze({revision:'93cfc6e9',base:24235,bitmap:695751408,gwin:695784176,context:'ae6292cbd27a637f870bab4383eb328ec114a7dc484c26a2528834827c20b3ce',policy:'8f7b92d3d1d40cbafd25d1150144ee6cb35446120fcca2f6942685636621fd36',span:'02948bf7a2627e24e4d515c1a3d38c11d4a92ac3c0b35779b25b51b089e5c608'}),
 'a220e667d38c0a6509c1507ad3ca9c6fddeb2220b429bf28707d7ca8cbbc42c8':Object.freeze({revision:'aa2429fb',base:24243,bitmap:695752400,gwin:695785168,context:'b77099da356626122838e96ed0338bde5ea83ef2427dbbc1f245951a609f5b0c',policy:'d55463ad80bb5c86b84928794d521c10b7d97c19a3e116edc877564f8b3bffce',span:'d537d962904d143ea6659d4c750c90fef25016323eac31e108751a203d813109'}),
 'f88fc7a0fe3082e20814f705635410d046fcdfe053eb70d65c49dec7583105b9':Object.freeze({revision:'15e5958f',base:24243,bitmap:695752400,gwin:695785168,context:'b77099da356626122838e96ed0338bde5ea83ef2427dbbc1f245951a609f5b0c',policy:'d55463ad80bb5c86b84928794d521c10b7d97c19a3e116edc877564f8b3bffce',span:'d537d962904d143ea6659d4c750c90fef25016323eac31e108751a203d813109'}),
 'c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391':Object.freeze({revision:'943ee537',base:24241,bitmap:695752272,gwin:695785040,context:'438b4cbe982fa89167827518a5fbc23e306ae216d8dffd54473f9bd881a72de9',policy:'7abcb4c0952c468441758dd3af07100a1b5f3093fd166ee06ba8f64aa4ed2b57',span:'b8f1acc411f77c0b575b8d74bd7f1766bb061a1d7ceb30e7365befba81c6c7eb'})
});
const supports=moduleHash=>typeof moduleHash==='string'&&Object.hasOwn(PINS,moduleHash);
const clone=value=>JSON.parse(JSON.stringify(value));
const prefix=Buffer.from([0x41,...Proof.leb(0x883dac),0x28,0x02,0x00,0x21,0x05,0x20,0x05,0x41,...Proof.leb(0x8c),0x10]);
const suffix=Buffer.from([0x45,0x04,0x40,0x41,0x04,0x0f,0x0b,0x20,0x05,0x2f,0x01,...Proof.leb(0x8a)]);
function replaceOnce(bytes,from,to){
 const at=bytes.indexOf(from);assert(at>=0,'Exact TrackInfo load/local/140-byte check/identity-read sequence');
 assert.equal(bytes.indexOf(from,at+1),-1,'Unique TrackInfo span caller');assert.equal(from.length,to.length);
 const out=Buffer.from(bytes);to.copy(out,at);return{out,at};
}
function derive(profile){
 assert(supports(profile?.moduleHash),'Exact reviewed TrackInfo window profile');const pin=PINS[profile.moduleHash];
 assert.equal(profile.schema,'nfsu2-forward-native-patch-v1');assert.equal(profile.revision,pin.revision);
 assert.equal(profile.importFunctions,37);assert.equal(profile.importFunctions+profile.definedFunctions,pin.base);
 assert.equal(profile.runtime.moduleHash,profile.moduleHash);assert.equal(profile.runtime.revision,pin.revision);
 assert.equal(profile.runtime.bitmap,pin.bitmap);assert.equal(profile.runtime.guestCeiling,0x28000000);
 assert.equal(profile.runtime.nativePolicy.version,1);assert.equal(profile.runtime.nativePolicy.gwin,pin.gwin);assert.equal(profile.capabilities.nativePolicy,true);
 assert.equal(profile.helpers.length,26);const contextIndex=16,spanIndex=13,policyIndex=0;
 assert.equal(profile.helpers[contextIndex].name,'fwg_context');assert.equal(profile.helpers[contextIndex].type,3);
 assert.equal(profile.helpers[spanIndex].name,'fwg_span');assert.equal(profile.helpers[spanIndex].type,2);
 assert.equal(profile.helpers[policyIndex].name,'fwg_policy_range');assert.equal(profile.helpers[policyIndex].type,2);
 assert.equal(hash(Buffer.from(profile.helpers[spanIndex].body,'base64')),pin.span);
 assert.equal(hash(Buffer.from(profile.helpers[policyIndex].body,'base64')),pin.policy);
 const oldCall=Proof.leb(pin.base+spanIndex),newCall=Proof.leb(pin.base+policyIndex);assert.equal(oldCall.length,newCall.length);
 const from=Buffer.concat([prefix,oldCall,suffix]),to=Buffer.concat([prefix,newCall,suffix]),provided=Buffer.from(profile.helpers[contextIndex].body,'base64');
 let before=provided;
 if(hash(provided)!==pin.context)before=replaceOnce(provided,to,from).out;
 assert.equal(hash(before),pin.context,'Complete frozen baseline context body');
 const changed=replaceOnce(before,from,to),after=changed.out;
 assert.equal(after.length,before.length);assert.deepEqual(replaceOnce(after,to,from).out,before,'Only one TrackInfo call operand changes');
 assert(provided.equals(before)||provided.equals(after),'Exact baseline or reviewed transformed context');
 const byteChanges=[];for(let i=0;i<before.length;i++)if(before[i]!==after[i])byteChanges.push(i);
 const receipt={schema:'nfsu2-trackinfo-guest-window-v03811',moduleHash:profile.moduleHash,revision:pin.revision,helperIndex:pin.base+contextIndex,helperName:'fwg_context',helperBytes:before.length,baselineHelperSha256:pin.context,candidateHelperSha256:hash(after),changedByteOffsets:byteChanges,
  trackInfoGuestPointerSource:0x883dac,trackInfoBytes:0x8c,spanCalleeBefore:pin.base+spanIndex,spanCalleeAfter:pin.base+policyIndex,policyRangeSha256:pin.policy,windowControl:pin.gwin,windowLow:0x50000000,windowHigh:0x7ffe0000,
  originalNativeBodiesChanged:0,otherHelperBodiesChanged:0,newHelpers:0,newGlobals:0,newHooks:0,liveVerified:false};
 return{before,after,contextIndex,receipt};
}
function transformConfig(profile){
 const d=derive(profile),config=clone(profile);config.helpers[d.contextIndex].body=d.after.toString('base64');return{config,receipt:d.receipt};
}
function transformModule(bytes,profile){
 const input=Buffer.from(bytes),d=derive(profile),parsed=Proof.parse(input),body=parsed.bodies.get(d.receipt.helperIndex);
 assert(body&&(body.equals(d.before)||body.equals(d.after)),'Exact composed authored context body');
 const offset=body.byteOffset-input.byteOffset;assert(offset>=0&&offset+d.after.length<=input.length);
 const output=Buffer.from(input);d.after.copy(output,offset);assert.equal(output.length,input.length);
 const next=Proof.parse(output);for(const[id,original]of parsed.bodies)assert.deepEqual(next.bodies.get(id),id===d.receipt.helperIndex?d.after:original,'Exact isolated body scope f'+id);
 for(let i=0;i<parsed.sections.length;i++)if(parsed.sections[i].id!==10)assert.deepEqual(next.sections[i].bytes,parsed.sections[i].bytes,'Unchanged native section '+parsed.sections[i].id);
 return output;
}
module.exports={PINS,supports,derive,transformConfig,transformModule};
if(require.main===module){
 assert.deepEqual(process.argv.slice(2),['--write-candidates'],'Use --write-candidates for the isolated .11 artifact directory');
 const fs=require('node:fs'),path=require('node:path'),Registry=require('../extension/forward-native-config.js'),Probe=require('../extension/route-probe.js');
 const out=path.resolve(__dirname,'../integration/route-trackinfo-window-v03811');fs.mkdirSync(out,{recursive:true});const entries=[];
 for(const profile of Object.values(Registry.profiles).filter(p=>supports(p.moduleHash))){
  const{config,receipt}=transformConfig(profile),file=profile.revision+'.json',text=JSON.stringify(config,null,2)+'\n';fs.writeFileSync(path.join(out,file),text);entries.push({file,sha256:hash(text),receipt});
 }
 const codebook={fields:['forwardReadPhaseCode','forwardReadSubreasonCode'],readPhaseCodes:Probe.readPhaseCodes,readSubreasonCodes:Probe.readSubreasonCodes,rawPointersLogged:false};
 fs.writeFileSync(path.join(out,'codebook.json'),JSON.stringify(codebook,null,2)+'\n');
 const manifest={schema:'nfsu2-trackinfo-window-candidate-v03811',generatorSha256:hash(fs.readFileSync(__filename)),profiles:entries,codebookSha256:hash(fs.readFileSync(path.join(out,'codebook.json'))),originalNativeBodiesChanged:0,wholeRaceChecked:false,liveVerified:false};
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({directory:out,profiles:entries.length,manifestSha256:hash(fs.readFileSync(path.join(out,'manifest.json'))),liveVerified:false}));
}
