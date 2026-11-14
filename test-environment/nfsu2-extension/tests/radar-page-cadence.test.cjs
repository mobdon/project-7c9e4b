'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../extension/page.js'),'utf8');
function fixture(){
 const nodes=new Map(),stats=[],radar=[];
 const c={now:0,ui:{querySelector:id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);}},
  streamHudEnabled:true,rearRadarEnabled:true,cleanView:false,hudEditing:false,visible:false,hubOpen:false,
  streamRenderAt:-Infinity,radarAt:0,radarSample:{available:true,id:0},radarDrawnSample:undefined,
  infoHudSample:null,infoHudView:()=>({}),prefs:{},raceOnlyAI:false,raceStats:null,forwardSnapshot:{},
  streamSession:require('../extension/stream-hud.js').createSession(),
  StreamHud:{render:()=>stats.push(c.now),renderRadar:(_ui,s)=>radar.push({at:c.now,sample:s})},performance:{now:()=>c.now}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('  function renderStreamHud('),source.indexOf('  function setCleanView('))+';this.draw=renderStreamHud;',c);
 return{c,nodes,stats,radar,sample(at){c.now=at;c.radarAt=at;c.radarSample={available:true,id:at};c.draw();}};
}
test('radar draws each new100ms observation while statistics retain their250ms cadence',()=>{
 const f=fixture();f.c.draw();f.c.now=50;f.c.draw();f.sample(100);f.sample(200);f.c.now=250;f.c.draw();f.sample(300);
 assert.deepEqual(f.radar.map(r=>r.at),[0,100,200,300]);assert.deepEqual(f.stats,[0,250]);
 assert.deepEqual(f.radar.map(r=>r.sample.id),[0,100,200,300]);
});
test('an expired radar observation clears immediately even inside the stats throttle',()=>{
 const f=fixture();f.c.draw();f.c.now=250;f.c.draw();assert.equal(f.radar.length,1);
 f.c.now=251;f.c.draw();assert.equal(f.radar.length,2);assert.equal(f.radar.at(-1).sample,null);assert.deepEqual(f.stats,[0,250]);
 f.c.now=275;f.c.draw();assert.equal(f.radar.length,2);
});
test('hidden widgets cause no redraw; forced layout refresh draws the current observation',()=>{
 const f=fixture();f.c.visible=true;f.c.draw();assert.equal(f.radar.length,0);assert.equal(f.stats.length,0);
 f.c.visible=false;f.c.draw();f.c.now=50;f.c.draw(true);assert.deepEqual(f.radar.map(r=>r.at),[0,50]);
 assert.equal(f.radar[0].sample,f.radar[1].sample);assert.deepEqual(f.stats,[0,50]);
});
test('page catch reports fixed guard45 and Stop clears the prior rejection code',()=>{
 assert.match(source,/catch \{cancelForward\(\);forwardSnapshot=\{forwardState:'unknown',forwardGuardCode:45,/);
 const clear=source.slice(source.indexOf('  function cancelForward('),source.indexOf('  function cancelForward(')+700);
 assert.match(clear,/forwardGuardCode:undefined/);
});
