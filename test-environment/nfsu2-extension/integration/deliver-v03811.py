"""Deliver the reviewed .11 into the existing Desktop folder; import is read-only."""
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
ARCHIVE = ARTIFACTS / 'NFSU2-Driving-Tools-v0.38.11-Desktop-Folder.zip'
BACKUPS = {name: ARTIFACTS / (name + '-v0.38.10-backup-before-v03811')
           for name in ('Desktop', 'Source', 'Support')}
TREES = ('tests', 'tools', 'templates', 'integration', 'verification', 'native')
BASELINE = ROOT / 'verification/baseline-source-desktop-v03811.json'
SUPPORT_BASELINE = ROOT / 'verification/baseline-support-v03811.json'
BASELINE_PIN = '51ed2c207b959621e84d03aed983c863e0df4fe875c09f2fdc274efc61f20b0c'
SUPPORT_PIN = 'f988cd5ac231af83c3e621a8a2d06ad487e4e37af51e1ca8d99a8f79b6a40fc1'
PRIOR_ZIP_PIN = '7312f1d8ae82e0b8983fb7fbd92190b66d12ad8f6bad93576ecf47b2342997ba'
PACKER_PIN = '1a6b0fd324e221cb86b8e5163380d608e41b3da32621b385b2c2d1d2bd6f6616'
GUIDE_PIN = 'f9bce9451c6674ab53dea0a605f7fbdf20a9c830272aaafba9cfc72555b0929f'
NATIVE = ROOT / 'native/paced-build.json'
NATIVE_PIN = '4e6123f4863ed0c3d9a653cca273409ba5a82576942432d1e463ef877602779b'
NATIVE_TESTS = 'native/catchup-tests-v03811.json'
NATIVE_TEST_COUNT = 63
NATIVE_TESTS_PIN = '96ca1cb49bbfd74c70a64af7efbd1f9d256fcd785cea470ed068cc810463706b'
MODULES = ROOT / 'verification/release-modules-v03811-final.json'
MODULES_PIN = '86b25d06134eee73c62f725658c8776de120f5038e5c57e9c7eeec233c556696'
SUPPORT_PLAN = ROOT / 'integration/delivery-support-v03811.json'
SUPPORT_PLAN_PIN = 'c913b3b4f3f3948ce9da667518fbde363e20ee97e5ca5cb990c627c8bf98ebd7'
PEER_REVIEW = ROOT / 'integration/delivery-independent-review-v03811.json'
SUITE = ROOT / 'verification/canonical-suite-v03811-final-result.json'
SUITE_PIN = '6b692af2d93d60f34fc82c603206900d7360014910e6a418638cbef6933a6c0e'
SOURCE_LOCK = ROOT / 'verification/source-reviewed-v03811-final.json'
SOURCE_LOCK_PIN = '12434dfbc61d4a07d0950abc4310e466ac84a20a7e07844dc090e136c7f87cc5'
COMPOSITION = ROOT / 'verification/native-composition-v03811.json'
COMPOSITION_PIN = '25b9e86c763c678c6066f394b6d59e6f3a47f1bacf710ae72c8b5a8d28cf0995'
PREVIOUS_MODULES_PIN = 'f094c70fe8733a9fcbd1fdeeb64cbcf9b98c4d805305a129c5dad5bfce025bf5'
NPC_MANIFEST_PIN = '420fc9d4759cda3d496fbde8fe64ac4688e8c08d86b98077e546ce341fd07e18'
FILES = ROOT / 'verification/final-suite-v03811-final-files.json'
LOG = ROOT / 'verification/final-suite-v03811-final.txt'
RUNNER = ROOT / 'tools/run-canonical-v03811.cjs'
RECEIPTS = ('package-v03811.json', 'release-summary-v03811.json', 'support-sync-v03811.json')


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



def require_pin(value, label):
    assert isinstance(value, str) and re.fullmatch(r'[a-f0-9]{64}', value), 'Bind ' + label


def verify_module_audit(lock, native, behavior):
    require_pin(MODULES_PIN, 'final twelve-build native audit')
    assert digest(MODULES) == MODULES_PIN
    audit = read(MODULES)
    assert audit['version'] == '0.38.11' and audit['passed'] is True
    assert audit['sourceFileCount'] == 57 and audit['sourceUnchanged'] is True
    assert audit['sourceHashes'] == lock and audit['sourceLockSha256'] == SOURCE_LOCK_PIN
    assert audit['verifierSha256'] == digest(ROOT / 'tools/verify-release-modules-v03811.cjs')
    assert audit['fullGameInstantiated'] is False and audit['liveGameTested'] is False
    assert audit['sevenOlderCompleteOutputsUnchanged'] is True and audit['fiveDeclaredFinalOutputChanges'] is True
    prior_path = PRODUCTION / 'verification/release-modules-v03810-final.json'
    assert digest(prior_path) == audit['previousReleaseReceiptSha256'] == PREVIOUS_MODULES_PIN
    prior = {item['revision']: item for item in read(prior_path)['modules']}
    modules = audit['modules']
    assert len(modules) == 12 and len({item['revision'] for item in modules}) == 12
    assert {item['revision'] for item in modules} == set(prior)
    changes = {'8abf9be8': [24222], '93cfc6e9': [24251],
               'aa2429fb': [22957, 24259], '15e5958f': [22957, 24259],
               '943ee537': [22957, 24257]}
    current = {item['revision']: item for item in native['modules']}
    for item in modules:
        previous = prior[item['revision']]
        expected = changes.get(item['revision'], [])
        assert item['changedFromV03810'] == expected
        assert item['unchangedFromV03810'] is (not expected)
        assert item['previousV03810OutputSha256'] == previous['outputSha256']
        assert item['inputSha256'] == previous['inputSha256'] and item['inputBytes'] == previous['inputBytes']
        assert item['valid'] is True and item['compiled'] is True
        assert item['changedFunctions'] == previous['changedFunctions'], 'Original native modification sites changed'
        assert item['appendedAuthoredHelpers'] == previous['appendedAuthoredHelpers']
        assert item['appendedPrivateGlobals'] == previous['appendedPrivateGlobals']
        if not expected:
            assert item['outputSha256'] == previous['outputSha256'] and item['outputBytes'] == previous['outputBytes']
        if item['revision'] in current:
            built = current[item['revision']]
            assert item['outputSha256'] == built['outputSha256']
            assert item['prePacedOutputSha256'] == built['inputSha256']
            assert len(item['authoredPlanProof']) == 9
            assert all(proof['exactAuthoredPlanReconstructed'] is True for proof in item['authoredPlanProof'])
    assert digest(COMPOSITION) == COMPOSITION_PIN
    composition = read(COMPOSITION)
    assert composition['version'] == '0.38.11' and composition['passed'] is True
    assert composition['npcManifestSha256'] == NPC_MANIFEST_PIN
    assert digest(ROOT / 'integration/online-rival-cars-v03811/manifest.json') == NPC_MANIFEST_PIN
    for name, pin in composition['sourceHashes'].items():
        assert digest(ROOT / name) == pin, 'Changed composed native input: ' + name
    for name, pin in composition['preservedFormulaSources'].items():
        assert digest(ROOT / name) == digest(WORKSPACE / 'work-paced-v03810' / name) == pin
    assert composition['paced']['productSha256'] == native['productSha256'] == behavior['productSha256']


def verify_release():
    assert NATIVE_PIN and re.fullmatch(r'[a-f0-9]{64}', NATIVE_PIN), 'Bind the reviewed native receipt'
    assert NATIVE_TESTS and NATIVE_TESTS_PIN and digest(ROOT / NATIVE_TESTS) == NATIVE_TESTS_PIN
    require_pin(SUITE_PIN, 'final canonical receipt')
    assert digest(SUITE) == SUITE_PIN
    suite = read(SUITE)
    prior = read(PRODUCTION / 'verification/release-summary-v03810.json')
    lock = inventory(SOURCE)
    assert len(lock) == 57 and lock == suite['sourceHashes']
    assert digest(SOURCE_LOCK) == SOURCE_LOCK_PIN and read(SOURCE_LOCK) == lock
    assert read(SOURCE / 'manifest.json')['version'] == suite['version'] == '0.38.11'
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
            'corner-fallback-v0389.test.cjs', 'runtime-cpu-v03810.test.cjs',
            'cars-online-state-v03811.test.cjs', 'online-rival-native-v03811.test.cjs',
            'city-current-frame-v03811.test.cjs', 'route-read-diagnostics-v03811.test.cjs',
            'route-trackinfo-native-v03811.test.cjs', 'native-control-evidence-v03811.test.cjs',
            'context-diagnostics-v03811.test.cjs', 'online-all-page-v03811.test.cjs'} <= set(selected)
    assert set(read(PRODUCTION / 'verification/final-suite-v03810-final-files.json')) <= set(selected)
    assert all('tests/' + name in suite['testHashes'] for name in selected)
    for name, pin in suite['testHashes'].items():
        assert digest(ROOT / name) == pin, 'Changed final test input: ' + name
    log = LOG.read_text(encoding='utf-8-sig')
    for key, value in suite['counts'].items():
        assert re.findall(r'^# ' + re.escape(key) + r' (\d+)\r?$', log, re.MULTILINE) == [str(value)]
    assert digest(NATIVE) == NATIVE_PIN
    native = read(NATIVE)
    assert native['version'] == '0.38.11' and native['passed'] is True
    assert native['productSha256'] == lock['paced-catchup.js'] == digest(ROOT / 'native/paced-catchup.js')
    assert native['liveVerified'] is False and native['fullGameInstantiated'] is False
    modules = native['modules']
    assert len(modules) == 3 and {item['revision'] for item in modules} == {'aa2429fb', '15e5958f', '943ee537'}
    assert all(item['valid'] is True and item['compiled'] is True and item['otherNonCodeSectionsPreserved'] is True
               for item in modules)
    behavior = read(ROOT / NATIVE_TESTS)
    assert behavior['passed'] is True and behavior['productSha256'] == lock['paced-catchup.js']
    assert behavior['liveVerified'] is False and behavior['fullGameInstantiated'] is False
    assert NATIVE_TEST_COUNT and behavior['tests'] == behavior['passedTests'] == NATIVE_TEST_COUNT and behavior['failedTests'] == 0
    assert behavior['buildSha256'] == NATIVE_PIN
    assert behavior['verifierSha256'] == digest(ROOT / 'native/verify-catchup-v03811.cjs')
    for name, pin in behavior['sourceHashes'].items():
        assert digest(ROOT / name) == pin, 'Changed native behavior input: ' + name
    verify_module_audit(lock, native, behavior)
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
    assert read(PRODUCTION / 'extension/manifest.json')['version'] == read(DESKTOP / 'manifest.json')['version'] == '0.38.10'
    for path in (ARCHIVE, *BACKUPS.values()):
        assert not path.exists() and not linked(path), 'Preserve existing artifact: ' + str(path)
    for name in RECEIPTS:
        assert digest(ROOT / 'verification' / name) is None and digest(PRODUCTION / 'verification' / name) is None
    old_zip = Path(read(PRODUCTION / 'verification/package-v03810.json')['archive'])
    assert digest(old_zip) == PRIOR_ZIP_PIN and zip_inventory(old_zip) == baseline['desktop']
    lock, suite, native = verify_release()
    assert set(lock) == set(baseline['extension'])
    packer_path = ROOT / 'tools/package-release.py'
    guide_path = ROOT / 'templates/UPDATE-WINDOWS-DESKTOP.txt'
    assert digest(packer_path) == PACKER_PIN and digest(guide_path) == GUIDE_PIN
    spec = importlib.util.spec_from_file_location('reviewed_v03811_packer', packer_path)
    packer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(packer)
    version, payload = packer.collect(SOURCE, 'desktop-folder')
    expected = {name: sha(data) for name, data in payload.items()}
    assert version == '0.38.11' and len(expected) == 59 and set(expected) == set(baseline['desktop'])
    for name, pin in lock.items():
        if name != 'README.md':
            assert expected[name] == pin
    checksums = json.loads(payload['PACKAGE-CHECKSUMS.json'])
    assert checksums['extension_version'] == '0.38.11' and len(checksums['files']) == 58
    assert set(checksums['files']) == set(payload) - {'PACKAGE-CHECKSUMS.json'}
    for name, item in checksums['files'].items():
        assert item['sha256'] == expected[name] and item['bytes'] == len(payload[name])
    assert not any(Path(name).suffix.lower() in ('.wasm', '.wat', '.exe', '.bin', '.mpf', '.mus') for name in payload)
    proposed = support_inventory(ROOT)
    changed = sorted(name for name, pin in proposed.items() if old_support.get(name) != pin)
    # Merge support additions/changes; retain baseline files absent from this
    # pre-delivery candidate, including the three .10 delivery receipts.
    historical = [name for name in changed if name in old_support and re.search(r'v0[0-9]+', name)]
    assert set(historical) <= {'native/runtime-cpu-v03810.test.cjs'}, 'Preserve dated historical artifacts'
    if historical:
        assert historical == ['native/runtime-cpu-v03810.test.cjs']
        assert digest(ROOT / historical[0]) == 'e880e520d9390eee5a10753c8faf50c5675e57d3319330161375c7f2eb905217'

    require_pin(SUPPORT_PLAN_PIN, 'final reviewed support plan')
    assert digest(SUPPORT_PLAN) == SUPPORT_PLAN_PIN
    plan, peer = read(SUPPORT_PLAN), read(PEER_REVIEW)
    assert plan['version'] == peer['version'] == '0.38.11'
    assert plan['state'] == 'final-reviewed'
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
                                             RUNNER, SOURCE_LOCK, COMPOSITION, NATIVE, ROOT / NATIVE_TESTS, MODULES, SUPPORT_PLAN, PEER_REVIEW,
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
    receipt = {'version': '0.38.11', 'desktop': str(DESKTOP), 'archive': str(ARCHIVE), 'sha256': package['sha256'],
               'backups': {name: str(path) for name, path in BACKUPS.items()}, 'sourceFiles': 57, 'desktopFiles': 59,
               'receiptFilesVerified': 58, 'liveReloadVerified': False, 'liveRaceTested': False,
               'userReloadRequired': True, 'nativeReceiptSha256': NATIVE_PIN}
    summary = {'version': '0.38.11', 'checkedAt': datetime.now(timezone.utc).isoformat(), 'passed': suite['counts']['pass'],
               'selectedFiles': suite['selectedFiles'], 'excludedFiles': suite['excludedFiles'], 'allTestFilesPassed': False,
               'sourceHashes': lock, 'canonicalReceiptSha256': digest(SUITE), 'nativeReceiptSha256': NATIVE_PIN,
               'nativeBehaviorReceiptSha256': NATIVE_TESTS_PIN, 'supportManifestSha256': SUPPORT_PLAN_PIN,
               'nativeModuleReceiptSha256': MODULES_PIN,
               'deliveryPeerReviewSha256': digest(PEER_REVIEW),
               'package': receipt, 'liveGameTested': False, 'fullGameInstantiated': False}
    sync = {'version': '0.38.11', 'backup': str(BACKUPS['Support']), 'before': before,
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
