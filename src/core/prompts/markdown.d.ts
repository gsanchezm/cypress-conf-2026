// Prompt text lives in .md files so it can be reviewed and edited as prose
// rather than as string literals wedged into TypeScript. esbuild is
// configured with `loader: { '.md': 'text' }` in cypress.config.ts, which
// turns each import into a plain string at bundle time - no runtime file
// read, so the strategies that consume it stay synchronous.
declare module '*.md' {
  const content: string;
  export default content;
}
