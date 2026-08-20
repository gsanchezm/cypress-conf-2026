import { defineConfig } from 'cypress';
import createBundler from '@bahmutov/cypress-esbuild-preprocessor';
import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor';
import { createEsbuildPlugin } from '@badeball/cypress-cucumber-preprocessor/esbuild';
import { ReportingSubject } from './src/core/reporting/ReportingSubject';
import { ConsoleObserver } from './src/core/reporting/ConsoleObserver';
import { GithubActionsSummaryObserver } from './src/core/reporting/GithubActionsSummaryObserver';
import type { TestResult } from './src/core/reporting/Observer';

export default defineConfig({
  projectId: '5v45hh',
  viewportWidth: 1280,
  viewportHeight: 800,
  e2e: {
    baseUrl: 'https://omnipizza-frontend.onrender.com',
    specPattern: ['cypress/e2e/**/*.feature', 'cypress/unit/**/*.cy.ts'],
    supportFile: 'cypress/support/e2e.ts',
    async setupNodeEvents(on, config) {
      await addCucumberPreprocessorPlugin(on, config);
      on('file:preprocessor', createBundler({ plugins: [createEsbuildPlugin(config)] }));

      const reportingSubject = new ReportingSubject();
      reportingSubject.subscribe(new ConsoleObserver());
      reportingSubject.subscribe(new GithubActionsSummaryObserver(process.env.GITHUB_STEP_SUMMARY));

      on('after:spec', (spec, results) => {
        const sliceMatch = spec.relative.match(/[\\/]e2e[\\/]([^\\/]+)[\\/]/);
        const slice = sliceMatch ? sliceMatch[1] : 'unknown';
        const testResults = (results?.tests ?? []).map((t) => ({
          specPath: spec.relative,
          title: t.title.join(' > '),
          state: t.state as TestResult['state'],
          durationMs: t.duration ?? 0,
          slice,
        }));
        reportingSubject.notify(testResults);
      });

      return config;
    },
  },
  env: {
    apiUrl: 'https://omnipizza-backend.onrender.com',
  },
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: 'cypress/reports/mochawesome',
    overwrite: false,
    html: true,
    json: true,
  },
});
