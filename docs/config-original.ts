import {
  BiBook,
  BiCloudDownload,
  BiCode,
  BiCog,
  BiData,
  BiExtension,
  BiRocket,
  BiServer,
  BiShield,
  BiTerminal
} from 'react-icons/bi';
import { FaPuzzlePiece } from 'react-icons/fa';
import { GrHelpBook } from 'react-icons/gr';
import { LuCpu } from 'react-icons/lu';

export default {
  domain: 'stacktape.com',
  metadata: {
    name: 'Stacktape documentation',
    description: 'Your AWS, 97% easier',
    title: 'Stacktape | Your AWS, 97% easier',
    language: 'en',
    pathPrefix: '/',
    favicon: 'static/assets/favicon.png',
    themeColor: '#70C8B6', // Used for setting manifest and progress theme colors.
    backgroundColor: '#1B1B1B', // Used for setting manifest background color.
    url: 'https://docs.stacktape.com',
    siteimage: 'https://stacktape.com/cover-images/opengraph.png',
    copyright: 'Copyright © Stacktape 2025'
  },
  sidebar: {
    forcedNavOrder: [
      '/getting-started',
      '/cli',
      '/compute-resources',
      '/database-resources',
      '/configuration',
      '/developing'
    ],
    groups: [
      {
        order: 1,
        path: '/getting-started',
        title: 'Getting Started',
        icon: BiRocket
      },
      {
        order: 2,
        path: '/tutorials',
        title: 'Tutorials',
        icon: GrHelpBook
      },
      {
        order: 3,
        path: '/cli',
        title: 'CLI',
        icon: BiTerminal
      },
      {
        order: 4,
        path: '/sdk',
        title: 'SDK',
        icon: BiCode
      },
      {
        order: 6,
        path: '/compute-resources',
        title: 'Compute resources',
        icon: LuCpu
      },
      {
        order: 7,
        path: '/database-resources',
        title: 'Database resources',
        icon: BiData
      },
      {
        order: 8,
        path: '/security-resources',
        title: 'Security resources',
        icon: BiShield
      },
      {
        order: 9,
        path: '/other-resources',
        title: 'Other Resources',
        icon: BiServer
      },
      {
        order: 10,
        path: '/3rd-party-resources',
        title: '3rd party resources',
        icon: FaPuzzlePiece
      },
      {
        order: 11,
        path: '/extending',
        title: 'Extending Stacktape',
        icon: BiExtension
      },
      {
        order: 12,
        path: '/user-guides',
        title: 'User Guides',
        icon: BiBook
      },
      {
        order: 13,
        path: '/configuration',
        title: 'Configuration',
        icon: BiCog
      },
      {
        order: 14,
        path: '/migration-guides',
        title: 'Migration guides',
        icon: BiCloudDownload
      }
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
