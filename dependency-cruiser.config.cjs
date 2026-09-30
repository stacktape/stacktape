/**
 * The workspace runner resolves each application's own aliases and checks runtime and declaration imports.
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'workspace-imports-resolve',
      severity: 'error',
      from: {},
      to: {
        couldNotResolve: true,
        path: '^(@stacktape/|@domain-services/|@application-services/|@utils/|@config$|@cli-config$|@errors$|@generated/|@/|src/)'
      }
    },
    {
      name: 'init-ui-does-not-import-other-apps',
      severity: 'error',
      from: { path: '^apps/init-ui/' },
      to: { path: '^apps/(?!init-ui/)' }
    },
    {
      name: 'console-ui-uses-explicit-api-contracts',
      severity: 'error',
      from: { path: '^apps/console/ui/src/' },
      to: {
        path: '^apps/console/api/',
        pathNot:
          '^apps/console/api/((dist/)?src/(console-router|controllers/stacks|services/config-gen/ai-config-generator|utils/(aws|cloudformation)|integrations/git/repository-url|organizations/personal-organization|aws/(region|browser-capabilities)|product-config)|(dist/)?@generated/prisma/(client|enums))\\.(d\\.)?ts$'
      }
    },
    {
      name: 'console-ui-imports-cli-catalogs-only',
      severity: 'error',
      from: { path: '^apps/console/ui/src/' },
      to: {
        path: '^apps/cli/',
        pathNot:
          '^apps/cli/(@generated/(aws-price/prices|db-engine-versions/versions|cloudformation-resource-types)|starter-projects-metadata)\\.json$'
      }
    },
    {
      name: 'console-ui-does-not-import-api-runtime',
      severity: 'error',
      from: { path: '^apps/console/ui/src/' },
      to: {
        path: '^apps/console/api/',
        pathNot: '^apps/console/api/src/(integrations/git/repository-url|organizations/personal-organization)\\.ts$'
      }
    },
    {
      name: 'normalization-does-not-import-command-implementations',
      severity: 'error',
      from: { path: '^apps/cli/src/domain/(config-manager|calculated-stack-overview-manager|template-manager)/' },
      to: { path: '^apps/cli/src/commands/' }
    },
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
      name: 'synthesis-does-not-read-cli-global-state',
      severity: 'error',
      from: { path: '^apps/cli/src/domain/calculated-stack-overview-manager/' },
      to: { path: '^apps/cli/src/app/global-state-manager/' }
    },
    {
      name: 'config-entry-boundary-does-not-read-cli-global-state',
      severity: 'error',
      from: {
        path: '^apps/cli/src/domain/config-manager/(index|built-in-directives|config-resolver|context)\\.ts$'
      },
      to: { path: '^apps/cli/src/app/global-state-manager/' }
    },
    {
      name: 'template-manager-does-not-read-cli-global-state',
      severity: 'error',
      from: { path: '^apps/cli/src/domain/template-manager/' },
      to: { path: '^apps/cli/src/app/global-state-manager/' }
    },
    {
      name: 'aws-capabilities-do-not-read-cli-global-state',
      severity: 'error',
      from: { path: '^apps/cli/src/aws/' },
      to: { path: '^apps/cli/src/app/global-state-manager/' }
    },
    {
      name: 'docs-does-not-import-other-apps',
      severity: 'error',
      from: { path: '^apps/docs/' },
      to: { path: '^apps/(?!docs/)', pathNot: '^apps/cli/starter-projects-metadata\\.json$' }
    },
    {
      name: 'website-does-not-import-other-apps',
      severity: 'error',
      from: { path: '^apps/website/' },
      to: { path: '^apps/(?!website/)' }
    },
    {
      name: 'vscode-extension-does-not-import-other-apps',
      severity: 'error',
      from: { path: '^apps/vscode-extension/' },
      to: { path: '^apps/(?!vscode-extension/)' }
    }
  ],
  options: {
    // Keep dependency edges to generated data and external modules, without traversing their implementation.
    // The runner separately discovers authored source, so these directories never become scan roots.
    doNotFollow: { path: 'node_modules|(^|/)(@generated|generated|dist|fixtures|public)/' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default']
    }
  }
};
