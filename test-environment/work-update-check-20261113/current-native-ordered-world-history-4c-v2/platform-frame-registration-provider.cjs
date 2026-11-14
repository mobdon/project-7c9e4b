'use strict';
// Native gw_init page notifications. No GPU renderer or display output supplied.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const states=new WeakMap(),GPU=719318132,VSYNC=719337756,INITIALIZED=719337952;
function install(H,{directory}){
  const prior=H.boundary[5];assert.equal(typeof prior,'function');
  H.boundary[5]=(f,kind,pointer,length)=>{
    if(kind!==1&&kind!==6)return prior(f,kind,pointer,length);
    let calls=states.get(f.memory);if(!calls){calls=[];states.set(f.memory,calls);}
    const row={api:'nfsu2_register',kind,pointer,length,returned:false};calls.push(row);
    try{
      assert.equal(f.view.getUint8(INITIALIZED),1,'Original24008 owns native g_inited');
      assert.equal(calls.filter(call=>call.kind===kind).length,1,'One original24008 registration per native control');
      assert(Number.isInteger(pointer)&&pointer>=0x10000&&pointer+length<=f.memory.buffer.byteLength);
      assert.equal(pointer,f.get(kind===1?GPU:VSYNC),'Actual published native control pointer only');assert.equal(length,kind===1?432:32);
      const bytes=Buffer.from(f.bytes(pointer,length)),cpu=Buffer.from(f.bytes(H.A.cpu,344));
      row.nativeControlHex=bytes.toString('hex');
      if(kind===1){assert.deepEqual(Array.from({length:4},(_,i)=>f.get(pointer+i*4)),[0x55504757,8,0x81b0a4d4,432],'Authoritative current rawWASM GPU header; old backup header is not used');}
      else assert.deepEqual(bytes,Buffer.alloc(32),'Original24008 native-zeroed Vsync control');
      // game-worker host registration posts a page notification and returns0;
      // this offline fixture records that notification, with no renderer attached.
      row.declaredPlatformOutcome={notificationRecorded:true,rendererAttached:false,returnValue:0,guestWritesPerformed:false};
      assert.deepEqual(f.bytes(pointer,length),bytes);assert.deepEqual(f.bytes(H.A.cpu,344),cpu);
      row.actualResult=0;row.returned=true;return 0;
    }catch(error){row.failure={name:error.name,message:error.message,stack:error.stack};throw error;}
    finally{fs.appendFileSync(path.join(directory,'platform-frame-registration-calls.jsonl'),JSON.stringify(row)+'\n');}
  };
}
function receipt(f){return{calls:states.get(f.memory)||[],scope:'Only original24008 nativeGPU kind1/432B and Vsync kind6/32B page notifications; return0/no guest writes, native pointers/header/initialization preserved. Existing LAN registration continues through its unchanged boundary.'};}
module.exports={GPU,VSYNC,INITIALIZED,install,receipt};
