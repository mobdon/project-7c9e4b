'use strict';
// Isolated authored contact adapter. Only the existing 40-byte car mailbox is
// used: +28 is aggregate non-player contacts when rival mode is armed. This
// intentionally allocates no memory beside the paced-catch-up reservation.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {compose,locals}=require('./compose-contact-prefixes.cjs');
const B=0xd0d1c0,A=0xd0d100,RECORDS=0x890160,STRIDE=0x940;
const load=n=>`(i32.load (i32.const ${B+n}))`,G=n=>`(i32.load (i32.const ${n}))`,L=n=>`(local.get $${n})`;
const ptr=x=>`(i32.and (i32.ge_u ${x} (i32.const 65536)) (i32.and (i32.lt_u ${x} (i32.const 0x27fff000)) (i64.lt_u (i64.extend_i32_u ${x}) (i64.sub (i64.shl (i64.extend_i32_u (memory.size)) (i64.const 16)) (i64.const 4096)))))`;
const deny=x=>`  (br_if $ordinary ${x})\n`;
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,'Unique authored rival contact anchor');return s.replace(a,b);};
function roster(label){return `
  (local.set $most (i32.load offset=36 ${L('race')}))
${deny(`(i32.lt_u ${L('most')} (i32.const 2))`)}${deny(`(i32.gt_u ${L('most')} (i32.const 6))`)}
  (local.set $pair (i32.const 0)) (local.set $stack (i32.const 0))
  (loop $${label}
   (local.set $wall (i32.load offset=3024 (i32.add ${L('race')} (i32.shl ${L('pair')} (i32.const 2)))))
${deny(`(i32.lt_u ${L('wall')} (i32.add ${L('race')} (i32.const 48)))`)}${deny(`(i32.gt_u ${L('wall')} (i32.add ${L('race')} (i32.const 2528)))`)}${deny(`(i32.rem_u (i32.sub ${L('wall')} (i32.add ${L('race')} (i32.const 48))) (i32.const 496))`)}
   (if (i32.eq (i32.load ${L('wall')}) ${L('car')}) (then
${deny(`(i32.ne (i32.load offset=28 ${L('car')}) ${L('wall')})`)}
    (local.set $stack (i32.add ${L('stack')} (i32.const 1)))))
   (if (i32.eq (i32.load ${L('wall')}) ${L('face')}) (then
${deny(`(i32.ne (i32.load offset=28 ${L('face')}) ${L('wall')})`)}
    (local.set $stack (i32.add ${L('stack')} (i32.const 8)))))
   (local.set $pair (i32.add ${L('pair')} (i32.const 1)))
   (br_if $${label} (i32.lt_u ${L('pair')} ${L('most')})))
${deny(`(i32.ne ${L('stack')} (i32.const 9))`)}
`;}
function npcProof(label){return `
  ;; Exact native game_opponent predicate: static aligned kind-2 records only.
${deny(`(i32.ne ${G(A+84)} (i32.const 1))`)}${deny(`(i32.ne (i32.load offset=36 ${L('face')}) (i32.const 3))`)}
  (local.set $pair (i32.load offset=20 ${L('face')}))
${deny(`(i32.lt_u ${L('pair')} (i32.const ${RECORDS}))`)}${deny(`(i32.ge_u ${L('pair')} (i32.const ${RECORDS+22*STRIDE}))`)}${deny(`(i32.rem_u (i32.sub ${L('pair')} (i32.const ${RECORDS})) (i32.const ${STRIDE}))`)}${deny(`(i32.ne (i32.load offset=4 ${L('pair')}) (i32.const 2))`)}
  ;; G_WORLD is a pointer. Prove a bounded current AI range and one membership.
  (local.set $pair ${G(0x890080)})
${deny(`(i32.eqz ${ptr(L('pair'))})`)}${deny(`(i32.lt_u (i32.load offset=16 ${L('pair')}) (i32.const 1))`)}${deny(`(i32.gt_u (i32.load offset=16 ${L('pair')}) (i32.const 22))`)}
  (local.set $stack (i32.load offset=20 ${L('pair')}))
${deny(`(i32.ge_u ${L('stack')} (i32.load offset=24 ${L('pair')}))`)}${deny(`(i32.gt_u (i32.load offset=24 ${L('pair')}) (i32.load offset=16 ${L('pair')}))`)}
  (local.set $most (i32.const 0))
  (loop $${label}_world
   (if (i32.eq (i32.load offset=28 (i32.add ${L('pair')} (i32.shl ${L('stack')} (i32.const 2)))) ${L('face')})
    (then (local.set $most (i32.add ${L('most')} (i32.const 1)))))
   (local.set $stack (i32.add ${L('stack')} (i32.const 1)))
   (br_if $${label}_world (i32.lt_u ${L('stack')} (i32.load offset=24 ${L('pair')}))))
${deny(`(i32.ne ${L('most')} (i32.const 1))`)}
  (if (i32.eq ${G(0x89e7b0)} (i32.const 7)) (then ${roster(label+'_roster')}))
  (local.set $most (i32.const -8))
`;}
function playerOutrunProof(label){return `
  ;; A native player-slot match is necessary but not sufficient for Outrun.
${deny(`(i32.ne ${G(A+84)} (i32.const 1))`)}${deny(`(i32.ne ${G(0x89e7b0)} (i32.const 7))`)}
${roster(label+'_roster')}
  ;; Positive category marker preserves the existing player counter route.
  (local.set $most (i32.const 8))
`;}
function transform(source){
 let s=require('./add-online-race-cars.cjs').transform(source);
 const start=source.indexOf('  (if ',source.indexOf(';; Online mode bits:')),end=source.indexOf('  (local.set $pair (i32.load offset=20',start);
 assert(start>=0&&end>start,'Original authored classifier');
 const classifier=`  (if ${load(36)} (then
   (local.set $most (call $slot_kind ${L('face')} (i32.const 0)))
   ;; Identified remote players never fall through to NPC/traffic, regardless
   ;; of driver or whether they happen to carry a static-looking record.
   (if (i32.ge_s ${L('most')} (i32.const 0))
    (then
${deny(`(i32.gt_u ${L('most')} (i32.const 2))`)}${deny(`(i32.eqz (i32.and ${load(36)} (i32.const 2)))`)}
     (if (i32.eq ${G(0x89e7b0)} (i32.const 7))
      (then ${playerOutrunProof('player_initial')})
      (else ${deny(`(i32.ne ${G(0x89e7b0)} (i32.const 0))`)})))
    (else
${deny(`(i32.ne ${L('most')} (i32.const -1))`)}
     (if (i32.eq (i32.load offset=36 ${L('face')}) (i32.const 4))
      (then
${deny(`(i32.ne ${G(0x89e7b0)} (i32.const 0))`)}${deny(`(i32.eqz (i32.and ${load(36)} (i32.const 1)))`)})
      (else
${deny(`(i32.eqz (i32.and ${load(36)} (i32.const 8)))`)}${npcProof('npc_initial')}
      ))))))
`;
 s=once(s,source.slice(start,end),classifier);
 s=once(s,`(i32.gt_u ${load(36)} (i32.const 4))`,`(i32.or (i32.gt_u ${load(36)} (i32.const 11)) (i32.and (i32.ne (i32.and ${load(36)} (i32.const 4)) (i32.const 0)) (i32.ne ${load(36)} (i32.const 4))))`);
 const type0=`(i32.ne ${G(0x89e7b0)} (i32.const 0))`;
 // This anchor is in the original online context gate, before classification.
 const gate=`(i32.or (i32.eqz (local.get $most)) ${type0})`;
 s=once(s,gate,`(i32.or (i32.eqz (local.get $most)) (i32.and ${type0} (i32.eqz (i32.and (i32.ne (i32.and ${load(36)} (i32.const 10)) (i32.const 0)) (i32.eq ${G(0x89e7b0)} (i32.const 7))))))`);
 const guard='  (local.set $p ';
 const at=s.indexOf(guard);assert(at>=0);
 const special=[0x89e7d8,0x89e7d9,0x89e7e3].map(a=>`(i32.load8_u (i32.const ${a}))`).concat([0x890104,0x890108,0x89010c,0x890114].map(G)).reduce((a,b)=>`(i32.or ${a} ${b})`);
 const guardedContext=`(i32.or (i32.and ${load(36)} (i32.const 8)) (i32.and (i32.ne (i32.and ${load(36)} (i32.const 2)) (i32.const 0)) (i32.eq ${G(0x89e7b0)} (i32.const 7))))`;
 s=s.slice(0,at)+`  (if ${guardedContext} (then\n${deny(`(i32.ne ${G(A+84)} (i32.const 1))`)}${deny(special)}  ))\n`+s.slice(at);
 const anchor='  ;; Same finite pair-pass bookkeeping used by the game\'s Ghost mode.';
 const final=`  ;; Recheck NPC/player Outrun proof after native slot lookup and before
  ;; contact mutation. Preserve the already bounded contact pair and CPU stack.
  (if (i32.or (i32.eq ${L('most')} (i32.const -8)) (i32.eq ${L('most')} (i32.const 8))) (then
   (local.set $a ${L('pair')}) (local.set $b ${L('stack')})
${deny('(i32.eqz (call $roam_online))')}
   (if (i32.eq ${L('most')} (i32.const 8))
    (then
     (local.set $most (call $slot_kind ${L('face')} (i32.const 0)))
${deny(`(i32.lt_s ${L('most')} (i32.const 0))`)}${deny(`(i32.gt_u ${L('most')} (i32.const 2))`)}
${playerOutrunProof('player_final')}
    )
    (else
${deny(`(i32.ne (call $slot_kind ${L('face')} (i32.const 0)) (i32.const -1))`)}${npcProof('npc_final')}
    ))
   (local.set $pair ${L('a')}) (local.set $stack ${L('b')})
   (local.set $a (i32.load offset=12 ${L('contact')})) (local.set $b (i32.load offset=16 ${L('contact')}))
   (local.set $wall (i32.load offset=60 ${L('face')}))
${deny(`(i32.eqz ${ptr(L('wall'))})`)}${deny(`(i32.load8_u offset=17 ${L('wall')})`)}${deny(`(i32.load8_u offset=17 ${L('body')})`)}${deny(`(i32.ne (i32.load offset=304 ${L('wall')}) ${L('face')})`)}${deny(`(i32.ne (i32.load offset=60 ${L('car')}) ${L('body')})`)}${deny(`(i32.ne (i32.load offset=304 ${L('body')}) ${L('car')})`)}
${deny(`(i32.eqz (i32.or (i32.and (i32.eq ${L('a')} ${L('body')}) (i32.eq ${L('b')} ${L('wall')})) (i32.and (i32.eq ${L('b')} ${L('body')}) (i32.eq ${L('a')} ${L('wall')}))))`)}
${deny(`(i32.ne (i32.load offset=20 ${L('contact')}) ${L('pair')})`)}${deny(`(i32.ne (i32.load offset=568 ${L('pair')}) ${L('a')})`)}${deny(`(i32.ne (i32.load offset=572 ${L('pair')}) ${L('b')})`)}
${deny(`(i32.ne (i32.load offset=4 ${L('cpu')}) ${L('contact')})`)}${deny(`(i32.ne (i32.load offset=16 ${L('cpu')}) ${L('stack')})`)}${deny(`(i32.ne ${G(0xd00000)} ${L('p')})`)}${deny(`(i32.ne (i32.load offset=4 ${L('p')}) ${L('car')})`)}${deny(`(i32.ne ${G(0x890118)} ${L('race')})`)}
${deny(`(i32.and ${G(0x850078)} (i32.const 520))`)}${deny(G(0x866a14))}${deny(G(0x8669f4))}${deny('(i32.load8_u (i32.const 0x89cf69))')}${deny(special)}
${deny(`(i32.eqz (i32.or (i32.eq ${G(0x89e7b0)} (i32.const 0)) (i32.eq ${G(0x89e7b0)} (i32.const 7))))`)}${deny(`(i32.and (i32.eq ${L('most')} (i32.const 8)) (i32.ne ${G(0x89e7b0)} (i32.const 7)))`)}${deny(`(i32.ne ${G(0x8654a4)} (i32.const 6))`)}${deny(`(i32.ne ${G(0xd00030)} (i32.const 1))`)}${deny(`(i32.ne (i32.load ${L('race')}) (i32.const 4))`)}${deny(`(i32.load offset=16 ${L('p')})`)}${deny(`(i32.ge_u ${G(A+48)} (i32.const 180))`)}${deny(`(i32.ne ${load(8)} (i32.const 1))`)}${deny(`(i32.eqz (i32.and ${load(36)} (select (i32.const 2) (i32.const 8) (i32.eq ${L('most')} (i32.const 8)))))`)}
${deny(`(i32.ne ${L('seq')} ${load(4)})`)}${deny(`(i32.ne ${L('aseq')} ${G(A+4)})`)}
  ))
`;
 return once(s,anchor,final+anchor);
}
function compile(wabt,text){const m=wabt.parseWat('online-rivals-v03811.wat',text,{threads:true});m.resolveNames();m.validate({threads:true});return Buffer.from(m.toBinary({}).buffer);}
function onlyBody(bytes){const p=require('../../work-aa-profile/tools/native-proof.cjs').parse(bytes);assert.equal(p.bodies.size,1);return [...p.bodies.values()][0];}
function contactBody(wabt,source,profile,cars){
 const online='(import "env" "roam_online" (func $roam_online (result i32)))',slot='(import "env" "slot_kind" (func $slot_kind (param i32 i32) (result i32)))',native='(import "env" "original" (func $native (param i32)))';
 const imports=online+(cars?slot:'')+native,dummy=Array.from({length:profile.wall.helper},(_,i)=>`(import "unused" "${i}" (func))`).join('');
 return [...onlyBody(compile(wabt,once(once(source,imports,dummy+online+(cars?slot:'')),'(call $native (local.get $cpu))','')))];
}
async function build(profile){
 assert.equal(profile.cars?.onlineRaceCars,true,'Reviewed ordinary/race contact baseline');assert.equal(profile.cars.bytes,40);assert.equal(profile.cars.totalLocals,19);assert.equal(profile.cars.slotKind,profile.wall.helper+1);
 const wabt=await require('../../build-deps/node_modules/wabt')(),source=fs.readFileSync(path.join(__dirname,'cars-online.wat'),'utf8'),wall=fs.readFileSync(path.join(__dirname,'walls-current.wat'),'utf8');
 const oldCar=contactBody(wabt,require('./add-online-race-cars.cjs').transform(source),profile,true),wallBody=contactBody(wabt,wall,profile,false),oldCombined=compose(oldCar,wallBody);
 const authored=transform(source),car=contactBody(wabt,authored,profile,true),combined=compose(car,wallBody);
 assert.deepEqual(locals(car).types,locals(oldCar).types);
 assert(Buffer.from(profile.wall.bridge).equals(Buffer.from(oldCombined))||(profile.cars.onlineRivals===true&&Buffer.from(profile.wall.bridge).equals(Buffer.from(combined))),'Frozen original or exact candidate combined car/wall body');
 const next=JSON.parse(JSON.stringify(profile));next.wall.bridge=combined;next.cars.onlineRivals=true;next.cars.onlinePlayerOutrun=true;next.cars.primaryCounterScope='aggregate-non-player-with-rivals';next.capabilities.onlineRivals=true;next.capabilities.onlinePlayerOutrun=true;
 return {profile:next,car,wall:wallBody,combined,standalone:compile(wabt,authored),receipt:{schema:'nfsu2-online-rival-contact-v03811',revision:profile.revision,moduleHash:profile.hash,contactFunction:profile.wall.functionIndex,slotKind:profile.cars.slotKind,mailbox:{base:B,bytes:40,newAllocation:false},originalContactHash:crypto.createHash('sha256').update(Buffer.from(oldCombined)).digest('hex'),contactHash:crypto.createHash('sha256').update(Buffer.from(combined)).digest('hex'),totalLocals:19,liveVerified:false}};
}
module.exports={transform,build,compile,contactBody,npcProof};
