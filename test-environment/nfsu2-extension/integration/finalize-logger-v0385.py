from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'tests/package-release.test.cjs'
text=p.read_text();assert text.count(r'0\.38\.4')==4
p.write_text(text.replace(r'0\.38\.4',r'0\.38\.5'),encoding='utf-8',newline='\n')
p=ROOT/'extension/README.md'
p.write_text(p.read_text(encoding='utf-8'),encoding='utf-8',newline='\n')
p=ROOT/'extension/page.js'
text=p.read_text(encoding='utf-8')
old="${status.events} recent events · ${status.persistence==='same-tab'?'kept across reloads in this tab':'memory only; storage unavailable'}"
assert text.count(old)==1
new="${status.events} recent events · ${status.traceSamples||0} driving trace samples · ${status.persistence==='same-tab'?'kept across reloads in this tab':'memory only; storage unavailable'}"
p.write_text(text.replace(old,new),encoding='utf-8',newline='\n')
print('Finalized current version assertions, source README line endings and trace count display.')
