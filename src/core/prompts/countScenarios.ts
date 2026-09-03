// Counts how many scenarios a .feature file expands to, which is the
// multiplier in the cy.prompt budget. Same technique as parsePromptDocument:
// split on the heading itself rather than walk lines with state. Prose,
// `Feature:`, `Background:` and comments fall into the leading hole or into a
// block they do not affect.
const SCENARIO_BOUNDARY = /^[ \t]*(?=Scenario(?: Outline)?:)/m;
const EXAMPLES_BOUNDARY = /^[ \t]*Examples:/m;
const TABLE_ROW = /^[ \t]*\|/;

// Each Examples block contributes its rows minus the header row; a block
// with only a header (or none) contributes nothing rather than -1.
function examplesRows(block: string): number {
  const [, ...examples] = block.split(EXAMPLES_BOUNDARY);
  return examples
    .map((section) => section.split('\n').filter((line) => TABLE_ROW.test(line)).length - 1)
    .reduce((total, rows) => total + Math.max(rows, 0), 0);
}

export function countScenarios(featureText: string): number {
  const [, ...blocks] = featureText.split(SCENARIO_BOUNDARY);
  return blocks.reduce(
    (total, block) => total + (block.startsWith('Scenario Outline:') ? examplesRows(block) : 1),
    0,
  );
}
