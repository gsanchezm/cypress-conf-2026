"""Render selected bundled slide sections as local PNGs for layout review."""

import re
import subprocess
import sys
from pathlib import Path


HERE = Path(__file__).resolve().parent
SLIDES = HERE / "deck-preview.html"
OUT = HERE / "previews"
OUT.mkdir(exist_ok=True)
SECTION = re.compile(r'<section data-label="([^"]+)"[^>]*>.*?</section>', re.S)
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")


def main(labels):
    source = SLIDES.read_text(encoding="utf-8")
    sections = {m.group(1): m.group(0) for m in SECTION.finditer(source)}
    variables = re.search(r":root \{[^}]+\}", source).group(0)
    for label in labels:
        if label not in sections:
            raise KeyError(label)
        safe = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")
        page = OUT / f"{safe}.html"
        image = OUT / f"{safe}.png"
        page.write_text(
            "<!doctype html><html><head><meta charset='utf-8'><style>"
            + variables
            + "body{margin:0;background:var(--bg)}section{width:1920px;height:1080px;overflow:hidden}"
            + "</style></head><body>"
            + sections[label]
            + "</body></html>",
            encoding="utf-8",
        )
        subprocess.run(
            [str(CHROME), "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1920,1080", f"--screenshot={image}", page.as_uri()],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True,
        )
        print(image)


if __name__ == "__main__":
    main(sys.argv[1:] or ["Agenda", "Six-Level Case Ladder", "Official Skills", "Subagents and Graphify", "Prompts as Markdown", "TestRail Bulk Reporting", "CI and Reporting"])
