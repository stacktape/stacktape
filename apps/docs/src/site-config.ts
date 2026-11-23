import {
  LuActivity,
  LuBot,
  LuBoxes,
  LuBookOpen,
  LuBrainCircuit,
  LuCloudUpload,
  LuContainer,
  LuCpu,
  LuDatabase,
  LuFileCog,
  LuGitBranch,
  LuHardDrive,
  LuHistory,
  LuKeyRound,
  LuLaptop,
  LuLayoutDashboard,
  LuMessageSquare,
  LuMonitor,
  LuNetwork,
  LuPackage,
  LuPuzzle,
  LuRocket,
  LuServer,
  LuShield,
  LuTerminal,
  LuWallet,
  LuWorkflow,
  LuWrench,
  LuZap
} from 'react-icons/lu';
import type { ComponentType } from 'react';

/**
 * Site-level constants and the authored sidebar taxonomy.
 *
 * Everything here is deliberately static: the production build must be reproducible, so nothing in
 * this file may read the clock, the environment, or the network.
 */

/** A `react-icons` component. */
export type SidebarIcon = ComponentType<{ size?: number }>;

/** `v4` is the current documentation; `v3` is the frozen 3.7.1 archive under `/v3/`. */
export type DocsVersion = 'v4' | 'v3';

export type SidebarSubgroup = {
  /**
   * Key of the subgroup node. A subgroup without `pages` holds the pages under this URL prefix
   * (`/resources/compute`). A subgroup with `pages` can use any path inside its group that no page
   * uses (`/cli/deploy-group`).
   */
  path: string;
  /** Sidebar label. Defaults to the capitalized last path segment. */
  title?: string;
  icon?: SidebarIcon;
  /**
   * URLs of the pages in this subgroup, in sidebar order, whatever their URL path. The CLI keeps flat
   * `/cli/<command>` URLs and groups the commands by task here.
   */
  pages?: string[];
  /**
   * Pages that another group lists (see `SidebarGroup.pages`) and that this subgroup links to as well, after its own
   * pages. The link never opens its branch: the page's place in the sidebar is the group that lists it.
   */
  links?: string[];
};

type SidebarGroup = {
  order: number;
  /** Key of the group. Pages whose URL starts with it belong to it, unless another group lists them. */
  path: string;
  title: string;
  icon: SidebarIcon;
  defaultOpen?: boolean;
  /**
   * Pages from another URL path that sit in this group among its own pages, at `order` (the frontmatter order of the
   * group's own pages). Used where the sidebar place changed but the URL had to stay, because the CLI prints it.
   */
  pages?: { url: string; order: number }[];
  subgroups?: SidebarSubgroup[];
};

const siteConfig = {
  metadata: {
    name: 'Stacktape documentation',
    description:
      'Deploy production-grade serverless and container applications to your own AWS account with a type-safe, developer-friendly infrastructure framework.',
    pathPrefix: '/',
    url: 'https://docs.stacktape.com',
    siteimage: 'https://docs.stacktape.com/cover-images/opengraph.png',
    copyright: 'Copyright © Stacktape'
  },
  sidebar: {
    // Lifecycle order: start, describe the stack, develop and ship it, run it, govern it, then the
    // tools. Groups list in this order; subgroups list in the order of their `subgroups` array.
    forcedNavOrder: [
      '/getting-started',
      '/configuration',
      '/resources',
      '/local-development',
      '/packaging',
      '/deployment-and-lifecycle',
      '/ci-cd-and-gitops',
      '/observability',
      '/managing-costs',
      '/guardrails',
      '/stacktape-console',
      '/using-with-ai',
      '/cli',
      '/stacktape-v3'
    ],
    groups: [
      {
        order: 1,
        path: '/getting-started',
        title: 'Getting started',
        icon: LuRocket,
        defaultOpen: true,
        // Setting up a domain is a step of going live, right after "Going to production".
        pages: [{ url: '/resources/networking/custom-domains', order: 10 }]
      },
      { order: 2, path: '/configuration', title: 'Configuration', icon: LuFileCog },
      {
        order: 3,
        path: '/resources',
        title: 'Resources',
        icon: LuBoxes,
        subgroups: [
          { path: '/resources/compute', icon: LuCpu },
          { path: '/resources/frontend', icon: LuMonitor },
          { path: '/resources/databases', icon: LuDatabase },
          { path: '/resources/storage', icon: LuHardDrive },
          { path: '/resources/networking', icon: LuNetwork, links: ['/resources/networking/custom-domains'] },
          { path: '/resources/messaging', icon: LuMessageSquare },
          { path: '/resources/triggers', icon: LuZap },
          { path: '/resources/orchestration', icon: LuWorkflow },
          { path: '/resources/security', icon: LuKeyRound },
          { path: '/resources/ai', title: 'AgentCore', icon: LuBrainCircuit },
          { path: '/resources/advanced', icon: LuWrench }
        ]
      },
      { order: 4, path: '/local-development', title: 'Local development', icon: LuLaptop },
      {
        order: 5,
        path: '/packaging',
        title: 'Packaging',
        icon: LuPackage,
        subgroups: [
          { path: '/packaging/function', title: 'Lambda functions', icon: LuZap },
          { path: '/packaging/containers', icon: LuContainer }
        ]
      },
      { order: 6, path: '/deployment-and-lifecycle', title: 'Deployment', icon: LuCloudUpload },
      { order: 7, path: '/ci-cd-and-gitops', title: 'CI/CD', icon: LuGitBranch },
      { order: 8, path: '/observability', title: 'Observability', icon: LuActivity },
      { order: 9, path: '/managing-costs', title: 'Costs', icon: LuWallet },
      { order: 10, path: '/guardrails', title: 'Guardrails', icon: LuShield },
      { order: 11, path: '/stacktape-console', title: 'Stacktape Console', icon: LuLayoutDashboard },
      { order: 12, path: '/using-with-ai', title: 'Coding agents', icon: LuBot },
      {
        order: 13,
        path: '/cli',
        title: 'CLI reference',
        icon: LuTerminal,
        subgroups: [
          {
            path: '/cli/set-up',
            title: 'Set up',
            pages: [
              '/cli/init',
              '/cli/aws-profile-create',
              '/cli/aws-profile-list',
              '/cli/aws-profile-update',
              '/cli/aws-profile-delete',
              '/cli/defaults-set',
              '/cli/defaults-list',
              '/cli/domain-add',
              '/cli/upgrade',
              '/cli/version',
              '/cli/help'
            ]
          },
          {
            path: '/cli/deploy-and-manage',
            title: 'Deploy and manage stacks',
            pages: [
              '/cli/validate',
              '/cli/diff',
              '/cli/synth',
              '/cli/package',
              '/cli/deploy',
              '/cli/status',
              '/cli/stack-list',
              '/cli/stack-history',
              '/cli/rollback',
              '/cli/stack-recover',
              '/cli/stack-update-modules',
              '/cli/deployment-script-run',
              '/cli/bucket-sync',
              '/cli/delete'
            ]
          },
          {
            path: '/cli/develop',
            title: 'Develop locally',
            pages: ['/cli/dev', '/cli/dev-stop', '/cli/dev-network', '/cli/dev-network-delete', '/cli/script-run']
          },
          {
            path: '/cli/secrets-and-parameters',
            title: 'Secrets and parameters',
            pages: ['/cli/secret-set', '/cli/secret-get', '/cli/secret-delete', '/cli/param-get']
          },
          {
            path: '/cli/inspect-and-debug',
            title: 'Inspect and debug',
            pages: [
              '/cli/logs',
              '/cli/metrics',
              '/cli/alarm-list',
              '/cli/aws-call',
              '/cli/container-shell',
              '/cli/container-exec',
              '/cli/bastion-shell',
              '/cli/bastion-tunnel',
              '/cli/query-sql',
              '/cli/query-dynamodb',
              '/cli/query-redis',
              '/cli/query-opensearch'
            ]
          },
          {
            path: '/cli/incidents-and-errors',
            title: 'Incidents and errors',
            pages: [
              '/cli/incident-list',
              '/cli/incident-show',
              '/cli/incident-ack',
              '/cli/incident-watch',
              '/cli/incident-resolve',
              '/cli/error-list',
              '/cli/error-resolve',
              '/cli/error-ignore',
              '/cli/error-reopen'
            ]
          },
          {
            path: '/cli/console-and-account',
            title: 'Console and account',
            pages: [
              '/cli/login',
              '/cli/logout',
              '/cli/connect',
              '/cli/whoami',
              '/cli/org-list',
              '/cli/org-create',
              '/cli/org-delete',
              '/cli/project-list',
              '/cli/project-create',
              '/cli/project-delete',
              '/cli/alarm-export'
            ]
          },
          {
            path: '/cli/coding-agents',
            title: 'Coding agents',
            pages: ['/cli/mcp', '/cli/mcp-add', '/cli/mcp-remove', '/cli/ai-connect', '/cli/ai-disconnect']
          }
        ]
      },
      {
        // Kept apart from Getting started, whose pages are for new users.
        order: 14,
        path: '/stacktape-v3',
        title: 'Stacktape v3',
        icon: LuHistory,
        pages: [{ url: '/getting-started/upgrading-from-v3', order: 1 }]
      }
    ] satisfies SidebarGroup[],
    /**
     * Virtual subgroup paths that default to expanded when a user first lands on the docs site.
     * Top-level groups use `defaultOpen` on their group entry above. The branch of the current page
     * always opens.
     */
    defaultOpenPaths: [] as string[]
  },
  /** Sidebar of the frozen v3 archive: v3's own groups, in v3's order. */
  v3Sidebar: {
    basePath: '/v3',
    forcedNavOrder: ['/getting-started', '/cli', '/compute-resources', '/database-resources', '/configuration'],
    groups: [
      { order: 1, path: '/getting-started', title: 'Getting Started', icon: LuRocket, defaultOpen: true },
      { order: 3, path: '/cli', title: 'CLI', icon: LuTerminal },
      { order: 6, path: '/compute-resources', title: 'Compute resources', icon: LuCpu },
      { order: 7, path: '/database-resources', title: 'Database resources', icon: LuDatabase },
      { order: 8, path: '/security-resources', title: 'Security resources', icon: LuShield },
      { order: 9, path: '/other-resources', title: 'Other Resources', icon: LuServer },
      { order: 10, path: '/3rd-party-resources', title: '3rd party resources', icon: LuPuzzle },
      { order: 11, path: '/extending', title: 'Extending Stacktape', icon: LuWrench },
      { order: 12, path: '/user-guides', title: 'User Guides', icon: LuBookOpen },
      { order: 13, path: '/configuration', title: 'Configuration', icon: LuFileCog }
    ] satisfies SidebarGroup[]
  },
  social: {
    github: 'https://github.com/stacktape/stacktape',
    linkedin: 'https://www.linkedin.com/company/stacktape',
    twitter: 'https://twitter.com/stacktape',
    facebook: 'https://facebook.com/stacktape',
    slack: 'https://join.slack.com/t/stacktape-community/shared_invite/zt-16st4nmgl-B8adf0YnZWSMEbuz9Ih6vg'
  },
  algolia: {
    appId: 'PFTWPISD3F',
    apiKey: 'b10d8ccfbb0cb544d1a42486e46ecc8f',
    indexName: 'Docs crawler'
  }
};

export default siteConfig;
