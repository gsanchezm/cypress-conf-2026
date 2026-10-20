# Slide deck source

The published slide deck is [docs/index.html](../../docs/index.html), a self-contained Design export. Its HTML template is embedded as a JSON string beside a manifest of images, scripts, and fonts. Editing the giant bundled line by hand is error-prone.

`deck-base.html` is the readable template from the original 27-slide export. [build.py](build.py) reorders and rewrites sections, embeds architecture diagrams from `presentation/architecture/`, and replaces only the bundled template string. The original manifest remains byte-for-byte unchanged. The build produces 37 slides and [deck-preview.html](deck-preview.html) for content inspection.

Run from the repository root after editing the build script or the architecture SVGs:

```powershell
python presentation/deck/build.py
```

To render selected new slides for a visual review:

```powershell
python presentation/deck/preview.py "Six-Level Case Ladder" "CI and Reporting"
```

The preview images are written to `presentation/deck/previews/`. This uses local Chrome. The preview strips the deck viewer so each section can be checked at 1920 × 1080; `docs/index.html` should also be opened once to check that the full bundled viewer loads.

The Agenda and Live Demo Route slides show the sequence without timing estimates. The `cy.prompt` material is inside the live demo. Speaker notes remain in Spanish and slide labels in English. The Archify agent diagram separates skills, shared roles and host-specific hooks, the deterministic Cypress runner, and optional runtime `cy.prompt`.

Current behavior and proposed work are separated throughout the deck. In particular, TestRail result writing exists, but a pre-run `get_case` reader does not. The Cloud run is verified, but the CLI still needs separate authentication. The current deterministic triage workflow does not yet enforce the proposed strict product-bug issue gate.
