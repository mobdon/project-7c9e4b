OFFLINE REPORT LAB

Run from this folder with Node.js (verified with v26.13.0):

  node lab.cjs

To also execute the original isolated encoder on the captured synthetic reports:

  node lab.cjs --encode

No package installation is needed. Open the index.html path printed by the command.
Each run creates a new directory under runs, with report.json and captures/*.bin.
The HTML and JSON label pre-encoding inputs and encoded outputs separately.
To choose a new or empty output directory:

  node lab.cjs --out runs/my-inspection --json

Run verification:

  node --test --test-concurrency=1 test/*.test.cjs

WHAT EXECUTES

The native cases instantiate eight small isolated helper bodies copied from the
reviewed 60946132 module. Frame observations, the selected record descriptor,
context pointers and session data are controlled fixtures. The complete game
does not load or run. Original native envelope builders call a local recorder
at their encoder-input boundary. This boundary returns zero, so the downstream
sender never runs. Those captures are native input structures before encoding.

With --encode, two captured synthetic inputs are separately replayed through
the original isolated f22860 encoder, with its seven actual leaf helpers linked. The
encoder has no transport implementation. Its returned bytes are saved locally;
an independent checksum check and short-buffer cases inspect the result and
capacity handling. This executes selected serialization paths, not every
message schema, the full client or an actual online report exchange.

The page-check cases use pinned source in an isolated VM. They compare clean
APIs with the actual extension startup wrapper. A separate minimal-module case
demonstrates explicit local loading without replacing browser APIs. That case
does not establish compatibility of a full patched game.

NETWORK BOUNDARY

The CLI blocks common networking, subprocess and worker APIs in its own Node
process. Native fixtures have exact import allowlists; the page-check VM has
no network or process capability. The local HTML viewer has no scripts and a
Content Security Policy that blocks connections and external assets. No HTTP
server is needed. This is not an OS firewall or a general untrusted-code sandbox.

Fixtures and provenance are bundled and hash-pinned. No official-site requests,
accounts, browser sessions, external services or installed-extension changes
are part of a run. Historical reports and private server decisions are absent.
A clean controlled case does not prove multiplayer safety.

CONTINUING THE OFFLINE WORK

lib/local-loader.cjs is the shared entry point. It accepts local bytes and a
complete expected SHA-256, checks the source, applies explicitly supplied patch
steps, checks every step's expected input/output hash, then compiles directly.
It does not fetch files, intercept browser APIs, supply imports, instantiate a
game or start an entry point. Each caller must provide its own bounded imports
and decide whether to instantiate its verified isolated module.

To adapt an existing pure patcher, provide a transform record:

  {
    name: 'Reviewed offline patch',
    inputSha256: VERIFIED_INPUT_HASH,
    outputSha256: VERIFIED_OUTPUT_HASH,
    apply: bytes => existingPatcher(bytes)
  }

The current native fixtures already use the shared loader. Future work can add
one reviewed patch/controller integration at a time and compare its observations
with the clean baseline, while retaining the reporting checks and local capture.
This does not implement a complete playable offline client. Matching assets,
host/worker ABIs, rendering, audio, input and saves still require integration.
