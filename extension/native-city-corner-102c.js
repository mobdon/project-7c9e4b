/* Exact102c ordinary-online-city corner compensation. This adapter changes only
 * the command1 live/selected pace compatibility guard in function4653. Existing
 * matching-pace and race paths remain native. A reduction must stay inside the
 * selected ceiling and retain ownership, online permission, mode and sequence
 * through the native helper. No new guest mailbox or physics fields are used. */
(function(root){'use strict';
 const PLAN={"revision":"102c8d92","sourceModuleHash":"2ba0b075721d80e75fc3fb9a3b0e4d2acae835d21fcc406d009669b83f81858d","inputModuleHash":"5bb985a5a7a77efabce919d7c3cd872c94466f3d66522449a106511413434fdf","outputModuleHash":"dc06dc479e0160e3b8d6f42a4148b4ec3ce33eab9744d92b25dc09e21c39f0a0","importFunctions":38,"changes":[{"index":4653,"originalLength":5317,"originalHash":"5158ba72d5bdf69ad210d5c7c9e4d01139ace98b8f769bd7f792a52a1565d80c","patchedHash":"14370cd45d1212ff5abf61d9f75f5bd5bdd24482f93b0a7292d8bf9adf796ca2","oldLocals":69,"newLocals":71,"nativeCoreSha256":"72e6315ba31bf64f0fa1d31c7e840559eb78bddb442f4867a2fe61ce49c23e92","edits":[{"offset":0,"needle":"CQJ/A3wEfwJ9EX8JfBl/Bn0BfA==","replacement":"CgJ/A3wEfwJ9EX8JfBl/Bn0BfAJ/"},{"offset":1095,"needle":"IBtBvKLDBigCAEHkAEG8osMGKAIAQeQASxtHDQE=","replacement":"IBtBvKLDBigCAEHkAEG8osMGKAIAQeQASxtHBEBBvKLDBigCACFHPwBBq9QASQ0CIBpBAUZFDQJBhKTDBigCAEEBRkUNAkGIosMGKAIAQQJGRQ0CQbDPpwQoAgBBAEZFDQJBgKLDBigCAEHOgqW6A0ZFDQJBnKLDBigCAEHOgqW6A0ZFDQJBgKTDBigCAEHDnMmaA0ZFDQIgEUUNAiARQQFxDQJBhKLDBigCACARRkUNAkGwpMMGKAIAIBtGRQ0CQYikwwYoAgAgF0ZFDQJBpKTDBigCACAZRkUNAkG8osMGKAIAIEdGRQ0CIEdBywBJDQIgRyAbTw0CIBtB5ABJDQIgG0GsAksNAkGkqZkEKAIAQQZGRQ0CQbCAwAYoAgBBAUZFDQJBtKLDBigCAEEBRkUNAkGwosMGKAIAQbQBTw0CQdjPpwQtAAANAkHZz6cELQAADQJB48+nBC0AAA0CQYSCpAQoAgANAkGIgqQEKAIADQJBjIKkBCgCAA0CQZSCpAQoAgANAkGIgZQEKAIAQQpGDQJB1KLDBigCAEEBRkUNAkH4gJQEKAIAQYgEcUGU1JkEKAIAQfTTmQQoAgBB6Z6nBC0AAHJyckEAR0HYyZTQAigCAEEAR0Hw46jRAi0AAEEAR0HU66fRAigCAEEAR3FxckUNAkGMosMGKAIAIBRGRQ0CQaCiwwYoAgAgFEZFDQJBgIDABigCACAURkUNAiAUKAIEIBNGRQ0CIBQoAhANAkGQosMGKAIAIBNGRQ0CQaSiwwYoAgAgE0ZFDQIgEygCJEEDRkUNAiATKAIsIBZGRQ0CIBYoAgBB8KbhA0ZFDQIgFigCBCATRkUNAiAWKALoDSAWQfAGakZFDQJBlKLDBigCACAVRkUNAkGoosMGKAIAIBVGRQ0CQZiCpAQoAgAgFUZFDQIgFSgCAEEERkUNAkG8osMGKAIAIEdGRQ0CQbCkwwYoAgAgG0ZFDQJBhKLDBigCACARRkUNAkEBIUYL"},{"offset":2966,"needle":"IAAoAhAgEkEEakcNAA==","replacement":"IAAoAhAgEkEEakcNACBGBEA/AEGr1ABJDQEgGkEBRkUNAUGEpMMGKAIAQQFGRQ0BQYiiwwYoAgBBAkZFDQFBsM+nBCgCAEEARkUNAUGAosMGKAIAQc6CpboDRkUNAUGcosMGKAIAQc6CpboDRkUNAUGApMMGKAIAQcOcyZoDRkUNASARRQ0BIBFBAXENAUGEosMGKAIAIBFGRQ0BQbCkwwYoAgAgG0ZFDQFBiKTDBigCACAXRkUNAUGkpMMGKAIAIBlGRQ0BQbyiwwYoAgAgR0ZFDQEgR0HLAEkNASBHIBtPDQEgG0HkAEkNASAbQawCSw0BQaSpmQQoAgBBBkZFDQFBsIDABigCAEEBRkUNAUG0osMGKAIAQQFGRQ0BQbCiwwYoAgBBtAFPDQFB2M+nBC0AAA0BQdnPpwQtAAANAUHjz6cELQAADQFBhIKkBCgCAA0BQYiCpAQoAgANAUGMgqQEKAIADQFBlIKkBCgCAA0BQYiBlAQoAgBBCkYNAUHUosMGKAIAQQFGRQ0BQfiAlAQoAgBBiARxQZTUmQQoAgBB9NOZBCgCAEHpnqcELQAAcnJyQQBHQdjJlNACKAIAQQBHQfDjqNECLQAAQQBHQdTrp9ECKAIAQQBHcXFyRQ0BQYyiwwYoAgAgFEZFDQFBoKLDBigCACAURkUNAUGAgMAGKAIAIBRGRQ0BIBQoAgQgE0ZFDQEgFCgCEA0BQZCiwwYoAgAgE0ZFDQFBpKLDBigCACATRkUNASATKAIkQQNGRQ0BIBMoAiwgFkZFDQEgFigCAEHwpuEDRkUNASAWKAIEIBNGRQ0BIBYoAugNIBZB8AZqRkUNAUGUosMGKAIAIBVGRQ0BQaiiwwYoAgAgFUZFDQFBmIKkBCgCACAVRkUNASAVKAIAQQRGRQ0BQbyiwwYoAgAgR0ZFDQFBsKTDBigCACAbRkUNAUGEosMGKAIAIBFGRQ0BCw=="}]}]};
 const supports=hash=>hash===PLAN.sourceModuleHash;
 const sha=async bytes=>Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const decode=s=>Uint8Array.from(root.atob(s),c=>c.charCodeAt(0));
 const concat=parts=>{const output=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){output.set(p,at);at+=p.length;}return output;};
 const leb=n=>{const a=[];do{const x=n&127;n>>>=7;a.push(x|(n?128:0));}while(n);return Uint8Array.from(a);};
 const read=(bytes,at)=>{let value=0,shift=0,b;do{if(at>=bytes.length||shift>28)throw Error('City corner integer bounds');b=bytes[at++];value+=(b&127)*2**shift;shift+=7;}while(b&128);return{value:value>>>0,end:at};};
 async function patchModule(input,{verifiedOriginalHash}={}){
  if(!supports(verifiedOriginalHash))return input;
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
  if(await sha(bytes)!==PLAN.inputModuleHash)throw Error('City corner complete input hash mismatch');
  const pending=new Map(PLAN.changes.map(p=>[p.index,p])),parts=[bytes.subarray(0,8)];let at=8,found=false;
  while(at<bytes.length){
   const start=at,id=bytes[at++],length=read(bytes,at),begin=length.end,end=begin+length.value;
   if(end>bytes.length)throw Error('City corner section bounds');at=end;
   if(id!==10){parts.push(bytes.subarray(start,end));continue;}
   if(found)throw Error('City corner duplicate code');found=true;
   const count=read(bytes,begin),bodies=[leb(count.value)];let cursor=count.end;
   for(let n=0;n<count.value;n++){
    const length=read(bytes,cursor),stop=length.end+length.value;if(stop>end)throw Error('City corner body bounds');
    let body=bytes.subarray(length.end,stop);cursor=stop;const plan=pending.get(n+PLAN.importFunctions);
    if(plan){
     if(body.length!==plan.originalLength||await sha(body)!==plan.originalHash)throw Error('City corner original body mismatch');
     const chunks=[];let p=0;
     for(const e of plan.edits){const needle=decode(e.needle),replacement=decode(e.replacement);if(e.offset<p||e.offset+needle.length>body.length||needle.some((v,i)=>body[e.offset+i]!==v))throw Error('City corner authored guard mismatch');chunks.push(body.subarray(p,e.offset),replacement);p=e.offset+needle.length;}
     chunks.push(body.subarray(p));body=concat(chunks);
     if(await sha(body)!==plan.patchedHash)throw Error('City corner patched body mismatch');pending.delete(n+PLAN.importFunctions);
    }
    bodies.push(leb(body.length),body);
   }
   if(cursor!==end)throw Error('City corner trailing code');const code=concat(bodies);parts.push(Uint8Array.of(10),leb(code.length),code);
  }
  if(!found||pending.size)throw Error('City corner missing body');
  const output=concat(parts);
  if(await sha(output)!==PLAN.outputModuleHash||!root.WebAssembly.validate(output))throw Error('City corner complete output mismatch');
  return output;
 }
 const api=Object.freeze({supports,patchModule,revision:PLAN.revision,sourceModuleHash:PLAN.sourceModuleHash,inputModuleHash:PLAN.inputModuleHash,outputModuleHash:PLAN.outputModuleHash});
 root.__NFSU2_NATIVE_CITY_CORNER_102C__=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
