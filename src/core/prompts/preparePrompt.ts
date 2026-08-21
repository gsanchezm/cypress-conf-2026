export type PromptDocument = Record<string, string[]>;

export interface PreparedPrompt {
  steps: string[];
  placeholders: Record<string, string>;
}

const SECTION_HEADING = /^##\s+(.+?)\s*$/;
const LIST_ITEM = /^[-*]\s+(.+?)\s*$/;
const PLACEHOLDER = /\{([A-Za-z0-9_]+)\}/g;

// Parses a prompt document into sections of ordered steps. A `## name`
// heading opens a section; every `- ` list item under it is one cy.prompt
// step, in file order. Everything else - the title, prose, blank lines - is
// documentation for whoever edits the file and never reaches cy.prompt.
//
// Takes the markdown as a string, not a path: esbuild's text loader supplies
// it inside the Cypress bundle, and keeping the function pure is what lets
// the whole thing be tested under node:test, which has no such loader.
export function parsePromptDocument(markdown: string): PromptDocument {
  const document: PromptDocument = {};
  let current: string | undefined;

  for (const line of markdown.split('\n')) {
    const heading = SECTION_HEADING.exec(line);
    if (heading) {
      current = heading[1]!;
      if (current in document) {
        throw new Error(`Prompt document: section declared more than once: ${current}`);
      }
      document[current] = [];
      continue;
    }

    const item = LIST_ITEM.exec(line);
    if (item && current) {
      document[current]!.push(item[1]!);
    }
  }

  return document;
}

// Reads one section and cross-checks its placeholder tokens against the
// values the caller supplies, in both directions.
//
// This check is the point of moving prompt text out of TypeScript at all.
// Inline, a renamed placeholder was a compile error. In a .md that a
// non-developer can edit, it is invisible: cy.prompt would receive the
// literal "{addres}", hand it to the model, and the AI would improvise
// something plausible - a silently wrong test rather than a failing one.
export function preparePrompt(
  markdown: string,
  section: string,
  placeholders: Record<string, string>,
): PreparedPrompt {
  const document = parsePromptDocument(markdown);
  const steps = document[section];

  if (!steps) {
    throw new Error(
      `Prompt document: no section "${section}". Declared sections: ${Object.keys(document).join(', ') || '(none)'}`,
    );
  }
  if (steps.length === 0) {
    throw new Error(`Prompt document: section "${section}" declares no steps`);
  }

  const referenced = new Set<string>();
  for (const step of steps) {
    for (const match of step.matchAll(PLACEHOLDER)) {
      referenced.add(match[1]!);
    }
  }

  const supplied = new Set(Object.keys(placeholders));
  const missing = [...referenced].filter((name) => !supplied.has(name));
  const unused = [...supplied].filter((name) => !referenced.has(name));

  if (missing.length > 0) {
    throw new Error(
      `Prompt document: section "${section}" references placeholders that were never supplied: ${missing.join(', ')}`,
    );
  }
  if (unused.length > 0) {
    throw new Error(
      `Prompt document: placeholders supplied to section "${section}" that no step ever references: ${unused.join(', ')}`,
    );
  }

  return { steps, placeholders };
}
