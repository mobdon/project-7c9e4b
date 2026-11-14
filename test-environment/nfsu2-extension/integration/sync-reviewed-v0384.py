"""Copy the exact tested support files; retain each replaced shared-workspace file."""
from pathlib import Path
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
PROD = ROOT.parent / 'nfsu2-extension'
BACKUP = ROOT.parent / 'artifacts/Support-v0.38.2-backup-20261110-before-v0384'
PATHS = [
    'tests/aa-profile.test.cjs', 'tests/forward-aa-native-horizon.test.cjs',
    'tests/forward-aa-native-policy.test.cjs', 'tests/forward-current-compatibility.test.cjs',
    'tests/forward-online-native.test.cjs', 'tests/forward-preflight-guards.test.cjs',
    'tests/forward-registry.test.cjs', 'tests/package-release.test.cjs',
    'tests/radar-page-cadence.test.cjs', 'tests/fixtures/forward-native-world.cjs',
    'tools/build-forward-registry.cjs', 'tools/verify-release-modules-v0384.cjs',
    'integration/forward-native-profiles/aa2429fb.json',
    'integration/run-suite-v0384.cjs', 'integration/deliver-v0384.py',
    'verification/canonical-suite-v0384-result.json', 'verification/final-suite-v0384.txt',
    'verification/final-suite-v0384-files.json', 'verification/source-reviewed-v0384.json',
    'verification/release-modules-v0384.json', 'verification/native-output-pins-v0384-harvest.json',
    'verification/package-v0384.json', 'verification/release-summary-v0384.json',
    'verification/delivery-audit-v0384.json',
]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None


def main():
    assert not BACKUP.exists()
    before = {name: digest(PROD / name) for name in PATHS}
    for name in PATHS:
        assert (ROOT / name).is_file()
    BACKUP.mkdir()
    for name, old in before.items():
        if old is not None:
            target = BACKUP / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(PROD / name, target)
            assert digest(target) == old
    assert all(digest(PROD / name) == old for name, old in before.items()), 'Concurrent support edit'
    for name in PATHS:
        target = PROD / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / name, target)
        assert digest(target) == digest(ROOT / name)
    receipt = {'version':'0.38.4','backup':str(BACKUP),'before':before,'after':{name:digest(PROD / name) for name in PATHS}}
    (ROOT / 'verification/support-sync-v0384.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    shutil.copy2(ROOT / 'verification/support-sync-v0384.json', PROD / 'verification/support-sync-v0384.json')
    print(json.dumps({'files':len(PATHS),'replaced':sum(x is not None for x in before.values()),'backup':str(BACKUP)}))


if __name__ == '__main__':
    main()
