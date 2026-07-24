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
      name: 'apps-do-not-import-other-apps',
      severity: 'error',
      from: { path: '^apps/([^/]+)/', pathNot: '^apps/console/' },
      to: { path: '^apps/(?!$1/|console/)' }
    }
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    includeOnly: '^(apps|packages)/',
    tsConfig: { fileName: 'tsconfig.base.json' }
  }
};
