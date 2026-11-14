# Public reference exports

Read `00-START-HERE.txt` and `01-CURRENT-HANDOFF.txt` first. The complete current extension source is in `NFSU2-EXTENSION-0.42.8-COMPLETE.txt`.

The sanitized archive text represents78 included archives. Eight actual save archives and two gameISO archives are explicitly excluded; their contents and associated save/settings/registry text objects are absent.

`BINARY-PAYLOADS-INDEX.txt` maps399 archived binary entries, the original current native fixture, and9 additional harness dependencies to SHA256-named payload files. `ADDITIONAL-HARNESS-DEPENDENCIES.json` gives each added file's exact original workspace path, intended repository destination, byte length and SHA256. The additions include the source/composed4cWASM modules, SPEED2.EXE, the three default Retail.seed tables and generated road inputs plus their exact receipt.

Restore a required file by copying the payload bytes to its `repositoryTarget` without conversion. The raw live game module is source/regeneration evidence; the current harness reads the composed candidate and prebuilt fixture separately. The receiptJSON is stored as exact bytes in the payload map too.

Existing readable text parts and their original-byte reconstruction hashes are unchanged by these dependency additions. This map does not claim complete runtime closure or grant permission to rerun frozen native conditions. No native/game/extension code was executed during export preparation or verification.

The limited credential-pattern review found only three header-label assertions in a historical TLS test; no unresolved matches were found in the78 original includedZIPs or the9 added dependency files. That check is not an exhaustive secret audit.
