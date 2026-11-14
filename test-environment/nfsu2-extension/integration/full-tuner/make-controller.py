from pathlib import Path
root=Path(__file__).resolve().parents[2]
s=(root.parent/'full-race-tuner-candidate/extension/dyno.js').read_text()
s=s.replace("const BASE=0xd0d300,MAGIC=0x384e5944;", "const BASE=0xd0d300,MAGIC=0x384e5944,BUFFER_MAGIC=0x3154464e,CAPACITY=0x1000000;\nconst Evaluator=root.__NFSU2_DYNO_EVALUATOR__||(typeof require==='function'?require('./dyno-evaluator.js'):null);\nconst allocations=new WeakMap();")
s=s.replace("constructor(memory,patched,revision=Core.REVISION){", "constructor(memory,patched,revision=Core.REVISION,{prepared,module}={}){this.prepared=prepared;this.module=module;this.pb=0;this.evaluator=null;this.full=true;")
s=s.replace("7:'Full-setting writes are not verified in this build'", "8:'Full tuner snapshot layout is unsupported; no setup changes were made'")
s=s.replace('parts+64','parts+148').replace('parts,64','parts,148')
start=s.index(' async request(');end=s.index(' async acquire(',start)
s=s[:start]+(root/'integration/full-tuner/controller-request.txt').read_text()+s[end:]
start=s.index(' async acquire(');end=s.index(' async release(',start)
s=s[:start]+''' async acquire({signal}={}){
  if(!this.evaluator)this.evaluator=await Evaluator.create(await this.prepared);
  const x=await this.request(16,{signal}),expected=this.searchContext;
  if(expected&&['record','tuned','kind'].some(k=>x.lease[k]!==expected[k]))throw Error('Car or race mode changed. Load the selected mode again.');
  const permissions=this.evaluator.load(x.snapshot);this.lease={...x.lease,baseline:x.setup,snapshot:x.snapshot};
  const measured=await this.evaluator.evaluate(x.setup,{signal});
  return {...x,...permissions,result:measured.result,lease:this.lease};
 }
 async evaluate({lease,setup,signal}){
  if(lease!==this.lease)throw Error('Expired tuning baseline');
  this.evaluator.load(lease.snapshot);return this.evaluator.evaluate(setup,{signal});
 }
'''+s[end:]
s=s.replace("if(!['peakPower','peakTorque'].includes(goal))", "if(!['peakPower','peakTorque','acceleration60','acceleration100','topSpeed'].includes(goal))")
s=s.replace("const curveOffsets=pre.allowedOffsets.filter(n=>n>=23);", "const curveOffsets=pre.allowedOffsets.filter(n=>n>=23||(['acceleration60','acceleration100','topSpeed'].includes(goal)&&n>=9&&n<=15));")
s=s.replace("budget:120,steps:[40,20,10]", "budget:48,steps:[40,20,10]")
s=s.replace("// Manual edits are local drafts only. Preview uses one native game-thread trial\n // and the bridge restores the entire ride before acknowledging any result.", "// Manual drafts and every native trial stay in private memory. Live setup\n // writes occur only through the bounded selected-preset Stage/Restore protocol.")
s=s.replace("result=await this.request(2,{lease:editor.lease,expected:editor.baseline,candidate:requested,signal:this.abortController.signal});", "this.lease=editor.lease;result=await this.evaluate({lease:editor.lease,setup:requested,signal:this.abortController.signal});")
start=s.index(' async apply(){');end=s.index('\n}\nconst api=',start)
s=s[:start]+''' async apply(){
  if(!this.busy)this.syncContext();
  if(this.busy||!this.outcome||this.applied)throw Error('Preview a tune for the selected car and mode first');this.busy=true;
  try{const o=this.outcome,r=await this.request(17,{lease:o.lease,expected:o.baseline,expectedVisit:o.lease.visitBytes,candidate:o.best,candidateVisit:o.best});if(!eq(r.setup,o.best)||!eq(r.lease.visitBytes,o.best))throw Error('Staged setup was not confirmed');this.applied={...o,current:r.setup,stagedLease:r.lease};return r;}finally{this.busy=false;this.cancel();}
 }
 async restore(){
  if(!this.busy)this.syncContext();
  if(this.busy||!this.applied)throw Error('No unchanged staged tune to restore for the selected car and mode');this.busy=true;
  try{
   const o=this.applied,lease={...o.stagedLease};
   // A normal native Save Profile may have committed this selected value.
   // Accept that exact known record transition, but never an unrelated edit.
   const current=Uint8Array.from(new Uint8Array(this.memory.buffer,lease.record+0x360,205)),start=lease.kind*41;
   if(!eq(current,lease.recordBytes)){
    const known=Uint8Array.from(lease.recordBytes);known.set(o.current,start);
    if(!eq(current,known))throw Error('Stored presets changed. Reload before restoring.');
    lease.recordBytes=current;
   }
   const r=await this.request(18,{lease,expected:o.current,expectedVisit:o.current,candidate:o.baseline,candidateVisit:o.lease.visitBytes});
   if(!eq(r.setup,o.baseline)||!eq(r.lease.visitBytes,o.lease.visitBytes))throw Error('Restored setup was not confirmed');
   this.applied=null;this.outcome=null;this.editor=null;return r;
  }finally{this.busy=false;this.cancel();}
 }
'''+s[end:]
s=s.replace("root.__NFSU2_DYNO__=api", "root.__NFSU2_DYNO_FULL__=api")
(root/'extension/dyno-full.js').write_text(s)
