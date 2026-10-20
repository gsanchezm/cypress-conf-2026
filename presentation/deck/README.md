# Slide deck source

The published slide deck is [docs/index.html](../../docs/index.html), a self-contained Design export. Its HTML template is embedded as a JSON string beside a manifest of images, scripts, and fonts. Editing the giant bundled line by hand is error-prone.

`deck-base.html` is the readable template from the original 27-slide export. [build.py](build.py) reorders and rewrites sections, embeds architecture diagrams from `presentation/architecture/`, and replaces only the bundled template string. The original manifest remains byte-for-byte unchanged. The build produces 39 slides and [deck-preview.html](deck-preview.html) for content inspection. The opening video is a separate file at `docs/media/opening.mp4`, so keep it beside the published HTML. Use the always-visible Play with sound and Restart buttons on the opening slide.

Run from the repository root after editing the build script or the architecture SVGs:

```powershell
python presentation/deck/build.py
```

To render selected new slides for a visual review:

```powershell
python presentation/deck/preview.py "Six-Level Case Ladder" "CI and Reporting"
```

The preview images are written to `presentation/deck/previews/`. This uses local Chrome. The preview strips the deck viewer so each section can be checked at 1920 × 1080; `docs/index.html` should also be opened once to check that the full bundled viewer loads.

The Agenda and Live Demo Route slides show the sequence without timing estimates. The `cy.prompt` material is inside the live demo. The deck viewer shows English notes for all 39 slides. Expanded speaker guides are local files excluded from the repository. When the local English guide exists, the build copies each **Say** line into the bundled note; for the opening video and Claude Code demo slides it also appends the **Do** stage cue. Otherwise it preserves the published notes. Slide labels are in English. The Archify agent diagram separates skills, shared roles and host-specific hooks, the deterministic Cypress runner, and optional runtime `cy.prompt`.

For the Claude Code guided C9 sequence, use the [live-demo prompts](claude-code-demo.md) alongside slides 25–26, 30, and 32. Cloud runs 9 and 10 and TestRail runs R8 and R9 are prepared evidence; the on-stage red and fallback runs are local and sequential.

The Cloud slide embeds an actual Cypress Cloud Runs page screenshot supplied by the owner (`evidence/cypress-cloud-runs-ui.png`). The cy.prompt and backup slides use a clearly labeled image generated from real Cypress Cloud CLI results for [run 8](https://cloud.cypress.io/projects/5v45hh/runs/8); refresh its source with `python presentation/deck/fetch_cloud_evidence.py`. TestRail R7 is likewise a labeled API snapshot generated from `evidence/testrail-r7.json`, not a TestRail web UI screenshot. Refresh it with `python presentation/deck/fetch_testrail_evidence.py` when local TestRail credentials are available. Regenerate the API images with `python presentation/deck/render_evidence.py` before rebuilding the deck.

Current behavior and proposed work are separated throughout the deck. In particular, TestRail result writing exists, but a pre-run `get_case` reader does not. The Cloud CLI is authenticated and run listing was verified on October 19, 2026. MCP servers are configured in `.mcp.json`, but this verification did not exercise a Cypress MCP tool through an agent host; CLI authentication is separate from MCP authentication. The current deterministic triage workflow does not yet enforce the proposed strict product-bug issue gate.
