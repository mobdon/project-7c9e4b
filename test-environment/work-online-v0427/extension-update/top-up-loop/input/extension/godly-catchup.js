/* Player-only constant catch-up ("to the finish line"), also in Drag and Street X.
 * Applied after the paced catch-up patch on the exact ed8d3359 build only.
 * The paired catch-up publisher previously required the race's Catch Up flag
 * ([0x89E7F8] == 1) and the site's Rubberbanding mode = Original. With
 * Rubberbanding Off the game keeps every AI's factor at 1, so the player's AI
 * car got no boost at all. These same-length edits make both checks pass, so
 * the player's owned AI car gets pace x strength from a native factor of 1
 * (constant, independent of the gap), while opponents keep the game's setting.
 * The page never enables the command in online sessions.
 *
 * Skill (0.41): the AI driver's GetSkill() (0x402580) returns the player's
 * marker -2, which the game's AI code clamps to skill 0, the weakest level.
 * The replaced body returns 9, the best opponent level, only for the player's
 * marker, only at the listed call sites that clamp it (nitrous decisions, drag
 * launch delay, decision chances), and only while the extension's native AI
 * owns the local player's current car in a solo session. Every other caller,
 * car and session keeps the game's value. */
(function(root){
  'use strict';
  if(root.__NFSU2_GODLY_CATCHUP__)return;
  const hex=s=>Uint8Array.from(s.match(/../g).map(x=>parseInt(x,16)));
  const configs=Object.freeze({
    'f9e0002e8a04a88355b3cc62235010e19479e0cf2ab05d8916975d68abf5706b':Object.freeze({
      revision:'ed8d3359',
      inputModuleHash:'92b567a3e8a2588ab0c9bfc875ae5a236ad96fd49fe527b1a83c92fe64011e73',
      outputModuleHash:'41470ae572c414cb3751cc2528ab7dff710ca0a6a0c1f54f552f3b4272a91842',
      edits:Object.freeze([
        // i32.const <Rubberbanding mode host>; i32.load -> drop; i32.const 0 (mode reads as Original)
        Object.freeze({needle:'41e0eed7c002280200410046',replacement:'41e0eed7c0021a4100410046',count:36}),
        // i32.const 0x89E7F8; i32.load -> drop; i32.const 1 (Catch Up flag reads as on)
        Object.freeze({needle:'41f8cfa704280200410146',replacement:'41f8cfa7041a4101410146',count:36})
      ]),
      // Race-kind exclusion inside the same catch-up functions: Drag ([0x89E7D8], forced [0x890108]) and
      // Street X ([0x89E7E3], forced [0x89010C]) now read as 0; Drift stays excluded. Exact offsets only
      // (the same expression in the route-choice function is left alone).
      modes:Object.freeze({needle:'410041d8cfa7042d00007241d9cfa7042d00007241e3cfa7042d000072418482a40428020072418882a40428020072418c82a40428020072419482a4042802007245450d',
        replacement:'410041d8cfa7041a41007241d9cfa7042d00007241e3cfa7041a410072418482a40428020072418882a4041a410072418c82a4041a410072419482a4042802007245450d',
        offsets:Object.freeze([5229340, 5232362, 5235628, 5238370, 5241113, 5243870, 5246917, 5249659, 5252402, 5255159, 5257986, 5261107, 6895045, 10614412, 10616962, 10619791, 10622107, 10625090, 10627437, 11080139, 11083164, 11086031, 11088658, 11091218, 11094863, 11097888, 11100755, 11103382, 11105942, 21941233, 21948472, 21953577, 22408138, 22413446, 22418601, 36298968])}),
      // GetSkill() wrapper, whole body pinned and replaced. Sites are x86 return addresses read from the guest stack:
      // 0x4082e6 decision chance, 0x40844b nitrous delay, 0x40d863/0x40d91e nitrous decision (drag gear),
      // 0x416faa nitrous use on road, 0x42c105 drag launch delay, 0x42d666 manoeuvre parameter.
      // Left native on purpose: 0x402263 (off-screen reset check), 0x41c648/0x41c9c9 (the marker already gets no
      // random speed variance), the catch-up curve/update sites and the branch choice (shortcut policy owns it).
      skill:Object.freeze({index:12864,importFunctions:38,level:9,
        original:'01027f20002000280210417c6a2201360210200041808080800020002802046a41046a280000220236020020024180808080006a41146a28000021022001418bcb80023600808080800020002002360204200010da8e818000200020002c0000360200200020002802102201280080808080003602202000200141046a3602100b',
        replacement:'01077f20002000280210417c6a220136021020002802042104200041808080800020002802046a41046a28000022023602002002210320024180808080006a41146a28000021022001418bcb80023600808080800020002002360204200010da8e818000200020002c000036020002402000280200417e470d0020002802102800002105200541e685820246200541cb8882024672200541e3b0830246722005419eb283024672200541aadf8502467220054185828b024672200541e6ac8b024672450d004180a2c30628020041ce82a5ba03470d00419ca2c30628020041ce82a5ba03470d004184a2c306280200210620064101710d0041b0a2c30628020041b4014f0d004188a2c30628020041016b41014b0d0041b4a2c3062802004101470d0041a4a999042802004106470d0041b080c0062802004101470d0041f8809404280200418804714194d499042802007241f4d3990428020041e99ea7042d000072720d00200341a4a2c306280200470d0020034190a2c306280200470d0020032802244103470d00200328022c2004470d00418080c00628020021072007418080046b418080f8bf024f0d00200741a0a2c306280200470d0020072802042003470d0020064184a2c306280200470d00200041093602000b200020002802102201280080808080003602202000200141046a3602100b'})
    })
  });
  const sha=async bytes=>Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  function find(hay,needle,from){
    outer:for(let i=from;i<=hay.length-needle.length;i++){
      if(hay[i]!==needle[0])continue;
      for(let j=1;j<needle.length;j++)if(hay[i+j]!==needle[j])continue outer;
      return i;
    }
    return -1;
  }
  const leb=n=>{const a=[];do{let v=n&127;n>>>=7;if(n)v|=128;a.push(v);}while(n);return Uint8Array.from(a);};
  const read=(b,p)=>{let v=0,s=0,x;do{x=b[p++];v|=(x&127)<<s;s+=7;}while(x&128);return {value:v>>>0,end:p};};
  const concat=parts=>{const o=new Uint8Array(parts.reduce((n,b)=>n+b.length,0));let at=0;for(const b of parts){o.set(b,at);at+=b.length;}return o;};
  // Replaces one pinned function body in the code section and re-encodes the two sizes around it.
  function replaceBody(bytes,plan){
    const old=hex(plan.original),neu=hex(plan.replacement),target=plan.index-plan.importFunctions,parts=[bytes.subarray(0,8)];
    let at=8,done=false;
    while(at<bytes.length){
      const start=at,id=bytes[at++],len=read(bytes,at),data=len.end,end=data+len.value;
      if(end>bytes.length)throw Error('Godly skill: section bounds');
      at=end;
      if(id!==10){parts.push(bytes.subarray(start,end));continue;}
      if(done)throw Error('Godly skill: duplicate code section');
      const count=read(bytes,data);let cur=count.end;
      if(target<0||target>=count.value)throw Error('Godly skill: function index');
      for(let n=0;n<target;n++){const size=read(bytes,cur);cur=size.end+size.value;if(cur>=end)throw Error('Godly skill: code bounds');}
      const size=read(bytes,cur),from=size.end,to=from+size.value;
      if(to>end||size.value!==old.length)throw Error('Godly skill: wrapper pin');
      for(let j=0;j<old.length;j++)if(bytes[from+j]!==old[j])throw Error('Godly skill: wrapper pin');
      const size2=leb(neu.length);
      parts.push(Uint8Array.of(10),leb(len.value-(to-cur)+size2.length+neu.length),bytes.subarray(data,cur),size2,neu,bytes.subarray(to,end));
      done=true;
    }
    if(!done)throw Error('Godly skill: no code section');
    return concat(parts);
  }
  const supports=hash=>Object.prototype.hasOwnProperty.call(configs,hash);
  async function patchModule(input,{verifiedOriginalHash}={}){
    if(!supports(verifiedOriginalHash))return input;
    const p=configs[verifiedOriginalHash];
    const out=Uint8Array.from(input instanceof Uint8Array?input:new Uint8Array(input));
    if(await sha(out)!==p.inputModuleHash)throw Error('Godly catch-up: input hash mismatch');
    for(const e of p.edits){
      const a=hex(e.needle),b=hex(e.replacement);
      let n=0,i=find(out,a,0);
      while(i>=0){out.set(b,i);n++;i=find(out,a,i+a.length);}
      if(n!==e.count)throw Error('Godly catch-up: site count mismatch');
    }
    const m=p.modes,ma=hex(m.needle),mb=hex(m.replacement);
    for(const at of m.offsets){
      for(let j=0;j<ma.length;j++)if(out[at+j]!==ma[j])throw Error('Godly catch-up: race-kind site mismatch');
      out.set(mb,at);
    }
    const result=replaceBody(out,p.skill);
    if(await sha(result)!==p.outputModuleHash)throw Error('Godly catch-up: output hash mismatch');
    return result;
  }
  const api=Object.freeze({supports,patchModule});
  root.__NFSU2_GODLY_CATCHUP__=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
