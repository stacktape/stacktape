import {
  LuRocket,
  LuFileCog,
  LuBoxes,
  LuPackage,
  LuCloudUpload,
  LuActivity,
  LuGitBranch,
  LuLaptop,
  LuBot,
  LuLayoutDashboard,
  LuLightbulb,
  LuBookOpen,
  LuTerminal
} from 'react-icons/lu';

export type SidebarGroup = {
  order: number;
  path: string;
  title: string;
  icon: any;
  defaultOpen?: boolean;
};

export default {
  domain: 'stacktape.com',
  metadata: {
    name: 'Stacktape documentation',
    description: 'Your AWS, 97% easier',
    title: 'Stacktape | Your AWS, 97% easier',
    language: 'en',
    pathPrefix: '/',
    favicon: 'static/assets/favicon.png',
    themeColor: '#70C8B6',
    backgroundColor: '#1B1B1B',
    url: 'https://docs.stacktape.com',
    siteimage: 'https://stacktape.com/cover-images/opengraph.png',
    copyright: 'Copyright © Stacktape 2025'
  },
  sidebar: {
    forcedNavOrder: [
      '/getting-started',
      '/configuration',
      '/resources',
      '/packaging',
      '/deployment-and-lifecycle',
      '/operations',
      '/ci-cd-and-gitops',
      '/local-development',
      '/using-with-ai',
      '/stacktape-console',
      '/recipes',
      '/reference',
      '/cli'
    ],
    groups: [
      { order: 1, path: '/getting-started', title: 'Getting Started', icon: LuRocket, defaultOpen: true },
      { order: 2, path: '/configuration', title: 'Configuration', icon: LuFileCog },
      { order: 3, path: '/resources', title: 'Resources', icon: LuBoxes, defaultOpen: true },
      { order: 4, path: '/packaging', title: 'Packaging', icon: LuPackage },
      { order: 5, path: '/deployment-and-lifecycle', title: 'Deploying & Lifecycle', icon: LuCloudUpload },
      { order: 6, path: '/operations', title: 'Operations', icon: LuActivity },
      { order: 7, path: '/ci-cd-and-gitops', title: 'CI/CD & GitOps', icon: LuGitBranch },
      { order: 8, path: '/local-development', title: 'Local Development', icon: LuLaptop },
      { order: 9, path: '/using-with-ai', title: 'Using with AI', icon: LuBot },
      { order: 10, path: '/stacktape-console', title: 'Stacktape Console', icon: LuLayoutDashboard },
      { order: 11, path: '/recipes', title: 'Recipes', icon: LuLightbulb },
      { order: 12, path: '/reference', title: 'Reference', icon: LuBookOpen },
      { order: 13, path: '/cli', title: 'CLI Reference', icon: LuTerminal }
    ] satisfies SidebarGroup[],
    // Subgroup paths (virtual nodes) that should default to expanded when a user first lands on
    // the docs site. Top-level groups use `defaultOpen` on their config entry above.
    defaultOpenPaths: [
      '/resources/compute'
    ]
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
  },
  crisp: {
    id: '1d26554b-8e37-4cb0-8c95-e774099f4b74'
  }
};
