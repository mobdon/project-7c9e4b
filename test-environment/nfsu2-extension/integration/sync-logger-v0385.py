from pathlib import Path
import hashlib
import json
import shutil

ROOT=Path(__file__).resolve().parents[1]
PROD=ROOT.parent/'nfsu2-extension'
BACKUP=ROOT.parent/'artifacts/Support-v0.38.4-backup-20261110-before-v0385'
PATHS=[
    'tests/native-telemetry.test.cjs','tests/page-logger-trace.test.cjs','tests/forward-plan-diagnostics.test.cjs',
    'tests/race-trace.test.cjs','tests/logger-storage-cadence.test.cjs','tests/usable-corner.test.cjs',
    'tests/diagnostics-page.test.cjs','tests/online-speed-lifecycle.test.cjs','tests/package-release.test.cjs',
    'tools/verify-release-modules-v0385.cjs','tools/inspect-race-trace.cjs',
    'integration/run-suite-v0385.cjs','integration/deliver-logger-v0385.py',
    'integration/recover-suite-summary-v0385.cjs',
    'verification/canonical-suite-v0385-result.json','verification/final-suite-v0385.txt',
    'verification/final-suite-v0385-files.json','verification/source-reviewed-v0385.json',
    'verification/release-modules-v0385.json','verification/logger-review-v0385.json',
    'verification/new-read-fields-v0385.json','verification/public-manifest-recheck-v0385.json',
    'verification/package-v0385.json','verification/release-summary-v0385.json','verification/delivery-audit-v0385.json',
    'verification/canonical-suite-v0385-before-summary-parser-fix-result.json',
]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else None
assert not BACKUP.exists()
for name in PATHS:assert (ROOT/name).is_file(),name
before={name:digest(PROD/name) for name in PATHS}
BACKUP.mkdir()
for name,pin in before.items():
    if pin is not None:
        out=BACKUP/name;out.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(PROD/name,out);assert digest(out)==pin
assert all(digest(PROD/name)==pin for name,pin in before.items()),'Concurrent support edit'
for name in PATHS:
    out=PROD/name;out.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/name,out);assert digest(out)==digest(ROOT/name)
receipt={'version':'0.38.5','backup':str(BACKUP),'before':before,'after':{name:digest(PROD/name) for name in PATHS}}
for folder in [ROOT,PROD]:(folder/'verification/support-sync-v0385.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'files':len(PATHS),'replaced':sum(pin is not None for pin in before.values()),'backup':str(BACKUP)}))
