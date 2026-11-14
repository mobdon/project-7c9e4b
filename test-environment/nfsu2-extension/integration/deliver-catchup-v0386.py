"""Deliver the reviewed v0.38.6 artifact to the existing stable folder.

This program is intentionally separate from testing and packaging preparation.
It performs no browser actions. Running it is the delivery step; merely reading
or importing it has no filesystem effects.
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
BASELINE = WORKSPACE / 'work-logger-v0385'
PRODUCTION = WORKSPACE / 'nfsu2-extension'
SOURCE = ROOT / 'extension'
VERIFY = ROOT / 'verification'
DESKTOP = Path('C:/Users/Admin/Desktop/NFSU2-Driving-Tools')
ARTIFACTS = WORKSPACE / 'artifacts'
ARCHIVE = ARTIFACTS / 'NFSU2-Driving-Tools-v0.38.6-Desktop-Folder.zip'
BACKUP = ARTIFACTS / 'Desktop-v0.38.5-backup-20261110-before-v0386'
SOURCE_BACKUP = ARTIFACTS / 'Source-v0.38.5-backup-20261110-before-v0386'
SUPPORT_BACKUP = ARTIFACTS / 'Support-v0.38.5-backup-20261110-before-v0386'
AA_PIN = '6fc3e86184f642d695ceb27af65132da63bb1a9744d760c89a8f48b9bea0e80e'
CURRENT_PINS = {
    '15e5958f': {
        'inputSha256': 'f88fc7a0fe3082e20814f705635410d046fcdfe053eb70d65c49dec7583105b9',
        'inputBytes': 38619511,
        'outputSha256': '354df67de5e643a94713a7453619a9fd641d9ecc6e0c6c14934abc25640332c3',
        'outputBytes': 38671141,
    },
    '943ee537': {
        'inputSha256': 'c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391',
        'inputBytes': 38618703,
        'outputSha256': '2cd120e4758f4034b037154ad2b70f3ed8ac2efd2f4d13653916e4a499c43e45',
        'outputBytes': 38670333,
    },
}
V0385_ARCHIVE_PIN = '47f7f6a0b28cafc0e606f38d7f456468b1e71052390c1f240c79719f63ee3cf1'
SUPPORT_DIRECTORIES = ('tests', 'tools', 'templates', 'integration', 'verification')
REQUIRED_REVIEWS = (
    'verification/independent-current-release-review-v0386.json',
    'verification/family-proof-v0386.json',
    'verification/forward-current-port-v0386.json',
    'verification/integration-review-v0386.json',
    'verification/shortcut-native-v0386-reviewed.json',
    'verification/shortcut-repin-v0386-geometry.json',
    'verification/catchup-geometry-contract-v0386.json',
)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def link(path):
    return path.is_symlink() or (hasattr(path, 'is_junction') and path.is_junction())


def digest(path):
    if not path.exists():
        return None
    assert path.is_file() and not link(path), 'Expected regular file: ' + str(path)
    return sha(path.read_bytes())


def inventory(folder):
    assert folder.is_dir() and not link(folder), 'Expected regular directory: ' + str(folder)
    entries = sorted(folder.iterdir())
    assert all(p.is_file() and not link(p) for p in entries), str(folder)
    return {p.name: digest(p) for p in entries}


def support_inventory(base):
    """Snapshot support trees so concurrent additions are detected as well."""
    out = {}
    for directory in SUPPORT_DIRECTORIES:
        folder = base / directory
        if not folder.exists():
            continue
        assert folder.is_dir() and not link(folder), str(folder)
        for item in sorted(folder.rglob('*')):
            # Generated Python caches are neither authored release inputs nor
            # synchronization targets. Leave any existing cache files in place.
            relative = item.relative_to(base)
            if '__pycache__' in relative.parts or item.suffix.lower() == '.pyc':
                continue
            assert not link(item), str(item)
            if item.is_file():
                out[relative.as_posix()] = digest(item)
    return out


def write_new(path, value):
    with path.open('x', encoding='utf-8', newline='\n') as stream:
        stream.write(json.dumps(value, indent=2) + '\n')


def verify_package(folder):
    files = inventory(folder)
    receipt = read(folder / 'PACKAGE-CHECKSUMS.json')
    assert receipt['layout'] == 'stable-desktop-folder'
    assert receipt['folder'] == 'NFSU2-Driving-Tools'
    assert set(files) == set(receipt['files']) | {'PACKAGE-CHECKSUMS.json'}
    for name, entry in receipt['files'].items():
        assert files[name] == entry['sha256'], name
        assert (folder / name).stat().st_size == entry['bytes'], name
    return receipt


def archive_inventory(path):
    prefix = 'NFSU2-Driving-Tools/'
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        assert len(names) == len(set(names)) and archive.testzip() is None
        assert all(name.startswith(prefix) and '/' not in name[len(prefix):]
                   and name[len(prefix):] not in ('', '.', '..') for name in names)
        return {name[len(prefix):]: sha(archive.read(name)) for name in names}


def checked_reviews(lock, native):
    current = read(ROOT / REQUIRED_REVIEWS[0])
    assert current['result'] == 'passed' and current['sourceHashes'] == lock, 'Current independent review must bind final source'
    assert read(VERIFY / 'current-source-freeze-v0386.json') == lock
    assert current['version'] == '0.38.6' and current['sourceFileCount'] == 52 and current['sourceUnchanged'] is True
    assert current['sourceFreezeSha256'] == digest(VERIFY / 'current-source-freeze-v0386.json')
    assert current['strictReceiptSha256'] == digest(VERIFY / 'release-modules-v0386-current.json')
    assert current['harvestReceiptSha256'] == digest(VERIFY / 'release-modules-v0386-current-harvest.json')
    assert current['verifierSha256'] == native['verifierSha256'] and current['modules'] == native['modules']
    assert current['historicalArtifactsPreserved'] == native['historicalArtifactsPreserved']
    assert all(current[key] is True for key in (
        'originalTenCompleteOutputsUnchanged', 'allTwelveCompleteOutputPinsVerified',
        'unrelatedNativeFunctionsAndSectionsPreserved', 'authoredHelperAndHookDerivationVerified',
        'finite0to4FactorAndPaceAcknowledgementContractPreserved'))
    assert current['physicsPrototypeIncluded'] is False and current['fullGameInstantiated'] is False
    assert current['liveGameTested'] is False and current['productFilesEditedByThisReview'] == [] and current['findings'] == []
    family = read(ROOT / REQUIRED_REVIEWS[1])
    assert family['familyFileSha256'] == lock['family-profiles.js']
    assert family['sourceProfileSha256'] == lock['aa-profile.js']
    assert family['unknownBuildsRemainClosed'] is True and family['allAuthoredProfileByteArraysPreserved'] is True
    family_rows = {row['revision']: row for row in family['rows']}
    assert len(family['rows']) == len(family_rows) == 2 and set(family_rows) == set(CURRENT_PINS)
    port = read(ROOT / REQUIRED_REVIEWS[2])
    assert port['canonicalRegistrySha256'] == lock['forward-native-config.js']
    assert port['canonicalBuilderSha256'] == digest(ROOT / 'tools/build-forward-registry.cjs')
    assert port['oldAAOutputPreserved'] is True and port['liveVerified'] is False
    port_rows = {row['next']['revision']: row for row in port['proofs']}
    assert len(port['proofs']) == len(port_rows) == 2 and set(port_rows) == set(CURRENT_PINS)
    for revision, pin in CURRENT_PINS.items():
        row, proof = family_rows[revision], port_rows[revision]
        assert row['hash'] == pin['inputSha256'] and row['size'] == pin['inputBytes']
        assert row['nativeWitnessCount'] == len(row['nativeWitnesses']) == 73
        assert row['nativePaceWrapperExact'] is True and row['liveGameVerified'] is False
        assert row['baseAI']['validAndCompiled'] is True and row['baseAI']['unknownSameSizedHashRejected'] is True
        assert proof['next']['hash'] == pin['inputSha256'] and proof['next']['size'] == pin['inputBytes']
        assert proof['outputSha256'] == pin['outputSha256'] and proof['outputBytes'] == pin['outputBytes']
        assert proof['aiSha256'] == row['baseAI']['outputSha256']
        assert proof['cleanFactorSemanticsPreserved'] is True and proof['changedByShortcut'] == [5206]
        assert proof['valid'] is True and proof['compiled'] is True and proof['liveVerified'] is False
        shortcut_input = port['shortcutInputs'][pin['inputSha256']]
        assert shortcut_input['outputModuleHash'] == pin['outputSha256']
        assert shortcut_input['baseModuleHash'] == proof['forwardSha256']
    # The AA reviews describe the immutable ten-build candidate. Registry and
    # address metadata changed afterward; current strict pins and the review
    # above bind those additions to the final 52-file source.
    aa_lock = read(VERIFY / 'source-reviewed-v0386-final.json')
    review = read(ROOT / REQUIRED_REVIEWS[3])
    assert review['version'] == '0.38.6' and review['sourceHashes'] == aa_lock
    assert all(review[key] is True for key in (
        'sourceUnchanged', 'allNineOlderOutputsIdentical',
        'aaChangedOnlyFourOriginalBodiesAndOneAuthoredHelper', 'nativePaceWrapperRestored'))
    assert review['liveGameVerified'] is False and len(review['modules']) == 10
    shortcut = read(ROOT / REQUIRED_REVIEWS[4])
    assert shortcut['version'] == '0.38.6' and shortcut['sourceUnchanged'] is True
    assert shortcut['sourceHashes'] == aa_lock and shortcut['completeCandidateSha256'] == AA_PIN
    assert shortcut['caseCount'] >= 656
    repin = read(ROOT / REQUIRED_REVIEWS[5])
    assert repin['outputModuleHash'] == AA_PIN
    assert repin['baseModuleHash'] == shortcut['baseModuleSha256']
    assert repin['adapterHash'] == aa_lock['shortcut-policy.js']
    assert repin['changedFromTargetConsumerCandidate'] == [5206]
    assert repin['otherBodiesAndNoncodeSectionsPreserved'] is True and repin['liveVerified'] is False
    geometry = read(ROOT / REQUIRED_REVIEWS[6])
    assert geometry['helper'] == 'fwg_context' and geometry['functionIndex'] == 24259
    assert geometry['nativeBaseMinimum'] == 0 and geometry['nativeBaseMaximum'] == 4
    assert all(geometry[key] is True for key in (
        'finiteCheckPreserved', 'selectedPaceAcknowledgementAndLeaseChecksPreserved',
        'otherHelpersPreserved', 'nonAAProfilesPreserved'))
    assert geometry['afterSha256'] == 'b77099da356626122838e96ed0338bde5ea83ef2427dbbc1f245951a609f5b0c'
    return {name: digest(ROOT / name) for name in REQUIRED_REVIEWS}


def verify_tests_and_modules(lock, prior):
    suite = read(VERIFY / 'canonical-suite-v0386-current-final-result.json')
    files = read(VERIFY / 'final-suite-v0386-current-final-files.json')
    assert suite['version'] == '0.38.6' and suite['passed'] is True
    assert suite['sourceUnchanged'] is True and suite['testsUnchanged'] is True and suite['exitCode'] == 0
    assert suite['counts']['tests'] == suite['counts']['pass'] and suite['counts']['pass'] >= 2525
    assert all(suite['counts'][key] == 0 for key in ('fail', 'cancelled', 'skipped', 'todo'))
    assert len(prior['excludedFiles']) == 8 and suite['excludedFiles'] == prior['excludedFiles']
    excluded = {row['file'] for row in prior['excludedFiles']}
    assert set(files) == {p.name for p in (ROOT / 'tests').glob('*.test.cjs')} - excluded
    assert len(files) == len(set(files)) == suite['selectedFiles']
    assert 'catchup-consumer-forward-combined.test.cjs' in files
    assert set(read(VERIFY / 'final-suite-v0385-files.json')) <= set(files)
    test_paths = {'tests/' + name for name in files}
    test_paths.update(p.relative_to(ROOT).as_posix() for p in (ROOT / 'tests/fixtures').glob('*.cjs'))
    assert set(suite['testHashes']) == test_paths
    for name, expected in suite['testHashes'].items():
        assert digest(ROOT / name) == expected, 'Test changed after canonical execution: ' + name
    assert (VERIFY / 'final-suite-v0386-current-final.txt').stat().st_size > 0
    native = read(VERIFY / 'release-modules-v0386-current.json')
    assert native['version'] == '0.38.6' and native['sourceUnchanged'] is True
    assert native['sourceHashes'] == lock and native['liveGameTested'] is False
    assert native['passed'] is True and native['sourceFrozenToHarvest'] is True
    assert native['kind'] == 'strict 12-build complete output pins and authored native-scope proof'
    assert native['originalTenCompleteOutputsUnchanged'] is True and native['fullGameInstantiated'] is False
    assert native['physicsPrototypeIncluded'] is False
    assert native['verifierSha256'] == digest(ROOT / 'tools/verify-release-modules-v0386-current.cjs')
    harvest_path = VERIFY / 'release-modules-v0386-current-harvest.json'
    assert native['harvestSha256'] == digest(harvest_path)
    harvest = read(harvest_path)
    assert harvest['passed'] is True and harvest['sourceHashes'] == lock
    assert harvest['verifierSha256'] == native['verifierSha256'] and harvest['modules'] == native['modules']
    assert len(native['historicalArtifactsPreserved']) == 19
    for name, expected in native['historicalArtifactsPreserved'].items():
        assert digest(ROOT / name) == expected, 'Historical native receipt changed: ' + name
    old_modules = {row['revision']: row for row in prior['nativeModules']['modules']}
    aa_modules = {row['revision']: row for row in read(VERIFY / 'release-modules-v0386-final.json')['modules']}
    current = {row['revision']: row for row in native['modules']}
    assert len(native['modules']) == len(current) == 12 and len(old_modules) == len(aa_modules) == 10
    assert set(current) == set(old_modules) | set(CURRENT_PINS) and set(old_modules) == set(aa_modules)
    for revision, row in current.items():
        assert row['valid'] and row['compiled'] and row['otherNativeFunctionsPreserved']
        assert row['importsExportsDataAndTableUnchanged'] and row['exactAuthoredAppendVerified']
        if revision in CURRENT_PINS:
            assert row['unchangedFromFinalV0386'] is False
            assert all(row[key] == value for key, value in CURRENT_PINS[revision].items())
            assert row['appendedAuthoredHelpers'] == 26 and row['appendedPrivateGlobals'] == 581 and row['appendedTypes'] == 0
            assert row['shortcutProof'] is not None and row['forwardProof'] is not None
            if revision == '943ee537':
                assert row['nativeRelocationProof'] is not None
        else:
            assert row['unchangedFromFinalV0386'] is True
            assert row['outputSha256'] == aa_modules[revision]['outputSha256']
            assert row['outputBytes'] == aa_modules[revision]['outputBytes']
            assert row['changedFunctions'] == aa_modules[revision]['changedFunctions']
            if revision == 'aa2429fb':
                assert row['outputSha256'] == AA_PIN
                assert aa_modules[revision]['changedFromV0385'] == [5206, 13653, 13962, 21268, 24259]
            else:
                assert row['outputSha256'] == old_modules[revision]['outputSha256']
    return suite, files, native, checked_reviews(lock, native)


def prepare_support():
    """Select changed authored support files and reject pre-existing foreign edits.

    The delivered .5 support tree is the expected prior content. New .6 receipts
    and files may be absent; an existing different file is never silently taken
    over. This routine only reads; backup and synchronization occur in main.
    """
    proposed = support_inventory(ROOT)
    historical = support_inventory(BASELINE)
    before = support_inventory(PRODUCTION)
    paths = []
    for name, after in proposed.items():
        # Historical receipts are immutable. Only new .6 verification artifacts
        # are synchronized; trials remain available alongside the final run.
        if name.startswith('verification/') and 'v0386' not in Path(name).name:
            continue
        previous = before.get(name)
        if previous == after:
            continue
        assert previous is None or previous == historical.get(name), 'Concurrent or unreviewed support change: ' + name
        paths.append(name)
    return sorted(paths), proposed, before


def backup_support(paths, before):
    SUPPORT_BACKUP.mkdir()
    for name in paths:
        expected = before.get(name)
        if expected is not None:
            target = SUPPORT_BACKUP / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(PRODUCTION / name, target)
            assert digest(target) == expected, name
    write_new(SUPPORT_BACKUP / 'BACKUP-INVENTORY.json', {name: before.get(name) for name in paths})


def sync_support(paths, proposed, before):
    """Called only after every product and support backup has been verified."""
    assert support_inventory(PRODUCTION) == before, 'Concurrent support edit after backup'
    for name in paths:
        assert digest(ROOT / name) == proposed[name], 'Candidate support changed: ' + name
        target = PRODUCTION / name
        assert digest(target) == before.get(name), 'Concurrent support edit: ' + name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / name, target)
        assert digest(target) == proposed[name], name
    expected = dict(before)
    expected.update({name: proposed[name] for name in paths})
    assert support_inventory(PRODUCTION) == expected, 'Concurrent support change during synchronization'
    return {'version': '0.38.6', 'backup': str(SUPPORT_BACKUP),
            'before': {name: before.get(name) for name in paths},
            'after': {name: proposed[name] for name in paths}}


def main():
    for path in (ARCHIVE, BACKUP, SOURCE_BACKUP, SUPPORT_BACKUP):
        assert not path.exists() and not link(path), 'Preserve immutable artifact: ' + str(path)
    for name in ('package-v0386.json', 'release-summary-v0386.json', 'support-sync-v0386.json'):
        assert not (VERIFY / name).exists(), 'Delivery receipt already exists: ' + name
        assert not (PRODUCTION / 'verification' / name).exists(), 'Existing foreign delivery receipt: ' + name
    lock = read(VERIFY / 'source-reviewed-v0386-current-final.json')
    old_lock = read(PRODUCTION / 'verification/source-reviewed-v0385.json')
    prior = read(PRODUCTION / 'verification/release-summary-v0385.json')
    assert prior == read(VERIFY / 'release-summary-v0385.json')
    assert prior['version'] == '0.38.5' and len(old_lock) == 50
    assert inventory(BASELINE / 'extension') == old_lock, 'Delivered .5 baseline changed'
    assert inventory(PRODUCTION / 'extension') == old_lock, 'Concurrent Claude/source edit; review it before delivery'
    assert inventory(SOURCE) == lock and len(lock) == 52
    assert set(lock) - set(old_lock) == {'shortcut-policy.js', 'family-profiles.js'} and not set(old_lock) - set(lock)
    assert read(SOURCE / 'manifest.json')['version'] == '0.38.6'
    suite, files, native, reviews = verify_tests_and_modules(lock, prior)
    frozen_inputs = {name: digest(VERIFY / name) for name in (
        'source-reviewed-v0386-current-final.json', 'current-source-freeze-v0386.json',
        'canonical-suite-v0386-current-final-result.json', 'final-suite-v0386-current-final-files.json',
        'final-suite-v0386-current-final.txt', 'release-modules-v0386-current.json',
        'release-modules-v0386-current-harvest.json')}
    frozen_inputs.update({str(Path(name).relative_to('verification')): value for name, value in reviews.items()})
    desktop_before = inventory(DESKTOP)
    old_package = verify_package(DESKTOP)
    assert old_package['extension_version'] == '0.38.5' and len(desktop_before) == 52
    prior_archive = Path(prior['package']['archive'])
    assert prior['package']['sha256'] == V0385_ARCHIVE_PIN and digest(prior_archive) == V0385_ARCHIVE_PIN
    assert desktop_before == archive_inventory(prior_archive), 'Concurrent Claude/Desktop edit; review it before delivery'
    spec = importlib.util.spec_from_file_location('reviewed_packer_v0386', ROOT / 'tools/package-release.py')
    packer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(packer)
    version, expected = packer.collect(SOURCE, 'desktop-folder')
    assert version == '0.38.6' and len(expected) == 54
    assert set(expected) - set(desktop_before) == {'shortcut-policy.js', 'family-profiles.js'}
    assert not set(desktop_before) - set(expected)
    assert not any(Path(name).suffix.lower() in ('.wasm', '.wat', '.exe', '.bin', '.mus', '.mpf') for name in expected)
    paths, proposed_support, support_before = prepare_support()
    BACKUP.mkdir()
    SOURCE_BACKUP.mkdir()
    for file in DESKTOP.iterdir():
        shutil.copy2(file, BACKUP / file.name)
    for file in (PRODUCTION / 'extension').iterdir():
        shutil.copy2(file, SOURCE_BACKUP / file.name)
    backup_support(paths, support_before)
    assert inventory(BACKUP) == desktop_before and inventory(SOURCE_BACKUP) == old_lock
    assert inventory(DESKTOP) == desktop_before and inventory(PRODUCTION / 'extension') == old_lock
    assert support_inventory(PRODUCTION) == support_before, 'Concurrent support edit during backup'
    assert inventory(SOURCE) == lock, 'Reviewed product changed after validation'
    package = packer.package(SOURCE, ARCHIVE, 'desktop-folder')
    assert archive_inventory(ARCHIVE) == {name: sha(data) for name, data in expected.items()}
    for name, expected_hash in frozen_inputs.items():
        assert digest(VERIFY / name) == expected_hash, 'Review or test receipt changed: ' + name
    for name, expected_hash in suite['testHashes'].items():
        assert digest(ROOT / name) == expected_hash, 'Test changed before delivery: ' + name
    assert inventory(DESKTOP) == desktop_before and inventory(PRODUCTION / 'extension') == old_lock
    for name in sorted(lock):
        target = PRODUCTION / 'extension' / name
        assert digest(target) == old_lock.get(name), 'Concurrent source edit: ' + name
        shutil.copy2(SOURCE / name, target)
        assert digest(target) == lock[name], name
    for name, data in sorted(expected.items()):
        target = DESKTOP / name
        assert digest(target) == desktop_before.get(name), 'Concurrent Desktop edit: ' + name
        target.write_bytes(data)
        assert digest(target) == sha(data), name
    assert inventory(PRODUCTION / 'extension') == lock and inventory(SOURCE) == lock
    assert inventory(DESKTOP) == {name: sha(data) for name, data in expected.items()}
    current = verify_package(DESKTOP)
    assert current['extension_version'] == '0.38.6' and len(current['files']) == 53
    support = sync_support(paths, proposed_support, support_before)
    receipt = {'version': '0.38.6', 'desktop': str(DESKTOP), 'archive': str(ARCHIVE),
               'sha256': package['sha256'], 'backup': str(BACKUP), 'sourceBackup': str(SOURCE_BACKUP),
               'supportBackup': str(SUPPORT_BACKUP), 'sourceFiles': 52, 'desktopFiles': 54,
               'receiptFilesVerified': 53, 'replacedDesktopVersion': '0.38.5',
               'replacedSourceVersion': '0.38.5', 'liveReloadVerified': False,
               'userReloadRequired': True, 'racingBehaviorChanged': True,
               'newProductFiles': ['family-profiles.js', 'shortcut-policy.js'], 'aaOutputSha256': AA_PIN,
               'newExactBuildOutputPins': {revision: pin['outputSha256'] for revision, pin in CURRENT_PINS.items()}}
    summary = {'version': '0.38.6', 'date': '2026-11-10', 'checkedAt': datetime.now(timezone.utc).isoformat(),
               'selectedFiles': len(files), 'passed': suite['counts']['pass'], 'failed': 0,
               'skipped': 0, 'cancelled': 0, 'allTestFilesPassed': False,
               'excludedFiles': suite['excludedFiles'], 'log': 'final-suite-v0386-current-final.txt',
               'fileList': 'final-suite-v0386-current-final-files.json', 'sourceLock': 'source-reviewed-v0386-current-final.json',
               'nativeModules': native, 'package': receipt, 'reviews': reviews,
               'racingBehaviorChanged': True, 'nativeOutputsUnchangedFromV0385': 9,
               'nativeOutputsUnchangedFromAAFinalV0386': 10, 'newExactBuildProfiles': sorted(CURRENT_PINS),
               'limits': ['Offline exact-native and controlled fixtures; live driving has not been verified.',
                          'Native cached-factor feedback is prevented by stack-only target pacing; no permanent grip boost is enabled.',
                          'Street X, free roam, shortcuts and online results still require live driving verification.',
                          'The existing eight historical fixture exclusions remain explicit; not every test file was run.',
                          'This release does not establish unattended streaming autonomy.']}
    for name, value in (('support-sync-v0386.json', support), ('package-v0386.json', receipt),
                        ('release-summary-v0386.json', summary)):
        write_new(VERIFY / name, value)
        target = PRODUCTION / 'verification' / name
        assert not target.exists(), str(target)
        shutil.copy2(VERIFY / name, target)
        assert digest(target) == digest(VERIFY / name)
    assert digest(prior_archive) == V0385_ARCHIVE_PIN
    assert inventory(BACKUP) == desktop_before and inventory(SOURCE_BACKUP) == old_lock
    assert inventory(PRODUCTION / 'extension') == lock
    assert inventory(DESKTOP) == archive_inventory(ARCHIVE)
    print(json.dumps({'package': receipt, 'tests': suite['counts'], 'selectedFiles': len(files),
                      'supportFilesSynchronized': len(paths)}, indent=2))


if __name__ == '__main__':
    main()
