"""Generate structural patch metadata, not bundled game instructions."""
from pathlib import Path
import json,subprocess,re,struct,hashlib
out=Path(__file__).parent;root=out.parents[2];research=root/'research/full-tuner-proof';source=root/'research/compatibility-93af6ccb/game.wasm'
ids=set(json.loads((research/'native-execution/closure.json').read_text())['ids'])|set(json.loads((research/'performance-metrics/closure.json').read_text())['ids'])
index=json.loads((research/'native-execution/index.json').read_text())
todo=[12315,12470]
while todo:
 n=todo.pop()
 if n in ids or n in [21726,21727]:continue
 ids.add(n);todo.extend(index[str(n)]['calls'])
b=source.read_bytes();assert hashlib.sha256(b).hexdigest()=='128e2b5816a8eace4b768aec920318a1613da8235801a361e2009e96550be1d6'
def u(pos):
 value=shift=0
 while True:
  x=b[pos];pos+=1;value|=(x&127)<<shift;shift+=7
  if x<128:return value,pos
bodies={};sections={};p=8
while p<len(b):
 sid=b[p];size,begin=u(p+1);end=begin+size;sections[sid]=(begin,end);p=end
 if sid==10:
  n,pos=u(begin)
  for i in range(n):
   size,start=u(pos);stop=start+size
   if i+37 in ids:
    groups,l=u(start)
    for g in range(groups):count,l=u(l);l+=1
    bodies[i+37]={'offset':start,'length':size,'localsEnd':l-start,'sha256':hashlib.sha256(b[start:stop]).hexdigest(),'patches':[]}
   pos=stop
index=json.loads((research/'native-execution/index.json').read_text())
for n in ids:bodies[n]['type']=int(re.search(r'\(type (\d+)\)',index[str(n)]['head'])[1])
cmd=['node',str(root/'research/compatibility-v011/node_modules/wabt/bin/wasm-objdump'),'-d',str(source)]
proc=subprocess.Popen(cmd,stdout=subprocess.PIPE,text=True);current=None;ops=set();counts={};seen=set()
for line in proc.stdout:
 m=re.match(r'^([0-9a-f]+) func\[(\d+)\]',line)
 if m:
  current=int(m[2]) if int(m[2]) in ids else None;
  if current is not None:seen.add(current)
  continue
 if current is None:continue
 m=re.match(r'^\s*([0-9a-f]+):\s*([0-9a-f ]+)\|\s*(\S+)(.*)',line)
 if not m:continue
 address=int(m[1],16);op=m[3];args=m[4].strip();fn=bodies[current];at=address-fn['offset'];count=len(m[2].split());patch=None
 if op in ['call','return_call']:
  target=int(args.split()[0]);assert target in ids or target in [21726,21727],(current,op,target)
  patch={'at':at,'length':count,'kind':'call','target':target,'tail':op=='return_call'}
 elif '.store' in op or '.load' in op:
  assert re.match(r'^(i32|i64|f32|f64|v128)\.(load|store)',op),(current,op)
  # Plain numeric align and offset from objdump. No atomic/lane memory operations.
  values=args.split();assert len(values) in [2,3],(op,args)
  patch={'at':at,'length':count,'kind':'memory','op':op,'offset':int(values[1])};
  if len(values)==3:patch['lane']=int(values[2])
  ops.add(op)
 elif op=='loop':patch={'at':at+count,'length':0,'kind':'fuel'}
 elif op.startswith(('memory.','table.')) or 'atomic' in op or op=='global.set':raise ValueError((current,op))
 if patch:fn['patches'].append(patch);counts[patch['kind']]=counts.get(patch['kind'],0)+1
assert proc.wait()==0
assert seen==ids,(len(seen),len(ids))
for n,fn in bodies.items():
 for p in fn['patches']:
  assert 0<=p['at']<fn['length']
 # Body digests, locations, and op names are verification metadata, not code copies.
result={'revision':'93af6ccb','moduleHash':hashlib.sha256(b).hexdigest(),'moduleSize':len(b),'functionImportCount':37,'functions':bodies,'memoryOps':sorted(ops),'tableSize':20795,'lookupBase':678302400,'memoryPages':11264,'tail':21726,'dispatch':21727,'counts':counts}
(out/'native-metadata.json').write_text(json.dumps(result,separators=(',',':'))+'\n');print(json.dumps({'functions':len(ids),'ops':sorted(ops),'counts':counts}))
