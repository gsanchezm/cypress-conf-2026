"""Save a credential-free Cypress Cloud CLI snapshot of recorded run 8."""

import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).with_name("evidence") / "cypress-cloud-run-8.json"


def query(*args):
    completed = subprocess.run(
        ["pnpm", "exec", "cy-cloud", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(completed.stdout)


def main():
    run = query("run", "get", "--projectId", "5v45hh", "--runNumber", "8")
    tests = query("test", "list", "--projectId", "5v45hh", "--runNumber", "8")
    snapshot = {
        "source": "Cypress Cloud CLI, historical project 5v45hh run 8",
        "url": "https://cloud.cypress.io/projects/5v45hh/runs/8",
        "run": {key: run.get(key) for key in ("runNumber", "branch", "createdAt", "completedAt", "status", "passedCount", "failedCount", "pendingCount", "skippedCount", "flakyCount")},
        "tests": [
            {"name": test["testName"][-1], "status": test["status"], "browser": test["browserName"]}
            for test in tests["tests"]
        ],
    }
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")
    print(f"Saved Cypress Cloud run {run['runNumber']}: {len(snapshot['tests'])} tests")


if __name__ == "__main__":
    main()
