"""Pure static PE disassembly and resident table evidence. Never executes game code."""
from pathlib import Path
import sys, json, struct, hashlib
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'research/native-capstone-deps'))
from capstone import Cs, CS_ARCH_X86, CS_MODE_32
data = (ROOT / 'research/current-native-image/SPEED2.EXE').read_bytes()
assert hashlib.sha256(data).hexdigest() == 'f9dd86c054878ce6276beb07c1fd61874f7a1e4bf1f241b084c65b73e24168a7'
u16 = lambda p: struct.unpack_from('<H', data, p)[0]
u32 = lambda p: struct.unpack_from('<I', data, p)[0]
coff = u32(60) + 4
opt = coff + 20
base = u32(opt + 28)
sections = []
for i in range(u16(coff + 2)):
    p = opt + u16(coff + 16) + 40 * i
    sections.append(dict(name=data[p:p+8].rstrip(b'\0').decode(), va=base+u32(p+12), raw=u32(p+20), rawSize=u32(p+16)))
def offset(address):
    s = next(s for s in sections if s['va'] <= address < s['va'] + s['rawSize'])
    return s['raw'] + address - s['va']
cs = Cs(CS_ARCH_X86, CS_MODE_32)
targets = [('array-entry-ctor-and-backing-producer',4533152,900), ('default-table-4722',7845616,340), ('sentinel-5349',7850592,40), ('ordinary-startup-caller-2922-callsite',5762490,55)]
rows=[]
for name,address,size in targets:
    p=offset(address)
    rows.append(dict(name=name,address=address,bytes=size,sha256=hashlib.sha256(data[p:p+size]).hexdigest(),ops=[dict(address=x.address,hex=hex(x.address),bytes=x.bytes.hex(),mnemonic=x.mnemonic,operands=x.op_str) for x in cs.disasm(data[p:p+size],address)]))
references=[]
for target in [7845616,7850592,7847296]:
    needle=struct.pack('<I',target)
    for s in sections:
        start=s['raw']; stop=start+s['rawSize']; at=start
        while True:
            at=data.find(needle,at,stop)
            if at<0: break
            address=s['va']+at-start
            lo=max(start,at-16);hi=min(stop,at+20)
            references.append(dict(target=target,section=s['name'],address=address,windowAddress=s['va']+lo-start,windowHex=data[lo:hi].hex(),windowWords=list(struct.unpack('<'+'I'*((hi-lo)//4),data[lo:lo+((hi-lo)//4)*4]))))
            at+=1
out=dict(kind='STATIC-NULL-OWNER-PE-CONTEXT',peSha256=hashlib.sha256(data).hexdigest(),rows=rows,absoluteAddressReferences=references,nativeExecuted=False,sourceSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest())
with Path(__file__).with_suffix('.json').open('x') as f: json.dump(out,f,indent=2);f.write('\n')
print(json.dumps(dict(rowCount=len(rows),references=references)))
