"""Deliver the reviewed .9 into the existing Desktop folder; import is read-only."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import re
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
PRODUCTION = WORKSPACE / 'nfsu2-extension'
SOURCE = ROOT / 'extension'
DESKTOP = Path('C:/Users/Admin/Desktop/NFSU2-Driving-Tools')
ARTIFACTS = WORKSPACE / 'artifacts'
ARCHIVE = ARTIFACTS / 'NFSU2-Driving-Tools-v0.38.9-Desktop-Folder.zip'
BACKUPS = {name: ARTIFACTS / (name + '-v0.38.8-backup-before-v0389')
           for name in ('Desktop', 'Source', 'Support')}
TREES = ('tests', 'tools', 'templates', 'integration', 'verification', 'native')
BASELINE = ROOT / 'verification/baseline-source-desktop-v0389.json'
SUPPORT_BASELINE = ROOT / 'verification/baseline-support-v0389.json'
BASELINE_PIN = '49167899c966d75eb1e562f8c53008c6cf1cc0f17778735a7e4f6d525528d143'
SUPPORT_PIN = '0fa1bb1c5260496e7e41ccf0858b5cec0eb07d4273133a8383b90fc21cd7056e'
PRIOR_ZIP_PIN = 'da5f29b0865e32ad0f28ebc3886844dea4273a36c30c3a1f30a340a8ae5a602b'
PACKER_PIN = '1a6b0fd324e221cb86b8e5163380d608e41b3da32621b385b2c2d1d2bd6f6616'
GUIDE_PIN = '74bbbcb6ee810ca5c1bc17e3bbc0d187f7fb8ae028b9faa42c56b0739f186dae'
NATIVE = ROOT / 'native/paced-build.json'
NATIVE_PIN = 'e15a6ecfc6b7160965d32542f8ce3c36fea2b32ef8ec1aa5c13597c6e4e98347'
NATIVE_TESTS = 'native/catchup-tests-v0389.json'
NATIVE_TESTS_PIN = '587f0f07de7b96683af8e9c3961ba4f838ae0543ca64c2872afe91d7289b58a2'
MODULES = ROOT / 'verification/release-modules-v0389-final.json'
MODULES_PIN = 'ec4fbd8f0e2b439d85ee690d435a33db64e708882b1676480baa271e607afdfe'
SUPPORT_PLAN = ROOT / 'integration/delivery-support-v0389.json'
SUPPORT_PLAN_PIN = '72105d007de06be329569b26761c09ef4cfadf9f4b8028e0d585bbc188c7328f'
PEER_REVIEW = ROOT / 'integration/delivery-independent-review-v0389.json'
SUITE = ROOT / 'verification/canonical-suite-v0389-final-result.json'
FILES = ROOT / 'verification/final-suite-v0389-final-files.json'
LOG = ROOT / 'verification/final-suite-v0389-final.txt'
RUNNER = ROOT / 'tools/run-canonical-v0389.cjs'
RECEIPTS = ('package-v0389.json', 'release-summary-v0389.json', 'support-sync-v0389.json')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def linked(path):
    return path.is_symlink() or (hasattr(path, 'is_junction') and path.is_junction())


def digest(path):
    assert not linked(path), str(path)
    if not path.exists():
        return None
    assert path.is_file(), str(path)
    return sha(path.read_bytes())


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def inventory(folder):
    assert folder.is_dir() and not linked(folder), str(folder)
    result = {}
    for path in sorted(folder.iterdir()):
        assert path.is_file() and not linked(path), str(path)
        result[path.name] = digest(path)
    return result


def support_inventory(base):
    result = {}
    for name in TREES:
        folder = base / name
        assert folder.is_dir() and not linked(folder), str(folder)
        for path in sorted(folder.rglob('*')):
            relative = path.relative_to(base)
            if '__pycache__' in relative.parts or path.suffix.lower() == '.pyc':
                continue
            assert not linked(path), str(path)
            if path.is_file():
                result[relative.as_posix()] = digest(path)
    return result


def zip_inventory(path):
    prefix = 'NFSU2-Driving-Tools/'
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        assert len(names) == len(set(names)) and archive.testzip() is None
        assert all(name.startswith(prefix) and re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]*', name[len(prefix):])
                   for name in names)
        return {name[len(prefix):]: sha(archive.read(name)) for name in names}


def write_new(path, value):
    with path.open('x', encoding='utf-8', newline='\n') as stream:
        stream.write(json.dumps(value, indent=2) + '\n')


def verify_release():
    assert NATIVE_PIN and re.fullmatch(r'[a-f0-9]{64}', NATIVE_PIN), 'Bind the reviewed native receipt'
    assert NATIVE_TESTS and NATIVE_TESTS_PIN and digest(ROOT / NATIVE_TESTS) == NATIVE_TESTS_PIN
    suite = read(SUITE)
    prior = read(PRODUCTION / 'verification/release-summary-v0388.json')
    lock = inventory(SOURCE)
    assert len(lock) == 57 and lock == suite['sourceHashes']
    assert read(SOURCE / 'manifest.json')['version'] == suite['version'] == '0.38.9'
    assert suite['passed'] is True and suite['exitCode'] == 0
    assert all(suite[key] is True for key in ('sourceUnchanged', 'testsUnchanged', 'runnerUnchanged'))
    assert suite['runnerSha256'] == digest(RUNNER)
    assert suite['counts']['tests'] == suite['counts']['pass'] >= prior['passed']
    assert all(suite['counts'][key] == 0 for key in ('fail', 'cancelled', 'skipped', 'todo'))
    assert suite['excludedFiles'] == prior['excludedFiles'] and len(suite['excludedFiles']) == 8
    excluded = {item['file'] for item in suite['excludedFiles']}
    selected = sorted(path.name for path in (ROOT / 'tests').glob('*.test.cjs') if path.name not in excluded)
    assert read(FILES) == selected and len(selected) == suite['selectedFiles']
    assert {'mode3-receipt-v0389.test.cjs', 'full-physics-fixture-v0389.test.cjs',
            'corner-fallback-v0389.test.cjs'} <= set(selected)
    assert set(read(PRODUCTION / 'verification/final-suite-v0388-final-files.json')) <= set(selected)
    assert all('tests/' + name in suite['testHashes'] for name in selected)
    for name, pin in suite['testHashes'].items():
        assert digest(ROOT / name) == pin, 'Changed final test input: ' + name
    log = LOG.read_text(encoding='utf-8-sig')
    for key, value in suite['counts'].items():
        assert re.findall(r'^# ' + re.escape(key) + r' (\d+)\r?$', log, re.MULTILINE) == [str(value)]
    assert digest(NATIVE) == NATIVE_PIN
    native = read(NATIVE)
    assert native['version'] == '0.38.9' and native['passed'] is True
    assert native['productSha256'] == lock['paced-catchup.js'] == digest(ROOT / 'native/paced-catchup.js')
    assert native['liveVerified'] is False and native['fullGameInstantiated'] is False
    modules = native['modules']
    assert len(modules) == 3 and {item['revision'] for item in modules} == {'aa2429fb', '15e5958f', '943ee537'}
    assert all(item['valid'] is True and item['compiled'] is True and item['otherNonCodeSectionsPreserved'] is True
               for item in modules)
    behavior = read(ROOT / NATIVE_TESTS)
    assert behavior['passed'] is True and behavior['productSha256'] == lock['paced-catchup.js']
    assert behavior['liveVerified'] is False and behavior['fullGameInstantiated'] is False
    assert behavior['tests'] == behavior['passedTests'] == 58 and behavior['failedTests'] == 0
    assert behavior['buildSha256'] == NATIVE_PIN
    assert behavior['verifierSha256'] == digest(ROOT / 'native/verify-catchup-v0389.cjs')
    for name, pin in behavior['sourceHashes'].items():
        assert digest(ROOT / name) == pin, 'Changed native behavior input: ' + name
    assert MODULES_PIN and digest(MODULES) == MODULES_PIN
    audit = read(MODULES)
    assert audit['version'] == '0.38.9' and audit['passed'] is True
    assert audit['sourceFileCount'] == 57 and audit['sourceUnchanged'] is True and audit['sourceHashes'] == lock
    source_lock = ROOT / 'verification/source-reviewed-v0389-final.json'
    assert audit['sourceLockSha256'] == digest(source_lock) and read(source_lock) == lock
    assert audit['verifierSha256'] == digest(ROOT / 'tools/verify-release-modules-v0389.cjs')
    assert audit['pacedPatcherSha256'] == lock['paced-catchup.js']
    assert audit['nativeBuildPath'] == 'native/paced-build.json' and audit['nativeBuildSha256'] == NATIVE_PIN
    assert audit['nativeBehaviorReceiptPath'] == NATIVE_TESTS and audit['nativeBehaviorReceiptSha256'] == NATIVE_TESTS_PIN
    assert audit['fullGameInstantiated'] is False and audit['liveGameTested'] is False
    assert all(audit[key] is True for key in ('allTwelvePrePacedOutputsEqualDeliveredV0387',
               'nineOlderCompleteOutputsUnchanged', 'onlyNineDeclaredExistingFunctionsChangedForThreeSupportedBuilds',
               'allPacedNonCodeSectionsPreserved', 'originalImportsExportsPreserved'))
    assert audit['additionalHelpers'] == audit['additionalPrivateGlobals'] == 0
    for name, pin in audit['historicalArtifactsPreserved'].items():
        assert digest(WORKSPACE / name) == pin, 'Changed historical native receipt: ' + name
    audited_modules = audit['modules']
    prior_modules = read(PRODUCTION / 'verification/release-modules-v0388-final.json')['modules']
    assert len(audited_modules) == 12 and {item['revision'] for item in audited_modules} == {item['revision'] for item in prior_modules}
    current_revisions = {'aa2429fb', '15e5958f', '943ee537'}
    for item in audited_modules:
        assert all(item[key] is True for key in ('valid', 'compiled', 'allPacedNonCodeSectionsPreserved',
                   'otherNativeFunctionsPreserved', 'importsExportsUnchangedFromRaw',
                   'sourceCacheGovernorAndSetterBodiesPreserved', 'exactAuthoredAppendVerified'))
        assert item['additionalPrivateGlobals'] == item['additionalHelpers'] == 0
        if item['revision'] in current_revisions:
            built = next(module for module in modules if module['revision'] == item['revision'])
            assert item['outputSha256'] == built['outputSha256']
            assert item['changedFromV0387'] == built['modifiedFunctions'] and len(item['authoredPlanProof']) == 9
            assert all(proof['exactAuthoredPlanReconstructed'] is True for proof in item['authoredPlanProof'])
        else:
            previous = next(module for module in prior_modules if module['revision'] == item['revision'])
            assert item['unchangedFromV0388'] is True and item['changedFromV0387'] == []
            assert item['outputSha256'] == previous['outputSha256'] and item['outputBytes'] == previous['outputBytes']
    return lock, suite, native


def main():
    if not __debug__:
        raise RuntimeError('Delivery requires Python assertions enabled')
    assert digest(BASELINE) == BASELINE_PIN and digest(SUPPORT_BASELINE) == SUPPORT_PIN
    baseline, old_support = read(BASELINE), read(SUPPORT_BASELINE)['supportHashes']
    assert len(baseline['extension']) == 57 and len(baseline['desktop']) == 59
    assert inventory(PRODUCTION / 'extension') == baseline['extension']
    assert inventory(DESKTOP) == baseline['desktop']
    assert support_inventory(PRODUCTION) == old_support
    assert read(PRODUCTION / 'extension/manifest.json')['version'] == read(DESKTOP / 'manifest.json')['version'] == '0.38.8'
    for path in (ARCHIVE, *BACKUPS.values()):
        assert not path.exists() and not linked(path), 'Preserve existing artifact: ' + str(path)
    for name in RECEIPTS:
        assert digest(ROOT / 'verification' / name) is None and digest(PRODUCTION / 'verification' / name) is None
    old_zip = Path(read(PRODUCTION / 'verification/package-v0388.json')['archive'])
    assert digest(old_zip) == PRIOR_ZIP_PIN and zip_inventory(old_zip) == baseline['desktop']
    lock, suite, native = verify_release()
    assert set(lock) == set(baseline['extension'])
    packer_path = ROOT / 'tools/package-release.py'
    guide_path = ROOT / 'templates/UPDATE-WINDOWS-DESKTOP.txt'
    assert digest(packer_path) == PACKER_PIN and digest(guide_path) == GUIDE_PIN
    spec = importlib.util.spec_from_file_location('reviewed_v0389_packer', packer_path)
    packer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(packer)
    version, payload = packer.collect(SOURCE, 'desktop-folder')
    expected = {name: sha(data) for name, data in payload.items()}
    assert version == '0.38.9' and len(expected) == 59 and set(expected) == set(baseline['desktop'])
    for name, pin in lock.items():
        if name != 'README.md':
            assert expected[name] == pin
    checksums = json.loads(payload['PACKAGE-CHECKSUMS.json'])
    assert checksums['extension_version'] == '0.38.9' and len(checksums['files']) == 58
    assert set(checksums['files']) == set(payload) - {'PACKAGE-CHECKSUMS.json'}
    for name, item in checksums['files'].items():
        assert item['sha256'] == expected[name] and item['bytes'] == len(payload[name])
    assert not any(Path(name).suffix.lower() in ('.wasm', '.wat', '.exe', '.bin', '.mpf', '.mus') for name in payload)
    proposed = support_inventory(ROOT)
    changed = sorted(name for name, pin in proposed.items() if old_support.get(name) != pin)
    assert all(not any(tag in name for tag in ('v0388', 'v0387', 'v0386', 'v0385')) for name in changed), 'Preserve dated historical artifacts'
    assert SUPPORT_PLAN_PIN and digest(SUPPORT_PLAN) == SUPPORT_PLAN_PIN
    plan, peer = read(SUPPORT_PLAN), read(PEER_REVIEW)
    assert plan['version'] == peer['version'] == '0.38.9'
    assert peer['result'] == 'passed' and peer['findings'] == []
    assert peer['deliveryScriptSha256'] == digest(Path(__file__))
    assert peer['supportManifestSha256'] == SUPPORT_PLAN_PIN
    special = {Path(__file__).relative_to(ROOT).as_posix(): digest(Path(__file__)),
               SUPPORT_PLAN.relative_to(ROOT).as_posix(): SUPPORT_PLAN_PIN,
               PEER_REVIEW.relative_to(ROOT).as_posix(): digest(PEER_REVIEW)}
    assert not (set(plan['files']) & set(special))
    assert {name: proposed[name] for name in changed} == {**plan['files'], **special}, 'Unreviewed support change'
    before = {name: old_support.get(name) for name in changed}
    frozen = {path: digest(path) for path in (Path(__file__), BASELINE, SUPPORT_BASELINE, SUITE, FILES, LOG,
                                             RUNNER, NATIVE, ROOT / NATIVE_TESTS, MODULES, SUPPORT_PLAN, PEER_REVIEW,
                                             packer_path, guide_path, old_zip)}

    def unchanged():
        assert inventory(SOURCE) == lock and support_inventory(ROOT) == proposed
        for path, pin in frozen.items():
            assert digest(path) == pin, 'Reviewed input changed: ' + str(path)

    for path in BACKUPS.values():
        path.mkdir()
    for name in baseline['desktop']:
        shutil.copy2(DESKTOP / name, BACKUPS['Desktop'] / name)
    for name in baseline['extension']:
        shutil.copy2(PRODUCTION / 'extension' / name, BACKUPS['Source'] / name)
    for name, pin in before.items():
        if pin is not None:
            target = BACKUPS['Support'] / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(PRODUCTION / name, target)
            assert digest(target) == pin
    write_new(BACKUPS['Support'] / 'BACKUP-INVENTORY.json', before)
    assert inventory(BACKUPS['Desktop']) == baseline['desktop'] and inventory(BACKUPS['Source']) == baseline['extension']
    assert inventory(PRODUCTION / 'extension') == baseline['extension'] and inventory(DESKTOP) == baseline['desktop']
    assert support_inventory(PRODUCTION) == old_support
    unchanged()
    package = packer.package(SOURCE, ARCHIVE, 'desktop-folder')
    assert zip_inventory(ARCHIVE) == expected
    unchanged()
    assert inventory(PRODUCTION / 'extension') == baseline['extension'] and inventory(DESKTOP) == baseline['desktop']
    assert support_inventory(PRODUCTION) == old_support
    for folder, values, previous in ((PRODUCTION / 'extension', lock, baseline['extension']),
                                     (DESKTOP, expected, baseline['desktop'])):
        for name, pin in values.items():
            target = folder / name
            assert digest(target) == previous[name]
            if folder == DESKTOP:
                target.write_bytes(payload[name])
            else:
                assert digest(SOURCE / name) == pin
                shutil.copy2(SOURCE / name, target)
            assert digest(target) == pin
    for name in changed:
        target = PRODUCTION / name
        assert digest(target) == before[name] and digest(ROOT / name) == proposed[name]
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / name, target)
        assert digest(target) == proposed[name]
    after_support = dict(old_support)
    after_support.update({name: proposed[name] for name in changed})
    assert support_inventory(PRODUCTION) == after_support
    receipt = {'version': '0.38.9', 'desktop': str(DESKTOP), 'archive': str(ARCHIVE), 'sha256': package['sha256'],
               'backups': {name: str(path) for name, path in BACKUPS.items()}, 'sourceFiles': 57, 'desktopFiles': 59,
               'receiptFilesVerified': 58, 'liveReloadVerified': False, 'liveRaceTested': False,
               'userReloadRequired': True, 'nativeReceiptSha256': NATIVE_PIN}
    summary = {'version': '0.38.9', 'checkedAt': datetime.now(timezone.utc).isoformat(), 'passed': suite['counts']['pass'],
               'selectedFiles': suite['selectedFiles'], 'excludedFiles': suite['excludedFiles'], 'allTestFilesPassed': False,
               'sourceHashes': lock, 'canonicalReceiptSha256': digest(SUITE), 'nativeReceiptSha256': NATIVE_PIN,
               'nativeBehaviorReceiptSha256': NATIVE_TESTS_PIN, 'supportManifestSha256': SUPPORT_PLAN_PIN,
               'nativeModuleReceiptSha256': MODULES_PIN,
               'deliveryPeerReviewSha256': digest(PEER_REVIEW),
               'package': receipt, 'liveGameTested': False, 'fullGameInstantiated': False}
    sync = {'version': '0.38.9', 'backup': str(BACKUPS['Support']), 'before': before,
            'after': {name: proposed[name] for name in changed}}
    for name, value in zip(RECEIPTS, (receipt, summary, sync)):
        path = ROOT / 'verification' / name
        write_new(path, value)
        with (PRODUCTION / 'verification' / name).open('xb') as stream:
            stream.write(path.read_bytes())
        after_support['verification/' + name] = digest(path)
    assert inventory(SOURCE) == inventory(PRODUCTION / 'extension') == lock
    assert inventory(DESKTOP) == zip_inventory(ARCHIVE) == expected
    assert support_inventory(PRODUCTION) == after_support and digest(old_zip) == PRIOR_ZIP_PIN
    print(json.dumps({'package': receipt, 'tests': suite['counts'], 'supportFilesSynchronized': len(changed)}, indent=2))


if __name__ == '__main__':
    main()
