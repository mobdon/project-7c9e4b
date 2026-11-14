'use strict';
// Candidate-only outputs. Frozen .10 profile inputs retain reproducibility
// after root composes .11 profiles and recomputes the downstream module pins.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{build}=require('./online-rival-cars-v03811.cjs');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function applyArtifact(profile,artifact){
 assert.equal(profile.hash,artifact.moduleHash);assert.equal(profile.revision,artifact.revision);assert.equal(profile.wall.functionIndex,artifact.contact.functionIndex);assert.equal(profile.wall.target,artifact.contact.target);
 const currentHash=hash(Buffer.from(profile.wall.bridge));assert([artifact.receipt.originalContactHash,artifact.receipt.contactHash].includes(currentHash),'Reviewed original or candidate combined contact body');
 assert.equal(hash(Buffer.from(artifact.contact.bridge)),artifact.receipt.contactHash);assert.equal(artifact.receipt.mailbox.bytes,40);assert.equal(artifact.receipt.mailbox.newAllocation,false);
 const baselineCars={...artifact.cars};delete baselineCars.onlineRivals;delete baselineCars.onlinePlayerOutrun;delete baselineCars.primaryCounterScope;const provided={...profile.cars};delete provided.onlineRivals;delete provided.onlinePlayerOutrun;delete provided.primaryCounterScope;assert.deepEqual(provided,baselineCars,'Unchanged native contact configuration');
 const next=JSON.parse(JSON.stringify(profile));next.wall.bridge=[...artifact.contact.bridge];next.cars={...artifact.cars};next.capabilities.onlineRivals=true;next.capabilities.onlinePlayerOutrun=true;return next;
}
async function main(){
 const profiles=[require('../../work-paced-v03810/extension/aa-profile.js'),...require('../../work-paced-v03810/extension/family-profiles.js').profiles],dir=path.resolve(__dirname,'../integration/online-rival-cars-v03811');fs.mkdirSync(dir,{recursive:true});
 const files=[];
 for(const profile of profiles){const b=await build(profile),artifact={schema:'nfsu2-online-rival-contact-candidate-v03811',revision:profile.revision,moduleHash:profile.hash,contact:{target:profile.wall.target,functionIndex:profile.wall.functionIndex,bridge:b.combined},cars:b.profile.cars,capabilities:{onlineRivals:true,onlinePlayerOutrun:true},receipt:b.receipt},name=profile.revision+'.json',bytes=JSON.stringify(artifact,null,2)+'\n';applyArtifact(profile,artifact);fs.writeFileSync(path.join(dir,name),bytes);files.push({file:name,sha256:hash(bytes)});}
 const manifest={schema:'nfsu2-online-rival-contact-candidate-manifest-v03811',files,sourceFiles:['tools/online-rival-cars-v03811.cjs','tools/build-online-rival-cars-v03811.cjs','extension/cars.js','tests/online-rival-native-v03811.test.cjs'].map(file=>({file,sha256:hash(fs.readFileSync(path.resolve(__dirname,'..',file)))})),liveVerified:false};
 const bytes=JSON.stringify(manifest,null,2)+'\n';fs.writeFileSync(path.join(dir,'manifest.json'),bytes);console.log(JSON.stringify({directory:dir,profiles:profiles.length,manifestSha256:hash(bytes),liveVerified:false}));
}
module.exports={applyArtifact,main};if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
