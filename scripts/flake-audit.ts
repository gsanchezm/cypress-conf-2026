// pnpm flake-audit [file]   (reads stdin when no file is given)
// Input: a `cy-cloud test list ...` JSON document. Output: FlakeReport JSON
// (flaky = status passed && attempts > 1, the Cloud docs' own definition).
// Never calls the Cloud itself - feed it a saved document or pipe cy-cloud
// into it:  cy-cloud test list --projectId 5v45hh --runNumber 42 | pnpm flake-audit
import { readFileSync } from 'node:fs';
import { parseCloudTestList, summariseFlakes } from '../src/core/cloud/flakeAudit';

const [file] = process.argv.slice(2);

try {
  const json = readFileSync(file ?? 0, 'utf8');
  process.stdout.write(`${JSON.stringify(summariseFlakes(parseCloudTestList(json)), null, 2)}\n`);
} catch (error) {
  process.stderr.write(`flake-audit: ${(error as Error).message}\n`);
  process.exit(1);
}
