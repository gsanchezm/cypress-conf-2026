// pnpm triage:signals [files...]   (reads stdin when no file is given)
// Input: any failure text - a CI job log, a mochawesome message, a saved
// `pnpm tap reporter` output. Output: { suggested, signals } - the
// deterministic hint handed to cy-triage and to the CI triage workflow.
import { readFileSync } from 'node:fs';
import { classifyFailureSignals, suggestCategory } from '../src/core/triage/classifyFailureSignals';

const files = process.argv.slice(2);

const readAll = (): string =>
  files.length === 0 ? readFileSync(0, 'utf8') : files.map((file) => readFileSync(file, 'utf8')).join('\n');

try {
  const signals = classifyFailureSignals(readAll());
  process.stdout.write(`${JSON.stringify({ suggested: suggestCategory(signals), signals }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`triage-signals: ${(error as Error).message}\n`);
  process.exit(1);
}
