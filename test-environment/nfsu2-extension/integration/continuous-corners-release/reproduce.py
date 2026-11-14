from pathlib import Path
import difflib, hashlib, json, shutil, subprocess, tempfile
root=Path(__file__).resolve().parents[2]
base=root.parent/'combined-v032-integration'
out=root/'integration/continuous-corners-release'
changed=[];patch=[];binary=[]
for scope in ('extension','tools','tests'):
 for p in sorted((root/scope).rglob('*')):
  if not p.is_file(): continue
  rel=p.relative_to(root);old=base/rel
  if old.exists() and old.read_bytes()==p.read_bytes():continue
  changed.append(str(rel));a=old.read_bytes() if old.exists() else b'';b=p.read_bytes()
  if p.suffix=='.wasm':binary.append(str(rel));continue
  for line in difflib.unified_diff(a.decode().splitlines(True),b.decode().splitlines(True),fromfile='a/'+str(rel),tofile='b/'+str(rel)):
   patch.append(line if line.endswith('\n') else line+'\n\\ No newline at end of file\n')
(out/'integrated-v033.patch').write_text(''.join(patch))
(out/'changed-files.json').write_text(json.dumps(changed,indent=2)+'\n')
with tempfile.TemporaryDirectory(prefix='v033-reproduction-',dir=root.parent) as td:
 temp=Path(td)
 for scope in ('extension','tools','tests'):shutil.copytree(base/scope,temp/scope,symlinks=True)
 (temp/'research').symlink_to('../research')
 subprocess.run(['patch','-p1','-i',str(out/'integrated-v033.patch')],cwd=temp,check=True,stdout=subprocess.PIPE)
 for builder in ('build-corner-hook.cjs','build-braking-hook.cjs','build-full-tuner-bridge.cjs','build-drag-input-guard.cjs','build-drag-overheat.cjs','build-latest-profile.cjs','build-next-profile.cjs'):
  subprocess.run(['node','tools/'+builder],cwd=temp,check=True,stdout=subprocess.PIPE)
 for rel in changed:assert (temp/rel).read_bytes()==(root/rel).read_bytes(),rel
 release=json.loads((out/'release-result.json').read_text());archive=Path(release['path'])
 subprocess.run(['python3','tools/package-release.py','--output',str(temp/'reproduced.zip')],cwd=temp,check=True,stdout=subprocess.PIPE)
 assert archive.read_bytes()==(temp/'reproduced.zip').read_bytes()
 result={'baseline':base.name,'patchWithoutConflicts':True,'sevenBuildersReproduced':True,'allChangedFilesMatch':len(changed),'regeneratedBinaries':binary,'archiveByteIdentical':True,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'size':archive.stat().st_size}
 (out/'reproduction-results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
