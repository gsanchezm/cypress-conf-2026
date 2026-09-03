export const RENAMED_TESTID_SUFFIX = '--renamed-by-demo';

// What the demo does to the app: the element keeps everything except the
// attribute the registry keys on. Suffixed rather than replaced so the
// screenshot of the failure names the original, and so nothing in the app
// could already carry the new value.
export function renamedTestId(previous: string): string {
  return `${previous}${RENAMED_TESTID_SUFFIX}`;
}

// Locator keys are namespaced by screen (login., landing., catalog.,
// checkout., orderSuccess.), so the screen a key lives on is its prefix.
export function belongsToScreen(dotPath: string, screen: string): boolean {
  return dotPath.startsWith(`${screen}.`);
}
