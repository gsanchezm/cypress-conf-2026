// pnpm triage:verdict [files...] (stdin when no files are given).
// Produces a provider-neutral JSON verdict from failed job logs.
import { readFileSync } from 'node:fs';
import { buildTriageVerdict } from '../src/core/triage/buildTriageVerdict';

try {
  const files = process.argv.slice(2);
  const log = files.length ? files.map((file) => readFileSync(file, 'utf8')).join('\n') : readFileSync(0, 'utf8');
  process.stdout.write(`${JSON.stringify(buildTriageVerdict(log), null, 2)}\n`);
} catch (error) {
  process.stderr.write(`triage-verdict: ${(error as Error).message}\n`);
  process.exitCode = 1;
}
