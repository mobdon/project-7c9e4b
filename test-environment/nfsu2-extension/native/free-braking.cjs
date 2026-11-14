'use strict';
// Build-time authored edits only. Keep the native grade getter and the existing
// race braking path intact; add pace compensation to owned ordinary free roam.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const P=require('../../work-aa-profile/tools/native-proof.cjs');
const {locals}=require('../../nfsu2-extension/tools/compose-contact-prefixes.cjs');
const INDEX=4497,NATIVE_HASH='0420516913f8f2513c82e748caa9446684d358afb259b3f6978d278372073044';
const HASHES=new Set(['a220e667d38c0a6509c1507ad3ca9c6fddeb2220b429bf28707d7ca8cbbc42c8','f88fc7a0fe3082e20814f705635410d046fcdfe053eb70d65c49dec7583105b9','c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391']);
const A=0xd0d100,B=0xd0d200,g=p=>`(i32.load (i32.const ${p}))`,a=n=>g(A+n),b=n=>g(B+n),eq=(x,n)=>`(i32.eq ${x} (i32.const ${n}))`;
const TABLES=Object.freeze([[0x7a4740,12],[0x7a4744,10.6],[0x7a4748,9.3],[0x7a474c,8],[0x7a4760,10],[0x7a4764,9],[0x7a4768,8],[0x7a476c,6]]);
let wabtPromise;
async function compile(source){
 const wabt=await(wabtPromise??=require('../../build-deps/node_modules/wabt')()),w=wabt.parseWat('authored-free-roam-braking.wat',source,{threads:true});
 w.resolveNames();w.validate({threads:true});const body=[...P.parse(Buffer.from(w.toBinary({}).buffer)).bodies.values()][0],meta=locals(body);w.destroy();return{header:body.subarray(0,meta.end),fragment:body.subarray(meta.end,-1)};
}
function replaceOnce(source,needle,replacement){const at=source.indexOf(needle);assert(at>=0&&source.indexOf(needle,at+1)<0,'Unique authored braking source: '+needle);return source.slice(0,at)+replacement+source.slice(at+needle.length);}
function freeGuards(profile,label,{post=false}={}){
 const stop=x=>`(br_if $${label} ${x})`,deny=x=>stop(`(i32.eqz ${x})`),o=profile.online;
 const network=`(i32.or (i32.or (i32.and ${g(0x850078)} (i32.const 520)) (i32.or ${g(0x866a14)} (i32.or ${g(0x8669f4)} (i32.load8_u (i32.const 0x89cf69))))) (i32.and (i32.ne ${g(o[0])} (i32.const 0)) (i32.and (i32.ne (i32.load8_u (i32.const ${o[1]})) (i32.const 0)) (i32.ne ${g(o[2])} (i32.const 0)))))`;
 const committed=p=>`(i32.ne (i32.and (i32.load8_u (i32.const ${profile.bitmap+(p>>>17)})) (i32.const ${1<<((p>>>14)&7)})) (i32.const 0))`;
 return `(if ${post?'(i32.eq (local.get $eligible) (i32.const 2))':'(local.get $fb_free)'} (then
 ${deny(eq(b(4),1))}
 ${post?`${deny(eq(a(0),0x3749414e))} ${deny(eq(a(28),0x3749414e))} ${deny(eq(b(0),0x33524e43))}
 ${deny(eq(a(52),1))} ${stop(`(i32.ge_u ${a(48)} (i32.const 180))`)} ${deny(eq(g(0x8654a4),6))} ${deny(eq(g(0xd00030),1))}
 ${stop('(i32.load offset=16 (local.get $player))')}
 ${[0x89e7d8,0x89e7d9,0x89e7e3].map(p=>stop(`(i32.load8_u (i32.const ${p}))`)).join('\n')}
 ${[0x890104,0x890108,0x89010c,0x890114].map(p=>stop(g(p))).join('\n')}`:''}
 ${stop(`(i32.lt_u (memory.size) (i32.const ${Math.ceil((Math.max(profile.bitmap+32768,...o.map(x=>x+4)))/65536)}))`)}
 ${stop('(i32.eqz (local.get $seq))')}
 ${deny(eq(a(8),2))} ${deny(eq(g(0x89e7b0),0))}
 ${stop('(i32.le_u (local.get $percent) (i32.const 100))')} ${stop('(i32.gt_u (local.get $percent) (i32.const 300))')}
 ${deny(`(i32.eq (local.get $percent) ${a(60)})`)} ${deny(`(i32.eq (local.get $percent) ${b(48)})`)} ${deny(eq(b(44),100))}
 ${stop(`(i32.gt_u ${a(84)} (i32.const 1))`)}
 (if ${network} (then ${deny(eq(a(84),1))} ${stop(eq(g(0x850088),10))}))
 ${stop('(i32.load8_u (i32.const 0x89e7e3))')} ${stop(g(0x89010c))}
 ${deny('(i32.eq (i32.load (local.get $driver)) (i32.const 0x785370))')}
 ${deny(committed(0x7a4740))}
 ${TABLES.map(([at,value])=>deny(`(f32.eq (f32.load (i32.const ${at})) (f32.const ${value}))`)).join('\n')}
 ${post?`${deny(`(i32.eq (local.get $car) ${a(16)})`)} ${deny(`(i32.eq (local.get $car) ${a(36)})`)}
 ${deny(`(i32.eq (local.get $player) ${g(0xd00000)})`)} ${deny('(i32.eq (i32.load offset=4 (local.get $player)) (local.get $car))')}
 ${deny('(i32.eq (i32.load offset=36 (local.get $car)) (i32.const 3))')} ${deny('(i32.eq (i32.load offset=44 (local.get $car)) (local.get $driver))')}
 ${deny('(i32.eq (i32.load offset=4 (local.get $driver)) (local.get $car))')} ${deny('(i32.eq (i32.load offset=1768 (local.get $driver)) (local.get $route))')}
 ${deny(`(i32.eq (local.get $race) ${g(0x890118)})`)} ${deny('(i32.eq (i32.load (local.get $race)) (i32.const 4))')}
 ${stop('(i32.gt_u (i32.load offset=4 (local.get $cpu)) (i32.const 3))')}
 ${deny(TABLES.map(([,value])=>`(f64.eq (local.get $native) (f64.promote_f32 (f32.const ${value})))`).reduce((x,y)=>`(i32.or ${x} ${y})`))}`:''}
 ))`;
}
async function transform(profile,beforeBody){
 const hash=profile?.native?.hash;assert(HASHES.has(hash),'Exact reviewed free-roam braking profile');assert(Number.isInteger(profile.bitmap)&&Array.isArray(profile.online)&&profile.online.length===3);
 const before=Buffer.from(beforeBody),source=fs.readFileSync(path.join(__dirname,'../../nfsu2-extension/tools/braking-hook.wat'),'utf8'),mark=';; ORIGINAL FUNCTION BODY RUNS HERE',split=source.indexOf(mark),start=source.indexOf('(block $skip');assert(split>start);
 const head=source.slice(0,start),pre=source.slice(start,split),post=source.slice(split+mark.length),oldPre=await compile(head+pre+'))'),oldPost=await compile(head+post);
 let next=replaceOnce(pre,`(br_if $skip (i32.eqz (i32.or ${eq(b(4),2)} ${eq(b(4),3)})))`,`(br_if $skip (i32.eqz (i32.or ${eq(b(4),1)} (i32.or ${eq(b(4),2)} ${eq(b(4),3)}))))`);
 const first=`(if ${eq(b(4),3)} (then`,at=next.indexOf(first);assert(at>=0);next=next.slice(0,at)+next.slice(at).replace(first,`(if (i32.or ${eq(b(4),1)} ${eq(b(4),3)}) (then`);
 next=replaceOnce(next,`(br_if $skip (i32.ne ${a(8)} (i32.const 1)))\n (br_if $skip (i32.ne ${g(0x89e7b0)} (i32.const 1)))`,`(if ${eq(b(4),1)} (then (br_if $skip (i32.ne ${a(8)} (i32.const 2))) (br_if $skip ${g(0x89e7b0)})) (else (br_if $skip (i32.ne ${a(8)} (i32.const 1))) (br_if $skip (i32.ne ${g(0x89e7b0)} (i32.const 1)))))`);
 const settings=`(local.set $percent ${b(48)}) (local.set $braking ${b(44)})`;next=replaceOnce(next,settings,settings+'\n'+freeGuards(profile,'skip'));
 next=replaceOnce(next,'(local.set $eligible (i32.const 1))','(br_if $skip (i32.ne (local.get $fb_free) '+eq(b(4),1)+'))\n (local.set $eligible (select (i32.const 2) (i32.const 1) (local.get $fb_free)))');
 const store='(f64.store (local.get $slot) (f64.mul (local.get $native)';let nextPost=replaceOnce(post,store,freeGuards(profile,'skipAfter',{post:true})+'\n '+store);
 const newHead=head+' (local $fb_free i32) ',newPre=await compile(newHead+'(local.set $fb_free '+eq(b(4),1)+')\n'+next+'))'),newPost=await compile(newHead+nextPost);assert.deepEqual(locals(newPre.header).types,[...locals(oldPre.header).types,127]);assert.deepEqual(newPost.header,newPre.header);
 const meta=locals(before),preAt=meta.end,postAt=before.length-1-oldPost.fragment.length;assert.deepEqual(before.subarray(preAt,preAt+oldPre.fragment.length),oldPre.fragment);assert.deepEqual(before.subarray(postAt,-1),oldPost.fragment);
 const native=Buffer.concat([Buffer.from([1,6,127]),before.subarray(preAt+oldPre.fragment.length,postAt),Buffer.from([11])]);assert.equal(P.hash(native),NATIVE_HASH,'Native getter instructions remain exact');
 const edits=[{offset:preAt,needle:oldPre.fragment,replacement:newPre.fragment},{offset:postAt,needle:oldPost.fragment,replacement:newPost.fragment}],parts=[newPre.header];let cursor=meta.end;
 for(const e of edits){parts.push(before.subarray(cursor,e.offset),e.replacement);cursor=e.offset+e.needle.length;}parts.push(before.subarray(cursor));const body=Buffer.concat(parts);
 return{body,plan:{index:INDEX,kind:'edits',originalHash:P.hash(before),originalLength:before.length,originalLocalsEnd:meta.end,locals:newPre.header.toString('base64'),edits:edits.map(e=>({offset:e.offset,needle:e.needle.toString('base64'),replacement:e.replacement.toString('base64')})),outputHash:P.hash(body)}};
}
module.exports={INDEX,NATIVE_HASH,TABLES,transform};
