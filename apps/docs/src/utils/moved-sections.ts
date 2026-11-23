/**
 * Sections that moved: those of the pages in `V4_RENAMED_PAGES` (`site-redirects.ts`), which readers may have
 * bookmarked or found in search results, and sections that left a page for a page of their own. A redirect keeps the
 * URL fragment, but the destination page names its sections differently. Keyed by the page the reader lands on, then by
 * the old fragment, with where that section lives now. `MovedSectionRedirect.astro` follows the entry when the destination has
 * no element with the old ID; `scripts/validate-built-site.ts` checks that every target exists.
 *
 * The docs rewrite of November 2026 renamed or removed most headings. Every heading ID of the production site before it
 * (and of its first round) that has a matching section today is listed here, matched by the text of the old and new
 * sections. Old IDs without a matching section, such as "When to use" (now the page lead) and FAQ questions whose answer
 * left the page, are left out on purpose: the reader lands at the top of the page.
 */
export const MOVED_SECTIONS: Record<string, Record<string, string>> = {
  '/': {
    'a-real-stacktape-config': '/#example-title',
    'open-source-core-paid-console': '/#cli-and-console-title',
    'private-networking': '/#example-title',
    'quick-start': '/#home-paths',
    'scripts--migrations': '/#example-title'
  },
  '/ci-cd-and-gitops/build-runners/': {
    'build-caches': '/ci-cd-and-gitops/build-runners/#build-cache',
    'can-deployment-and-github-actions-jobs-run-at-the-same-time': '/ci-cd-and-gitops/build-runners/#build-cache',
    'instance-types': '/ci-cd-and-gitops/build-runners/#instance-sizes',
    'lifecycle-and-cost': '/ci-cd-and-gitops/build-runners/#what-it-costs',
    'runner-configuration': '/ci-cd-and-gitops/build-runners/#settings',
    'runner-region': '/ci-cd-and-gitops/build-runners/#what-it-costs',
    'what-happens-when-the-runner-is-idle': '/ci-cd-and-gitops/build-runners/#when-it-starts-and-stops',
    'what-instance-type-should-i-choose': '/ci-cd-and-gitops/build-runners/#instance-sizes'
  },
  '/ci-cd-and-gitops/custom-ci-cd/': {
    'adding-tests-before-deploy': '/ci-cd-and-gitops/custom-ci-cd/#github-actions',
    authentication: '/ci-cd-and-gitops/custom-ci-cd/#authentication-fails',
    'cli-hangs-or-throws-an-error-waiting-for-input':
      '/ci-cd-and-gitops/custom-ci-cd/#needs-confirmation-and-this-run-cannot-ask-for-it',
    'concurrent-deploys-to-the-same-stage': '/ci-cd-and-gitops/custom-ci-cd/#when-two-deploys-of-a-stage-run-at-once',
    'how-do-i-authenticate-stacktape-in-a-ci-pipeline': '/ci-cd-and-gitops/custom-ci-cd/#authenticate-the-pipeline',
    'multi-stage-pipeline-with-tests': '/ci-cd-and-gitops/custom-ci-cd/#gitlab-ci',
    'pr-preview-environments': '/ci-cd-and-gitops/custom-ci-cd/#pull-request-previews',
    'previewing-changes-before-deploying': '/ci-cd-and-gitops/custom-ci-cd/#review-changes-before-an-approval',
    'stack-name-too-long-or-resource-names-obfuscated': '/ci-cd-and-gitops/custom-ci-cd/#the-stack-name-is-too-long',
    'what-happens-when-a-deploy-fails-in-ci': '/ci-cd-and-gitops/custom-ci-cd/#the-deploy-command',
    'what-happens-when-two-deploys-to-the-same-stage-run-at-once':
      '/ci-cd-and-gitops/custom-ci-cd/#when-two-deploys-of-a-stage-run-at-once'
  },
  '/ci-cd-and-gitops/gitops-with-console/': {
    'a-push-did-not-deploy-what-should-i-check': '/ci-cd-and-gitops/gitops-with-console/#a-push-did-not-deploy',
    'can-one-push-deploy-to-several-accounts-or-regions':
      '/ci-cd-and-gitops/gitops-with-console/#what-triggers-a-deployment',
    'several-rules-and-several-pushes': '/ci-cd-and-gitops/gitops-with-console/#what-triggers-a-deployment',
    'typical-setup': '/ci-cd-and-gitops/gitops-with-console/#create-a-git-deployment'
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
    'next-step': '/ci-cd-and-gitops/overview/#compare-the-options',
    'automation-options-at-a-glance': '/ci-cd-and-gitops/overview/#compare-the-options',
    'can-i-run-tests-before-deploying-with-gitops': '/ci-cd-and-gitops/overview/#git-deployments',
    'choosing-the-right-approach': '/ci-cd-and-gitops/overview/#compare-the-options',
    'custom-cicd': '/ci-cd-and-gitops/overview/#your-own-pipeline',
    'do-i-need-aws-credentials-in-my-ci-pipeline': '/ci-cd-and-gitops/overview/#your-own-pipeline',
    'gitops-with-console': '/ci-cd-and-gitops/overview/#git-deployments',
    'how-do-i-roll-back-a-failed-automated-deployment': '/ci-cd-and-gitops/overview/#when-an-automated-deploy-fails',
    'self-hosted-github-actions-runners': '/ci-cd-and-gitops/overview/#your-own-pipeline',
    'stacks-per-git-branch': '/ci-cd-and-gitops/overview/#pull-request-previews',
    'what-stage-does-a-gitops-pr-preview-deploy-to': '/ci-cd-and-gitops/overview/#pull-request-previews'
  },
  '/ci-cd-and-gitops/self-hosted-github-actions-runners/': {
    'configuring-the-runner': '/ci-cd-and-gitops/self-hosted-github-actions-runners/#turn-it-on',
    cost: '/ci-cd-and-gitops/self-hosted-github-actions-runners/#start-time-and-cost',
    'deploy-on-push-to-main': '/ci-cd-and-gitops/self-hosted-github-actions-runners/#turn-it-on',
    'disabling-the-runner': '/ci-cd-and-gitops/self-hosted-github-actions-runners/#turn-it-off',
    'do-i-need-to-store-aws-credentials-or-a-stacktape-api-key-in-github-secrets':
      '/ci-cd-and-gitops/self-hosted-github-actions-runners/#credentials-in-the-job',
    'hibernation-and-lifecycle': '/ci-cd-and-gitops/self-hosted-github-actions-runners/#start-time-and-cost',
    'how-do-i-troubleshoot-a-failed-runner-job':
      '/ci-cd-and-gitops/self-hosted-github-actions-runners/#a-job-was-cancelled-or-never-started',
    'how-does-stacktape-decide-which-aws-region-the-runner-uses-and-why-might-it-fail':
      '/ci-cd-and-gitops/self-hosted-github-actions-runners/#turn-it-on',
    'how-fast-does-the-runner-start-and-why-does-my-job-still-wait':
      '/ci-cd-and-gitops/self-hosted-github-actions-runners/#start-time-and-cost',
    'mixing-with-hosted-runners': '/ci-cd-and-gitops/self-hosted-github-actions-runners/#turn-it-on',
    'pr-preview-stages': '/ci-cd-and-gitops/self-hosted-github-actions-runners/#turn-it-on',
    'pre-installed-tools': '/ci-cd-and-gitops/self-hosted-github-actions-runners/#what-is-installed',
    prerequisites: '/ci-cd-and-gitops/self-hosted-github-actions-runners/#requirements',
    'running-tests-before-deploy': '/ci-cd-and-gitops/self-hosted-github-actions-runners/#turn-it-on',
    'should-i-use-self-hosted-runners-or-gitops-with-console':
      '/ci-cd-and-gitops/self-hosted-github-actions-runners/#turn-it-on',
    'using-the-runner-in-a-workflow': '/ci-cd-and-gitops/self-hosted-github-actions-runners/#turn-it-on'
  },
  '/ci-cd-and-gitops/stacks-per-git-branch-pattern/': {
    'ci-variables-for-custom-pipelines': '/ci-cd-and-gitops/stacks-per-git-branch-pattern/#pull-request-previews',
    'combining-patterns': '/ci-cd-and-gitops/stacks-per-git-branch-pattern/#long-lived-branch-stages',
    'cost-management': '/ci-cd-and-gitops/stacks-per-git-branch-pattern/#cost',
    'how-much-does-a-pr-preview-environment-cost': '/ci-cd-and-gitops/stacks-per-git-branch-pattern/#cost',
    'how-pr-previews-work-with-custom-cicd': '/ci-cd-and-gitops/stacks-per-git-branch-pattern/#pull-request-previews',
    'how-pr-previews-work-with-gitops': '/ci-cd-and-gitops/stacks-per-git-branch-pattern/#pull-request-previews',
    'how-the-pattern-works': '/ci-cd-and-gitops/stacks-per-git-branch-pattern/#long-lived-branch-stages',
    'recommended-naming-patterns': '/ci-cd-and-gitops/stacks-per-git-branch-pattern/#naming-stages',
    'setting-up-with-custom-cicd': '/ci-cd-and-gitops/stacks-per-git-branch-pattern/#long-lived-branch-stages',
    'strategies-to-control-costs': '/ci-cd-and-gitops/stacks-per-git-branch-pattern/#cost'
  },
  '/cli/ai-connect/': {
    'flags-reference': '/cli/ai-connect/#options'
  },
  '/cli/ai-disconnect/': {
    'flags-reference': '/cli/ai-disconnect/#options'
  },
  '/cli/alarm-list/': {
    'agent-mode': '/cli/alarm-list/#check-from-a-script',
    'filter-by-resource': '/cli/alarm-list/#filter-by-resource-or-state',
    'filter-by-state': '/cli/alarm-list/#filter-by-resource-or-state',
    'flags-reference': '/cli/alarm-list/#options',
    'how-do-i-check-from-a-script-whether-any-alarms-are-firing': '/cli/alarm-list/#check-from-a-script',
    'what-do-the-alarm-states-mean': '/cli/alarm-list/#usage'
  },
  '/cli/aws-profile-create/': {
    flags: '/cli/aws-profile-create/#options'
  },
  '/cli/aws-profile-delete/': {
    'arguments-reference': '/cli/aws-profile-delete/#options'
  },
  '/cli/aws-profile-list/': {
    'options-reference': '/cli/aws-profile-list/#options'
  },
  '/cli/aws-profile-update/': {
    'flags-reference': '/cli/aws-profile-update/#options'
  },
  '/cli/bastion-shell/': {
    'cli-reference': '/cli/bastion-shell/#options'
  },
  '/cli/bastion-tunnel/': {
    faq: '/cli/bastion-tunnel/#bastion-tunnel-faq',
    'flags-reference': '/cli/bastion-tunnel/#options'
  },
  '/cli/container-exec/': {
    'command-reference': '/cli/container-exec/#options',
    'multiple-containers-require-the---container-flag': '/cli/container-exec/#resource-contains-multiple-containers',
    'no-running-tasks-found': '/cli/container-exec/#no-running-task-was-found',
    'resource-is-not-a-container-workload': '/cli/container-exec/#resource-is-not-a-deployed-container-workload',
    'target-a-specific-container-in-a-multi-container-workload': '/cli/container-exec/#pick-the-task-and-the-container',
    'target-a-specific-task-in-a-scaled-out-service': '/cli/container-exec/#pick-the-task-and-the-container',
    'task-not-found': '/cli/container-exec/#task-was-not-found',
    'use-in-scripts-or-ci-pipelines': '/cli/container-exec/#use-it-in-a-script',
    'which-resource-types-work-with-container-exec':
      '/cli/container-exec/#resource-is-not-a-deployed-container-workload'
  },
  '/cli/container-shell/': {
    'arguments-reference': '/cli/container-shell/#options'
  },
  '/cli/defaults-list/': {
    'command-reference': '/cli/defaults-list/#options'
  },
  '/cli/defaults-set/': {
    'do-explicit-cli-flags-override-configured-defaults': '/cli/defaults-set/#usage',
    'flags-reference': '/cli/defaults-set/#options',
    'how-defaults-interact-with-cli-flags': '/cli/defaults-set/#usage'
  },
  '/cli/delete/': {
    'can-i-delete-a-stack-without-a-configuration-file': '/cli/delete/#beforedelete-hooks',
    'deletion-protection': '/cli/delete/#protected-stacks-and-resources',
    'how-do-i-delete-a-stack-in-a-cicd-pipeline': '/cli/delete/#usage',
    'how-do-i-delete-a-stack-with-termination-protection': '/cli/delete/#protected-stacks-and-resources',
    'lifecycle-hooks': '/cli/delete/#beforedelete-hooks',
    'termination-protection': '/cli/delete/#protected-stacks-and-resources'
  },
  '/cli/deploy/': {
    '--config': '/cli/deploy/#option-deploy-config',
    'all-flags': '/cli/deploy/#options',
    'deploy-everything-through-cloudformation': '/cli/deploy/#--full',
    'non-interactive-deploy-in-cicd': '/cli/deploy/#--yes'
  },
  '/cli/deployment-script-run/': {
    'arguments-reference': '/cli/deployment-script-run/#options'
  },
  '/cli/dev-network/': {
    'flags-reference': '/cli/dev-network/#options',
    'when-creating-the-network-failed': '/cli/dev-network/#deleting-the-dev-network'
  },
  '/cli/dev-stop/': {
    'flags-reference': '/cli/dev-stop/#options'
  },
  '/cli/dev/': {
    'supported-resource-types': '/cli/dev/#what-runs-where',
    'what-is-agent-mode-and-when-should-i-use-it': '/cli/dev/#--agent----agent-port',
    'what-it-does': '/cli/dev/#what-runs-where',
    'why-does-stacktape-dev-stop-with-free-plan-limit-reached': '/cli/dev/#free-plan-limit-reached'
  },
  '/cli/diff/': {
    'command-reference': '/cli/diff/#options',
    'does-diff-make-any-changes-to-my-stack': '/cli/diff/#what-diff-changes-in-aws',
    'does-diff-require-an-already-deployed-stack': '/cli/diff/#a-first-deployment-has-nothing-to-compare',
    'how-do-i-get-machine-readable-diff-output-for-scripts-or-pr-comments': '/cli/diff/#examples',
    'how-is-diff-different-from-synth': '/cli/diff/#a-first-deployment-has-nothing-to-compare',
    'how-it-works': '/cli/diff/#replaced-resources',
    'reading-the-output': '/cli/diff/#usage',
    'what-does-no-meaningful-stacktape-resource-changes-mean': '/cli/diff/#usage',
    'what-is-the-difference-between-will-replace-and-may-replace': '/cli/diff/#replaced-resources'
  },
  '/cli/domain-add/': {
    'arguments-reference': '/cli/domain-add/#options',
    'can-i-use-a-domain-registered-outside-aws': '/cli/domain-add/#what-it-does',
    'dns-managed-outside-aws': '/cli/domain-add/#what-it-does',
    'do-i-need-to-run-this-command-in-every-region': '/cli/domain-add/#what-it-does',
    'tls-certificates': '/cli/domain-add/#what-it-does',
    'what-happens-if-my-domain-is-not-yet-registered': '/cli/domain-add/#what-it-does'
  },
  '/cli/error-ignore/': {
    'flags-reference': '/cli/error-ignore/#options'
  },
  '/cli/error-list/': {
    'flags-reference': '/cli/error-list/#options'
  },
  '/cli/error-reopen/': {
    'arguments-reference': '/cli/error-reopen/#options'
  },
  '/cli/error-resolve/': {
    'flags-reference': '/cli/error-resolve/#options'
  },
  '/cli/help/': {
    'options-reference': '/cli/help/#options'
  },
  '/cli/incident-ack/': {
    'flags-reference': '/cli/incident-ack/#options'
  },
  '/cli/incident-list/': {
    'flags-reference': '/cli/incident-list/#options'
  },
  '/cli/incident-resolve/': {
    'flags-reference': '/cli/incident-resolve/#options'
  },
  '/cli/incident-show/': {
    'flags-reference': '/cli/incident-show/#options'
  },
  '/cli/incident-watch/': {
    'flags-reference': '/cli/incident-watch/#options'
  },
  '/cli/init/': {
    '--initialize-project-to': '/cli/init/#option-init-initialize-project-to',
    '--starter-id---starter-project': '/cli/init/#--starter-id---starter-project---initialize-project-to',
    'does-my-code-leave-my-machine': '/cli/init/#who-reads-your-code-and-what-leaves-your-machine',
    faq: '/cli/init/#init-faq',
    'how-do-i-run-init-non-interactively-in-ci-or-from-an-ai-coding-agent':
      '/cli/init/#can-i-run-init-from-ci-or-a-coding-agent',
    'what-does-try-it-here-first-run': '/cli/init/#what-happens-in-order',
    'what-happens-when-the-deploy-fails': '/cli/init/#what-happens-in-order',
    'who-reads-your-code': '/cli/init/#who-reads-your-code-and-what-leaves-your-machine',
    'why-does-it-barely-ask-me-anything': '/cli/init/#init-faq'
  },
  '/cli/login/': {
    faq: '/cli/login/#login-faq',
    'flags-reference': '/cli/login/#options'
  },
  '/cli/logout/': {
    'command-reference': '/cli/logout/#options'
  },
  '/cli/logs/': {
    'does-stacktape-logs-live-tail': '/cli/logs/#standard-mode',
    faq: '/cli/logs/#logs-faq',
    'flags-reference': '/cli/logs/#options',
    'how-do-i-filter-logs-for-errors-only': '/cli/logs/#filter',
    'how-far-back-can-i-fetch-logs': '/cli/logs/#starttime',
    'what-is-the-difference-between---filter-and---query': '/cli/logs/#filter',
    'what-is-the-difference-between---raw-and---agent': '/cli/logs/#logs-faq'
  },
  '/cli/mcp-add/': {
    'flags-reference': '/cli/mcp-add/#options'
  },
  '/cli/mcp-remove/': {
    'flags-reference': '/cli/mcp-remove/#options'
  },
  '/cli/mcp/': {
    faq: '/cli/mcp/#mcp-faq'
  },
  '/cli/metrics/': {
    'flags-reference': '/cli/metrics/#options',
    'supported-resource-types-and-metrics': '/cli/metrics/#supported-resources-and-metrics',
    'what-resource-types-support-metrics': '/cli/metrics/#supported-resources-and-metrics',
    'which---stat-should-i-use-for-a-given-metric': '/cli/metrics/#usage'
  },
  '/cli/org-create/': {
    'flags-reference': '/cli/org-create/#options'
  },
  '/cli/org-delete/': {
    'flags-reference': '/cli/org-delete/#options'
  },
  '/cli/org-list/': {
    'flags-reference': '/cli/org-list/#options'
  },
  '/cli/package/': {
    'command-reference': '/cli/package/#options',
    'does-package-use-caching': '/cli/package/#package-faq',
    faq: '/cli/package/#package-faq'
  },
  '/cli/param-get/': {
    'arguments-reference': '/cli/param-get/#options',
    faq: '/cli/param-get/#param-get-faq'
  },
  '/cli/project-create/': {
    'cli-reference': '/cli/project-create/#options',
    examples: '/cli/project-create/#usage'
  },
  '/cli/project-delete/': {
    'cli-reference': '/cli/project-delete/#options'
  },
  '/cli/project-list/': {
    'flags-reference': '/cli/project-list/#options'
  },
  '/cli/query-dynamodb/': {
    'cli-reference': '/cli/query-dynamodb/#options',
    faq: '/cli/query-dynamodb/#query-dynamodb-faq'
  },
  '/cli/query-opensearch/': {
    faq: '/cli/query-opensearch/#query-opensearch-faq',
    'flags-reference': '/cli/query-opensearch/#options'
  },
  '/cli/query-redis/': {
    'flags-reference': '/cli/query-redis/#options'
  },
  '/cli/query-sql/': {
    '-required': '/cli/query-sql/#sql-required',
    '-required-1': '/cli/query-sql/#sql-required',
    faq: '/cli/query-sql/#query-sql-faq',
    'flags-reference': '/cli/query-sql/#options'
  },
  '/cli/rollback/': {
    'arguments-reference': '/cli/rollback/#options',
    'can-i-roll-forward-after-a-rollback': '/cli/rollback/#how-rollback-works',
    'does-rollback-rebuild-my-code': '/cli/rollback/#how-rollback-works',
    faq: '/cli/rollback/#rollback-faq',
    'inspect-available-versions-first': '/cli/rollback/#--list-versions',
    'quick-rollback-after-a-bad-deploy': '/cli/rollback/#usage',
    'will-my-afterdeploy-hooks-run-during-rollback': '/cli/rollback/#safety-warnings'
  },
  '/cli/secret-delete/': {
    'arguments-reference': '/cli/secret-delete/#options',
    examples: '/cli/secret-delete/#usage'
  },
  '/cli/secret-get/': {
    'api-reference': '/cli/secret-get/#options'
  },
  '/cli/secret-set/': {
    'flags-reference': '/cli/secret-set/#options'
  },
  '/cli/stack-history/': {
    'flags-reference': '/cli/stack-history/#options'
  },
  '/cli/stack-list/': {
    'api-reference': '/cli/stack-list/#options'
  },
  '/cli/stack-recover/': {
    'arguments-reference': '/cli/stack-recover/#options',
    faq: '/cli/stack-recover/#stack-recover-faq',
    'when-should-i-use-stack-recover-instead-of-rollback': '/cli/stack-recover/#stack-recover-vs-rollback'
  },
  '/cli/stack-update-modules/': {
    'arguments-reference': '/cli/stack-update-modules/#options'
  },
  '/cli/status/': {
    'command-reference': '/cli/status/#options'
  },
  '/cli/synth/': {
    faq: '/cli/synth/#synth-faq',
    'flags-reference': '/cli/synth/#options',
    'the-synthesized-template-doesnt-match-what-i-expected--how-do-i-debug-it': '/cli/synth/#--keep-temp-files',
    'when-should-i-use-synth-vs-validate-vs-diff': '/cli/synth/#synth-vs-validate-vs-diff'
  },
  '/cli/upgrade/': {
    examples: '/cli/upgrade/#what-it-runs',
    flags: '/cli/upgrade/#options',
    'how-it-works': '/cli/upgrade/#what-it-runs',
    'what-happens-if-im-already-on-the-latest-version': '/cli/upgrade/#usage'
  },
  '/cli/validate/': {
    'can-i-use-validate-with-ai-agents-or-in-scripts': '/cli/validate/#validate-faq',
    'does-validate-create-or-modify-any-aws-resources': '/cli/validate/#thorough--add---thorough',
    faq: '/cli/validate/#validate-faq',
    'flags-reference': '/cli/validate/#options',
    'how-is-validate-different-from-synth': '/cli/validate/#validate-faq',
    'what-errors-does---thorough-catch-that-the-default-level-misses': '/cli/validate/#validation-levels'
  },
  '/cli/version/': {
    faq: '/cli/version/#version-faq',
    'flags-reference': '/cli/version/#options'
  },
  '/cli/whoami/': {
    flags: '/cli/whoami/#options'
  },
  '/configuration/configuration-files/': {
    'can-i-switch-from-yaml-to-typescript': '/configuration/configuration-files/#typescript-or-yaml',
    'choosing-a-format': '/configuration/configuration-files/#typescript-or-yaml',
    'conditional-logic-and-loops': '/configuration/configuration-files/#per-stage-values-and-generated-resources',
    'config-file-detection': '/configuration/configuration-files/#which-file-is-used',
    'config-file-structure': '/configuration/configuration-files/#top-level-fields',
    'directives-in-configuration': '/configuration/configuration-files/#directives',
    'how-typescript-maps-to-yaml': '/configuration/configuration-files/#typescript-or-yaml',
    'should-i-use-typescript-or-yaml-for-my-stacktape-config': '/configuration/configuration-files/#typescript-or-yaml',
    'splitting-config-across-files': '/configuration/configuration-files/#per-stage-values-and-generated-resources',
    'typescript-configuration': '/configuration/configuration-files/#typescript-or-yaml',
    'yaml-configuration': '/configuration/configuration-files/#typescript-or-yaml'
  },
  '/configuration/connecting-resources/': {
    'shared-network-for-non-production-stages': '/configuration/shared-network/',
    'can-i-grant-read-only-or-otherwise-narrower-access-with-connectto':
      '/configuration/connecting-resources/#custom-permissions-with-iamrolestatements',
    faq: '/configuration/connecting-resources/#connecting-resources-faq',
    'how-does-connectto-differ-from-manually-setting-environment-variables':
      '/configuration/connecting-resources/#how-does-connectto-differ-from-setting-environment-variables-myself',
    'what-is-the-difference-between-iam-permissions-and-security-groups':
      '/configuration/connecting-resources/#what-connectto-does',
    'why-cant-my-lambda-function-reach-the-database-i-connected-to':
      '/configuration/connecting-resources/#why-does-the-deploy-say-my-function-cannot-connect-to-vpc-only-resources'
  },
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
    'when-should-i-use-file-vs-cliargs-for-external-configuration': '/configuration/directives/#file',
    'deploy-time-parameters-faq': '/configuration/directives/#directives-faq',
    faq: '/configuration/directives/#directives-faq'
  },
  '/configuration/hooks-and-scripts/': {
    'release-command-database-migrations': '/deployment-and-lifecycle/release-commands/',
    'hooks-run-a-script-before-or-after-a-command': '/configuration/hooks-and-scripts/#hooks',
    'deployment-script-run-code-inside-aws': '/configuration/hooks-and-scripts/#deployment-scripts',
    'basic-hook-example': '/configuration/hooks-and-scripts/#hooks',
    'bastion-scripts': '/configuration/hooks-and-scripts/#scripts',
    'build-before-deploy': '/configuration/hooks-and-scripts/#hooks',
    'can-i-pass-secrets-to-deployment-scripts': '/configuration/hooks-and-scripts/#deployment-scripts',
    'database-migrations--choosing-the-right-approach': '/configuration/hooks-and-scripts/#choose-the-right-tool',
    'how-do-i-access-a-private-database-from-a-deployment-script': '/configuration/hooks-and-scripts/#scripts',
    'how-do-i-run-a-database-migration-on-deploy': '/configuration/hooks-and-scripts/#hooks',
    'how-do-i-run-a-script-against-a-private-vpc-only-database': '/configuration/hooks-and-scripts/#scripts',
    'how-long-can-a-deployment-script-run': '/configuration/hooks-and-scripts/#deployment-scripts',
    'local-scripts': '/configuration/hooks-and-scripts/#scripts',
    'local-scripts-with-bastion-tunneling': '/configuration/hooks-and-scripts/#local-script-with-bastion-tunneling',
    'running-deployment-scripts-manually': '/configuration/hooks-and-scripts/#running-scripts-manually',
    'shared-script-properties': '/configuration/hooks-and-scripts/#environment-variables-in-scripts',
    'skipping-hooks-in-ci-or-locally': '/configuration/hooks-and-scripts/#conditional-execution',
    'using-assumeroleofresource': '/configuration/hooks-and-scripts/#environment-variables-in-scripts',
    'what-happens-if-my-afterdeploy-hook-fails': '/configuration/hooks-and-scripts/#when-a-hook-fails',
    'when-should-i-use-hooks-vs-deployment-scripts': '/configuration/hooks-and-scripts/#deployment-scripts',
    'when-to-use-hooks-vs-deployment-scripts': '/configuration/hooks-and-scripts/#deployment-scripts'
  },
  '/configuration/overrides-and-escape-hatches/': {
    faq: '/configuration/overrides-and-escape-hatches/#overrides-and-escape-hatches-faq',
    'why-this-exists': '/configuration/overrides-and-escape-hatches/#overrides-and-escape-hatches-faq'
  },
  '/configuration/referenceable-parameters/': {
    agentcore: '/configuration/referenceable-parameters/#agentcore-runtime',
    faq: '/configuration/referenceable-parameters/#referenceable-parameters-faq'
  },
  '/configuration/resources/': {
    faq: '/configuration/resources/#declaring-resources-faq',
    'resources-faq': '/configuration/resources/#declaring-resources-faq'
  },
  '/configuration/secrets/': {
    'can-i-rotate-secrets-automatically': '/configuration/secrets/#secrets-manager-or-ssm-parameter-store',
    'creating-secrets': '/configuration/secrets/#create-a-secret',
    'delete-a-secret': '/configuration/secrets/#update-and-rotate',
    'how-secret-resolution-works': '/configuration/secrets/#update-and-rotate',
    'native-secret-injection-for-containers': '/configuration/secrets/#use-it-in-a-container',
    'referencing-secrets-with-secret': '/configuration/secrets/#use-it-elsewhere',
    'retrieving-and-managing-secrets': '/configuration/secrets/#create-a-secret',
    'update-a-secret': '/configuration/secrets/#update-and-rotate',
    'using-the-stacktape-console': '/configuration/secrets/#create-a-secret',
    'what-happens-if-a-referenced-secret-does-not-exist': '/configuration/secrets/#when-a-secret-does-not-exist',
    'where-can-i-use-secret-in-my-config': '/configuration/secrets/#use-it-in-a-container',
    'why-do-my-workloads-still-use-the-old-secret-value-after-i-updated-it': '/configuration/secrets/#update-and-rotate'
  },
  '/configuration/stages-and-environments/': {
    faq: '/configuration/stages-and-environments/#stages-and-environments-faq'
  },
  '/configuration/variables-and-reuse/': {
    'can-i-generate-resources-dynamically-in-a-loop': '/configuration/variables-and-reuse/#other-typescript-patterns',
    faq: '/configuration/variables-and-reuse/#variables-and-reuse-faq',
    'how-do-i-share-configuration-across-multiple-stacktape-projects':
      '/configuration/variables-and-reuse/#shared-modules-across-projects'
  },
  '/deployment-and-lifecycle/code-swap/': {
    'memory-and-request-failures': '/deployment-and-lifecycle/code-swap/#memory-and-failed-requests',
    'supported-services': '/deployment-and-lifecycle/code-swap/#several-services'
  },
  '/deployment-and-lifecycle/deploying-stacks/': {
    'cloudformation-stack-states': '/deployment-and-lifecycle/deploying-stacks/#stack-states',
    deploy: '/deployment-and-lifecycle/deploying-stacks/#what-a-deploy-does',
    'deploying-from-the-stacktape-console': '/deployment-and-lifecycle/deploying-stacks/#deploy-from-git',
    'deployment-confirmation': '/deployment-and-lifecycle/deploying-stacks/#run-a-deploy',
    'deployment-is-slow': '/deployment-and-lifecycle/deploying-stacks/#deploys-are-slow',
    'deployment-modes': '/deployment-and-lifecycle/deploying-stacks/#fast-deployments',
    'dev-mode-and-deployment': '/deployment-and-lifecycle/deploying-stacks/#dev-mode-and-deploy',
    'do-fast-deployments-cause-cloudformation-drift': '/deployment-and-lifecycle/deploying-stacks/#deploys-are-slow',
    'do-i-have-to-choose-between-a-fast-and-a-full-deployment':
      '/deployment-and-lifecycle/deploying-stacks/#fast-deployments',
    'full-deployment': '/deployment-and-lifecycle/deploying-stacks/#fast-deployments',
    'how-deployment-works': '/deployment-and-lifecycle/deploying-stacks/#what-a-deploy-does',
    'how-long-does-a-stacktape-deployment-take': '/deployment-and-lifecycle/deploying-stacks/#deploys-are-slow',
    'key-options': '/deployment-and-lifecycle/deploying-stacks/#run-a-deploy',
    'package-and-prepare-template': '/deployment-and-lifecycle/deploying-stacks/#what-a-deploy-does',
    'post-deploy': '/deployment-and-lifecycle/deploying-stacks/#run-a-deploy',
    'release-commands': '/deployment-and-lifecycle/deploying-stacks/#what-a-deploy-does',
    'running-a-deployment': '/deployment-and-lifecycle/deploying-stacks/#run-a-deploy',
    'secrets-prompt-blocking-cicd': '/deployment-and-lifecycle/deploying-stacks/#missing-secrets-fail-the-deploy-in-ci',
    'stack-is-in-rollback_complete-state': '/deployment-and-lifecycle/deploying-stacks/#stack-is-in-rollback_complete',
    upload: '/deployment-and-lifecycle/deploying-stacks/#what-a-deploy-does',
    'validate-and-prepare': '/deployment-and-lifecycle/deploying-stacks/#what-a-deploy-does',
    'what-happens-if-a-cloudformation-deployment-fails-midway':
      '/deployment-and-lifecycle/deploying-stacks/#when-a-deployment-fails'
  },
  '/deployment-and-lifecycle/destroying-stacks/': {
    'can-i-delete-a-stack-without-the-original-config-file':
      '/deployment-and-lifecycle/destroying-stacks/#delete-a-stage',
    'handling-failed-deletions': '/deployment-and-lifecycle/destroying-stacks/#when-a-delete-fails',
    'how-deletion-works': '/deployment-and-lifecycle/destroying-stacks/#what-happens-in-order',
    'how-do-i-prevent-team-members-from-accidentally-deleting-production':
      '/deployment-and-lifecycle/destroying-stacks/#protect-a-production-stage',
    'termination-protection': '/deployment-and-lifecycle/destroying-stacks/#protect-a-production-stage',
    'using-the-cli': '/deployment-and-lifecycle/destroying-stacks/#delete-a-stage',
    'what-gets-deleted': '/deployment-and-lifecycle/destroying-stacks/#what-happens-in-order',
    'what-if-my-stack-is-stuck-in-delete_failed': '/deployment-and-lifecycle/destroying-stacks/#when-a-delete-fails',
    'when-to-delete-vs-when-to-keep': '/deployment-and-lifecycle/destroying-stacks/#delete-or-keep-a-stage'
  },
  '/deployment-and-lifecycle/gradual-deployments/': {
    'basic-lambda-example': '/deployment-and-lifecycle/gradual-deployments/#turn-it-on-for-a-function',
    'basic-web-service-example': '/deployment-and-lifecycle/gradual-deployments/#turn-it-on-for-a-web-service',
    'can-i-customize-the-canary-percentage-or-timing': '/deployment-and-lifecycle/gradual-deployments/#strategies',
    'can-i-use-gradual-deployments-with-http-api-gateway':
      '/deployment-and-lifecycle/gradual-deployments/#turn-it-on-for-a-web-service',
    'choosing-a-strategy': '/deployment-and-lifecycle/gradual-deployments/#strategies',
    'container-lifecycle-hooks-and-test-listener':
      '/deployment-and-lifecycle/gradual-deployments/#turn-it-on-for-a-web-service',
    'container-workload-strategies': '/deployment-and-lifecycle/gradual-deployments/#turn-it-on-for-a-web-service',
    'lambda-lifecycle-hooks': '/deployment-and-lifecycle/gradual-deployments/#turn-it-on-for-a-function',
    'strategy-reference': '/deployment-and-lifecycle/gradual-deployments/#strategies',
    'strategy-reference-1': '/deployment-and-lifecycle/gradual-deployments/#strategies'
  },
  '/deployment-and-lifecycle/multi-region-deployments/': {
    'active-active': '/deployment-and-lifecycle/multi-region-deployments/#data-and-dns',
    'active-passive-failover': '/deployment-and-lifecycle/multi-region-deployments/#patterns',
    'can-i-use-the-same-stage-name-in-multiple-regions':
      '/deployment-and-lifecycle/multi-region-deployments/#deploy-to-two-regions',
    'cross-region-data-considerations': '/deployment-and-lifecycle/multi-region-deployments/#data-and-dns',
    'deleting-multi-region-stacks': '/deployment-and-lifecycle/multi-region-deployments/#operate-each-region',
    'how-do-custom-domains-and-dns-routing-work-with-multi-region':
      '/deployment-and-lifecycle/multi-region-deployments/#patterns',
    'how-do-i-keep-databases-in-sync-across-regions':
      '/deployment-and-lifecycle/multi-region-deployments/#data-and-dns',
    'how-many-regions-can-i-deploy-to': '/deployment-and-lifecycle/multi-region-deployments/#deploy-to-two-regions',
    'monitoring-multi-region-stacks': '/deployment-and-lifecycle/multi-region-deployments/#operate-each-region',
    'multi-region-patterns': '/deployment-and-lifecycle/multi-region-deployments/#patterns',
    'region-per-audience': '/deployment-and-lifecycle/multi-region-deployments/#patterns',
    'restricting-allowed-regions': '/deployment-and-lifecycle/multi-region-deployments/#automate-the-deploys',
    'sharing-configuration-across-regions':
      '/deployment-and-lifecycle/multi-region-deployments/#vary-the-config-by-region',
    'what-happens-if-one-regions-deployment-fails':
      '/deployment-and-lifecycle/multi-region-deployments/#automate-the-deploys'
  },
  '/deployment-and-lifecycle/previewing-changes/': {
    actions: '/deployment-and-lifecycle/previewing-changes/#read-the-output',
    'agent-mode-output': '/deployment-and-lifecycle/previewing-changes/#read-the-output',
    highlights: '/deployment-and-lifecycle/previewing-changes/#read-the-output',
    'how-diff-works': '/deployment-and-lifecycle/previewing-changes/#run-a-preview',
    'no-changes-detected': '/deployment-and-lifecycle/previewing-changes/#unexpected-changes',
    'preview-shows-changes-you-didnt-make': '/deployment-and-lifecycle/previewing-changes/#unexpected-changes',
    'preview-takes-a-long-time': '/deployment-and-lifecycle/previewing-changes/#run-a-preview',
    'reading-the-output': '/deployment-and-lifecycle/previewing-changes/#read-the-output',
    'running-a-preview': '/deployment-and-lifecycle/previewing-changes/#run-a-preview',
    'stack-does-not-exist-error': '/deployment-and-lifecycle/previewing-changes/#run-a-preview',
    'using-preview-in-cicd': '/deployment-and-lifecycle/previewing-changes/#run-a-preview',
    'what-the-command-does-and-does-not-modify': '/deployment-and-lifecycle/previewing-changes/#run-a-preview',
    'whats-the-difference-between-diff-and-terraform-plan':
      '/deployment-and-lifecycle/previewing-changes/#diff-synth-and-the-deploy-plan',
    'whats-the-difference-between-will-replace-and-may-replace':
      '/deployment-and-lifecycle/previewing-changes/#read-the-output'
  },
  '/deployment-and-lifecycle/release-commands/': {
    'running-it-only-when-something-changed':
      '/deployment-and-lifecycle/release-commands/#run-it-only-when-something-changed'
  },
  '/deployment-and-lifecycle/rollbacks/': {
    'artifact-retention': '/deployment-and-lifecycle/rollbacks/#how-many-releases-you-can-return-to',
    'basic-usage': '/deployment-and-lifecycle/rollbacks/#roll-back-to-an-earlier-release',
    'basic-usage-1': '/deployment-and-lifecycle/rollbacks/#recover-a-failed-update',
    'can-i-roll-forward-after-a-rollback': '/deployment-and-lifecycle/rollbacks/#roll-back-to-an-earlier-release',
    'cloudformation-rollback': '/deployment-and-lifecycle/rollbacks/#recover-a-failed-update',
    'does-cloudformation-rollback-always-succeed': '/deployment-and-lifecycle/rollbacks/#recover-a-failed-update',
    'how-do-i-know-which-version-to-roll-back-to':
      '/deployment-and-lifecycle/rollbacks/#roll-back-to-an-earlier-release',
    'how-it-works': '/deployment-and-lifecycle/rollbacks/#roll-back-to-an-earlier-release',
    'listing-available-versions': '/deployment-and-lifecycle/rollbacks/#roll-back-to-an-earlier-release',
    'rollback-safety-warnings': '/deployment-and-lifecycle/rollbacks/#what-a-rollback-does-not-undo',
    'version-rollback': '/deployment-and-lifecycle/rollbacks/#roll-back-to-an-earlier-release',
    'what-happens-to-my-database-during-a-rollback':
      '/deployment-and-lifecycle/rollbacks/#what-a-rollback-does-not-undo',
    'whats-the-difference-between-stacktape-rollback-and-stacktape-stack-recover':
      '/deployment-and-lifecycle/rollbacks/#recover-a-failed-update',
    'why-cant-i-roll-back-to-an-old-version': '/deployment-and-lifecycle/rollbacks/#roll-back-to-an-earlier-release'
  },
  '/getting-started/': {
    'install-the-package': '/configuration/configuration-files/#typescript-or-yaml',
    'your-first-stacktapets': '/configuration/configuration-files/#a-minimal-config',
    'adapt-config-per-stage': '/configuration/stages-and-environments/#stage-aware-configuration',
    'context-properties': '/configuration/stages-and-environments/#config-callback-parameters',
    'quick-start-with-stacktape-init': '/getting-started/#run-it-in-your-apps-directory',
    'beyond-resources': '/configuration/configuration-files/#top-level-fields',
    'next-step': '/getting-started/#what-happens-next'
  },
  '/getting-started/deploy-an-existing-app/': {
    prerequisites: '/getting-started/deploy-an-existing-app/#before-you-start',
    'step-1-set-up-aws-credentials': '/getting-started/aws-credentials/',
    'step-2-deploy': '/getting-started/deploy-an-existing-app/#4-deploy',
    'what-happens-during-deploy': '/deployment-and-lifecycle/deploying-stacks/#what-a-deploy-does',
    'deploy-output': '/getting-started/deploy-an-existing-app/#4-deploy',
    'add-the-console-optional': '/getting-started/deploy-an-existing-app/#add-the-console',
    'verifying-the-deploy': '/getting-started/deploy-an-existing-app/#its-live',
    'redeploying-after-changes': '/deployment-and-lifecycle/deploying-stacks/#run-a-deploy',
    'code-only-changes-deploy-in-seconds': '/deployment-and-lifecycle/deploying-stacks/#fast-deployments',
    'deploying-multiple-stages': '/configuration/stages-and-environments/#deploying-a-stage',
    troubleshooting: '/getting-started/deploy-an-existing-app/#if-something-goes-wrong',
    'no-aws-credentials-found': '/getting-started/deploy-an-existing-app/#aws-rejects-the-credentials',
    'deploy-takes-longer-than-expected': '/deployment-and-lifecycle/deploying-stacks/#deploys-are-slow',
    'how-long-does-a-first-deploy-take': '/deployment-and-lifecycle/deploying-stacks/#deploys-are-slow',
    'does-stacktape-cost-money-to-use-with-aws': '/getting-started/deploy-an-existing-app/#what-the-deploy-costs',
    'can-i-preview-what-a-deploy-will-change-before-running-it': '/deployment-and-lifecycle/previewing-changes/',
    'belongs-to-aws-account--which-is-not-connected': '/getting-started/deploy-an-existing-app/#4-deploy',
    'can-i-deploy-to-any-aws-region': '/getting-started/deploy-an-existing-app/#deploy-from-your-terminal-instead',
    'step-2-connect-your-aws-account': '/getting-started/deploy-an-existing-app/#add-the-console',
    'step-3-deploy': '/getting-started/deploy-an-existing-app/#4-deploy',
    'what-the-connection-creates': '/getting-started/deploy-an-existing-app/#deploy-from-your-terminal-instead',
    'whats-the-difference-between-stages-and-aws-accounts': '/getting-started/deploy-an-existing-app/#4-deploy'
  },
  '/getting-started/open-source-cli/': {
    faq: '/getting-started/open-source-cli/#use-the-cli-without-an-account-faq'
  },
  '/guardrails/databases/': {
    'engine-restriction': '/guardrails/databases/#allowed-database-engines',
    'instance-restriction': '/guardrails/databases/#allowed-database-instance-sizes'
  },
  '/guardrails/overview/': {
    'deployment-restrictions': '/guardrails/overview/#what-guardrails-check-and-when',
    'how-guardrails-work': '/guardrails/overview/#what-guardrails-check-and-when',
    'managing-guardrails': '/guardrails/overview/#what-guardrails-check-and-when',
    'resource-limits': '/guardrails/overview/#all-guardrails',
    'security-and-data-protection': '/guardrails/overview/#all-guardrails',
    'what-is-the-difference-between-blocking-a-resource-type-and-blocking-a-database-engine':
      '/guardrails/overview/#all-guardrails'
  },
  '/guardrails/resource-limits/': {
    'how-does-the-resource-count-limit-relate-to-aws-cloudformation-limits':
      '/guardrails/resource-limits/#stacktape-resource-count-limit',
    'resource-count-limit': '/guardrails/resource-limits/#stacktape-resource-count-limit',
    'will-a-guardrail-block-functions-that-dont-set-memory-or-timeout-explicitly':
      '/guardrails/resource-limits/#function-memory-limit'
  },
  '/guardrails/security-and-data-protection/': {
    'require-deletion-protection': '/guardrails/security-and-data-protection/#protect-databases-from-deletion',
    'require-multiple-container-instances': '/guardrails/security-and-data-protection/#require-two-container-instances',
    'require-stack-termination-protection': '/guardrails/security-and-data-protection/#protect-stacks-from-deletion',
    'require-vpc-databases': '/guardrails/security-and-data-protection/#keep-sql-and-opensearch-private',
    'require-waf': '/guardrails/security-and-data-protection/#require-waf-on-application-load-balancers',
    'what-does-the-require-waf-guardrail-actually-protect-against':
      '/guardrails/security-and-data-protection/#require-waf-on-application-load-balancers',
    'what-is-the-difference-between-deletion-protection-and-backups':
      '/guardrails/security-and-data-protection/#require-recoverable-data-stores',
    'what-is-vpc-only-database-accessibility':
      '/guardrails/security-and-data-protection/#keep-sql-and-opensearch-private'
  },
  '/local-development/debugging-lambda-functions/': {
    faq: '/local-development/debugging-lambda-functions/#debugging-lambda-functions-faq',
    'using-deployed-databases': '/local-development/debugging-lambda-functions/#using-a-database-in-aws'
  },
  '/local-development/dev-mode-overview/': {
    'the-edit-save-see-loop': '/local-development/dev-mode-overview/#change-code-and-see-it',
    'enable-file-watching': '/local-development/dev-mode-overview/#change-code-and-see-it',
    'useful-flags': '/local-development/dev-mode-overview/#flags',
    'agent-mode': '/local-development/dev-mode-overview/#agent-mode-for-coding-agents',
    'next-step': '/local-development/dev-mode-overview/#next-steps',
    'command-reference': '/local-development/dev-mode-overview/#flags',
    'connect-to-a-deployed-database-instead': '/local-development/dev-mode-overview/#use-a-database-in-aws-instead',
    'dev-mode-overview-faq': '/local-development/dev-mode-overview/#dev-mode-faq',
    'disabling-tunnels': '/local-development/dev-mode-overview/#keep-deployed-functions-away-from-local-databases',
    'do-i-need-docker-installed-for-dev-mode': '/local-development/dev-mode-overview/#what-you-need',
    'exclude-resources': '/local-development/dev-mode-overview/#run-part-of-the-stack',
    faq: '/local-development/dev-mode-overview/#dev-mode-faq',
    'how-dev-mode-works': '/local-development/dev-mode-overview/#start-dev-mode',
    'how-do-i-reset-my-local-database-data': '/local-development/dev-mode-overview/#local-database-emulation',
    'rebuilding-workloads': '/local-development/dev-mode-overview/#keyboard-shortcuts',
    'run-all-resources': '/local-development/dev-mode-overview/#start-dev-mode',
    'run-specific-resources': '/local-development/dev-mode-overview/#flags',
    'running-dev-mode': '/local-development/dev-mode-overview/#start-dev-mode',
    'startup-flow': '/local-development/dev-mode-overview/#what-happens-when-it-starts',
    'watch-mode': '/local-development/dev-mode-overview/#change-code-and-see-it',
    'which-resource-types-does-dev-mode-support-and-what-isnt-emulated-locally':
      '/local-development/dev-mode-overview/#what-runs-where'
  },
  '/local-development/local-databases/': {
    faq: '/local-development/local-databases/#local-databases-faq',
    'when-to-use-remote-databases': '/local-development/local-databases/#using-remote-databases'
  },
  '/managing-costs/budgets/': {
    'do-budget-alerts-stop-aws-from-charging-me': '/managing-costs/budgets/#budgets-faq',
    faq: '/managing-costs/budgets/#budgets-faq',
    'should-i-use-budgets-guardrails-or-both': '/managing-costs/budgets/#why-isnt-my-forecast-alert-arriving'
  },
  '/managing-costs/dashboards/': {
    'costs-per-stack': '/managing-costs/dashboards/#the-costs-page',
    'per-resource-breakdown': '/managing-costs/dashboards/#a-stages-costs',
    'identify-expensive-resources': '/managing-costs/dashboards/#a-stages-costs',
    'compare-stages': '/managing-costs/dashboards/#the-costs-page',
    'set-budget-alerts-based-on-real-data': '/managing-costs/budgets/',
    'does-this-include-stacktapes-subscription-fee': '/managing-costs/dashboards/#the-costs-page',
    'how-does-this-differ-from-aws-cost-explorer':
      '/managing-costs/dashboards/#how-is-this-different-from-aws-cost-explorer',
    'can-i-compare-costs-across-multiple-aws-accounts': '/managing-costs/dashboards/#the-costs-page',
    'can-i-set-up-alerts-when-costs-exceed-a-threshold': '/managing-costs/dashboards/#cost-dashboards-faq',
    'does-stacktape-add-any-markup-to-aws-costs': '/managing-costs/dashboards/#cost-dashboards-faq',
    filters: '/managing-costs/dashboards/#the-costs-page',
    'how-far-back-can-i-view-cost-data': '/managing-costs/dashboards/#cost-dashboards-faq',
    'how-far-back-can-i-view-cost-history': '/managing-costs/dashboards/#cost-dashboards-faq',
    'how-is-this-different-from-the-aws-billing-console':
      '/managing-costs/dashboards/#how-is-this-different-from-aws-cost-explorer',
    'how-often-is-cost-data-updated': '/managing-costs/dashboards/#cost-dashboards-faq',
    'per-resource-cost-breakdown-faq': '/managing-costs/dashboards/#cost-dashboards-faq',
    'why-is-no-cost-data-showing-for-my-stack': '/managing-costs/dashboards/#cost-dashboards-faq'
  },
  '/managing-costs/optimization-tips/': {
    faq: '/managing-costs/optimization-tips/#cost-optimization-tips-faq'
  },
  '/managing-costs/overview/': {
    'are-aws-costs-billed-through-stacktape': '/managing-costs/overview/#costs-faq',
    'how-long-does-it-take-for-cost-data-to-appear-and-how-often-does-it-refresh':
      '/managing-costs/overview/#costs-faq',
    'managing-costs-overview-faq': '/managing-costs/overview/#costs-faq',
    'reducing-costs': '/managing-costs/overview/#costs-faq',
    'viewing-costs': '/managing-costs/overview/#costs-faq',
    'what-aws-services-typically-cost-the-most-in-stacktape-deployments': '/managing-costs/overview/#costs-faq'
  },
  '/observability/alarms/': {
    'can-i-alarm-on-custom-cloudwatch-metrics-from-my-application':
      '/observability/alarms/#can-i-alarm-on-a-custom-metric-my-application-publishes',
    'can-i-set-different-alarm-thresholds-for-production-vs-development':
      '/observability/alarms/#can-i-set-different-thresholds-for-production-and-development',
    faq: '/observability/alarms/#alarms-faq',
    'how-do-i-avoid-false-alarms-from-short-traffic-spikes': '/observability/alarms/#evaluation-windows',
    'how-do-i-test-that-my-alarms-work': '/observability/alarms/#how-do-i-test-that-an-alarm-works',
    'where-do-i-change-an-alarm-rule': '/observability/alarms/#migrating-legacy-console-alarm-rules'
  },
  '/observability/alert-channels/': {
    'can-i-send-alerts-to-multiple-slack-channels': '/observability/alert-channels/#the-channel-page',
    'can-i-use-the-same-channel-for-alarms-notifications-and-budgets':
      '/observability/alert-channels/#create-a-channel',
    'channel-types': '/observability/alert-channels/#create-a-channel',
    'creating-a-channel-in-the-console': '/observability/alert-channels/#create-a-channel',
    discord: '/observability/alert-channels/#teams-and-discord',
    'how-do-i-tell-whether-an-alert-was-actually-delivered': '/observability/alert-channels/#the-channel-page',
    'is-there-a-cli-command-for-managing-alert-channels':
      '/observability/alert-channels/#use-a-channel-from-your-config',
    'microsoft-teams': '/observability/alert-channels/#teams-and-discord',
    'slack-stacktape-app': '/observability/alert-channels/#what-stacktape-sends-to-slack',
    'using-channels-with-rules': '/observability/alert-channels/#use-a-channel-from-your-config'
  },
  '/observability/alert-history/': {
    'an-alert-shows-1-of-3-failed-did-my-team-get-it': '/observability/alert-history/#find-an-alert-that-didnt-arrive',
    'can-i-see-sent-alerts-from-the-cli': '/observability/alert-history/#other-history',
    'delivery-details': '/observability/alert-history/#find-an-alert-that-didnt-arrive',
    'other-history-pages': '/observability/alert-history/#other-history',
    'why-is-an-event-i-expected-missing': '/observability/alert-history/#find-an-alert-that-didnt-arrive'
  },
  '/observability/debug-commands/': {
    'agent-mode': '/observability/debug-commands/#use-them-from-a-coding-agent',
    'can-i-pipe-debug-command-output-to-other-tools': '/observability/debug-commands/#use-them-from-a-coding-agent',
    'cloudwatch-logs-insights-queries': '/observability/debug-commands/#logs-and-metrics',
    'command-overview': '/observability/debug-commands/#pick-a-command',
    'customizing-the-query': '/observability/debug-commands/#query-a-database',
    'executing-commands-in-containers': '/observability/debug-commands/#get-into-a-container',
    'how-do-i-debug-a-vpc-only-database-without-a-bastion': '/observability/debug-commands/#query-a-database',
    'how-do-i-know-which-metrics-are-available-for-my-resource': '/observability/debug-commands/#logs-and-metrics',
    'interactive-container-shell': '/observability/debug-commands/#get-into-a-container',
    'time-range': '/observability/debug-commands/#logs-and-metrics',
    'viewing-logs': '/observability/debug-commands/#logs-and-metrics',
    'viewing-metrics': '/observability/debug-commands/#logs-and-metrics',
    'whats-the-difference-between-container-exec-and-container-shell':
      '/observability/debug-commands/#get-into-a-container'
  },
  '/observability/debugging-containers/': {
    'can-i-debug-containers-in-dev-mode': '/observability/debugging-containers/#workloads-with-several-containers',
    'choosing-the-right-command': '/observability/debugging-containers/#run-one-command',
    'common-use-cases': '/observability/debugging-containers/#open-a-shell',
    'do-these-commands-use-ssh-and-do-i-need-to-open-any-ports':
      '/observability/debugging-containers/#turn-on-remote-sessions-first',
    'does-not-have-a-deployed-ecs-service': '/observability/debugging-containers/#turn-on-remote-sessions-first',
    'interactive-shell-sessions': '/observability/debugging-containers/#open-a-shell',
    'multi-container-workloads': '/observability/debugging-containers/#workloads-with-several-containers',
    'multiple-running-tasks': '/observability/debugging-containers/#no-running-tasks-found-for-this-resource',
    'my-session-opens-and-immediately-closes--whats-wrong':
      '/observability/debugging-containers/#the-shell-opens-and-closes-right-away',
    prerequisites: '/observability/debugging-containers/#turn-on-remote-sessions-first',
    'running-one-off-commands': '/observability/debugging-containers/#run-one-command',
    'scripting-and-automation': '/observability/debugging-containers/#run-one-command',
    'session-disconnects-immediately': '/observability/debugging-containers/#the-shell-opens-and-closes-right-away',
    'supported-resources': '/observability/debugging-containers/#turn-on-remote-sessions-first',
    'targeting-a-specific-task': '/observability/debugging-containers/#run-one-command',
    'why-do-i-get-an-error-listing-container-names':
      '/observability/debugging-containers/#the-shell-opens-and-closes-right-away'
  },
  '/observability/error-tracking/': {
    'changing-issue-status': '/observability/error-tracking/#manage-errors-from-the-cli',
    filtering: '/observability/error-tracking/#triage-errors-in-the-console',
    'how-do-i-turn-error-tracking-off-for-a-stack':
      '/observability/error-tracking/#turn-it-off-or-limit-it-to-some-stages',
    'issue-statuses': '/observability/error-tracking/#triage-errors-in-the-console',
    'issue-table': '/observability/error-tracking/#triage-errors-in-the-console',
    'listing-issues': '/observability/error-tracking/#manage-errors-from-the-cli',
    'managing-issues-from-the-cli': '/observability/error-tracking/#manage-errors-from-the-cli',
    'migrating-to-v4': '/observability/error-tracking/#upgrading-from-v3',
    'turning-error-tracking-off-or-limiting-stages':
      '/observability/error-tracking/#turn-it-off-or-limit-it-to-some-stages',
    'viewing-issues-in-the-console': '/observability/error-tracking/#triage-errors-in-the-console',
    'why-arent-my-issues-showing-up': '/observability/error-tracking/#errors-dont-show-up'
  },
  '/observability/incident-ai/': {
    'ai-assessment-investigation-and-fixes-faq': '/observability/incident-ai/#ai-investigation-and-fixes-faq',
    'can-a-viewer-start-a-run': '/observability/incident-ai/#roles',
    'can-i-use-it-without-connecting-a-git-repository': '/observability/incident-ai/#fix-with-ai',
    'can-stacktape-change-my-main-branch': '/observability/incident-ai/#what-happens-when-a-run-fails',
    'can-the-agent-change-my-aws-resources': '/observability/incident-ai/#investigate-with-ai',
    'does-investigate-or-fix-deploy-anything': '/observability/incident-ai/#fix-with-ai',
    'does-the-briefing-change-the-incidents-severity-or-alerts': '/observability/incident-ai/#automatic-briefing',
    faq: '/observability/incident-ai/#ai-investigation-and-fixes-faq',
    'is-my-source-code-sent-to-the-ai-provider': '/observability/incident-ai/#what-leaves-your-aws-account'
  },
  '/observability/log-forwarding/': {
    'can-i-forward-logs-from-any-resource-type': '/observability/log-forwarding/#can-i-forward-only-some-logs',
    'can-i-use-a-custom-http-endpoint-for-grafana-cloud-logs':
      '/observability/log-forwarding/#forwarding-to-a-custom-http-endpoint',
    'choosing-a-destination': '/observability/log-forwarding/#supported-destinations',
    'failure-handling': '/observability/log-forwarding/#when-delivery-fails',
    faq: '/observability/log-forwarding/#log-forwarding-faq',
    'how-much-does-kinesis-data-firehose-cost': '/observability/log-forwarding/#log-forwarding-faq',
    'should-i-use-the-datadog-type-or-http-endpoint-type-for-datadog':
      '/observability/log-forwarding/#forwarding-to-a-custom-http-endpoint',
    'what-happens-if-my-endpoint-is-down': '/observability/log-forwarding/#when-delivery-fails',
    'when-not-to-use-log-forwarding': '/observability/log-forwarding/#log-forwarding-faq',
    'when-to-use-log-forwarding': '/observability/log-forwarding/#log-forwarding-faq'
  },
  '/observability/logs/': {
    'cloudwatch-logs-insights-queries': '/observability/logs/#read-logs-with-the-cli',
    'how-do-i-set-up-alerts-based-on-log-patterns': '/observability/logs/#get-alerted-on-a-log-pattern',
    'how-much-does-cloudwatch-logs-cost': '/observability/logs/#lower-the-ingestion-cost',
    'lower-cost-ingestion-for-infrequently-inspected-logs': '/observability/logs/#lower-the-ingestion-cost',
    'structured-logging': '/observability/logs/#write-structured-logs',
    'time-range-filtering': '/observability/logs/#read-logs-in-the-console',
    'time-ranges': '/observability/logs/#read-logs-with-the-cli',
    'viewing-logs-in-the-console': '/observability/logs/#read-logs-in-the-console',
    'viewing-logs-with-the-cli': '/observability/logs/#read-logs-with-the-cli'
  },
  '/observability/metrics/': {
    'aggregation-and-statistics': '/observability/metrics/#query-a-metric-with-the-cli',
    'cli-stacktape-metrics': '/observability/metrics/#query-a-metric-with-the-cli',
    'console-metrics-dashboard': '/observability/metrics/#see-metrics-in-the-console',
    'container-workload-metrics': '/observability/metrics/#read-the-common-metrics',
    'lambda-function-metrics': '/observability/metrics/#query-a-metric-with-the-cli',
    'output-formats': '/observability/metrics/#query-a-metric-with-the-cli',
    'supported-resource-types': '/observability/metrics/#query-a-metric-with-the-cli'
  },
  '/observability/notifications/': {
    'can-i-get-notified-only-for-production-deploys': '/observability/notifications/#rules-alarms-and-budgets',
    'can-i-route-different-events-to-different-channels':
      '/observability/notifications/#route-events-to-different-channels',
    'checking-what-was-sent': '/observability/notifications/#check-what-was-sent',
    'do-i-need-a-separate-alert-channel-for-notifications-and-budgets':
      '/observability/notifications/#rules-alarms-and-budgets',
    'event-types': '/observability/notifications/#events',
    'managing-notification-rules': '/observability/notifications/#add-a-rule',
    'notifications-vs-alarms-vs-budgets': '/observability/notifications/#rules-alarms-and-budgets',
    'scoping-notifications': '/observability/notifications/#add-a-rule',
    'what-is-the-difference-between-notifications-and-alarms': '/observability/notifications/#rules-alarms-and-budgets',
    'why-didnt-my-notification-get-delivered': '/observability/notifications/#check-what-was-sent'
  },
  '/packaging/containers/buildpack/': {
    faq: '/packaging/containers/buildpack/#buildpack-for-containers-faq'
  },
  '/packaging/containers/dockerfile/': {
    faq: '/packaging/containers/dockerfile/#dockerfile-faq'
  },
  '/packaging/containers/js-bundle/': {
    faq: '/packaging/containers/js-bundle/#js-bundle-for-containers-faq'
  },
  '/packaging/containers/prebuilt-image/': {
    'container-packaging-types':
      '/packaging/containers/prebuilt-image/#when-should-i-use-prebuilt-image-vs-letting-stacktape-build-the-image',
    faq: '/packaging/containers/prebuilt-image/#prebuilt-image-faq'
  },
  '/packaging/function/buildpack/': {
    faq: '/packaging/function/buildpack/#buildpack-for-lambda-faq'
  },
  '/packaging/function/custom-artifact/': {
    'do-i-have-to-zip-my-artifact-myself': '/packaging/function/custom-artifact/#packagepath',
    faq: '/packaging/function/custom-artifact/#custom-artifact-faq'
  },
  '/packaging/function/js-bundle/': {
    faq: '/packaging/function/js-bundle/#js-bundle-for-lambda-faq',
    'my-function-runs-an-older-aws-sdk-than-the-one-in-my-packagejson--why':
      '/packaging/function/js-bundle/#my-function-runs-an-older-aws-sdk-than-the-one-in-my-packagejson-why'
  },
  '/packaging/overview/': {
    faq: '/packaging/overview/#packaging-overview-faq',
    'whats-the-difference-between-function-packaging-and-container-packaging':
      '/packaging/overview/#two-packaging-categories'
  },
  '/resources/advanced/aws-cdk-constructs/': {
    'api-reference': '/resources/advanced/aws-cdk-constructs/#configuration-reference',
    'construct-entry-file': '/resources/advanced/aws-cdk-constructs/#basic-example',
    'passing-props-to-constructs': '/resources/advanced/aws-cdk-constructs/#pass-values-in',
    'why-doesnt-connectto-work-with-a-cdk-construct':
      '/resources/advanced/aws-cdk-constructs/#use-the-constructs-resources'
  },
  '/resources/advanced/custom-resources/': {
    'api-reference': '/resources/advanced/custom-resources/#configuration-reference',
    'building-from-source': '/resources/advanced/custom-resources/#basic-example',
    'can-custom-resources-return-values-for-use-elsewhere-in-the-stack':
      '/resources/advanced/custom-resources/#use-the-result-elsewhere',
    'can-i-create-multiple-instances-from-one-definition': '/resources/advanced/custom-resources/#instances',
    'can-i-use-connectto-with-custom-resources': '/resources/advanced/custom-resources/#packaging-and-access',
    'connecting-to-resources': '/resources/advanced/custom-resources/#basic-example',
    'event-fields': '/resources/advanced/custom-resources/#the-handler',
    'handler-best-practices': '/resources/advanced/custom-resources/#the-handler',
    'how-it-works': '/resources/advanced/custom-resources/#the-handler',
    packaging: '/resources/advanced/custom-resources/#packaging-and-access',
    'response-format': '/resources/advanced/custom-resources/#the-handler',
    runtime: '/resources/advanced/custom-resources/#packaging-and-access',
    'what-happens-if-my-custom-resource-lambda-fails-or-the-stack-rolls-back':
      '/resources/advanced/custom-resources/#the-handler',
    'writing-the-handler': '/resources/advanced/custom-resources/#the-handler'
  },
  '/resources/advanced/deployment-scripts/': {
    afterdeploy: '/resources/advanced/deployment-scripts/#when-it-runs-and-what-a-failure-does',
    'can-a-deployment-script-access-my-database': '/resources/advanced/deployment-scripts/#connecting-to-resources',
    'custom-artifact-packaging': '/resources/advanced/deployment-scripts/#packaging',
    'what-happens-if-my-afterdeploy-script-fails':
      '/resources/advanced/deployment-scripts/#when-it-runs-and-what-a-failure-does',
    'what-happens-if-my-beforedelete-script-fails': '/resources/advanced/deployment-scripts/#beforedelete'
  },
  '/resources/advanced/raw-cloudformation-resources/': {
    'are-raw-cloudformation-resources-deleted-when-i-delete-the-stack':
      '/resources/advanced/raw-cloudformation-resources/#resource-attributes',
    'avoiding-naming-conflicts':
      '/resources/advanced/raw-cloudformation-resources/#check-the-template-before-you-deploy',
    'do-raw-cloudformation-resources-count-toward-the-stacktape-resource-limit':
      '/resources/advanced/raw-cloudformation-resources/#limits',
    'granting-workload-access-to-raw-resources': '/resources/advanced/raw-cloudformation-resources/#basic-example',
    'how-do-i-reference-a-stacktape-managed-resource-from-a-raw-resource':
      '/resources/advanced/raw-cloudformation-resources/#reference-resources-both-ways',
    'using-intrinsic-functions': '/resources/advanced/raw-cloudformation-resources/#reference-resources-both-ways'
  },
  '/resources/ai/agentcore-browser/': {
    'api-reference': '/resources/ai/agentcore-browser/#configuration-reference',
    'full-agent-with-memory-and-browser': '/resources/ai/agentcore-browser/#basic-example',
    'how-do-i-connect-the-browser-to-my-agent-runtime': '/resources/ai/agentcore-browser/#basic-example',
    'how-much-does-agentcore-browser-cost': '/resources/ai/agentcore-browser/#cost',
    'session-recording': '/resources/ai/agentcore-browser/#record-sessions',
    'where-are-session-recordings-stored': '/resources/ai/agentcore-browser/#record-sessions'
  },
  '/resources/ai/agentcore-code-interpreter/': {
    'api-reference': '/resources/ai/agentcore-code-interpreter/#configuration-reference',
    'how-much-does-agentcore-code-interpreter-cost': '/resources/ai/agentcore-code-interpreter/#cost',
    'runtime-with-code-interpreter': '/resources/ai/agentcore-code-interpreter/#basic-example'
  },
  '/resources/ai/agentcore-gateway/': {
    'api-reference': '/resources/ai/agentcore-gateway/#configuration-reference',
    'connecting-to-an-agentcore-runtime': '/resources/ai/agentcore-gateway/#basic-example',
    'full-stack-gateway-with-agentcore-runtime': '/resources/ai/agentcore-gateway/#basic-example',
    'jwt-authorization': '/resources/ai/agentcore-gateway/#authorization',
    'mcp-protocol-configuration': '/resources/ai/agentcore-gateway/#other-settings',
    'multi-tool-gateway-with-jwt-authorization': '/resources/ai/agentcore-gateway/#basic-example',
    'tool-schema': '/resources/ai/agentcore-gateway/#write-a-tool-function',
    tools: '/resources/ai/agentcore-gateway/#write-a-tool-function',
    'which-identity-providers-work-with-the-jwt-authorizer': '/resources/ai/agentcore-gateway/#authorization'
  },
  '/resources/ai/agentcore-memory/': {
    'agentcore-runtime-with-dedicated-memory': '/resources/ai/agentcore-memory/#basic-example',
    'api-reference': '/resources/ai/agentcore-memory/#configuration-reference',
    'can-i-encrypt-agentcore-memory-with-my-own-kms-key': '/resources/ai/agentcore-memory/#encryption',
    'connecting-to-an-agentcore-runtime': '/resources/ai/agentcore-memory/#basic-example',
    'encrypted-memory-with-custom-retention': '/resources/ai/agentcore-memory/#encryption',
    'how-do-i-configure-memory-strategies': '/resources/ai/agentcore-memory/#memory-strategies',
    'memory-expiration': '/resources/ai/agentcore-memory/#memory-strategies'
  },
  '/resources/ai/agentcore-runtime/': {
    'agent-with-persistent-memory-and-lifecycle': '/resources/ai/agentcore-runtime/#sessions-and-lifecycle',
    'agent-with-tools-authentication-and-resource-access': '/resources/ai/agentcore-runtime/#authentication',
    'api-reference': '/resources/ai/agentcore-runtime/#configuration-reference',
    'connecting-to-other-resources': '/resources/ai/agentcore-runtime/#access-to-other-resources',
    'how-do-i-access-other-aws-resources-from-my-agent': '/resources/ai/agentcore-runtime/#access-to-other-resources',
    'how-do-i-secure-my-agent-endpoints': '/resources/ai/agentcore-runtime/#authentication',
    lifecycle: '/resources/ai/agentcore-runtime/#sessions-and-lifecycle',
    'tool-integrations': '/resources/ai/agentcore-runtime/#tools-memory-gateway-browser-and-code-interpreter',
    'what-managed-tools-can-i-attach-to-an-agent':
      '/resources/ai/agentcore-runtime/#tools-memory-gateway-browser-and-code-interpreter',
    'what-protocols-does-agentcore-runtime-support': '/resources/ai/agentcore-runtime/#protocols'
  },
  '/resources/compute/batch-job/': {
    'api-reference': '/resources/compute/batch-job/#configuration-reference',
    'how-should-i-size-cpu-and-memory-for-a-batch-job': '/resources/compute/batch-job/#compute-resources',
    'should-i-use-spot-instances-for-batch-jobs': '/resources/compute/batch-job/#spot-capacity',
    'why-do-my-batch-jobs-run-more-than-once-or-create-duplicate-side-effects':
      '/resources/compute/batch-job/#retries-and-timeout'
  },
  '/resources/compute/convex/': {
    'api-reference': '/resources/compute/convex/#configuration-reference',
    'backend-image': '/resources/compute/convex/#backend',
    'can-i-point-convex-at-my-existing-postgresql-database': '/resources/compute/convex/#database',
    'can-i-scale-the-convex-backend-horizontally': '/resources/compute/convex/#backend',
    'compute-resources': '/resources/compute/convex/#backend',
    'dashboard-image': '/resources/compute/convex/#dashboard',
    'dashboard-resources': '/resources/compute/convex/#dashboard',
    'disabling-the-dashboard': '/resources/compute/convex/#dashboard',
    'does-dev-mode-run-against-my-deployed-aws-backend-or-locally': '/resources/compute/convex/#dev-mode',
    'engine-options': '/resources/compute/convex/#database',
    'how-do-i-back-up-my-convex-data': '/resources/compute/convex/#backups',
    'how-do-i-restrict-access-to-the-convex-dashboard': '/resources/compute/convex/#dashboard',
    'other-database-overrides': '/resources/compute/convex/#database',
    'production-with-custom-domains': '/resources/compute/convex/#custom-domains',
    'restricting-dashboard-access': '/resources/compute/convex/#dashboard',
    'single-process-constraint': '/resources/compute/convex/#backend'
  },
  '/resources/compute/edge-function/': {
    'api-reference': '/resources/compute/edge-function/#configuration-reference',
    'how-do-i-attach-an-edge-function-to-cloudfront': '/resources/compute/edge-function/#cdn-attachment',
    'what-are-the-memory-and-timeout-limits-for-an-edge-function': '/resources/compute/edge-function/#runtime-limits',
    'which-runtimes-can-stacktape-edge-functions-use': '/resources/compute/edge-function/#runtime-limits',
    'why-cant-i-find-my-edge-functions-logs-in-my-stacks-region': '/resources/compute/edge-function/#logging',
    'why-cant-my-edge-function-use-environment-variables-or-reach-my-database':
      '/resources/compute/edge-function/#permissions'
  },
  '/resources/compute/lambda-function/': {
    alarms: '/resources/compute/lambda-function/#logs-and-alarms',
    'api-reference': '/resources/compute/lambda-function/#configuration-reference',
    'does-a-stacktape-lambda-function-scale-to-zero': '/resources/compute/lambda-function/#concurrency',
    'how-do-i-connect-a-lambda-function-to-a-database': '/resources/compute/lambda-function/#connecting-to-resources',
    observability: '/resources/compute/lambda-function/#logs-and-alarms',
    'scheduled-cleanup-task': '/resources/compute/lambda-function/#scheduled-job',
    'should-i-use-a-function-url-or-an-http-api-gateway': '/resources/compute/lambda-function/#function-urls',
    'why-are-records-being-processed-more-than-once-from-my-sqs-or-stream-trigger':
      '/resources/compute/lambda-function/#triggers'
  },
  '/resources/compute/multi-container-workload/': {
    'api-reference': '/resources/compute/multi-container-workload/#configuration-reference',
    'how-do-i-run-database-migrations-before-the-main-container-starts':
      '/resources/compute/multi-container-workload/#containers',
    'private-subnets': '/resources/compute/multi-container-workload/#private-subnets-and-nat',
    'what-happens-when-one-container-in-the-workload-crashes':
      '/resources/compute/multi-container-workload/#health-checks'
  },
  '/resources/compute/private-service/': {
    'api-reference': '/resources/compute/private-service/#configuration-reference',
    'can-i-expose-a-private-service-to-the-public-internet-later':
      '/resources/compute/private-service/#private-subnets-and-nat',
    'can-i-run-a-grpc-server-as-a-private-service': '/resources/compute/private-service/#logging',
    'efs-in-local-development': '/resources/compute/private-service/#efs-storage',
    'how-do-i-run-database-migrations-before-the-main-container-starts':
      '/resources/compute/private-service/#using-run-on-init-sidecars',
    'private-subnets': '/resources/compute/private-service/#private-subnets-and-nat'
  },
  '/resources/compute/web-service/': {
    'api-reference': '/resources/compute/web-service/#configuration-reference',
    'can-i-protect-a-web-service-with-aws-waf': '/resources/compute/web-service/#cdn',
    'does-a-stacktape-web-service-scale-to-zero': '/resources/compute/web-service/#scaling',
    'how-do-i-run-database-migrations-for-a-web-service': '/resources/compute/web-service/#side-containers',
    'private-subnets': '/resources/compute/web-service/#private-subnets-and-nat',
    'which-load-balancing-mode-should-i-choose': '/resources/compute/web-service/#traffic',
    'why-are-my-cors-settings-being-ignored': '/resources/compute/web-service/#domains-and-cors',
    'why-isnt-my-custom-domain-working': '/resources/compute/web-service/#domains-and-cors'
  },
  '/resources/compute/worker-service/': {
    'api-reference': '/resources/compute/worker-service/#configuration-reference',
    'how-do-i-debug-a-running-worker-service': '/resources/compute/worker-service/#remote-sessions',
    'how-do-i-run-database-migrations-before-my-worker-starts': '/resources/compute/worker-service/#side-containers',
    'private-subnets-with-nat': '/resources/compute/worker-service/#private-subnets-and-nat',
    'what-happens-when-a-worker-service-container-crashes': '/resources/compute/worker-service/#health-checks',
    'why-is-my-worker-killed-mid-task-during-a-deploy-or-scale-in':
      '/resources/compute/worker-service/#graceful-shutdown'
  },
  '/resources/databases/dsql/': {
    'api-reference': '/resources/databases/dsql/#configuration-reference'
  },
  '/resources/databases/dynamodb/': {
    'api-reference': '/resources/databases/dynamodb/#configuration-reference',
    'can-i-change-the-primary-key-after-creating-a-table': '/resources/databases/dynamodb/#primary-key',
    'does-connectto-grant-permission-for-dynamodb-transactions':
      '/resources/databases/dynamodb/#connecting-to-other-resources',
    'how-do-dynamodb-streams-work-with-stacktape': '/resources/databases/dynamodb/#streams'
  },
  '/resources/databases/mongodb-atlas/': {
    'admin-credentials': '/resources/databases/mongodb-atlas/#admin-user',
    'api-reference': '/resources/databases/mongodb-atlas/#configuration-reference',
    'can-i-connect-to-my-cluster-from-my-local-machine': '/resources/databases/mongodb-atlas/#admin-user',
    'connecting-to-other-resources': '/resources/databases/mongodb-atlas/#connecting-from-workloads',
    'how-do-i-back-up-my-mongodb-atlas-cluster': '/resources/databases/mongodb-atlas/#backups',
    'how-does-my-application-connect-to-the-mongodb-atlas-cluster':
      '/resources/databases/mongodb-atlas/#connecting-from-workloads',
    networking: '/resources/databases/mongodb-atlas/#network-access',
    'provider-configuration': '/resources/databases/mongodb-atlas/#basic-example',
    'whats-the-difference-between-shared-and-dedicated-mongodb-atlas-tiers':
      '/resources/databases/mongodb-atlas/#cluster-tiers'
  },
  '/resources/databases/opensearch/': {
    'api-reference': '/resources/databases/opensearch/#configuration-reference',
    'can-i-scale-my-cluster-after-creation': '/resources/databases/opensearch/#cluster-configuration',
    'do-i-need-dedicated-master-nodes': '/resources/databases/opensearch/#dedicated-master-nodes',
    'how-do-i-access-opensearch-from-a-lambda-function': '/resources/databases/opensearch/#networking'
  },
  '/resources/databases/redis/': {
    'api-reference': '/resources/databases/redis/#configuration-reference',
    'can-i-connect-to-the-cache-from-my-local-machine': '/resources/databases/redis/#networking',
    'which-engine-should-i-choose': '/resources/databases/redis/#choose-an-engine'
  },
  '/resources/databases/relational-database/': {
    'api-reference': '/resources/databases/relational-database/#configuration-reference',
    'aurora-serverless-v1-is-retired': '/resources/databases/relational-database/#aurora-serverless-v2',
    'can-i-change-the-engine-or-instance-size-later': '/resources/databases/relational-database/#engine-types',
    'can-i-connect-to-my-stacktape-database-from-my-local-machine':
      '/resources/databases/relational-database/#accessibility',
    'database-name-and-port': '/resources/databases/relational-database/#database-name-port-and-version',
    'how-do-i-back-up-and-restore-my-database': '/resources/databases/relational-database/#backups-and-maintenance',
    'how-do-i-run-database-migrations-with-stacktape':
      '/resources/databases/relational-database/#connecting-from-workloads',
    'supported-versions': '/resources/databases/relational-database/#database-name-port-and-version'
  },
  '/resources/databases/upstash-redis/': {
    'api-reference': '/resources/databases/upstash-redis/#configuration-reference',
    'should-i-use-the-rest-api-or-the-redis-protocol': '/resources/databases/upstash-redis/#using-the-rest-api'
  },
  '/resources/frontend/astro/': {
    'api-reference': '/resources/frontend/astro/#configuration-reference',
    'can-i-protect-an-astro-app-with-aws-waf': '/resources/frontend/astro/#firewall',
    'can-i-use-a-custom-domain-with-astro': '/resources/frontend/astro/#custom-domain',
    'cdn-and-firewall': '/resources/frontend/astro/#firewall',
    'connecting-resources': '/resources/frontend/astro/#connect-to-resources',
    'custom-domains': '/resources/frontend/astro/#custom-domain',
    'dev-mode': '/resources/frontend/astro/#build-and-dev-mode',
    'how-do-i-connect-astro-ssr-to-a-database': '/resources/frontend/astro/#connect-to-resources',
    'project-directory': '/resources/frontend/astro/#build-and-dev-mode',
    'server-lambda': '/resources/frontend/astro/#server-function',
    'why-cant-my-astro-ssr-function-reach-the-internet-after-connecting-to-a-database':
      '/resources/frontend/astro/#server-function'
  },
  '/resources/frontend/nextjs/': {
    'api-reference': '/resources/frontend/nextjs/#configuration-reference',
    'build-and-dev': '/resources/frontend/nextjs/#build-and-dev-mode',
    'can-i-protect-a-nextjs-app-with-aws-waf': '/resources/frontend/nextjs/#firewall',
    'connecting-resources': '/resources/frontend/nextjs/#connect-to-resources',
    'domains-and-firewall': '/resources/frontend/nextjs/#firewall',
    'edge-and-streaming': '/resources/frontend/nextjs/#streaming',
    'environment-variables': '/resources/frontend/nextjs/#connect-to-resources',
    'how-does-response-streaming-help-nextjs-ssr': '/resources/frontend/nextjs/#streaming',
    'how-much-does-hosting-nextjs-on-lambda-and-cloudfront-cost': '/resources/frontend/nextjs/#cost',
    logging: '/resources/frontend/nextjs/#server-function',
    'nextjs-connected-to-a-dynamodb-table': '/resources/frontend/nextjs/#connect-to-resources',
    'server-lambda': '/resources/frontend/nextjs/#server-function',
    'should-i-use-edge-lambda-for-nextjs-ssr': '/resources/frontend/nextjs/#edge-rendering',
    'what-does-stacktape-create-for-a-nextjs-app-and-does-it-support-isr': '/resources/frontend/nextjs/#basic-example',
    'where-should-appdirectory-point': '/resources/frontend/nextjs/#basic-example',
    'why-cant-my-nextjs-app-reach-its-database-or-redis': '/resources/frontend/nextjs/#server-function'
  },
  '/resources/frontend/nuxt/': {
    'api-reference': '/resources/frontend/nuxt/#configuration-reference',
    'build-and-dev': '/resources/frontend/nuxt/#build-and-dev-mode',
    'can-i-use-a-custom-domain-with-nuxt': '/resources/frontend/nuxt/#custom-domain',
    'can-i-use-nuxt-api-routes-nitro-server-routes': '/resources/frontend/nuxt/#basic-example',
    'cdn-caching': '/resources/frontend/nuxt/#caching',
    'connecting-resources': '/resources/frontend/nuxt/#connect-to-resources',
    'domains-and-firewall': '/resources/frontend/nuxt/#firewall',
    'environment-variables': '/resources/frontend/nuxt/#connect-to-resources',
    'file-options': '/resources/frontend/nuxt/#caching',
    'server-lambda': '/resources/frontend/nuxt/#server-function',
    'static-files-and-cdn': '/resources/frontend/nuxt/#caching',
    'what-does-stacktape-create-for-a-nuxt-app-and-how-does-ssr-run': '/resources/frontend/nuxt/#basic-example',
    'where-should-appdirectory-point': '/resources/frontend/nuxt/#basic-example',
    'why-cant-the-ssr-function-reach-my-database-or-redis-cache': '/resources/frontend/nuxt/#server-function'
  },
  '/resources/frontend/remix/': {
    'api-reference': '/resources/frontend/remix/#configuration-reference',
    'build-and-dev': '/resources/frontend/remix/#build-and-dev-mode',
    'can-i-protect-a-remix-app-with-aws-waf': '/resources/frontend/remix/#firewall',
    'can-i-use-a-custom-domain-with-remix': '/resources/frontend/remix/#custom-domain',
    'connecting-resources': '/resources/frontend/remix/#connect-to-resources',
    'domains-and-firewall': '/resources/frontend/remix/#firewall',
    'environment-variables': '/resources/frontend/remix/#connect-to-resources',
    logging: '/resources/frontend/remix/#server-function',
    'server-lambda': '/resources/frontend/remix/#server-function',
    'static-files-and-cdn': '/resources/frontend/remix/#caching',
    'where-should-appdirectory-point': '/resources/frontend/remix/#basic-example'
  },
  '/resources/frontend/solidstart/': {
    'api-reference': '/resources/frontend/solidstart/#configuration-reference',
    'build-and-dev': '/resources/frontend/solidstart/#build-and-dev-mode',
    'can-i-use-a-custom-domain-with-solidstart': '/resources/frontend/solidstart/#custom-domain',
    cdn: '/resources/frontend/solidstart/#caching',
    'connecting-resources': '/resources/frontend/solidstart/#connect-to-resources',
    'custom-domains-and-firewall': '/resources/frontend/solidstart/#firewall',
    'how-do-i-connect-to-a-database-from-solidstart-server-functions':
      '/resources/frontend/solidstart/#connect-to-resources',
    'server-lambda': '/resources/frontend/solidstart/#server-function',
    'static-files': '/resources/frontend/solidstart/#caching',
    'where-should-appdirectory-point': '/resources/frontend/solidstart/#basic-example'
  },
  '/resources/frontend/static-hosting/': {
    'api-reference': '/resources/frontend/static-hosting/#configuration-reference',
    'build-and-dev': '/resources/frontend/static-hosting/#build',
    'can-i-route-api-requests-from-a-static-site': '/resources/frontend/static-hosting/#api-routes-on-the-same-domain',
    'can-static-hosting-inject-environment-variables-without-rebuilding':
      '/resources/frontend/static-hosting/#deploy-time-values',
    'content-presets': '/resources/frontend/static-hosting/#caching-and-routing-presets',
    'custom-domains': '/resources/frontend/static-hosting/#custom-domain',
    'edge-functions': '/resources/frontend/static-hosting/#edge-functions-and-firewall',
    'environment-injection': '/resources/frontend/static-hosting/#deploy-time-values',
    'file-uploads': '/resources/frontend/static-hosting/#build',
    firewall: '/resources/frontend/static-hosting/#edge-functions-and-firewall',
    'which-build-output-directory-should-i-upload': '/resources/frontend/static-hosting/#build',
    'which-hostingcontenttype-should-i-choose': '/resources/frontend/static-hosting/#caching-and-routing-presets',
    'why-does-my-custom-domain-fail-to-provision': '/resources/frontend/static-hosting/#custom-domain'
  },
  '/resources/frontend/sveltekit/': {
    'api-reference': '/resources/frontend/sveltekit/#configuration-reference',
    'build-commands': '/resources/frontend/sveltekit/#build-and-dev-mode',
    'caching-and-headers': '/resources/frontend/sveltekit/#caching',
    'dev-mode': '/resources/frontend/sveltekit/#build-and-dev-mode',
    domains: '/resources/frontend/sveltekit/#custom-domain',
    'environment-and-access': '/resources/frontend/sveltekit/#connect-to-resources',
    'how-do-i-protect-a-sveltekit-app-with-aws-waf': '/resources/frontend/sveltekit/#firewall',
    'how-do-sveltekit-environment-variables-and-database-access-work':
      '/resources/frontend/sveltekit/#connect-to-resources',
    security: '/resources/frontend/sveltekit/#firewall',
    'server-lambda': '/resources/frontend/sveltekit/#server-function',
    'why-does-my-custom-domain-fail-to-provision': '/resources/frontend/sveltekit/#custom-domain'
  },
  '/resources/frontend/tanstack-start/': {
    'api-reference': '/resources/frontend/tanstack-start/#configuration-reference',
    'build-and-dev': '/resources/frontend/tanstack-start/#build-and-dev-mode',
    'cdn-and-static-assets': '/resources/frontend/tanstack-start/#caching',
    'connecting-resources': '/resources/frontend/tanstack-start/#connect-to-resources',
    'custom-domains-and-firewall': '/resources/frontend/tanstack-start/#custom-domain',
    'how-do-i-connect-a-database-to-a-tanstack-start-app': '/resources/frontend/tanstack-start/#connect-to-resources',
    'server-lambda': '/resources/frontend/tanstack-start/#server-function',
    'vpc-connectivity': '/resources/frontend/tanstack-start/#server-function',
    'what-does-stacktape-create-for-a-tanstack-start-app': '/resources/frontend/tanstack-start/#basic-example',
    'where-should-appdirectory-point': '/resources/frontend/tanstack-start/#basic-example'
  },
  '/resources/messaging/email-sender/': {
    'current-boundaries': '/resources/messaging/email-sender/#what-it-doesnt-set-up',
    'shared-identity-lifecycle': '/resources/messaging/email-sender/#shared-identity'
  },
  '/resources/messaging/event-bus/': {
    'api-reference': '/resources/messaging/event-bus/#configuration-reference',
    'connecting-to-other-resources': '/resources/messaging/event-bus/#publish-events',
    'event-archiving': '/resources/messaging/event-bus/#archive-and-replay',
    'how-do-i-subscribe-to-events-on-the-default-aws-event-bus':
      '/resources/messaging/event-bus/#aws-and-partner-events',
    'partner-event-sources': '/resources/messaging/event-bus/#aws-and-partner-events',
    'what-is-the-maximum-event-size-for-eventbridge': '/resources/messaging/event-bus/#publish-events'
  },
  '/resources/messaging/kafka-cluster/': {
    'development-mode': '/resources/messaging/kafka-cluster/#dev-mode',
    'regions-and-lifecycle': '/resources/messaging/kafka-cluster/#regions-and-deletion'
  },
  '/resources/messaging/kinesis-stream/': {
    'analytics-pipeline-with-lambda-consumer': '/resources/messaging/kinesis-stream/#basic-example',
    'api-reference': '/resources/messaging/kinesis-stream/#configuration-reference',
    'can-i-replay-data-from-a-kinesis-stream': '/resources/messaging/kinesis-stream/#retention',
    'capacity-modes': '/resources/messaging/kinesis-stream/#capacity-mode',
    'data-retention': '/resources/messaging/kinesis-stream/#retention',
    'event-ingestion-api-with-producer-lambda': '/resources/messaging/kinesis-stream/#basic-example',
    'provisioned-mode': '/resources/messaging/kinesis-stream/#capacity-mode',
    'triggering-a-lambda-function': '/resources/messaging/kinesis-stream/#basic-example',
    'what-is-enhanced-fan-out-and-when-should-i-use-it': '/resources/messaging/kinesis-stream/#enhanced-fan-out'
  },
  '/resources/messaging/sns-topic/': {
    'api-reference': '/resources/messaging/sns-topic/#configuration-reference',
    'connecting-to-other-resources': '/resources/messaging/sns-topic/#publish-messages',
    'fan-out-pattern': '/resources/messaging/sns-topic/#fan-out-to-sqs-queues',
    'fifo-topic': '/resources/messaging/sns-topic/#standard-or-fifo',
    'lambda-fan-out': '/resources/messaging/sns-topic/#fan-out-to-sqs-queues',
    'publishing-from-a-connected-lambda': '/resources/messaging/sns-topic/#publish-messages',
    'sms-display-name': '/resources/messaging/sns-topic/#sms-sender-name',
    'standard-vs-fifo-topics': '/resources/messaging/sns-topic/#standard-or-fifo',
    'subscribing-a-lambda-function': '/resources/messaging/sns-topic/#basic-example'
  },
  '/resources/messaging/sqs-queue/': {
    'api-reference': '/resources/messaging/sqs-queue/#configuration-reference',
    'connecting-to-other-resources': '/resources/messaging/sqs-queue/#send-messages',
    'dead-letter-queues': '/resources/messaging/sqs-queue/#dead-letter-queue',
    'eventbridge-integration': '/resources/messaging/sqs-queue/#deliver-eventbridge-events-to-the-queue',
    'fifo-queue': '/resources/messaging/sqs-queue/#standard-or-fifo',
    'fifo-queues-with-eventbridge': '/resources/messaging/sqs-queue/#deliver-eventbridge-events-to-the-queue',
    'high-throughput-fifo': '/resources/messaging/sqs-queue/#standard-or-fifo',
    'my-consumer-keeps-processing-the-same-message-twice--why':
      '/resources/messaging/sqs-queue/#visibility-timeout-and-polling',
    'polling-and-visibility': '/resources/messaging/sqs-queue/#visibility-timeout-and-polling',
    'standard-vs-fifo-queues': '/resources/messaging/sqs-queue/#standard-or-fifo',
    'what-is-the-maximum-message-size-for-sqs': '/resources/messaging/sqs-queue/#other-settings',
    'why-does-one-bad-message-block-my-whole-queue-and-how-do-i-stop-it':
      '/resources/messaging/sqs-queue/#dead-letter-queue'
  },
  '/resources/networking/application-load-balancer/': {
    'api-reference': '/resources/networking/application-load-balancer/#configuration-reference',
    'does-the-application-load-balancer-support-websockets':
      '/resources/networking/application-load-balancer/#websockets-and-health-checks',
    'how-do-i-route-traffic-to-multiple-services-through-one-alb':
      '/resources/networking/application-load-balancer/#routing',
    'multi-service-routing':
      '/resources/networking/application-load-balancer/#several-services-behind-one-load-balancer'
  },
  '/resources/networking/appsync-api/': {
    'api-reference': '/resources/networking/appsync-api/#configuration-reference'
  },
  '/resources/networking/cdn/': {
    'api-reference': '/resources/networking/cdn/#configuration-reference',
    'can-i-route-different-url-paths-to-different-backends': '/resources/networking/cdn/#route-rewrites',
    'how-much-does-a-cloudfront-cdn-cost': '/resources/networking/cdn/#price-class',
    'what-happens-to-the-cdn-cache-when-i-deploy': '/resources/networking/cdn/#cache-invalidation',
    'when-should-i-add-a-cdn-to-my-api': '/resources/networking/cdn/#api-backed-cdn',
    'why-isnt-my-api-or-alb-content-being-cached': '/resources/networking/cdn/#cache-key'
  },
  '/resources/networking/custom-domains/': {
    'api-reference': '/resources/networking/custom-domains/#configuration-reference',
    'can-i-route-one-domain-to-multiple-backends': '/resources/networking/custom-domains/#multiple-domains',
    'can-i-use-a-domain-registered-outside-aws': '/resources/networking/custom-domains/#set-up-the-domain',
    'can-i-use-cloudflare-with-stacktape-custom-domains': '/resources/networking/custom-domains/#external-dns',
    'does-stacktape-handle-tls-certificate-renewal': '/resources/networking/custom-domains/#tls-certificates',
    'how-much-do-custom-domains-cost-on-aws': '/resources/networking/custom-domains/#cost',
    prerequisites: '/resources/networking/custom-domains/#set-up-the-domain',
    'which-stacktape-resources-support-custom-domains': '/resources/networking/custom-domains/#supported-resources'
  },
  '/resources/networking/http-api-gateway/': {
    'api-reference': '/resources/networking/http-api-gateway/#configuration-reference',
    'can-i-protect-my-api-gateway-with-a-firewall': '/resources/networking/http-api-gateway/#firewall',
    'catch-all-pattern': '/resources/networking/http-api-gateway/#one-function-for-all-routes',
    'how-do-i-add-routes-to-my-http-api-gateway': '/resources/networking/http-api-gateway/#routing',
    'route-authorization': '/resources/networking/http-api-gateway/#routing',
    'what-is-the-maximum-payload-size-for-http-api-gateway': '/resources/networking/http-api-gateway/#payload-format',
    'when-should-i-use-http-api-gateway-vs-an-application-load-balancer':
      '/resources/networking/http-api-gateway/#choosing-between-http-api-gateway-and-a-load-balancer'
  },
  '/resources/networking/network-load-balancer/': {
    'api-reference': '/resources/networking/network-load-balancer/#configuration-reference',
    'can-i-expose-multiple-ports-on-a-single-network-load-balancer':
      '/resources/networking/network-load-balancer/#basic-example',
    'how-do-container-workloads-connect-to-a-network-load-balancer':
      '/resources/networking/network-load-balancer/#basic-example'
  },
  '/resources/networking/websocket-api-gateway/': {
    'api-reference': '/resources/networking/websocket-api-gateway/#configuration-reference'
  },
  '/resources/orchestration/state-machine/': {
    'api-reference': '/resources/orchestration/state-machine/#configuration-reference',
    'how-do-i-reference-lambda-functions-in-a-state-machine-definition':
      '/resources/orchestration/state-machine/#referencing-lambda-functions',
    'how-do-i-switch-to-an-express-workflow-or-change-other-cloudformation-settings':
      '/resources/orchestration/state-machine/#express-workflows-and-other-settings',
    'how-long-can-a-step-functions-execution-run': '/resources/orchestration/state-machine/#workflow-timeout',
    overrides: '/resources/orchestration/state-machine/#express-workflows-and-other-settings'
  },
  '/resources/security/bastion-host/': {
    'api-reference': '/resources/security/bastion-host/#configuration-reference',
    'bastion-with-compliance-logging': '/resources/security/bastion-host/#logging',
    'bastion-with-database-tooling': '/resources/security/bastion-host/#startup-commands',
    'can-i-connect-a-database-gui-to-a-private-database': '/resources/security/bastion-host/#basic-example',
    'can-i-run-database-migrations-through-a-bastion': '/resources/security/bastion-host/#scripts',
    tunnels: '/resources/security/bastion-host/#connecting-to-private-resources',
    'what-happens-if-i-change-the-startup-commands': '/resources/security/bastion-host/#startup-commands',
    'what-resources-can-i-tunnel-to': '/resources/security/bastion-host/#connecting-to-private-resources',
    'whats-the-difference-between-bastion-shell-and-bastion-tunnel':
      '/resources/security/bastion-host/#connecting-to-private-resources'
  },
  '/resources/security/user-auth-pool/': {
    'api-reference': '/resources/security/user-auth-pool/#configuration-reference',
    'how-do-i-add-custom-claims-roles-tenant-ids-to-jwt-tokens': '/resources/security/user-auth-pool/#lambda-hooks',
    'how-do-i-protect-api-routes-with-the-user-pool': '/resources/security/user-auth-pool/#protecting-api-routes',
    'which-social-and-enterprise-identity-providers-are-supported':
      '/resources/security/user-auth-pool/#identity-providers'
  },
  '/resources/security/web-application-firewall/': {
    'api-reference': '/resources/security/web-application-firewall/#configuration-reference',
    'attaching-to-resources': '/resources/security/web-application-firewall/#basic-example',
    'can-i-use-third-party-managed-rule-groups-from-aws-marketplace':
      '/resources/security/web-application-firewall/#managed-rule-groups',
    'cdn-attachment': '/resources/security/web-application-firewall/#basic-example',
    'how-do-i-handle-false-positives-from-managed-rule-groups':
      '/resources/security/web-application-firewall/#managed-rule-groups',
    'how-do-i-test-waf-rules-without-blocking-real-traffic':
      '/resources/security/web-application-firewall/#metrics-and-request-sampling',
    'regional-attachment': '/resources/security/web-application-firewall/#basic-example',
    scope: '/resources/security/web-application-firewall/#basic-example',
    'whats-the-difference-between-regional-and-cdn-scope': '/resources/security/web-application-firewall/#basic-example'
  },
  '/resources/storage/efs-filesystem/': {
    'api-reference': '/resources/storage/efs-filesystem/#configuration-reference',
    'can-multiple-containers-access-the-same-efs-filesystem': '/resources/storage/efs-filesystem/#basic-example',
    'how-do-i-mount-an-efs-volume-to-a-workload': '/resources/storage/efs-filesystem/#basic-example',
    'mounting-to-workloads': '/resources/storage/efs-filesystem/#basic-example',
    'what-throughput-mode-should-i-choose': '/resources/storage/efs-filesystem/#throughput-modes'
  },
  '/resources/storage/s3-bucket/': {
    'api-reference': '/resources/storage/s3-bucket/#configuration-reference',
    'how-do-i-trigger-a-lambda-function-when-a-file-is-uploaded':
      '/resources/storage/s3-bucket/#event-driven-workflows',
    'how-do-i-upload-files-to-an-s3-bucket-from-my-application-code':
      '/resources/storage/s3-bucket/#connecting-to-a-bucket',
    'is-data-in-s3-encrypted': '/resources/storage/s3-bucket/#versioning-and-encryption'
  },
  '/resources/triggers/alarms-as-triggers/': {
    'alarm-naming': '/resources/triggers/alarms-as-triggers/#alarm-types',
    configuration: '/resources/triggers/alarms-as-triggers/#basic-example',
    'handling-alarm-events': '/resources/triggers/alarms-as-triggers/#handling-the-event',
    'supported-alarm-types': '/resources/triggers/alarms-as-triggers/#alarm-types'
  },
  '/resources/triggers/cloudwatch-logs/': {
    'api-reference': '/resources/triggers/cloudwatch-logs/#configuration-reference',
    'event-payload': '/resources/triggers/cloudwatch-logs/#basic-example',
    'filtering-logs': '/resources/triggers/cloudwatch-logs/#filter-patterns',
    'how-many-subscription-filters-can-a-single-log-group-have': '/resources/triggers/cloudwatch-logs/#limits',
    'is-the-function-invoked-once-per-log-line': '/resources/triggers/cloudwatch-logs/#failures-and-retries',
    'referencing-log-groups-within-a-stack': '/resources/triggers/cloudwatch-logs/#basic-example'
  },
  '/resources/triggers/dynamodb-streams/': {
    'api-reference': '/resources/triggers/dynamodb-streams/#configuration-reference',
    'batching-and-throughput': '/resources/triggers/dynamodb-streams/#batching-and-ordering',
    'does-the-stream-trigger-process-records-in-order': '/resources/triggers/dynamodb-streams/#batching-and-ordering',
    'enabling-streams-on-the-table': '/resources/triggers/dynamodb-streams/#basic-example',
    'processing-stream-records': '/resources/triggers/dynamodb-streams/#basic-example',
    'retry-and-failure-handling': '/resources/triggers/dynamodb-streams/#failures-and-retries',
    'same-stack-table-stream-to-lambda-example': '/resources/triggers/dynamodb-streams/#basic-example',
    'why-must-my-stream-handler-be-idempotent': '/resources/triggers/dynamodb-streams/#failures-and-retries'
  },
  '/resources/triggers/event-bus-events/': {
    'api-reference': '/resources/triggers/event-bus-events/#configuration-reference',
    'can-i-receive-events-from-another-aws-account': '/resources/triggers/event-bus-events/#pick-the-bus',
    'choosing-the-event-source': '/resources/triggers/event-bus-events/#pick-the-bus',
    'content-based-filtering-with-detail': '/resources/triggers/event-bus-events/#event-patterns',
    'delivery-failure-handling': '/resources/triggers/event-bus-events/#basic-example',
    'how-do-i-filter-events-by-nested-payload-fields': '/resources/triggers/event-bus-events/#event-patterns',
    'input-transformer': '/resources/triggers/event-bus-events/#change-what-the-function-receives',
    'pattern-fields': '/resources/triggers/event-bus-events/#event-patterns',
    'using-an-external-event-bus': '/resources/triggers/event-bus-events/#basic-example',
    'using-the-default-aws-event-bus': '/resources/triggers/event-bus-events/#pick-the-bus'
  },
  '/resources/triggers/http-triggers/': {
    'alb-integration': '/resources/triggers/http-triggers/#application-load-balancer',
    'can-i-add-authentication-to-my-http-trigger-routes': '/resources/triggers/http-triggers/#authorization',
    'choosing-a-trigger-type': '/resources/triggers/http-triggers/#api-gateway-or-load-balancer',
    'container-workloads': '/resources/triggers/http-triggers/#containers',
    'route-matching': '/resources/triggers/http-triggers/#routes',
    'routing-conditions': '/resources/triggers/http-triggers/#application-load-balancer',
    'rule-priority': '/resources/triggers/http-triggers/#application-load-balancer',
    'what-is-the-difference-between-payload-format-10-and-20': '/resources/triggers/http-triggers/#payload-format',
    'why-isnt-my-alb-rule-matching-even-though-the-path-is-correct':
      '/resources/triggers/http-triggers/#application-load-balancer'
  },
  '/resources/triggers/kinesis-events/': {
    'api-reference': '/resources/triggers/kinesis-events/#configuration-reference',
    'bisecting-failed-batches': '/resources/triggers/kinesis-events/#failures-and-retries',
    'consumption-modes': '/resources/triggers/kinesis-events/#enhanced-fan-out',
    'direct-polling': '/resources/triggers/kinesis-events/#enhanced-fan-out',
    'error-handling': '/resources/triggers/kinesis-events/#failures-and-retries',
    'failure-destination': '/resources/triggers/kinesis-events/#failures-and-retries',
    'handler-code': '/resources/triggers/kinesis-events/#basic-example',
    'limiting-retries': '/resources/triggers/kinesis-events/#failures-and-retries',
    parallelization: '/resources/triggers/kinesis-events/#batching',
    'reporting-the-failed-record': '/resources/triggers/kinesis-events/#failures-and-retries',
    'what-happens-if-my-function-cant-keep-up-with-the-stream': '/resources/triggers/kinesis-events/#batching'
  },
  '/resources/triggers/overview/': {
    'choosing-the-right-trigger': '/resources/triggers/overview/#pick-a-trigger',
    'container-networking-integrations': '/resources/triggers/overview/#what-each-resource-accepts',
    'error-handling-and-retries': '/resources/triggers/overview/#how-events-are-delivered',
    'event-filtering': '/resources/triggers/overview/#filtering-events',
    'how-triggers-work': '/resources/triggers/overview/#pick-a-trigger',
    'http-api-gateway-or-application-load-balancer': '/resources/triggers/overview/#what-each-resource-accepts',
    'trigger-categories': '/resources/triggers/overview/#pick-a-trigger',
    'what-happens-if-my-function-fails-while-processing-a-batch':
      '/resources/triggers/overview/#how-events-are-delivered',
    'what-is-service-connect-and-when-should-i-use-it': '/resources/triggers/overview/#what-each-resource-accepts',
    'what-is-the-difference-between-sqs-sns-and-eventbridge-triggers': '/resources/triggers/overview/#pick-a-trigger',
    'which-resources-support-which-triggers': '/resources/triggers/overview/#what-each-resource-accepts',
    'why-cant-a-web-service-consume-an-sqs-queue-directly': '/resources/triggers/overview/#what-each-resource-accepts',
    'why-cant-container-workloads-use-queue-or-stream-triggers':
      '/resources/triggers/overview/#what-each-resource-accepts'
  },
  '/resources/triggers/s3-events/': {
    'api-reference': '/resources/triggers/s3-events/#configuration-reference',
    'avoiding-infinite-loops': '/resources/triggers/s3-events/#avoid-loops',
    'can-i-filter-s3-events-by-object-size-or-content-type': '/resources/triggers/s3-events/#filter-by-key',
    'can-several-functions-react-to-the-same-bucket': '/resources/triggers/s3-events/#filter-by-key',
    'delivery-and-retries': '/resources/triggers/s3-events/#failures-and-retries',
    'event-payload': '/resources/triggers/s3-events/#event-types',
    'filtering-events': '/resources/triggers/s3-events/#filter-by-key',
    'is-s3-event-delivery-guaranteed-exactly-once': '/resources/triggers/s3-events/#failures-and-retries',
    'what-happens-if-my-lambda-function-fails-processing-an-s3-event':
      '/resources/triggers/s3-events/#failures-and-retries'
  },
  '/resources/triggers/schedule-triggers/': {
    'api-reference': '/resources/triggers/schedule-triggers/#configuration-reference',
    'are-schedule-times-in-utc-or-local-time': '/resources/triggers/schedule-triggers/#cron-expressions',
    'event-payload-customization': '/resources/triggers/schedule-triggers/#custom-payloads',
    'fixed-input': '/resources/triggers/schedule-triggers/#basic-example',
    'handler-example': '/resources/triggers/schedule-triggers/#basic-example',
    'how-do-i-pass-different-payloads-for-different-schedules-on-the-same-function':
      '/resources/triggers/schedule-triggers/#custom-payloads',
    'input-path': '/resources/triggers/schedule-triggers/#custom-payloads',
    'input-transformer': '/resources/triggers/schedule-triggers/#custom-payloads',
    'invalid-expressions': '/resources/triggers/schedule-triggers/#rate-expressions',
    'multiple-schedules': '/resources/triggers/schedule-triggers/#custom-payloads',
    'pausing-a-schedule': '/resources/triggers/schedule-triggers/#pause-a-schedule',
    'schedule-formats': '/resources/triggers/schedule-triggers/#rate-expressions',
    'what-happens-if-my-function-is-still-running-when-the-next-schedule-fires':
      '/resources/triggers/schedule-triggers/#failures-and-overlapping-runs',
    'what-is-the-minimum-schedule-interval': '/resources/triggers/schedule-triggers/#rate-expressions'
  },
  '/resources/triggers/sns-events/': {
    'api-reference': '/resources/triggers/sns-events/#configuration-reference',
    'fifo-topic-restriction': '/resources/triggers/sns-events/#fifo-topics',
    'filtering-messages': '/resources/triggers/sns-events/#filter-messages',
    'using-external-topics': '/resources/triggers/sns-events/#basic-example',
    'why-cant-i-use-a-fifo-sns-topic-to-trigger-my-lambda-function': '/resources/triggers/sns-events/#fifo-topics',
    'why-doesnt-my-filterpolicy-match--the-field-is-in-my-message': '/resources/triggers/sns-events/#filter-messages'
  },
  '/resources/triggers/sqs-events/': {
    'api-reference': '/resources/triggers/sqs-events/#configuration-reference',
    'batching-and-throughput': '/resources/triggers/sqs-events/#batching',
    'handling-failures': '/resources/triggers/sqs-events/#failures-and-retries',
    'how-do-i-see-that-the-queue-is-falling-behind': '/resources/triggers/sqs-events/#limiting-concurrency',
    'how-do-i-tell-whether-my-queue-is-falling-behind': '/resources/triggers/sqs-events/#limiting-concurrency',
    'processing-sqs-messages': '/resources/triggers/sqs-events/#basic-example',
    'retrying-only-the-failed-messages': '/resources/triggers/sqs-events/#retry-only-the-failed-messages',
    'what-happens-when-my-lambda-function-fails-to-process-a-message':
      '/resources/triggers/sqs-events/#send-failing-messages-to-a-dead-letter-queue'
  },
  '/stacktape-console/api-keys/': {
    permissions: '/stacktape-console/api-keys/#what-a-key-can-reach'
  },
  '/stacktape-console/aws-permissions/': {
    'auditing-stacktape-activity': '/stacktape-console/aws-permissions/#audit-stacktapes-activity',
    'aws-service-control-policies-scps': '/stacktape-console/aws-permissions/#restrict-what-stacktape-can-do',
    'can-i-restrict-what-stacktape-can-do-in-my-account':
      '/stacktape-console/aws-permissions/#restrict-what-stacktape-can-do',
    'do-my-deployed-resources-get-deleted-if-i-revoke-access': '/stacktape-console/aws-permissions/#revoke-access',
    'revoking-access': '/stacktape-console/aws-permissions/#revoke-access',
    'what-stacktape-does-in-your-account': '/stacktape-console/aws-permissions/#restrict-what-stacktape-can-do',
    'why-is-the-connection-stack-created-in-eu-west-1':
      '/stacktape-console/aws-permissions/#what-the-connection-stack-creates'
  },
  '/stacktape-console/billing-and-subscription/': {
    'billing-and-subscription-faq': '/stacktape-console/billing-and-subscription/#billing-faq',
    'can-i-downgrade-from-flexible-to-free': '/stacktape-console/billing-and-subscription/#change-your-plan',
    'cannot-see-the-upgrade-or-downgrade-button': '/stacktape-console/billing-and-subscription/#change-your-plan',
    'downgrading-to-the-free-plan': '/stacktape-console/billing-and-subscription/#free-plan',
    'how-do-i-get-enterprise-pricing': '/stacktape-console/billing-and-subscription/#enterprise-plan',
    'how-does-stacktape-pricing-work': '/stacktape-console/billing-and-subscription/#plans',
    'subscription-plans': '/stacktape-console/billing-and-subscription/#plans',
    'walkthrough-upgrading-to-the-flexible-plan': '/stacktape-console/billing-and-subscription/#flexible-plan',
    'what-counts-as-managed-aws-costs': '/stacktape-console/billing-and-subscription/#billing-faq',
    'what-happens-if-i-exceed-the-free-plans-100month-limit': '/stacktape-console/billing-and-subscription/#free-plan',
    'who-can-manage-billing-in-my-organization': '/stacktape-console/billing-and-subscription/#billing-faq'
  },
  '/stacktape-console/connecting-your-aws-account/': {
    'account-shows-blocked': '/stacktape-console/connecting-your-aws-account/#account-shows-no-access',
    'account-stuck-in-pending':
      '/stacktape-console/connecting-your-aws-account/#account-stuck-in-connecting-or-setup-not-finished',
    'connection-states': '/stacktape-console/connecting-your-aws-account/#account-status',
    'do-i-need-to-create-aws-access-keys-for-stacktape':
      '/stacktape-console/connecting-your-aws-account/#connect-an-account-in-the-console',
    'how-do-i-revoke-stacktapes-access-to-my-aws-account':
      '/stacktape-console/connecting-your-aws-account/#revoking-access',
    overview: '/stacktape-console/connecting-your-aws-account/#connect-an-account-in-the-console',
    walkthrough: '/stacktape-console/connecting-your-aws-account/#connect-an-account-in-the-console',
    'why-cant-i-delete-a-connected-aws-account':
      '/stacktape-console/connecting-your-aws-account/#cannot-disconnect-an-aws-account',
    'why-is-the-connect-aws-account-button-disabled':
      '/stacktape-console/connecting-your-aws-account/#you-do-not-have-permission-to-manage-aws-accounts',
    'why-wont-my-account-stay-connected-stuck-in-pending':
      '/stacktape-console/connecting-your-aws-account/#account-stuck-in-connecting-or-setup-not-finished'
  },
  '/stacktape-console/console-overview/': {
    'the-overview-dashboard': '/stacktape-console/console-overview/#the-projects-home',
    logs: '/observability/logs/',
    metrics: '/observability/metrics/',
    alarms: '/stacktape-console/console-overview/#setting-up-alarms',
    'error-tracking': '/stacktape-console/console-overview/#tracking-runtime-errors',
    'cost-dashboards': '/managing-costs/dashboards/',
    'secrets-management': '/stacktape-console/console-overview/#managing-secrets',
    'quick-reference': '/stacktape-console/console-overview/#common-tasks',
    'next-step': '/stacktape-console/console-overview/#related-pages',
    'do-i-need-the-console-to-use-stacktape': '/stacktape-console/console-overview/#console-overview-faq',
    faq: '/stacktape-console/console-overview/#console-overview-faq',
    'getting-started': '/stacktape-console/console-overview/#get-your-stacks-into-the-console',
    'how-does-stacktape-track-aws-costs-and-why-is-the-costs-page-empty':
      '/stacktape-console/console-overview/#cost-data-is-not-appearing',
    'related-features': '/stacktape-console/console-overview/#related-pages',
    'what-the-console-does': '/stacktape-console/console-overview/#what-you-can-do-in-the-console',
    'where-do-i-configure-alarms': '/stacktape-console/console-overview/#setting-up-alarms',
    'why-is-a-sidebar-item-missing-for-me': '/stacktape-console/console-overview/#sidebar-items-are-missing'
  },
  '/stacktape-console/organizations-projects-and-stages/': {
    'access-control': '/stacktape-console/organizations-projects-and-stages/#project-settings',
    'configuring-build-runners': '/stacktape-console/organizations-projects-and-stages/#project-settings',
    'configuring-project-settings': '/stacktape-console/organizations-projects-and-stages/#project-settings',
    'cost-shows-0-for-active-stage':
      '/stacktape-console/organizations-projects-and-stages/#organizations-projects-and-stages-faq',
    'deleting-a-stage-or-project': '/stacktape-console/organizations-projects-and-stages/#project-settings',
    'failed-stage-in-the-sidebar':
      '/stacktape-console/organizations-projects-and-stages/#redeploy-roll-back-or-delete-a-stage',
    'filtering-and-finding-projects': '/stacktape-console/organizations-projects-and-stages/#projects',
    'git-repository-not-connected': '/stacktape-console/organizations-projects-and-stages/#project-settings',
    'how-the-hierarchy-works': '/stacktape-console/organizations-projects-and-stages/#organizations',
    'should-i-use-one-configuration-per-project-or-one-per-stage':
      '/stacktape-console/organizations-projects-and-stages/#stages',
    'step-1--create-a-project': '/stacktape-console/organizations-projects-and-stages/#projects',
    'step-2--create-a-stage': '/stacktape-console/organizations-projects-and-stages/#create-a-stage',
    'what-is-the-difference-between-a-project-and-a-stage-in-stacktape':
      '/stacktape-console/organizations-projects-and-stages/#stages',
    'what-is-the-difference-between-a-stacktape-organization-and-an-aws-account':
      '/stacktape-console/organizations-projects-and-stages/#organizations',
    'why-does-my-active-stage-show-0-cost':
      '/stacktape-console/organizations-projects-and-stages/#organizations-projects-and-stages-faq'
  },
  '/using-with-ai/agent-mode-in-dev/': {
    faq: '/using-with-ai/agent-mode-in-dev/#agent-mode-in-dev-faq'
  },
  '/using-with-ai/mcp-server-setup/': {
    faq: '/using-with-ai/mcp-server-setup/#mcp-server-faq',
    'mcp-server-setup-faq': '/using-with-ai/mcp-server-setup/#mcp-server-faq'
  },
  '/using-with-ai/overview/': {
    'agent-mode': '/using-with-ai/overview/#set-up-your-agent',
    'ai-config-generation': '/using-with-ai/overview/#write-or-change-the-config',
    'can-an-ai-assistant-deploy-to-production-through-the-mcp-server':
      '/using-with-ai/overview/#what-runs-without-asking',
    'coding-assistant-setup': '/using-with-ai/overview/#set-up-your-agent',
    'credential-handling': '/using-with-ai/overview/#what-runs-without-asking',
    'does-the-mcp-server-require-separate-authentication': '/using-with-ai/overview/#what-runs-without-asking',
    'safety-model': '/using-with-ai/overview/#what-runs-without-asking',
    'start-here': '/using-with-ai/overview/#set-up-your-agent',
    'the-ai-assisted-development-workflow': '/using-with-ai/overview/#build-and-test-in-dev-mode',
    'which-ai-coding-assistants-work-with-stacktape': '/using-with-ai/overview/#set-up-your-agent'
  }
};
