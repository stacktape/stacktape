/**
 * `pnpm check:architecture` runs with `--ignore-known`, which reads
 * `.dependency-cruiser-known-violations.json`. Regenerate that file with
 * `pnpm check:architecture:update-known > .dependency-cruiser-known-violations.json` only to record a
 * cycle that was deliberately accepted, and never to make a new one pass quietly.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      // The imported Stacktape CLI and Console both arrived with import cycles, hand-written as well as in
      // vendored language-service code. Breaking them means restructuring the applications, so the ones
      // that already existed are recorded in `.dependency-cruiser-known-violations.json` and the check runs
      // with `--ignore-known`: those exact cycles stay quiet, and any new one fails.
      name: 'no-cycles',
      severity: 'error',
      from: {},
      to: { circular: true }
    },
    {
      name: 'packages-do-not-import-apps',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' }
    },
    {
      name: 'public-does-not-import-private-console',
      severity: 'error',
      from: { pathNot: '^apps/console/' },
      to: { path: '^apps/console/' }
    },
    {
      name: 'cli-does-not-import-other-apps',
      severity: 'error',
      from: { path: '^apps/cli/' },
      to: { path: '^apps/(?!cli/)' }
    },
    {
      name: 'docs-does-not-import-other-apps',
      severity: 'error',
      from: { path: '^apps/docs/' },
      to: { path: '^apps/(?!docs/)' }
    },
    {
      name: 'website-does-not-import-other-apps',
      severity: 'error',
      from: { path: '^apps/website/' },
      to: { path: '^apps/(?!website/)' }
    }
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: {
      /**
       * Build output, fixtures, and committed generator output. The generated artifacts are
       * excluded because applications consume them as data: `apps/docs` reads the CLI's config
       * schema, LLM corpus, and starter-project metadata without importing CLI implementation, and
       * the `does-not-import-other-apps` rules exist to stop the latter, not the former.
       */
      path:
        '^apps/(cli/(@generated|generated|starter-projects|_test-stacks)/|cli/starter-projects-metadata\\.json$' +
        '|docs/dist/|console/(api/(@generated|dist)|ui/(dist|public))/)'
    },
    includeOnly: '^(apps|packages)/',
    tsConfig: { fileName: 'tsconfig.base.json' }
  }
};
