/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      // The imported Stacktape CLI contains pre-existing import cycles, both hand-written and in generated
      // CloudFormation namespaces. Breaking them means restructuring the application, so the rule guards
      // everything else until that is done deliberately.
      name: 'no-cycles',
      severity: 'error',
      from: { pathNot: '^apps/cli/' },
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
    exclude: { path: '^apps/cli/(@generated|starter-projects|_test-stacks)/' },
    includeOnly: '^(apps|packages)/',
    tsConfig: { fileName: 'tsconfig.base.json' }
  }
};
