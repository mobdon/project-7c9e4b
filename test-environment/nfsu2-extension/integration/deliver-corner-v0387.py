"""Deliver the reviewed v0.38.7 to the existing stable Desktop folder.

Reading/importing this file does not package or deliver anything. main() is the
explicit delivery action. Existing archives, backups and receipts are immutable.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
PRODUCTION = WORKSPACE / 'nfsu2-extension'
SOURCE = ROOT / 'extension'
VERIFY = ROOT / 'verification'
DESKTOP = Path('C:/Users/Admin/Desktop/NFSU2-Driving-Tools')
ARTIFACTS = WORKSPACE / 'artifacts'
ARCHIVE = ARTIFACTS / 'NFSU2-Driving-Tools-v0.38.7-Desktop-Folder.zip'
BACKUP = ARTIFACTS / 'Desktop-v0.38.6-backup-20261110-before-v0387'
SOURCE_BACKUP = ARTIFACTS / 'Source-v0.38.6-backup-20261110-before-v0387'
SUPPORT_BACKUP = ARTIFACTS / 'Support-v0.38.6-backup-20261110-before-v0387'
PACKER = PRODUCTION / 'tools/package-release.py'
GUIDE = PRODUCTION / 'templates/UPDATE-WINDOWS-DESKTOP.txt'
PACKER_PIN = '1a6b0fd324e221cb86b8e5163380d608e41b3da32621b385b2c2d1d2bd6f6616'
GUIDE_PIN = '74bbbcb6ee810ca5c1bc17e3bbc0d187f7fb8ae028b9faa42c56b0739f186dae'
BASELINE_PIN = '23d011ac6ffbaf2992068217dd5b52ff23326413f695d9904da32ba0adfc48b2'
SUPPORT_PIN = '9165e3fd2b6a20d628c474050a3e7a36451e9585bcd1c819555d702a80a24e12'
V0386_ARCHIVE_PIN = 'd812777d56bf060699048c407f91241fa916aa9bc6b978c3cb1cba30b939badd'
SEALED_NATIVE_PIN = '0505326e2b384b9918899efa936d2e2db3b3cc8ea0da2ddd6ee9ead4d1b6f3ca'
CORNER_PATCHER_PIN = 'b77ad11ed360919ed346c934e6ea37c80bf482da18d2cec853ef78edf803608f'
PUBLISHER_OUTPUTS = {
    'aa2429fb': '8e9dad5c36a8d4e9de19656e37f15ac7a23886f6a4afaf710c010e4441d5c114',
    '15e5958f': '4fb939201464f2fdcb117bbfa56ce5c9dff88387aa4fb81deb610cd489b3688b',
    '943ee537': '6d23a0a62c1d133eaf5b64581a213a136d08c47600ae1d298452712e873f8bc2',
}
NATIVE_OUTPUTS = {
    'aa2429fb': 'cc8d3b46da22d6dad1a99de1e1c8c8a28d3782cfcd92d01fe722a7ee4c54baed',
    '15e5958f': '314b47584891c237f8ce7826c3424f3e2c2610131542fdda6564b6e22288db71',
    '943ee537': '73581fa5430fae6e6b2d7276b264deed29d0ec90232c4e6d0b6b402069e086fe',
}
SUPPORT_TREES = ('tests', 'tools', 'templates', 'integration', 'verification', 'native')
NEW_RUNTIME = {'native-rubberband.js', 'rubberband-controller.js', 'native-corner-target.js'}
RECEIPTS = ('package-v0387.json', 'release-summary-v0387.json', 'support-sync-v0387.json')
REVIEW_PATHS = (
    'integration/lifecycle-review-native-calculated-v0387.json',
    'integration/native-rubberband-independent-review.json',
    'integration/native-rubberband-seal-independent-review-v0387.json',
    'native/seal-review.json',
    'integration/native-corner-target-independent-review-v0387.json',
)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def linked(path):
    return path.is_symlink() or (hasattr(path, 'is_junction') and path.is_junction())


def digest(path):
    if not path.exists():
        assert not linked(path), str(path)
        return None
    assert path.is_file() and not linked(path), str(path)
    return sha(path.read_bytes())


def inventory(folder):
    assert folder.is_dir() and not linked(folder), str(folder)
    entries = sorted(folder.iterdir())
    assert all(p.is_file() and not linked(p) for p in entries), str(folder)
    return {p.name: digest(p) for p in entries}


def support_inventory(base):
    result = {}
    for directory in SUPPORT_TREES:
        folder = base / directory
        if not folder.exists():
            assert not linked(folder), str(folder)
            continue
        assert folder.is_dir() and not linked(folder), str(folder)
        for item in sorted(folder.rglob('*')):
            relative = item.relative_to(base)
            if '__pycache__' in relative.parts or item.suffix.lower() == '.pyc':
                continue
            assert not linked(item), str(item)
            if item.is_file():
                result[relative.as_posix()] = digest(item)
    return result


def write_new(path, value):
    with path.open('x', encoding='utf-8', newline='\n') as stream:
        stream.write(json.dumps(value, indent=2) + '\n')


def archive_inventory(path):
    prefix = 'NFSU2-Driving-Tools/'
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        assert len(names) == len(set(names)) and archive.testzip() is None
        assert all(n.startswith(prefix) and '/' not in n[len(prefix):]
                   and n[len(prefix):] not in ('', '.', '..') for n in names)
        return {n[len(prefix):]: sha(archive.read(n)) for n in names}


def verify_package(folder):
    actual = inventory(folder)
    receipt = read(folder / 'PACKAGE-CHECKSUMS.json')
    assert receipt['layout'] == 'stable-desktop-folder'
    assert receipt['folder'] == 'NFSU2-Driving-Tools'
    assert set(actual) == set(receipt['files']) | {'PACKAGE-CHECKSUMS.json'}
    for name, entry in receipt['files'].items():
        assert actual[name] == entry['sha256'], name
        assert (folder / name).stat().st_size == entry['bytes'], name
    return receipt


def verify_release(lock):
    suite = read(VERIFY / 'canonical-suite-v0387-final-result.json')
    files = read(VERIFY / 'final-suite-v0387-final-files.json')
    previous = read(PRODUCTION / 'verification/release-summary-v0386.json')
    assert suite['version'] == '0.38.7' and suite['passed'] is True
    assert suite['sourceUnchanged'] is True and suite['testsUnchanged'] is True
    assert suite['sourceHashes'] == lock, 'Canonical tests must bind the final reviewed source'
    assert suite['exitCode'] == 0 and suite['counts']['tests'] == suite['counts']['pass'] >= 2549
    assert all(suite['counts'][key] == 0 for key in ('fail', 'cancelled', 'skipped', 'todo'))
    assert len(suite['excludedFiles']) == 8 and suite['excludedFiles'] == previous['excludedFiles']
    excluded = {row['file'] for row in suite['excludedFiles']}
    assert set(files) == {p.name for p in (ROOT / 'tests').glob('*.test.cjs')} - excluded
    assert len(files) == len(set(files)) == suite['selectedFiles']
    assert {'rubberband-controller.test.cjs', 'rubberband-page.test.cjs',
            'forward-knot-invariance.test.cjs', 'native-corner-target.test.cjs'} <= set(files)
    assert set(read(PRODUCTION / 'verification/final-suite-v0386-current-final-files.json')) <= set(files)
    required = {'tests/' + name for name in files}
    required.update(p.relative_to(ROOT).as_posix() for p in (ROOT / 'tests/fixtures').glob('*.cjs'))
    required.update(p.relative_to(ROOT).as_posix() for p in (ROOT / 'native').glob('*.cjs'))
    required.update(('native/plans.json', 'native/corner-target-plans.json'))
    assert set(suite['testHashes']) == required
    for name, pin in suite['testHashes'].items():
        assert digest(ROOT / name) == pin, 'Test changed after canonical execution: ' + name
    assert (VERIFY / 'final-suite-v0387-final.txt').stat().st_size > 0
    native = read(VERIFY / 'release-modules-v0387-final.json')
    assert native['version'] == '0.38.7' and native['passed'] is True
    assert native['sourceHashes'] == lock and native['sourceUnchanged'] is True
    assert native['liveGameTested'] is False and native['fullGameInstantiated'] is False
    assert all(native[key] is True for key in (
        'allTwelvePreAssistOutputsEqualDeliveredV0386', 'nineOlderCompleteOutputsUnchanged',
        'onlyAdditionalFunctions3553And4653ForThreeSupportedBuilds'))
    assert native['sourceFileCount'] == 55
    assert native['verifierSha256'] == digest(ROOT / 'tools/verify-release-modules-v0387.cjs')
    assert native['sealedNativePatcherSha256'] == SEALED_NATIVE_PIN
    assert native['nativeIndependentReviewSha256'] == digest(ROOT / REVIEW_PATHS[1])
    assert native['nativeSealReceiptSha256'] == digest(ROOT / REVIEW_PATHS[3])
    assert native['nativeCornerTargetPatcherSha256'] == CORNER_PATCHER_PIN
    assert native['nativeCornerTargetIndependentReviewSha256'] == digest(ROOT / REVIEW_PATHS[4])
    for name, pin in native['historicalArtifactsPreserved'].items():
        assert digest(WORKSPACE / name) == pin, 'Historical native proof changed: ' + name
    rows = {row['revision']: row for row in native['modules']}
    old = {row['revision']: row for row in previous['nativeModules']['modules']}
    assert len(rows) == len(native['modules']) == 12 and set(rows) == set(old)
    for revision, row in rows.items():
        assert row['valid'] is True and row['compiled'] is True
        assert row['otherNativeFunctionsPreserved'] is True
        assert row['importsExportsDataAndTableUnchanged'] is True
        assert row['exactAuthoredAppendVerified'] is True
        assert row['previousV0386OutputSha256'] == old[revision]['outputSha256']
        assert row['preAssistOutputSha256'] == old[revision]['outputSha256']
        assert row['extraChangedFromV0386'] == ([3553, 4653] if revision in NATIVE_OUTPUTS else [])
        assert row['unchangedFromV0386'] is (revision not in NATIVE_OUTPUTS)
        assert row['outputSha256'] == NATIVE_OUTPUTS.get(revision, old[revision]['outputSha256'])
        if revision in NATIVE_OUTPUTS:
            assert row['preCornerOutputSha256'] == PUBLISHER_OUTPUTS[revision]
            assert row['cornerTarget']['modifiedFunctions'] == [4653]
            assert row['cornerTarget']['onlyAuthoredExpressionChanged'] is True
            assert row['cornerTarget']['nonCodeSectionsUnchanged'] is True
    assert lock['native-rubberband.js'] == SEALED_NATIVE_PIN
    assert lock['native-corner-target.js'] == CORNER_PATCHER_PIN
    lifecycle = read(ROOT / REVIEW_PATHS[0])
    assert lifecycle['result'] == 'passed' and lifecycle['findings'] == []
    assert lifecycle['sourceHashes'] == {name: lock[name] for name in (
        'page.js', 'core.js', 'ai.js', 'diagnostics.js', 'forward-driving.js', 'README.md')}
    assert lifecycle['activeContract'] == {
        'mode': 'native-calculated', 'selectedPace': 1,
        'publisherCommandEnabled': False, 'publisherCommandPercent': 100,
        'nativeCalculatedFactorsUnchanged': True, 'nativeUniversalMaximumClaimed': False,
    }
    assert lifecycle['checks']['allPagePublisherCommandsRemainOff100'] is True
    focused = lifecycle['validation']['focusedTests']
    assert focused['file'] == 'tests/rubberband-page.test.cjs' and focused['passed'] is True
    assert focused['sha256'] == suite['testHashes'][focused['file']]
    assert focused['liveGameTested'] is False
    assert lifecycle['nativeCornerTargetSourceSha256'] == CORNER_PATCHER_PIN
    assert lifecycle['manifestSourceSha256'] == lock['manifest.json']
    loader = lifecycle['validation']['loaderTests']
    assert loader['passed'] is True and loader['liveGameTested'] is False
    assert loader['sha256'] == suite['testHashes'][loader['file']]
    review = read(ROOT / REVIEW_PATHS[1])
    assert review['result'] == 'passed' and review['findings'] == [] and review['maximumPercent'] == 150
    seal = read(ROOT / REVIEW_PATHS[2])
    assert seal['result'] == 'passed' and seal['sealedProductSha256'] == SEALED_NATIVE_PIN
    assert seal['unsealedProductSha256'] == review['unsealedProductSha256']
    native_seal = read(ROOT / REVIEW_PATHS[3])
    assert native_seal['sealedProductSha256'] == SEALED_NATIVE_PIN
    assert native_seal['reviewReceiptSha256'] == digest(ROOT / REVIEW_PATHS[1])
    assert {row['revision']: row['outputSha256'] for row in native_seal['outputPins']} == PUBLISHER_OUTPUTS
    corner = read(ROOT / REVIEW_PATHS[4])
    assert corner['result'] == 'passed' and corner['findings'] == []
    assert corner['productSha256'] == CORNER_PATCHER_PIN and corner['sealedPublisherSha256'] == SEALED_NATIVE_PIN
    assert corner['validation']['focusedTests'] == corner['validation']['passed'] == 3
    assert corner['validation']['failed'] == 0 and corner['validation']['totalNativeCases'] == 219
    assert corner['validation']['liveGameTested'] is False and corner['validation']['fullGameInstantiated'] is False
    for name, pin in corner['sourceHashes'].items():
        assert digest(ROOT / name) == pin, 'Corner proof input changed: ' + name
    for field in ('scopeReceipt', 'independentBehaviorReceipt', 'independentFinalRunLog'):
        assert digest(ROOT / corner[field]) == corner[field + 'Sha256']
    assert {row['revision']: row['inputSha256'] for row in corner['inputOutputPins']} == PUBLISHER_OUTPUTS
    assert {row['revision']: row['outputSha256'] for row in corner['inputOutputPins']} == NATIVE_OUTPUTS
    return suite, files, native


def main():
    for path in (ARCHIVE, BACKUP, SOURCE_BACKUP, SUPPORT_BACKUP):
        assert not path.exists() and not linked(path), 'Preserve immutable artifact: ' + str(path)
    for name in RECEIPTS:
        assert not (VERIFY / name).exists() and not linked(VERIFY / name), name
        target = PRODUCTION / 'verification' / name
        assert not target.exists() and not linked(target), name
    baseline_path = VERIFY / 'baseline-source-desktop.json'
    support_path = VERIFY / 'baseline-support-v0387.json'
    assert digest(baseline_path) == BASELINE_PIN and digest(support_path) == SUPPORT_PIN
    baseline, support_baseline = read(baseline_path), read(support_path)['supportHashes']
    assert len(baseline['extension']) == 52 and len(baseline['desktop']) == 54
    assert inventory(PRODUCTION / 'extension') == baseline['extension'], 'Concurrent source edit; review before delivery'
    assert inventory(DESKTOP) == baseline['desktop'], 'Concurrent Desktop edit; review before delivery'
    assert support_inventory(PRODUCTION) == support_baseline, 'Concurrent support edit; review before delivery'
    assert read(PRODUCTION / 'extension/manifest.json')['version'] == '0.38.6'
    assert verify_package(DESKTOP)['extension_version'] == '0.38.6'
    prior = read(PRODUCTION / 'verification/package-v0386.json')
    prior_archive = Path(prior['archive'])
    assert prior['sha256'] == V0386_ARCHIVE_PIN and digest(prior_archive) == V0386_ARCHIVE_PIN
    assert archive_inventory(prior_archive) == baseline['desktop']
    lock_path = VERIFY / 'source-reviewed-v0387-final.json'
    lock = read(lock_path)
    assert len(lock) == 55 and inventory(SOURCE) == lock
    assert set(lock) - set(baseline['extension']) == NEW_RUNTIME
    assert not set(baseline['extension']) - set(lock)
    assert read(SOURCE / 'manifest.json')['version'] == '0.38.7'
    suite, files, native = verify_release(lock)
    assert digest(PACKER) == PACKER_PIN and digest(GUIDE) == GUIDE_PIN
    frozen = {path: digest(path) for path in (
        Path(__file__), baseline_path, support_path, lock_path, PACKER, GUIDE,
        VERIFY / 'canonical-suite-v0387-final-result.json', VERIFY / 'final-suite-v0387-final-files.json',
        VERIFY / 'final-suite-v0387-final.txt', VERIFY / 'release-modules-v0387-final.json',
        ROOT / 'tools/verify-release-modules-v0387.cjs',
        *(ROOT / name for name in REVIEW_PATHS))}
    frozen.update({ROOT / name: pin for name, pin in suite['testHashes'].items()})
    corner_review = read(ROOT / REVIEW_PATHS[4])
    frozen.update({ROOT / name: pin for name, pin in corner_review['sourceHashes'].items()})
    frozen.update({ROOT / corner_review[field]: corner_review[field + 'Sha256']
                   for field in ('scopeReceipt', 'independentBehaviorReceipt', 'independentFinalRunLog')})
    frozen.update({WORKSPACE / name: pin for name, pin in native['historicalArtifactsPreserved'].items()})
    spec = importlib.util.spec_from_file_location('reviewed_packer_v0387', PACKER)
    packer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(packer)
    version, expected = packer.collect(SOURCE, 'desktop-folder')
    assert version == '0.38.7' and len(expected) == 57
    assert set(expected) == set(lock) | {'UPDATE-WINDOWS.txt', 'PACKAGE-CHECKSUMS.json'}
    assert set(expected) - set(baseline['desktop']) == NEW_RUNTIME
    assert not any(Path(name).suffix.lower() in ('.wasm', '.wat', '.exe', '.bin', '.mus', '.mpf') for name in expected)
    for name, pin in lock.items():
        if name != 'README.md':
            assert sha(expected[name]) == pin, 'Packaged runtime differs from reviewed source: ' + name
    proposed = support_inventory(ROOT)
    paths = []
    for name, pin in proposed.items():
        if name.startswith('verification/') and 'v0387' not in Path(name).name and name != 'verification/baseline-source-desktop.json':
            continue
        if name.startswith('integration/') and any(old in name for old in ('v0385', 'v0386')):
            continue
        if support_baseline.get(name) != pin:
            paths.append(name)
    paths.sort()
    assert all('v0386' not in Path(name).name for name in paths if name.startswith('verification/'))
    # Complete verified backups precede every replacement. Generated caches are
    # left untouched. A failed gate leaves archives/backups for manual review.
    BACKUP.mkdir(); SOURCE_BACKUP.mkdir(); SUPPORT_BACKUP.mkdir()
    for name in baseline['desktop']:
        shutil.copy2(DESKTOP / name, BACKUP / name)
    for name in baseline['extension']:
        shutil.copy2(PRODUCTION / 'extension' / name, SOURCE_BACKUP / name)
    before = {name: support_baseline.get(name) for name in paths}
    for name, pin in before.items():
        if pin is not None:
            target = SUPPORT_BACKUP / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(PRODUCTION / name, target)
            assert digest(target) == pin, name
    write_new(SUPPORT_BACKUP / 'BACKUP-INVENTORY.json', before)
    assert inventory(BACKUP) == baseline['desktop'] and inventory(SOURCE_BACKUP) == baseline['extension']
    assert inventory(PRODUCTION / 'extension') == baseline['extension'] and inventory(DESKTOP) == baseline['desktop']
    assert support_inventory(PRODUCTION) == support_baseline
    assert inventory(SOURCE) == lock and support_inventory(ROOT) == proposed
    for path, pin in frozen.items():
        assert digest(path) == pin, 'Reviewed input changed: ' + str(path)
    package = packer.package(SOURCE, ARCHIVE, 'desktop-folder')
    expected_hashes = {name: sha(data) for name, data in expected.items()}
    assert archive_inventory(ARCHIVE) == expected_hashes
    for path, pin in frozen.items():
        assert digest(path) == pin, 'Reviewed input changed before replacement: ' + str(path)
    assert inventory(SOURCE) == lock and support_inventory(ROOT) == proposed
    assert inventory(PRODUCTION / 'extension') == baseline['extension'] and inventory(DESKTOP) == baseline['desktop']
    assert support_inventory(PRODUCTION) == support_baseline
    for name in sorted(lock):
        target = PRODUCTION / 'extension' / name
        assert digest(target) == baseline['extension'].get(name), 'Concurrent source edit: ' + name
        assert digest(SOURCE / name) == lock[name], name
        shutil.copy2(SOURCE / name, target)
        assert digest(target) == lock[name], name
    for name, data in sorted(expected.items()):
        target = DESKTOP / name
        assert digest(target) == baseline['desktop'].get(name), 'Concurrent Desktop edit: ' + name
        target.write_bytes(data)
        assert digest(target) == expected_hashes[name], name
    assert inventory(PRODUCTION / 'extension') == lock and inventory(SOURCE) == lock
    assert inventory(DESKTOP) == expected_hashes
    assert verify_package(DESKTOP)['extension_version'] == '0.38.7'
    assert support_inventory(PRODUCTION) == support_baseline
    for name in paths:
        target = PRODUCTION / name
        assert digest(target) == before[name], 'Concurrent support edit: ' + name
        assert digest(ROOT / name) == proposed[name], 'Candidate support edit: ' + name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / name, target)
        assert digest(target) == proposed[name], name
    support_after = dict(support_baseline)
    support_after.update({name: proposed[name] for name in paths})
    assert support_inventory(PRODUCTION) == support_after
    support = {'version': '0.38.7', 'backup': str(SUPPORT_BACKUP), 'before': before,
               'after': {name: proposed[name] for name in paths}}
    receipt = {'version': '0.38.7', 'desktop': str(DESKTOP), 'archive': str(ARCHIVE),
               'sha256': package['sha256'], 'backup': str(BACKUP), 'sourceBackup': str(SOURCE_BACKUP),
               'supportBackup': str(SUPPORT_BACKUP), 'sourceFiles': 55, 'desktopFiles': 57,
               'receiptFilesVerified': 56, 'replacedDesktopVersion': '0.38.6', 'replacedSourceVersion': '0.38.6',
               'liveReloadVerified': False, 'userReloadRequired': True, 'racingBehaviorChanged': True,
               'newProductFiles': sorted(NEW_RUNTIME), 'activeMode': 'native-calculated',
               'activeSelectedPace': 1, 'activePublisherCommandEnabled': False,
               'activePublisherCommandPercent': 100, 'nativeCalculatedFactorsUnchanged': True,
               'nativeUniversalMaximumClaimed': False, 'nativeOutputPins': NATIVE_OUTPUTS}
    summary = {'version': '0.38.7', 'checkedAt': datetime.now(timezone.utc).isoformat(),
               'selectedFiles': len(files), 'passed': suite['counts']['pass'], 'failed': 0, 'skipped': 0,
               'cancelled': 0, 'allTestFilesPassed': False, 'excludedFiles': suite['excludedFiles'],
               'sourceLock': lock_path.name, 'log': 'final-suite-v0387-final.txt',
               'fileList': 'final-suite-v0387-final-files.json', 'nativeModules': native, 'package': receipt,
               'reviewHashes': {name: digest(ROOT / name) for name in REVIEW_PATHS},
               'limits': ['Offline checks only; live driving and reload remain unverified.',
                          'Active page preserves calculated native factors and always observes publication at Off/100.',
                          'Observer Off/100 acknowledgement is not evidence that the native factor is 1.',
                          'Observer reset remains pending until an advancing current-car native publication acknowledges it.',
                          'Eight historical fixture exclusions remain; not every test file was run.',
                          'This release does not establish unattended streaming autonomy.']}
    for name, value in (('support-sync-v0387.json', support), ('package-v0387.json', receipt),
                        ('release-summary-v0387.json', summary)):
        write_new(VERIFY / name, value)
        target = PRODUCTION / 'verification' / name
        with target.open('xb') as stream:
            stream.write((VERIFY / name).read_bytes())
        assert digest(target) == digest(VERIFY / name)
        support_after['verification/' + name] = digest(target)
    assert support_inventory(PRODUCTION) == support_after
    assert digest(prior_archive) == V0386_ARCHIVE_PIN
    assert inventory(BACKUP) == baseline['desktop'] and inventory(SOURCE_BACKUP) == baseline['extension']
    assert inventory(PRODUCTION / 'extension') == lock and inventory(DESKTOP) == archive_inventory(ARCHIVE)
    print(json.dumps({'package': receipt, 'tests': suite['counts'], 'supportFilesSynchronized': len(paths)}, indent=2))


if __name__ == '__main__':
    main()
