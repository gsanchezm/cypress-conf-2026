import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AstBuilder, GherkinClassicTokenMatcher, Parser } from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';
import { parseCaseMap } from '../../src/core/reporting/testrail/caseMap';

const sourceDir = 'cypress/e2e';
const outputDir = 'testrail/bdd';
const slices = ['auth', 'catalog', 'checkout'];
const check = process.argv.includes('--check');

function caseId(tags: readonly { name: string }[]): number {
  const matches = tags.map((tag) => /^@C(\d+)$/.exec(tag.name)?.[1]).filter((id): id is string => id !== undefined);
  if (matches.length !== 1) throw new Error(`Expected one @C tag, found ${matches.length}`);
  return Number(matches[0]);
}

function stepLines(steps: readonly { keyword: string; text: string }[]): string[] {
  return steps.map((step) => `    ${step.keyword}${step.text}`);
}

function tableLine(cells: readonly { value: string }[]): string {
  return `      | ${cells.map((cell) => cell.value).join(' | ')} |`;
}

function addCase(outputs: Map<number, string>, id: number, content: string): void {
  if (outputs.has(id)) throw new Error(`Duplicate TestRail case C${id}`);
  outputs.set(id, content);
}

async function main(): Promise<void> {
  const outputs = new Map<number, string>();
  for (const slice of slices) {
    const source = await readFile(join(sourceDir, slice, `${slice}.feature`), 'utf8');
    const parser = new Parser(new AstBuilder(IdGenerator.incrementing()), new GherkinClassicTokenMatcher());
    const feature = parser.parse(source).feature;
    if (!feature) throw new Error(`${slice}: missing Feature`);
    for (const child of feature.children) {
      const scenario = child.scenario;
      if (!scenario) throw new Error(`${slice}: unsupported Rule or Background`);
      const id = caseId(scenario.tags);
      const lines = [`Feature: ${feature.name}`, '', `  @C${id}`, `  ${scenario.keyword}: ${scenario.name}`, ...stepLines(scenario.steps)];
      for (const example of scenario.examples) {
        if (!example.tableHeader) throw new Error(`C${id}: missing Examples header`);
        lines.push(
          '',
          `    ${example.keyword}: ${example.name}`,
          tableLine(example.tableHeader.cells),
          ...example.tableBody.map((row) => tableLine(row.cells)),
        );
      }
      addCase(outputs, id, `${lines.join('\n')}\n`);
    }
  }

  if (outputs.size !== 4) throw new Error(`Expected 4 TestRail cases, found ${outputs.size}`);
  await mkdir(outputDir, { recursive: true });
  const existing = (await readdir(outputDir)).filter((name) => /^C\d+\.feature$/.test(name));
  for (const name of existing) {
    if (!outputs.has(Number(name.slice(1, -8)))) {
      if (check) throw new Error(`Stale output: ${name}`);
      await unlink(join(outputDir, name));
    }
  }
  for (const [id, content] of [...outputs].sort(([a], [b]) => a - b)) {
    const name = `C${id}.feature`;
    const mapping = parseCaseMap(content, join(outputDir, name));
    if (mapping.size !== (id === 3 || id === 8 ? 5 : 1) || [...mapping.values()].some((mappedId) => mappedId !== id)) {
      throw new Error(`${name}: invalid case mapping`);
    }
    const path = join(outputDir, name);
    if (check) {
      const actual = await readFile(path, 'utf8');
      if (actual !== content) throw new Error(`${path} differs from source .feature`);
    } else {
      await writeFile(path, content);
    }
  }
  console.log(`${check ? 'Verified' : 'Prepared'} ${outputs.size} BDD cases in ${outputDir}`);
}

await main();
