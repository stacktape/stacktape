/**
 * Sections of the pages in `V4_RENAMED_PAGES` (`site-redirects.ts`) that readers may have bookmarked or found in search results. A redirect keeps the URL
 * fragment, but the destination page names its sections differently. Keyed by destination page, then by the old
 * fragment, with where that section lives now. `MovedSectionRedirect.astro` follows the entry when the destination has
 * no element with the old ID; `scripts/validate-built-site.ts` checks that every target exists.
 */
export const MOVED_SECTIONS: Record<string, Record<string, string>> = {
  '/configuration/directives/': {
    'typescript-programmatic-config': '/configuration/directives/#using-directives-in-typescript',
    'directive-syntax': '/configuration/directives/#local-vs-runtime-directives',
    'resolution-phases': '/configuration/directives/#local-vs-runtime-directives',
    'deployment-context-directives': '/configuration/directives/#pass-deployment-context-to-your-app',
    'custom-cli-arguments': '/configuration/directives/#cliargs',
    'external-configuration-files': '/configuration/directives/#file',
    'git-metadata': '/configuration/directives/#gitinfo',
    'string-composition': '/configuration/directives/#format',
    'cross-stack-references': '/configuration/directives/#stackoutput',
    'secrets-and-ssm-parameters': '/configuration/directives/#secret',
    'resource-references': '/configuration/directives/#resourceparam',
    'variables-and-self-reference': '/configuration/directives/#var',
    'what-is-the-difference-between-format-and-cfformat': '/configuration/directives/#cfformat',
    'how-do-i-manage-different-configurations-for-development-and-production':
      '/configuration/directives/#how-do-i-keep-one-config-for-development-and-production',
    'how-do-i-pass-secrets-to-my-application-at-deploy-time': '/configuration/directives/#secret',
    'can-i-reference-outputs-from-a-stack-in-a-different-aws-region':
      '/configuration/directives/#can-i-import-an-output-from-a-stack-in-another-region',
    'how-do-cloudformation-time-directives-behave-during-local-development':
      '/configuration/directives/#how-do-runtime-directives-resolve-in-dev-mode',
    'when-should-i-use-file-vs-cliargs-for-external-configuration': '/configuration/directives/#file'
  },
  '/managing-costs/dashboards/': {
    'costs-per-stack': '/managing-costs/dashboards/#aws-account-the-costs-page',
    'per-resource-breakdown': '/managing-costs/dashboards/#stage-costs-per-resource',
    'identify-expensive-resources': '/managing-costs/dashboards/#stage-costs-per-resource',
    'compare-stages': '/managing-costs/dashboards/#aws-account-the-costs-page',
    'set-budget-alerts-based-on-real-data': '/managing-costs/budgets/',
    'does-this-include-stacktapes-subscription-fee':
      '/managing-costs/dashboards/#does-stacktape-add-any-markup-to-aws-costs',
    'how-does-this-differ-from-aws-cost-explorer':
      '/managing-costs/dashboards/#how-is-this-different-from-aws-cost-explorer'
  },
  '/getting-started/': {
    'install-the-package': '/configuration/configuration-files/#typescript-configuration',
    'your-first-stacktapets': '/configuration/configuration-files/#typescript-configuration',
    'adapt-config-per-stage': '/configuration/stages-and-environments/#stage-aware-configuration',
    'context-properties': '/configuration/stages-and-environments/#config-callback-parameters',
    'quick-start-with-stacktape-init': '/getting-started/#run-it-in-your-apps-directory',
    'beyond-resources': '/configuration/configuration-files/#config-file-structure',
    'next-step': '/getting-started/#what-happens-next'
  },
  '/getting-started/deploy-an-existing-app/': {
    prerequisites: '/getting-started/deploy-an-existing-app/#before-you-start',
    'step-1-set-up-aws-credentials': '/getting-started/aws-credentials/',
    'step-2-deploy': '/getting-started/deploy-an-existing-app/#4-deploy',
    'what-happens-during-deploy': '/deployment-and-lifecycle/deploying-stacks/#how-deployment-works',
    'deploy-output': '/getting-started/deploy-an-existing-app/#4-deploy',
    'add-the-console-optional': '/getting-started/deploy-an-existing-app/#add-the-console',
    'verifying-the-deploy': '/getting-started/deploy-an-existing-app/#its-live',
    'redeploying-after-changes': '/deployment-and-lifecycle/deploying-stacks/#running-a-deployment',
    'code-only-changes-deploy-in-seconds': '/deployment-and-lifecycle/deploying-stacks/#fast-deployments',
    'deploying-multiple-stages': '/configuration/stages-and-environments/#deploying-a-stage',
    troubleshooting: '/getting-started/deploy-an-existing-app/#if-something-goes-wrong',
    'no-aws-credentials-found': '/getting-started/deploy-an-existing-app/#aws-rejects-the-credentials',
    'deploy-takes-longer-than-expected': '/deployment-and-lifecycle/deploying-stacks/#deployment-is-slow',
    'how-long-does-a-first-deploy-take':
      '/deployment-and-lifecycle/deploying-stacks/#how-long-does-a-stacktape-deployment-take',
    'does-stacktape-cost-money-to-use-with-aws': '/getting-started/deploy-an-existing-app/#what-the-deploy-costs',
    'can-i-preview-what-a-deploy-will-change-before-running-it': '/deployment-and-lifecycle/previewing-changes/'
  },
  '/local-development/dev-mode-overview/': {
    'the-edit-save-see-loop': '/local-development/dev-mode-overview/#change-code-and-see-it',
    'enable-file-watching': '/local-development/dev-mode-overview/#change-code-and-see-it',
    'useful-flags': '/local-development/dev-mode-overview/#flags',
    'agent-mode': '/local-development/dev-mode-overview/#agent-mode-for-coding-agents',
    'next-step': '/local-development/dev-mode-overview/#next-steps'
  },
  '/stacktape-console/console-overview/': {
    'the-overview-dashboard': '/stacktape-console/console-overview/#the-overview-page',
    logs: '/observability/logs/',
    metrics: '/observability/metrics/',
    alarms: '/stacktape-console/console-overview/#setting-up-alarms',
    'error-tracking': '/stacktape-console/console-overview/#tracking-runtime-errors',
    'cost-dashboards': '/managing-costs/dashboards/',
    'secrets-management': '/stacktape-console/console-overview/#managing-secrets',
    'quick-reference': '/stacktape-console/console-overview/#common-tasks',
    'next-step': '/stacktape-console/console-overview/#related-pages'
  },
  '/ci-cd-and-gitops/overview/': {
    'gitops-via-the-stacktape-console': '/ci-cd-and-gitops/overview/#git-deployments',
    'cli-prompt-after-first-deploy': '/ci-cd-and-gitops/gitops-with-console/',
    'what-you-can-configure': '/ci-cd-and-gitops/gitops-with-console/#create-a-git-deployment',
    'pr-preview-environments': '/ci-cd-and-gitops/overview/#pull-request-previews',
    'connecting-your-repository': '/ci-cd-and-gitops/gitops-with-console/#connect-your-git-provider',
    'custom-cicd-integration': '/ci-cd-and-gitops/overview/#your-own-pipeline',
    credentials: '/ci-cd-and-gitops/custom-ci-cd/#authenticate-the-pipeline',
    'github-actions-example': '/ci-cd-and-gitops/custom-ci-cd/#github-actions',
    'gitlab-ci-example': '/ci-cd-and-gitops/custom-ci-cd/#gitlab-ci',
    'pr-previews-in-custom-ci': '/ci-cd-and-gitops/custom-ci-cd/#pull-request-previews',
    'which-path-to-choose': '/ci-cd-and-gitops/overview/#compare-the-options',
    'next-step': '/ci-cd-and-gitops/overview/#compare-the-options'
  }
};
