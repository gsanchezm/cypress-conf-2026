"""Export the checked Archify agent diagram as a clean slide PNG.

The HTML remains the interactive source. This script extracts its native SVG
with bundled styles, then asks local Chrome or Edge to render a 16:9 image.
"""

import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / ".archify/architecture-agent-workflow-20261019/agent-workflow.html"
OUTPUT = ROOT / "presentation/architecture/06-agent-workflow-archify.png"
WRAPPER = ROOT / "presentation/deck/previews/agent-archify-export.html"
BROWSERS = [
    Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
]


def main():
    source = SOURCE.read_text(encoding="utf-8")
    start = source.index("<svg ")
    end = source.index("</svg>", start) + len("</svg>")
    svg = source[start:end].replace("<svg ", '<svg style="width:1500px;height:auto;max-height:850px" ', 1)
    styles = "\n".join(re.findall(r"<style[^>]*>.*?</style>", source[:start], re.S))
    WRAPPER.parent.mkdir(parents=True, exist_ok=True)
    WRAPPER.write_text(
        '<!doctype html><html data-theme="dark" data-preset="classic"><head><meta charset="utf-8">'
        + styles
        + '</head><body style="margin:0;background:#080e1d;display:flex;justify-content:center;align-items:center;height:100vh">'
        + svg
        + "</body></html>",
        encoding="utf-8",
    )
    browser = next((path for path in BROWSERS if path.exists()), None)
    if browser is None:
        raise RuntimeError("Chrome or Edge is required for the PNG export")
    subprocess.run(
        [str(browser), "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1600,900", f"--screenshot={OUTPUT}", WRAPPER.as_uri()],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    if not OUTPUT.is_file():
        raise RuntimeError("Archify PNG export did not create an image")
    print(OUTPUT)


if __name__ == "__main__":
    main()
