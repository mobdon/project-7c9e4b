from pathlib import Path

root = Path(__file__).resolve().parents[1]
file = root / 'extension/ai.js'
source = file.read_text(encoding='utf-8')
start = source.index('    catchupDiagnostics(){')
end = source.index('    status(){', start)
method = '''    catchupDiagnostics(){
      // Exact-AA read-only observations. These measure current native fields,
      // not extra assist application, grip effectiveness or a frame lock.
      const unavailable=catchupTelemetryStatus=>({catchupTelemetryStatus});
      if(this.capabilities.nativePaceCacheFix!==true)return unavailable('unsupported');
      if(!this.available||!this.refresh())return unavailable('unavailable');
      if(this.read(0)!==MAGIC||this.read(28)!==MAGIC)return unavailable('mailbox-unready');
      const seq=this.read(4);
      if(!seq||(seq&1))return unavailable('mailbox-unready');
      const valid=(p,n)=>Number.isInteger(p)&&!(p&3)&&p>=0x10000&&p+n<=Math.min(this.view.byteLength,0x28000000);
      const player=this.u32(0xd00000),car=this.u32(player+4),race=this.u32(0x890118);
      if(this.u32(0x8654a4)!==6||this.u32(0xd00030)!==1||!valid(player,0x234)||this.u32(player+16)!==0||!valid(car,0x9e4)||!valid(race,4)||this.u32(race)!==4)return unavailable('context-invalid');
      const driver=this.u32(car+0x2c),kind=this.u32(car+0x24);
      const driverOK=kind===3&&valid(driver,0x800)&&this.u32(driver)===0x785370&&this.u32(driver+4)===car;
      const driverBits=driverOK?this.u32(driver+0x770):null,carBits=this.u32(car+0x468);
      const out={catchupTelemetryStatus:'sampled',catchupDriverVerified:driverOK};
      const factor=bits=>{const b=new ArrayBuffer(4),d=new DataView(b);d.setUint32(0,bits,true);const value=d.getFloat32(0,true);return Number.isFinite(value)&&value>=0&&value<=32?value:null;};
      const carFactor=factor(carBits),driverFactor=driverOK?factor(driverBits):null;
      if(carFactor!==null)out.catchupCarFactor=carFactor;
      if(driverFactor!==null)out.catchupDriverFactor=driverFactor;
      if(carFactor===null||(driverOK&&driverFactor===null))out.catchupTelemetryStatus='value-invalid';
      // Wider observation bounds expose runaway values; they never authorize
      // a write. Reject mixed identities/publications instead of logging them.
      if(this.read(4)!==seq||this.read(0)!==MAGIC||this.read(28)!==MAGIC)return unavailable('context-changed');
      if(this.u32(0xd00000)!==player||this.u32(player+4)!==car||this.u32(player+16)!==0||this.u32(0x890118)!==race||this.u32(race)!==4||this.u32(car+0x2c)!==driver||this.u32(car+0x24)!==kind||this.u32(car+0x468)!==carBits||this.u32(0x8654a4)!==6||this.u32(0xd00030)!==1)return unavailable('context-changed');
      if(driverOK&&(this.u32(driver)!==0x785370||this.u32(driver+4)!==car||this.u32(driver+0x770)!==driverBits))return unavailable('context-changed');
      return out;
    }
'''
source = source[:start] + method + source[end:]
anchor = 'return {available:true,ready:true,active,owned:!!owned,manual,controlModeRetry,'
assert source.count(anchor) == 1
source = source.replace(anchor, 'return {...this.catchupDiagnostics(),available:true,ready:true,active,owned:!!owned,manual,controlModeRetry,')
file.write_text(source, encoding='utf-8', newline='\n')

file = root / 'extension/page.js'
source = file.read_text(encoding='utf-8')
anchor = 'nativePaceTelemetryStatus:aiState.nativePaceTelemetryStatus,'
assert source.count(anchor) == 1
source = source.replace(anchor, anchor + 'catchupTelemetryStatus:aiState.catchupTelemetryStatus,catchupDriverVerified:aiState.catchupDriverVerified,catchupDriverFactor:aiState.catchupDriverFactor,catchupCarFactor:aiState.catchupCarFactor,')
file.write_text(source, encoding='utf-8', newline='\n')
