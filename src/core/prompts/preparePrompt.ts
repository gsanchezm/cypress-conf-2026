// A Map, not a Record: section names come from a markdown file anyone can
// edit, and `'constructor' in {}` is true. On a plain object a section
// innocently named `constructor` or `toString` would be reported as a
// duplicate that was never declared - Map has no such inherited keys.
export type PromptDocument = ReadonlyMap<string, string[]>;

export interface PreparedPrompt {
  steps: string[];
  placeholders: Record<string, string>;
}

// Splits on the `## ` heading itself rather than walking lines and tracking
// "which section am I in?" - that state was what forced the nesting this
// parser used to have. Everything before the first heading is the
// document's preamble and is discarded by the leading hole.
const SECTION_BOUNDARY = /^##[ \t]+(?=\S)/m;
const LIST_ITEM = /^[-*]\s+(.+?)\s*$/;
const PLACEHOLDER = /\{([A-Za-z0-9_]+)\}/g;

// `?? []` makes flatMap drop non-matching lines, so prose is filtered out by
// the same pass that extracts the steps - no second filter, no type guard.
function stepsIn(body: string[]): string[] {
  return body.flatMap((line) => LIST_ITEM.exec(line)?.[1] ?? []);
}

function placeholdersIn(steps: string[]): Set<string> {
  return new Set(steps.flatMap((step) => [...step.matchAll(PLACEHOLDER)].map((token) => token[1]!)));
}

// Parses a prompt document into sections of ordered steps. A `## name`
// heading opens a section; every `- ` list item under it is one cy.prompt
// step, in file order. Everything else - the title, prose, blank lines - is
// documentation for whoever edits the file and never reaches cy.prompt.
//
// Takes the markdown as a string, not a path: esbuild's text loader supplies
// it inside the Cypress bundle, and keeping the function pure is what lets
// the whole thing be tested under node:test, which has no such loader.
export function parsePromptDocument(markdown: string): PromptDocument {
  const [, ...sections] = markdown.split(SECTION_BOUNDARY);

  return sections.reduce((document, section) => {
    const [heading = '', ...body] = section.split('\n');
    const name = heading.trim();
    if (document.has(name)) {
      throw new Error(`Prompt document: section declared more than once: ${name}`);
    }
    return document.set(name, stepsIn(body));
  }, new Map<string, string[]>());
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
  const steps = document.get(section);

  if (!steps) {
    const declared = [...document.keys()].join(', ') || '(none)';
    throw new Error(`Prompt document: no section "${section}". Declared sections: ${declared}`);
  }
  if (steps.length === 0) {
    throw new Error(`Prompt document: section "${section}" declares no steps`);
  }

  const referenced = placeholdersIn(steps);
  const supplied = new Set(Object.keys(placeholders));

  const missing = [...referenced].filter((name) => !supplied.has(name));
  if (missing.length > 0) {
    throw new Error(
      `Prompt document: section "${section}" references placeholders that were never supplied: ${missing.join(', ')}`,
    );
  }

  const unused = [...supplied].filter((name) => !referenced.has(name));
  if (unused.length > 0) {
    throw new Error(
      `Prompt document: placeholders supplied to section "${section}" that no step ever references: ${unused.join(', ')}`,
    );
  }

  return { steps, placeholders };
}
