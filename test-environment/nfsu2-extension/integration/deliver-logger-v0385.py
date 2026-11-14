"""Deliver the reviewed logger without changing the frozen native race outputs."""
from pathlib import Path
import hashlib
import importlib.util
import json
import shutil
import zipfile

ROOT=Path(__file__).resolve().parents[1]
WORKSPACE=ROOT.parent
PRODUCTION=WORKSPACE/'nfsu2-extension'
SOURCE=ROOT/'extension'
VERIFY=ROOT/'verification'
DESKTOP=Path('C:/Users/Admin/Desktop/NFSU2-Driving-Tools')
ARTIFACTS=WORKSPACE/'artifacts'
ARCHIVE=ARTIFACTS/'NFSU2-Driving-Tools-v0.38.5-Desktop-Folder.zip'
BACKUP=ARTIFACTS/'Desktop-v0.38.4-backup-20261110-before-v0385'
SOURCE_BACKUP=ARTIFACTS/'Source-v0.38.4-backup-20261110-before-v0385'


def sha(data):return hashlib.sha256(data).hexdigest()
def read(path):return json.loads(path.read_text(encoding='utf-8-sig'))
def inventory(folder):
    files=list(folder.iterdir())
    assert all(p.is_file() and not p.is_symlink() for p in files),str(folder)
    return {p.name:sha(p.read_bytes()) for p in files}
def verify_package(folder):
    files=inventory(folder)
    receipt=read(folder/'PACKAGE-CHECKSUMS.json')
    assert set(files)==set(receipt['files'])|{'PACKAGE-CHECKSUMS.json'}
    for name,entry in receipt['files'].items():
        assert files[name]==entry['sha256'] and (folder/name).stat().st_size==entry['bytes'],name
    return receipt


def main():
    assert not any(p.exists() for p in [ARCHIVE,BACKUP,SOURCE_BACKUP]),'Preserve immutable artifacts'
    lock=read(VERIFY/'source-reviewed-v0385.json')
    assert inventory(SOURCE)==lock
    assert read(SOURCE/'manifest.json')['version']=='0.38.5'
    assert 'shortcut-policy.js' not in lock,'This release is logger-only'
    suite=read(VERIFY/'canonical-suite-v0385-result.json')
    prior=read(VERIFY/'release-summary-v0384.json')
    files=read(VERIFY/'final-suite-v0385-files.json')
    assert suite['passed'] and suite['sourceUnchanged'] and suite['exitCode']==0
    assert suite['counts']['tests']==suite['counts']['pass'] and suite['counts']['pass']>=prior['passed']
    assert all(suite['counts'][k]==0 for k in ['fail','cancelled','skipped','todo'])
    assert suite['excludedFiles']==prior['excludedFiles']
    assert set(files)=={p.name for p in (ROOT/'tests').glob('*.test.cjs')}-{row['file'] for row in prior['excludedFiles']}
    assert len(files)==121 and len(files)==len(set(files))
    assert set(read(VERIFY/'final-suite-v0384-files.json'))<=set(files)
    native=read(VERIFY/'release-modules-v0385.json')
    assert native['version']=='0.38.5' and native['sourceUnchanged'] and native['sourceHashes']==lock and native['liveGameTested'] is False
    assert native['verifierSha256']==sha((ROOT/'tools/verify-release-modules-v0385.cjs').read_bytes())
    old_modules={r['revision']:r for r in prior['nativeModules']['modules']}
    assert len(native['modules'])==10 and set(r['revision'] for r in native['modules'])==set(old_modules)
    for row in native['modules']:
        assert row['valid'] and row['compiled'] and row['otherNativeFunctionsPreserved']
        assert row['outputSha256']==old_modules[row['revision']]['outputSha256']
    review=read(VERIFY/'logger-review-v0385.json')
    assert review['result']=='passed' and review['sourceHashes']==lock,'Review must bind final source'
    old_lock=read(PRODUCTION/'verification/source-reviewed-v0384.json')
    assert inventory(PRODUCTION/'extension')==old_lock,'Review concurrent source edits before replacing'
    desktop_before=inventory(DESKTOP)
    old_package=verify_package(DESKTOP)
    assert old_package['extension_version']=='0.38.4'
    prior_archive=Path(prior['package']['archive'])
    assert sha(prior_archive.read_bytes())==prior['package']['sha256']
    with zipfile.ZipFile(prior_archive) as archive:
        assert desktop_before=={name.removeprefix('NFSU2-Driving-Tools/'):sha(archive.read(name)) for name in archive.namelist()}
    spec=importlib.util.spec_from_file_location('reviewed_packer',ROOT/'tools/package-release.py')
    packer=importlib.util.module_from_spec(spec);spec.loader.exec_module(packer)
    _,expected=packer.collect(SOURCE,'desktop-folder')
    assert set(expected)==set(desktop_before)
    package=packer.package(SOURCE,ARCHIVE,'desktop-folder')
    with zipfile.ZipFile(ARCHIVE) as archive:
        assert {name.removeprefix('NFSU2-Driving-Tools/'):archive.read(name) for name in archive.namelist()}==expected
    BACKUP.mkdir();SOURCE_BACKUP.mkdir()
    for file in DESKTOP.iterdir():shutil.copy2(file,BACKUP/file.name)
    for file in (PRODUCTION/'extension').iterdir():shutil.copy2(file,SOURCE_BACKUP/file.name)
    assert inventory(BACKUP)==desktop_before and inventory(SOURCE_BACKUP)==old_lock
    assert inventory(DESKTOP)==desktop_before and inventory(PRODUCTION/'extension')==old_lock,'Concurrent change after backup'
    for name in lock:shutil.copy2(SOURCE/name,PRODUCTION/'extension'/name)
    for name,data in expected.items():(DESKTOP/name).write_bytes(data)
    assert inventory(PRODUCTION/'extension')==lock
    current=verify_package(DESKTOP)
    assert current['extension_version']=='0.38.5'
    assert all((DESKTOP/name).read_bytes()==data for name,data in expected.items())
    receipt={'version':'0.38.5','desktop':str(DESKTOP),'archive':str(ARCHIVE),'sha256':package['sha256'],'backup':str(BACKUP),'sourceBackup':str(SOURCE_BACKUP),'sourceFiles':len(lock),'desktopFiles':len(expected),'receiptFilesVerified':len(current['files']),'replacedDesktopVersion':'0.38.4','replacedSourceVersion':'0.38.4','liveReloadVerified':False,'userReloadRequired':True,'reloadConstraint':'Enforced browser policy denies internal Extensions page; reload requires the user.','racingBehaviorChanged':False}
    (VERIFY/'package-v0385.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    summary={'version':'0.38.5','date':'2026-11-10','selectedFiles':len(files),'passed':suite['counts']['pass'],'failed':0,'skipped':0,'cancelled':0,'allTestFilesPassed':False,'excludedFiles':suite['excludedFiles'],'log':'final-suite-v0385.txt','fileList':'final-suite-v0385-files.json','sourceLock':'source-reviewed-v0385.json','nativeModules':native,'package':receipt,'racingBehaviorChanged':False,'nativeOutputsUnchangedFromV0384':10,'logger':{'traceMs':250,'maxTraceSamples':480,'maxTraceBytes':393216,'persistMs':2000,'explicitNulls':True,'coverageAndSourceStatus':True,'perRowToolsAndBuild':True,'liveExportVerified':False},'limits':['This update improves diagnostic capture; Street X pacing and missed road corners are not claimed fixed.','Trace values are best-effort shared-memory observations; matching reads are not an atomic snapshot.','Native target/geometry values are not newly calibrated SI units; requests are not proof of native application.','A sudden speed loss is not verified collision detection.','Trace is bounded and can be clipped; actual retained span/gaps/missing fields are exported.','A tab crash may lose the most recent two-second persistence interval.','The experimental route-choice skill policy remains isolated and is not included.']}
    (VERIFY/'release-summary-v0385.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'package':receipt,'tests':suite['counts'],'selectedFiles':len(files)},indent=2))


if __name__=='__main__':main()
