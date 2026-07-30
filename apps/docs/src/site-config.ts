import {
  LuActivity,
  LuBot,
  LuBoxes,
  LuBrainCircuit,
  LuCloudUpload,
  LuContainer,
  LuCpu,
  LuDatabase,
  LuFileCog,
  LuGitBranch,
  LuHardDrive,
  LuKeyRound,
  LuLaptop,
  LuLayoutDashboard,
  LuMessageSquare,
  LuMonitor,
  LuNetwork,
  LuPackage,
  LuRocket,
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

type SidebarSubgroup = {
  /**
   * Full path of the virtual subgroup node, e.g. `/resources/compute`. The icon is rendered next to
   * the subgroup label in the sidebar.
   */
  path: string;
  icon: SidebarIcon;
};

type SidebarGroup = {
  order: number;
  path: string;
  title: string;
  icon: SidebarIcon;
  defaultOpen?: boolean;
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
    forcedNavOrder: [
      '/getting-started',
      '/configuration',
      '/resources',
      '/packaging',
      '/deployment-and-lifecycle',
      '/observability',
      '/managing-costs',
      '/guardrails',
      '/ci-cd-and-gitops',
      '/local-development',
      '/using-with-ai',
      '/stacktape-console',
      '/cli'
    ],
    groups: [
      { order: 1, path: '/getting-started', title: 'Getting Started', icon: LuRocket, defaultOpen: true },
      { order: 2, path: '/configuration', title: 'Configuration', icon: LuFileCog },
      {
        order: 3,
        path: '/resources',
        title: 'Resources',
        icon: LuBoxes,
        defaultOpen: true,
        subgroups: [
          { path: '/resources/compute', icon: LuCpu },
          { path: '/resources/frontend', icon: LuMonitor },
          { path: '/resources/databases', icon: LuDatabase },
          { path: '/resources/storage', icon: LuHardDrive },
          { path: '/resources/networking', icon: LuNetwork },
          { path: '/resources/messaging', icon: LuMessageSquare },
          { path: '/resources/triggers', icon: LuZap },
          { path: '/resources/orchestration', icon: LuWorkflow },
          { path: '/resources/security', icon: LuKeyRound },
          { path: '/resources/advanced', icon: LuWrench },
          { path: '/resources/ai', icon: LuBrainCircuit }
        ]
      },
      {
        order: 4,
        path: '/packaging',
        title: 'Packaging',
        icon: LuPackage,
        subgroups: [
          { path: '/packaging/function', icon: LuZap },
          { path: '/packaging/containers', icon: LuContainer }
        ]
      },
      { order: 5, path: '/deployment-and-lifecycle', title: 'Deploying & Lifecycle', icon: LuCloudUpload },
      { order: 6, path: '/observability', title: 'Observability', icon: LuActivity },
      { order: 7, path: '/managing-costs', title: 'Managing Costs', icon: LuWallet },
      { order: 8, path: '/guardrails', title: 'Guardrails', icon: LuShield },
      { order: 9, path: '/ci-cd-and-gitops', title: 'CI/CD & GitOps', icon: LuGitBranch },
      { order: 10, path: '/local-development', title: 'Local Development', icon: LuLaptop },
      { order: 11, path: '/using-with-ai', title: 'Using with AI', icon: LuBot },
      { order: 12, path: '/stacktape-console', title: 'Stacktape Console', icon: LuLayoutDashboard },
      { order: 13, path: '/cli', title: 'CLI Reference', icon: LuTerminal }
    ] satisfies SidebarGroup[],
    /**
     * Virtual subgroup paths that default to expanded when a user first lands on the docs site.
     * Top-level groups use `defaultOpen` on their group entry above.
     */
    defaultOpenPaths: ['/resources/compute']
  },
  social: {
    github: 'https://github.com/stacktape/stacktape',
    linkedin: 'https://www.linkedin.com/company/stacktape',
    twitter: 'https://twitter.com/stacktape',
    facebook: 'https://facebook.com/stacktape',
    slack: 'https://join.slack.com/t/stacktape-community/shared_invite/zt-16st4nmgl-B8adf0YnZWSMEbuz9Ih6vg',
    discord: 'https://discord.gg/gSvzRWe3YD'
  },
  algolia: {
    appId: 'PFTWPISD3F',
    apiKey: 'b10d8ccfbb0cb544d1a42486e46ecc8f',
    indexName: 'Docs crawler'
  }
};

export default siteConfig;
