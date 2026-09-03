import { AstBuilder, GherkinClassicTokenMatcher, Parser, compile } from '@cucumber/gherkin';
import { IdGenerator, type Pickle } from '@cucumber/messages';
import type { TestResult } from '../Observer';
import { TITLE_SEPARATOR } from '../runSummary';

// TestRail case ids are the number in /cases/view/<id>; the tag is that number prefixed with C.
const CASE_TAG = /^@C(\d+)$/;
// @badeball's suffix for Scenario Outline rows.
export const EXAMPLE_SUFFIX = / \(example #\d+\)$/;

export type CaseMap = ReadonlyMap<string, number>;

export function normaliseSpecPath(specPath: string): string {
  return specPath.replace(/\\/g, '/');
}

export function caseKey(specPath: string, scenarioTitle: string): string {
  return `${normaliseSpecPath(specPath)}::${scenarioTitle}`;
}

// TestResult.title is "Feature > Scenario" (or "Feature > Rule > Scenario"); the scenario is last.
export function scenarioTitleOf(resultTitle: string): string {
  return resultTitle.split(TITLE_SEPARATOR).at(-1) ?? resultTitle;
}

export function stripExampleSuffix(title: string): string {
  return title.replace(EXAMPLE_SUFFIX, '');
}

// Pickle tags arrive as feature tags, then scenario tags, then the row's Examples tags, so the
// last @C tag is the most specific one.
function caseIdOf(pickle: Pickle): number | undefined {
  const ids = pickle.tags.map((tag) => CASE_TAG.exec(tag.name)?.[1]).filter((id): id is string => id !== undefined);
  const mostSpecific = ids.at(-1);
  return mostSpecific === undefined ? undefined : Number(mostSpecific);
}

// Mirrors @badeball's naming: an outline row (two ast node ids: scenario + table row) gets
// " (example #N)", N counted across every Examples block of that scenario.
function preprocessorTitle(pickle: Pickle, indexWithinScenario: number): string {
  return pickle.astNodeIds.length === 2 ? `${pickle.name} (example #${indexWithinScenario + 1})` : pickle.name;
}

export function parseCaseMap(featureSource: string, specPath: string): CaseMap {
  const newId = IdGenerator.incrementing();
  const parser = new Parser(new AstBuilder(newId), new GherkinClassicTokenMatcher());
  const pickles = compile(parser.parse(featureSource), specPath, newId);
  const indexWithinScenario = (position: number): number =>
    pickles.slice(0, position).filter((earlier) => earlier.astNodeIds[0] === pickles[position].astNodeIds[0]).length;

  const entries = pickles.flatMap((pickle, position) => {
    const caseId = caseIdOf(pickle);
    if (caseId === undefined) return [];
    return [[caseKey(specPath, preprocessorTitle(pickle, indexWithinScenario(position))), caseId] as const];
  });
  return new Map(entries);
}

export async function loadCaseMap(specPaths: string[], read: (specPath: string) => Promise<string>): Promise<CaseMap> {
  const distinct = [...new Set(specPaths.map(normaliseSpecPath))];
  const maps = await Promise.all(distinct.map(async (specPath) => parseCaseMap(await read(specPath), specPath)));
  return new Map(maps.flatMap((map) => [...map]));
}

// Exact preprocessor title first; then the title without " (example #N)", so an outline that is
// tagged once at scenario level in a hand-built map (or a future renaming) still resolves.
export function caseIdFor(caseMap: CaseMap, result: Pick<TestResult, 'specPath' | 'title'>): number | undefined {
  const title = scenarioTitleOf(result.title);
  return caseMap.get(caseKey(result.specPath, title)) ?? caseMap.get(caseKey(result.specPath, stripExampleSuffix(title)));
}
