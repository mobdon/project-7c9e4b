from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
file = root / 'extension/manifest.json'
manifest = json.loads(file.read_text(encoding='utf-8'))
scripts = manifest['content_scripts'][0]['js']
assert 'family-profiles.js' not in scripts
scripts.insert(scripts.index('aa-profile.js') + 1, 'family-profiles.js')
file.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8', newline='\n')

old = "'a220e667d38c0a6509c1507ad3ca9c6fddeb2220b429bf28707d7ca8cbbc42c8'"
new = old + ",'f88fc7a0fe3082e20814f705635410d046fcdfe053eb70d65c49dec7583105b9','c000f8f9002762f4274f173c81678772c456b1a696f3b69751fc6e91118fe391'"
for name in ['forward-geometry.js', 'forward-pacing.js']:
    file = root / 'extension' / name
    text = file.read_text(encoding='utf-8')
    assert text.count(old) == 1
    file.write_text(text.replace(old, new), encoding='utf-8', newline='\n')

file = root / 'tests/package-release.test.cjs'
text = file.read_text(encoding='utf-8')
text = text.replace("'aa-profile.js','race-capture-config.js'", "'aa-profile.js','family-profiles.js','race-capture-config.js'")
file.write_text(text, encoding='utf-8', newline='\n')

file = root / 'tests/fixtures/forward-native-world.cjs'
text = file.read_text(encoding='utf-8')
anchor = "'aa2429fb':'research/compatibility-aa2429fb/game.wasm'"
assert text.count(anchor) == 1
text = text.replace(anchor, anchor + ",\n '15e5958f':'research/compatibility-15e5958f/game.wasm',\n '943ee537':'research/compatibility-943ee537/game.wasm'")
file.write_text(text, encoding='utf-8', newline='\n')

file = root / 'extension/README.md'
text = file.read_text(encoding='utf-8')
text = text.replace('On exact game build aa2429fb,', 'On exact game builds aa2429fb, 15e5958f and 943ee537,')
text = text.replace('on aa2429fb.', 'on aa2429fb, 15e5958f and 943ee537.')
text = text.replace('9 and aa2429fb. Unknown', '9, aa2429fb, 15e5958f and 943ee537. Unknown')
text = text.replace('Corrects two folded native evaluator guard cells', 'Corrects two folded native evaluator guard cells')
text = text.replace('A separate always-on catch-up physics assist', 'The two newer builds have explicit native mapping and host-address witnesses; unreviewed builds still refuse memory tools. A separate always-on catch-up physics assist')
file.write_text(text, encoding='utf-8', newline='\n')

file = root / 'integration/run-suite-v0386-current.cjs'
text = (root / 'integration/run-suite-v0386.cjs').read_text(encoding='utf-8').replace("tag='v0386-final'", "tag='v0386-current'")
file.write_text(text, encoding='utf-8', newline='\n')
