import { basename } from 'node:path';
import { TITLE_SEPARATOR } from '../runSummary';

// Cypress names screenshots "<describe> -- <it> (failed)[ (attempt N)].png"; the titles are the
// same ones after:spec joins with TITLE_SEPARATOR, so a prefix match finds every attempt.
const SCREENSHOT_SEPARATOR = ' -- ';

export function screenshotsForTitle(title: string, screenshots: string[]): string[] {
  const prefix = title.split(TITLE_SEPARATOR).join(SCREENSHOT_SEPARATOR);
  return screenshots.filter((path) => basename(path).startsWith(prefix));
}

export function attachmentMethod(resultId: number): string {
  return `add_attachment_to_result/${resultId}`;
}

// multipart/form-data with the file under "attachment" (TestRail's documented field name). The
// copy into a fresh Uint8Array keeps TypeScript's Blob typing happy with a Node Buffer input.
export function attachmentForm(filePath: string, bytes: Uint8Array): FormData {
  const form = new FormData();
  form.append('attachment', new Blob([new Uint8Array(bytes)], { type: 'image/png' }), basename(filePath));
  return form;
}
