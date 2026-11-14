from pathlib import Path

file = Path(__file__).resolve().parents[1] / 'extension/README.md'
text = file.read_text(encoding='utf-8')
end = text.index('## Racing and cornering')
intro = '''# NFSU2 Driving Tools: experimental v0.38.6

On exact game build aa2429fb, selected pace now scales the native speed factor when the racing AI consumes it. It leaves the native driver cache and vehicle catch-up factor untouched. The previous wrapper could multiply its own cached result again before the game's next refresh; actual native fixtures reproduced 1.95 → 3.80 → 7.41. This correction removes that authored cache mutation. Native corner/behavior limits and the optional forward target can still lower the resulting target. Street X uses its existing native tables and corner controls; it receives the cache correction without the ordinary-road shortcut policy.

Adaptive road-race speed also enables a targeted experimental shortcut-choice policy on aa2429fb. The car's raw player skill marker254/signed−2 stays intact. Only the eligible owned Race action's branch-choice check consumes skill9 instead. Native graph, category, probability, direction, event and checkpoint rules stay in control. It does not force every shortcut, replace pathfinding, or prove that a real shortcut completes correctly. Drag, Drift and Street X remain excluded from that branch policy. Stop prevents further authored branch-choice substitutions; an already cached native decision can persist until the game replaces it.

The 250 ms local driving trace retains separate requested/applied pace, current native driver and car catch-up factors, target/control values, corner-record coverage and planner evidence. The new factor readings are bounded read-only observations. Shortcut installed/requested flags are not branch-use receipts. Previous v0.38.5 trace rows survive a same-tab upgrade with nulls for the new fields. Samples, offline native tests and compiled output checks are distinct from live-game verification.

This update retains the game's existing catch-up physics. A separate always-on catch-up physics assist remains a private default-off prototype and is not included. There is no claim of perfect grip, automatic wins or live collision-free driving. It is not ready for unattended streaming autonomy.

'''
text = intro + text[end:]
text = text.replace('- Street X, Drag AI and engine protection keep their existing mode behavior. No global skill-sentinel overwrite, new steering controller, lobby creation or opponent manipulation is included.', '- Existing Street X corner formulas, Drag AI and engine protection remain. The AA pacing correction changes speed-factor composition without changing the native cache or adding a steering controller. No global skill-sentinel overwrite, lobby creation or opponent manipulation is included.')
text = text.replace('Native shortcut route selection remains under investigation, with checkpoint legality required before any route-choice change.', 'The optional native shortcut-choice policy requires live route/checkpoint testing; it retains existing native eligibility and does not force a link.')
file.write_text(text, encoding='utf-8', newline='\n')
