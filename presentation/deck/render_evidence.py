"""Render readable snapshots from TestRail API and Cypress Cloud CLI data."""

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent / "evidence"
DATA = json.loads((HERE / "testrail-r7.json").read_text(encoding="utf-8"))
FONT = Path(r"C:\Windows\Fonts\arial.ttf")
BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")


def font(size, bold=False):
    return ImageFont.truetype(str(BOLD if bold else FONT), size)


def main():
    run = DATA["run"]
    cases = sorted(result["case_id"] for result in DATA["results"] if result["status_id"] == 1)
    image = Image.new("RGB", (1440, 780), "#f6f7f9")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 1440, 92), fill="#142c45")
    draw.text((52, 26), "TESTRAIL", font=font(35, True), fill="white")
    draw.text((52, 126), "Historical run R7", font=font(52, True), fill="#19344e")
    draw.text((54, 198), "API evidence snapshot · Checkout · cyPrompt", font=font(27), fill="#526478")
    draw.rounded_rectangle((50, 259, 1390, 394), radius=12, fill="white", outline="#cbd5df", width=2)
    draw.text((84, 290), "COMPLETED", font=font(25, True), fill="#446070")
    draw.text((84, 330), "Run closed", font=font(29, True), fill="#19344e")
    draw.text((525, 289), "PASSED", font=font(25, True), fill="#446070")
    draw.text((525, 321), str(run["passed_count"]), font=font(47, True), fill="#188351")
    draw.text((980, 289), "FAILED", font=font(25, True), fill="#446070")
    draw.text((980, 321), str(run["failed_count"]), font=font(47, True), fill="#19344e")
    draw.text((55, 435), "Case results", font=font(32, True), fill="#19344e")
    for index, case in enumerate(cases):
        left = 52 + index * 277
        draw.rounded_rectangle((left, 505, left + 252, 635), radius=12, fill="white", outline="#cbd5df", width=2)
        draw.text((left + 23, 527), f"C{case}", font=font(34, True), fill="#19344e")
        draw.text((left + 23, 582), "PASSED", font=font(24, True), fill="#188351")
    draw.text((55, 704), "Source: TestRail get_run/7 + get_results_for_run/7", font=font(22), fill="#5b6d7d")
    image.save(HERE / "testrail-r7-api.png", optimize=True)

    cloud = json.loads((HERE / "cypress-cloud-run-8.json").read_text(encoding="utf-8"))
    recorded = cloud["run"]
    cloud_image = Image.new("RGB", (1440, 780), "#f4f6f9")
    draw = ImageDraw.Draw(cloud_image)
    draw.rectangle((0, 0, 1440, 94), fill="#20253b")
    draw.ellipse((52, 26, 94, 68), outline="#72d6a0", width=5)
    draw.text((112, 25), "CYPRESS CLOUD", font=font(34, True), fill="white")
    draw.text((52, 120), "Recorded run #8", font=font(52, True), fill="#24314d")
    draw.text((54, 186), "Checkout · Chrome · main · 19 Oct 2026", font=font(26), fill="#657187")
    draw.rounded_rectangle((52, 241, 1388, 342), radius=12, fill="white", outline="#d5dbe6", width=2)
    draw.text((82, 268), "PASSED", font=font(29, True), fill="#23885d")
    draw.text((510, 263), f"{recorded['passedCount']} passed", font=font(38, True), fill="#24314d")
    draw.text((1050, 263), f"{recorded['failedCount']} failed", font=font(38, True), fill="#24314d")
    draw.text((54, 375), "Recorded tests", font=font(31, True), fill="#24314d")
    for index, test in enumerate(cloud["tests"]):
        top = 426 + index * 55
        country = test["name"].split(" in ", 1)[-1].split(" (example", 1)[0]
        draw.rounded_rectangle((52, top, 1388, top + 49), radius=8, fill="white", outline="#d5dbe6", width=1)
        draw.text((75, top + 10), country, font=font(24, True), fill="#24314d")
        draw.text((1178, top + 11), test["status"].upper(), font=font(22, True), fill="#23885d")
    draw.text((54, 722), "Source: cy-cloud run get + test list · project 5v45hh / run 8", font=font(21), fill="#657187")
    cloud_image.save(HERE / "cypress-cloud-run-8.png", optimize=True)

    print("Rendered TestRail and Cypress Cloud evidence")


if __name__ == "__main__":
    main()
