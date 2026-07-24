/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
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
    includeOnly: '^(apps|packages)/',
    tsConfig: { fileName: 'tsconfig.base.json' }
  }
};
