"""Save a small, credential-free snapshot of the historical TestRail run."""

import json
from pathlib import Path

import requests


ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).with_name("evidence") / "testrail-r7.json"


def main():
    values = {}
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            values[key] = value.strip().strip('"')

    session = requests.Session()
    session.auth = (values["TESTRAIL_USER"], values["TESTRAIL_API_KEY"])
    base = values["TESTRAIL_URL"].rstrip("/") + "/index.php?/api/v2/"

    run_response = session.get(base + "get_run/7", timeout=20)
    run_response.raise_for_status()
    result_response = session.get(base + "get_results_for_run/7", timeout=20)
    result_response.raise_for_status()
    run = run_response.json()
    results = result_response.json()
    if isinstance(results, dict):
        results = results["results"]

    snapshot = {
        "source": "TestRail API, historical run R7",
        "run": {key: run.get(key) for key in ("id", "name", "is_completed", "passed_count", "failed_count", "blocked_count", "untested_count")},
        "results": [{"case_id": result.get("case_id"), "status_id": result.get("status_id")} for result in results],
    }
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")
    print(f"Saved R{snapshot['run']['id']}: {len(snapshot['results'])} results")


if __name__ == "__main__":
    main()
