'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Layout=require('../extension/hud-layout.js');
class Target{
  constructor(){this.listeners=new Map();}
  addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);}
  removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
  emit(type,data={}){const event={button:0,isPrimary:true,pointerId:7,clientX:0,clientY:0,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...data};for(const fn of this.listeners.get(type)||[])fn(event);return event;}
}
class Element extends Target{
  constructor(doc,tag='div',rect={left:24,top:24,width:220,height:100}){super();this.ownerDocument=doc;this.tagName=tag;this.rect=rect;this.attrs=new Map();this.style={};this.children=[];this.parent=null;this.hidden=false;this.textContent='';this.captured=new Set();}
  setAttribute(name,value){this.attrs.set(name,String(value));}
  getAttribute(name){return this.attrs.get(name)??null;}
  appendChild(node){this.children.push(node);node.parent=this;return node;}
  remove(){if(this.parent){this.parent.children=this.parent.children.filter(x=>x!==this);this.parent=null;}}
  matches(selector){return selector==='.stream-hud'&&this.host===true;}
  querySelectorAll(selector){const out=[];for(const n of this.children){if(selector==='[data-hud-widget]'&&n.attrs.has('data-hud-widget'))out.push(n);out.push(...n.querySelectorAll(selector));}return out;}
  querySelector(selector){if(selector==='.stream-hud')return this.children.find(x=>x.host)||null;return null;}
  get offsetWidth(){return Math.min(this.rect.width,parseFloat(this.style.maxWidth)||Infinity);}
  get offsetHeight(){return Math.min(this.rect.height,parseFloat(this.style.maxHeight)||Infinity);}
  getBoundingClientRect(){if(this.host)return {left:0,top:0,width:this.ownerDocument.defaultView.innerWidth,height:this.ownerDocument.defaultView.innerHeight};const scale=Number(/^scale\(([^)]+)\)$/.exec(this.style.transform||'')?.[1]||1);return {left:this.style.left?.endsWith('px')?parseFloat(this.style.left):this.rect.left,top:this.style.top?.endsWith('px')?parseFloat(this.style.top):this.rect.top,width:this.offsetWidth*scale,height:this.offsetHeight*scale};}
  setPointerCapture(id){this.captured.add(id);}
  releasePointerCapture(id){this.captured.delete(id);}
  set innerHTML(_value){throw Error('Layout must never interpret stored HTML');}
}
function fixture(initial={},size={width:1000,height:600}){
  const win=new Target();win.innerWidth=size.width;win.innerHeight=size.height;
  const doc={defaultView:win,createElement(tag){return new Element(doc,tag);}};
  const ui=new Element(doc);ui.style.pointerEvents='none';const host=new Element(doc);host.host=true;host.style.pointerEvents='none';ui.appendChild(host);
  const driver=new Element(doc);driver.setAttribute('data-hud-widget','driver');host.appendChild(driver);
  const values=new Map(Object.entries(initial)),writes=[];
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>{values.set(key,value);writes.push({key,value});},removeItem:key=>{values.delete(key);writes.push({key,removed:true});}};
  const api=Layout.create(ui,{storage});
  const bar=el=>el.children.find(n=>n.attrs.has('data-hud-layout-controls'));
  const action=(name,el=driver)=>bar(el).children.find(n=>n.getAttribute('data-hud-layout-action')===name);
  return {ui,host,win,doc,driver,api,values,writes,storage,bar,action};
}
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);
function inside(f,node){const r=node.getBoundingClientRect();assert.ok(r.left>=0&&r.top>=0);assert.ok(r.left+r.width<=f.win.innerWidth+.0001);assert.ok(r.top+r.height<=f.win.innerHeight+.0001);}

test('storage accepts only known IDs with finite numeric coordinates and bounded scale',()=>{
  const x=Layout.sanitize(JSON.parse('{"v":1,"widgets":{"driver":{"x":-9,"y":20,"scale":8},"radar":{"x":0.2,"y":0.3,"scale":0.1},"footer":{"x":"0.2","y":0.3,"scale":1},"evil":{"x":0,"y":0,"scale":1},"__proto__":{"polluted":true}}}'));
  assert.deepEqual(x,{driver:{x:0,y:1,scale:1.6},radar:{x:.2,y:.3,scale:.6}});assert.equal({}.polluted,undefined);
  for(const v of [null,[],{v:2,widgets:{}},{v:1,widgets:[]},{v:1,widgets:{driver:{x:NaN,y:0,scale:1}}}])assert.deepEqual(Layout.sanitize(v),{});
});

test('editing starts off and cannot activate drag/scale or block the page',()=>{
  const f=fixture(),move=f.action('move'),before=f.driver.getBoundingClientRect();
  assert.equal(f.api.editing,false);assert.equal(f.driver.style.pointerEvents,'none');assert.equal(f.bar(f.driver).style.display,'none');
  move.emit('pointerdown',{clientX:10,clientY:10});move.emit('pointermove',{clientX:500,clientY:400});f.action('larger').emit('click');
  assert.deepEqual(f.driver.getBoundingClientRect(),before);assert.deepEqual(f.api.positions(),{});assert.equal(f.writes.length,0);assert.equal(f.ui.style.pointerEvents,'none');assert.equal(f.host.style.pointerEvents,'none');
});

test('pointer drag uses actual pixel movement, capture and bounded normalized persistence',()=>{
  const f=fixture(),move=f.action('move');f.api.setEditing(true);
  const down=move.emit('pointerdown',{clientX:100,clientY:100});assert.equal(down.prevented,true);assert.equal(down.stopped,true);assert.equal(move.captured.has(7),true);
  move.emit('pointermove',{clientX:200,clientY:150});close(f.driver.getBoundingClientRect().left,124);close(f.driver.getBoundingClientRect().top,74);assert.equal(f.writes.length,0);
  move.emit('pointerup');assert.equal(move.captured.has(7),false);const s=f.api.positions().driver;close(s.x,124/780);close(s.y,74/500);assert.equal(s.scale,1);assert.equal(f.writes.length,1);
  const parsed=JSON.parse(f.values.get(Layout.key));assert.equal(parsed.v,1);assert.deepEqual(parsed.widgets.driver,s);inside(f,f.driver);
});

test('wrong-pointer/nonprimary input cannot hijack a drag and stopping editing ends it',()=>{
  const f=fixture(),move=f.action('move');f.api.setEditing(true);
  move.emit('pointerdown',{isPrimary:false,clientX:0,clientY:0});move.emit('pointermove',{clientX:99,clientY:99});assert.deepEqual(f.api.positions(),{});
  move.emit('pointerdown',{clientX:0,clientY:0});move.emit('pointermove',{pointerId:8,clientX:300,clientY:300});assert.deepEqual(f.api.positions(),{});
  move.emit('pointermove',{clientX:9999,clientY:9999});assert.deepEqual(f.api.positions().driver,{x:1,y:1,scale:1});f.api.setEditing(false);assert.equal(f.writes.length,1);assert.equal(move.captured.size,0);inside(f,f.driver);
  const before=f.api.positions();move.emit('pointermove',{clientX:-9999,clientY:-9999});f.action('smaller').emit('click');assert.deepEqual(f.api.positions(),before);assert.equal(f.bar(f.driver).hidden,true);assert.equal(f.bar(f.driver).style.display,'none');assert.equal(f.driver.style.pointerEvents,'none');
});

test('per-widget scale controls clamp both ends and all saved coordinates remain within the viewport on resize',()=>{
  const f=fixture();f.api.setEditing(true);for(let i=0;i<20;i++)f.action('larger').emit('click');assert.equal(f.api.positions().driver.scale,1.6);
  const move=f.action('move');move.emit('pointerdown');move.emit('pointermove',{clientX:9999,clientY:9999});move.emit('pointerup');inside(f,f.driver);
  f.win.innerWidth=200;f.win.innerHeight=120;f.win.emit('resize');inside(f,f.driver);assert.equal(f.api.positions().driver.scale,1.6);
  for(let i=0;i<30;i++)f.action('smaller').emit('click');assert.equal(f.api.positions().driver.scale,.6);inside(f,f.driver);
});

test('reset restores default CSS and removes only the separate layout key',()=>{
  const profileKey='nfsu2-driving-tools-profiles-v1',profile='{"streetX":"keep"}',f=fixture({[profileKey]:profile});f.api.setEditing(true);f.action('larger').emit('click');assert.ok(f.values.has(Layout.key));f.api.reset();
  assert.equal(f.values.has(Layout.key),false);assert.equal(f.values.get(profileKey),profile);assert.deepEqual(f.api.positions(),{});assert.equal(f.driver.style.transform,'');assert.equal(f.driver.style.left,'');assert.equal(f.driver.getBoundingClientRect().left,24);assert.equal(f.api.editing,true);
  const copy=f.api.positions();copy.driver={x:1,y:1,scale:1.6};assert.deepEqual(f.api.positions(),{});
});

test('saved radar layout attaches after late insertion; unknown and duplicate widget IDs are untouched',()=>{
  const f=fixture({[Layout.key]:JSON.stringify({v:1,widgets:{radar:{x:1,y:1,scale:1.2}}})});
  const radar=new Element(f.doc,'div',{left:0,top:0,width:100,height:80});radar.setAttribute('data-hud-widget','stream-radar');f.host.appendChild(radar);
  const unknown=new Element(f.doc);unknown.setAttribute('data-hud-widget','launch-car');f.host.appendChild(unknown);
  const duplicate=new Element(f.doc);duplicate.setAttribute('data-hud-widget','driver');f.host.appendChild(duplicate);f.api.attach();
  assert.ok(f.bar(radar));assert.equal(radar.style.transform,'scale(1.2)');inside(f,radar);assert.equal(unknown.children.length,0);assert.equal(duplicate.children.length,0);
  const replacement=new Element(f.doc);replacement.setAttribute('data-hud-widget','driver');f.driver.remove();f.host.appendChild(replacement);duplicate.remove();f.api.attach();assert.equal(f.driver.children.length,0);assert.ok(f.bar(replacement));
});

test('storage failures stay local and dispose removes handles/listeners and restores original styles',()=>{
  const f=fixture(),before={...f.driver.style};f.api.dispose();assert.equal(f.driver.children.length,0);assert.equal(f.win.listeners.get('resize').size,0);assert.equal(f.driver.style.pointerEvents,'');assert.equal(f.api.setEditing(true),false);
  const api=Layout.create(f.ui,{key:'nfsu2-driving-tools-profiles-v1',storage:{getItem(){throw Error('blocked');},setItem(){throw Error('full');},removeItem(){throw Error('blocked');}}});assert.equal(api.key,Layout.key);api.setEditing(true);f.action('larger').emit('click');assert.equal(api.positions().driver.scale,1.1);api.reset();assert.deepEqual(api.positions(),{});api.dispose();
});
