from pathlib import Path
import re
pattern=re.compile(r'^<<<<<<<[^\n]*\n(.*?)^=======\n(.*?)^>>>>>>>[^\n]*\n',re.M|re.S)
p=Path('extension/page.js');s=p.read_text();n=0
def merge(m):
 global n
 n+=1;a,b=m.groups()
 if n==1:return b.replace('...prefs,dynoEnabled','...prefs,raceOnlyAI,dynoEnabled')
 if n==2:
  out=a.replace('raceOnlyRequested:false,paceConfirmed:false',"raceOnlyRequested:false,adaptiveRaceRequested:false,adaptiveRaceState:adaptiveRaceEnabled?'paused':'off',paceConfirmed:false")
  return out+''.join(line+'\n' for line in b.splitlines() if "ui.querySelector('#adaptive-race-state')" in line or "if(adaptiveRaceEnabled)" in line)
 if n==3:return b.replace('enabled:prefs.ai','enabled:aiRequested').replace('!!prefs.ai && safe','!!aiRequested && safe')
 if n==4:return b.replace('prefs.players,prefs.ai,prefs.aiPace','prefs.players,prefs.ai,raceOnlyAI,prefs.aiPace')
 if n==5:
  aline={line.strip().split(' = ')[0]:line for line in a.splitlines()}
  out=b.replace('!prefs.ai || !aiState.active','!aiRequested || !aiState.active')
  for prefix in ["aiNode.textContent", "ui.querySelector('#drag-ai-state').textContent"]:
   old=next(line for line in out.splitlines() if line.strip().startswith(prefix))
   new=next(line for line in a.splitlines() if line.strip().startswith(prefix))
   out=out.replace(old,new)
  row=next((line for line in a.splitlines() if "querySelector('#race-only-state')" in line),None)
  if row:out=row+'\n'+out
  return out
 if n==6:return '    clearRaceOnlyAI();\n'+b
 raise Exception(n)
s=pattern.sub(merge,s);assert n==6
start=s.index('      const raceOnlyInputClear=');end=s.index('      const dragAIRequested',start)
block=s[start:end];s=s[:start]+s[end:];where=s.index('      const streetX=');s=s[:where]+block+s[where:]
s=s.replace('ai:prefs.ai,safe,network:s.network','ai:aiRequested,safe,network:s.network').replace("'ai-off':'Waiting for Automatic driver'","'ai-off':'Waiting for an automatic driver mode'")
assert '<<<<<<<' not in s;p.write_text(s)
p=Path('extension/diagnostics.js');s=p.read_text();ms=list(pattern.finditer(s));assert len(ms)==1;b=ms[0].group(2).replace("'paceConfirmed','adaptiveRaceRequested'","'paceConfirmed','adaptiveRaceRequested','raceOnlyEligible','raceOnlyRequested','raceOnlyInputClear'").replace("const TOOL_FLAGS = ['ai',","const TOOL_FLAGS = ['ai','raceOnlyAI',");s=pattern.sub(lambda m:b,s);p.write_text(s)
