import { join } from 'node:path';
import type { RunObserver, RunSummary } from '../RunObserver';
import { attachmentForm, attachmentMethod, screenshotsForTitle } from './attachments';
import { loadCaseMap } from './caseMap';
import { addResultsRequest, addRunRequest, closeRunRequest, groupResults, mapResults, type MappedResult } from './requests';
import { TESTRAIL_STATUS } from './statusMap';
import type { TestRailClient } from './TestRailClient';
import type { TestRailConfig } from './TestRailConfig';
import type { RunLogger } from './testrailLogger';

export interface TestRailObserverDeps {
  client: TestRailClient;
  logger: RunLogger;
  projectRoot: string;
  readText: (absolutePath: string) => Promise<string>;
  readBinary: (absolutePath: string) => Promise<Uint8Array>;
}

interface CreatedRun {
  id: number;
}

interface CreatedResult {
  id: number;
}

// Reports one whole `cypress run` to TestRail in three bulk requests. Subscribed through
// ReportingSubject.subscribeRun only when TESTRAIL_URL is set (see createTestRailObserver).
export class TestRailObserver implements RunObserver {
  constructor(
    private readonly config: TestRailConfig,
    private readonly deps: TestRailObserverDeps,
  ) {}

  async onRunComplete(summary: RunSummary): Promise<void> {
    try {
      await this.report(summary);
    } catch (error) {
      // A reporting failure must not turn a green run red: log it and let Cypress exit normally.
      this.deps.logger.error({ err: error }, 'TestRail: reporting failed - the Cypress exit code is unaffected');
    }
  }

  private async report(summary: RunSummary): Promise<void> {
    const { client, logger, projectRoot, readText } = this.deps;
    const caseMap = await loadCaseMap(
      summary.results.map((result) => result.specPath),
      (specPath) => readText(join(projectRoot, specPath)),
    );
    const mapped = mapResults(summary, caseMap);
    if (mapped.length === 0) {
      logger.info({ results: summary.results.length }, 'TestRail: nothing to report (no @C-tagged passed/failed results)');
      return;
    }

    const run = await client.postJson<CreatedRun>(addRunRequest(this.config, summary, mapped.map((entry) => entry.caseId)));
    const created = await client.postJson<CreatedResult[]>(addResultsRequest(run.id, mapped, summary));
    if (this.config.attachScreenshots) await this.attachFailures(mapped, created, summary);
    await client.postJson(closeRunRequest(run.id));
    logger.info(
      { runId: run.id, cases: groupResults(mapped).length, scenarios: mapped.length, unmapped: summary.results.length - mapped.length, dryRun: this.config.dryRun },
      'TestRail: run reported and closed',
    );
  }

  // add_results_for_cases answers in request order. Each result is one case and may
  // contain several market scenarios, so attach every failing market to its case result.
  private async attachFailures(mapped: MappedResult[], created: CreatedResult[], summary: RunSummary): Promise<void> {
    const uploads = groupResults(mapped).flatMap((group, index) => {
      const result = created[index];
      if (result === undefined) return [];
      return group.entries.flatMap((entry) => entry.statusId === TESTRAIL_STATUS.failed
        ? screenshotsForTitle(entry.test.title, summary.screenshots).map((path) => ({ resultId: result.id, path }))
        : []);
    });
    await Promise.all(uploads.map((upload) => this.attach(upload.resultId, upload.path)));
  }

  private async attach(resultId: number, path: string): Promise<void> {
    const bytes = await this.deps.readBinary(path).catch((error: unknown) => {
      this.deps.logger.error({ err: error, path }, 'TestRail: screenshot unreadable, skipped');
      return undefined;
    });
    if (!bytes) return;
    await this.deps.client.postForm(attachmentMethod(resultId), attachmentForm(path, bytes));
  }
}
