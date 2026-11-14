/* Read-only function signature scan. Matches are diagnostic evidence, never
 * permission to patch an unknown build. No game instructions are bundled. */
(function(root){
  'use strict';
  const MAX_MODULE_BYTES=128*1024*1024, MAX_FUNCTIONS=100000, MAX_ANCHORS=128;
  const signatureKey=s=>JSON.stringify([s.params,s.results]);
  const hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
  function parse(input){
    const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
    if(bytes.length>MAX_MODULE_BYTES||bytes.length<8||!bytes.subarray(0,8).every((b,i)=>b===[0,97,115,109,1,0,0,0][i]))throw Error('Unsupported signature-scan module');
    const reader=(begin,end)=>({p:begin,end});
    const byte=r=>{if(r.p>=r.end)throw Error('Truncated signature-scan input');return bytes[r.p++];};
    const u32=r=>{let v=0;for(let i=0;i<5;i++){const b=byte(r);if(i===4&&(b&240))throw Error('Invalid module integer');v+=(b&127)*2**(7*i);if(!(b&128))return v;}throw Error('Invalid module integer');};
    const count=r=>{const n=u32(r);if(n>MAX_FUNCTIONS)throw Error('Signature scan count limit');return n;};
    const skip=(r,n)=>{if(n>r.end-r.p)throw Error('Truncated signature-scan input');r.p+=n;};
    const name=r=>skip(r,u32(r));
    const val=r=>{const b=byte(r);if(![127,126,125,124,123,112,111].includes(b))throw Error('Unsupported signature value type');return b;};
    const limits=r=>{const f=u32(r);if(f&~3||f===2)throw Error('Unsupported signature memory type');u32(r);if(f&1)u32(r);};
    const r=reader(8,bytes.length),seen=new Set(),types=[],functionTypes=[],functions=[];
    let importedFunctions=0;
    while(r.p<r.end){
      const id=byte(r),size=u32(r),begin=r.p;skip(r,size);
      if(id>13||(id&&seen.has(id)))throw Error('Unsupported duplicate module section');seen.add(id);
      const s=reader(begin,begin+size);
      if(id===1){for(let n=count(s);n--;){if(byte(s)!==96)throw Error('Unsupported recursive signature');const params=[],results=[];for(let k=count(s);k--;)params.push(val(s));for(let k=count(s);k--;)results.push(val(s));types.push({params,results});}}
      else if(id===2){for(let n=count(s);n--;){name(s);name(s);const kind=byte(s);if(kind===0){if(!types[u32(s)])throw Error('Unknown imported signature');importedFunctions++;}else if(kind===1){val(s);limits(s);}else if(kind===2)limits(s);else if(kind===3){val(s);byte(s);}else if(kind===4){byte(s);u32(s);}else throw Error('Unsupported import kind');}}
      else if(id===3){for(let n=count(s);n--;)functionTypes.push(u32(s));}
      else if(id===10){for(let n=count(s),i=0;i<n;i++){const length=u32(s),offset=s.p;skip(s,length);const signature=types[functionTypes[i]];if(!signature||!length||bytes[s.p-1]!==11)throw Error('Invalid function signature');functions.push({index:importedFunctions+i,length,offset,signature});}}
      else continue;
      if(s.p!==s.end)throw Error('Unexpected signature-scan section content');
    }
    if(functions.length!==functionTypes.length)throw Error('Signature function count mismatch');
    return {bytes,importedFunctions,functions};
  }
  async function scan(input,profile,options={}){
    if(!profile||profile.schema!==1||!Array.isArray(profile.anchors)||!profile.anchors.length||profile.anchors.length>MAX_ANCHORS)throw Error('Invalid signature profile');
    const parsed=parse(input),names=new Set(),byKey=new Map(),matches=new Map();
    for(const anchor of profile.anchors){
      if(typeof anchor.name!=='string'||names.has(anchor.name)||!Number.isInteger(anchor.length)||anchor.length<1||!/^[a-f0-9]{64}$/.test(anchor.sha256)||!anchor.signature||!Array.isArray(anchor.signature.params)||!Array.isArray(anchor.signature.results))throw Error('Invalid signature anchor');
      names.add(anchor.name);matches.set(anchor.name,[]);
      const key=anchor.length+':'+signatureKey(anchor.signature);if(!byKey.has(key))byKey.set(key,[]);byKey.get(key).push(anchor);
    }
    const digest=options.digest||((data)=>crypto.subtle.digest('SHA-256',data));
    const moduleSha256=hex(await digest(parsed.bytes));
    let hashedFunctions=0;
    for(const fn of parsed.functions){
      const candidates=byKey.get(fn.length+':'+signatureKey(fn.signature));if(!candidates)continue;
      const hash=hex(await digest(parsed.bytes.subarray(fn.offset,fn.offset+fn.length)));hashedFunctions++;
      for(const anchor of candidates)if(hash===anchor.sha256)matches.get(anchor.name).push(fn.index);
    }
    const anchors=profile.anchors.map(a=>{const indices=matches.get(a.name);return {name:a.name,expectedIndex:a.index,indices,status:indices.length===1?'unique':indices.length?'ambiguous':'missing'};});
    const byName=new Map(anchors.map(a=>[a.name,a])),features={};
    for(const [name,dependencies] of Object.entries(profile.features||{})){
      if(!Array.isArray(dependencies)||!dependencies.length||dependencies.some(d=>!byName.has(d)))throw Error('Invalid feature signature dependencies');
      const unique=dependencies.every(d=>byName.get(d).status==='unique');
      features[name]={status:unique?'candidate-only':'unresolved',enabled:false,dependencies};
    }
    return {schema:1,status:'diagnostic-only',referenceRevision:profile.revision,moduleSha256,
      referenceModuleMatches:moduleSha256===profile.sha256,
      importedFunctions:parsed.importedFunctions,definedFunctions:parsed.functions.length,hashedFunctions,
      anchors,features,canEnable:false,
      reason:'Function matches do not verify callees, dispatch tables, memory ownership or live behavior.'};
  }
  function summarize(result){
    return {referenceRevision:result.referenceRevision,moduleSha256:result.moduleSha256,
      referenceModuleMatches:result.referenceModuleMatches,anchors:result.anchors.length,
      unique:result.anchors.filter(a=>a.status==='unique').length,
      ambiguous:result.anchors.filter(a=>a.status==='ambiguous').length,
      missing:result.anchors.filter(a=>a.status==='missing').length,
      candidateFeatures:Object.values(result.features).filter(f=>f.status==='candidate-only').length,
      unresolvedFeatures:Object.values(result.features).filter(f=>f.status==='unresolved').length,
      canEnable:false};
  }
  async function scanAll(input,profiles,options={}){
    if(!Array.isArray(profiles)||!profiles.length||profiles.length>8)throw Error('Invalid signature profile list');
    const reports=[];
    // Keep profiles separate. A partial match from one cannot complete another.
    for(const profile of profiles)reports.push(await scan(input,profile,options));
    const summaries=reports.map(summarize);
    const ranked=[...summaries].sort((a,b)=>Number(b.referenceModuleMatches)-Number(a.referenceModuleMatches)||b.unique-a.unique||a.ambiguous-b.ambiguous);
    return {schema:1,status:'diagnostic-only',canEnable:false,reports,summaries,bestReference:ranked[0],
      reason:'Best reference is diagnostic similarity, not compatibility approval.'};
  }
  const api=Object.freeze({scan,scanAll,summarize,parse});root.__NFSU2_SIGNATURES__=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
