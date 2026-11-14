/* One-time selective integration. Fails closed when surrounding code changed.
 * Run after the bridge/dyno owner releases extension/ai.js, then regenerate
 * tools/build-corner-hook.cjs so the injected guards use the final bridge magic. */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),file=path.join(root,'extension/ai.js');
let s=fs.readFileSync(file,'utf8');
if(s.includes('function patchCornerBody('))throw Error('Corner integration already present; do not apply twice.');
function replace(a,b){if(s.split(a).length!==2)throw Error('Integration anchor changed: '+a.slice(0,100));s=s.replace(a,b);}
replace('  async function patchBytes(input) {',`  function patchCornerBody(old) {
    const pre=Uint8Array.from(CORNER.pre),post=Uint8Array.from(CORNER.post),before=locals(old),prefix=locals(pre),suffix=locals(post);
    const expected=CORNER.originalTypes.map(t=>({i32:127,f32:125,f64:124}[t]));
    if(before.types.length!==expected.length || before.types.some((t,i)=>t!==expected[i]) || prefix.types.length!==CORNER.totalLocals || suffix.types.length!==CORNER.totalLocals || old[old.length-1]!==11)
      throw Error('Native corner planner layout changed.');
    return join(pre.subarray(0,pre.length-1),old.subarray(before.end,old.length-1),post.subarray(suffix.end));
  }
  async function patchBytes(input) {`);
replace('          if(i===TARGET){',`          if(i===CORNER.index-37){
            const fn=patchCornerBody(bytes.subarray(fnStart,fnEnd));pieces.push(leb(fn.length),fn);changed++;
          }else if(i===TARGET){`);
replace('if(changed!==3 || p.i!==end)','if(changed!==4 || p.i!==end)');
replace('return b.byteLength>=BASE+92;','return b.byteLength>=CORNER.commandBase+36;');
replace('publish(wanted=0,player=0,car=0,race=0,pace=1,allowNetwork=false,allowDragAI=false){','publish(wanted=0,player=0,car=0,race=0,pace=1,allowNetwork=false,allowDragAI=false,cornerAssist=false,cornerFactor=0.8){');
replace('this.write(88,allowDragAI === true ? 1 : 0);this.write(24,++this.hb);',`this.write(88,allowDragAI === true ? 1 : 0);
      const cornerOn=cornerAssist===true && wanted===2 && this.u32(0x89e7b0)===0 && !this.view.getUint8(0x89e7d8);
      const percent=Number.isFinite(cornerFactor)&&cornerFactor>=0.6&&cornerFactor<=0.95?Math.round(cornerFactor*100):80;
      const cr=off=>Atomics.load(this.words,(CORNER.commandBase+off)/4)>>>0,cw=(off,v)=>Atomics.store(this.words,(CORNER.commandBase+off)/4,v|0);
      if(cr(0)!==CORNER.commandMagic || cr(4)!==Number(cornerOn) || cr(8)!==percent || (cr(12)&&cr(12)!==car)){
        for(let off=12;off<36;off+=4)cw(off,0);
      }
      cw(0,CORNER.commandMagic);cw(4,Number(cornerOn));cw(8,percent);this.write(24,++this.hb);`);
replace('update({enabled=false,safe=false,state=null,mode=0,pace=1,allowNetwork=false,allowDragAI=false}={}){','update({enabled=false,safe=false,state=null,mode=0,pace=1,allowNetwork=false,allowDragAI=false,cornerAssist=false,cornerFactor=0.8}={}){');
replace("        const target=[player,state.car,state.race,state.drag?'drag':'native',mode].join(':');",`        const raceType=this.u32(0x89e7b0),cornerOn=cornerAssist===true && mode===2 && raceType===0 && !state.drag;
        const cornerPercent=Number.isFinite(cornerFactor)&&cornerFactor>=0.6&&cornerFactor<=0.95?Math.round(cornerFactor*100):80;
        // Native planned caps are cached: rebuild the private route on every
        // effective corner-profile/category change, never merely reissue ON.
        const target=[player,state.car,state.race,state.drag?'drag':'native',mode,raceType,cornerOn?cornerPercent:0].join(':');`);
replace('this.publish(wanted?mode:0,player,state?.car||0,state?.race||0,pace,allowNetwork,allowDragAI);','this.publish(wanted?mode:0,player,state?.car||0,state?.race||0,pace,allowNetwork,allowDragAI,cornerAssist,cornerFactor);');
replace('      const level=rec>=0x10000',`      const cr=off=>Atomics.load(this.words,(CORNER.commandBase+off)/4)>>>0;
      const cornerRequested=cr(0)===CORNER.commandMagic && cr(4)===1 && this.read(8)===2 && this.u32(0x89e7b0)===0 && !drag;
      const cornerHits=cornerRequested && cr(12)===car?cr(16):0,cornerFactor=cr(8)/100;
      const cornerApplied=active && cornerRequested && cornerHits && cr(32)===cr(8)?cr(32)/100:null;
      const level=rec>=0x10000`);
replace('manual,dragUnsupported:','manual,cornerRequested,cornerFactor,cornerApplied,cornerHits,dragUnsupported:');
replace('patchBytes,BASE,MAGIC};','patchBytes,patchCornerBody,BASE,MAGIC,CORNER_BASE:CORNER.commandBase,CORNER_MAGIC:CORNER.commandMagic};');
replace('Changing AI mode · waiting for native handback.','Changing AI mode or corner settings · waiting for native handback.');
fs.writeFileSync(file,s);
console.log('Corner patcher and Controller selectively integrated. Run node tools/build-corner-hook.cjs next.');
