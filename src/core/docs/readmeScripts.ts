// Slices one top-level (`## `) section out of a markdown document. `### `
// sub-headings stay inside; a missing heading throws instead of returning an
// empty string, so a test over the section can never pass vacuously. CRLF is
// normalised first: with core.autocrlf the checked-out file differs from the index.
export const sectionOf = (markdown: string, heading: string): string => {
  const text = markdown.replace(/\r\n/g, '\n');
  const marker = `\n## ${heading}\n`;
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(`no "## ${heading}" section found`);
  const body = text.slice(start + marker.length);
  const next = body.search(/^## /m);
  return (next < 0 ? body : body.slice(0, next)).trim();
};

// `pnpm exec <bin>` and `pnpm dlx <pkg>` run binaries; only a bare
// `pnpm <name>` refers to a package.json script.
const SCRIPT_CALL = /\bpnpm\s+(?!exec\b|dlx\b)([\w:.-]+)/g;

export const pnpmScriptsIn = (markdown: string): string[] =>
  [...new Set([...markdown.matchAll(SCRIPT_CALL)].map(([, name]) => name))];
