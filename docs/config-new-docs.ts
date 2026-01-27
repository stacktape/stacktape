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
import { LuCpu, LuNetwork, LuHardDrive, LuMessageSquare, LuWorkflow, LuPlay, LuZap } from 'react-icons/lu';
import { MdOutlineMonitor } from 'react-icons/md';

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
      '/quick-start',
      '/getting-started',
      '/configuration',
      '/development',
      '/compute',
      '/databases',
      '/networking',
      '/storage',
      '/messaging',
      '/orchestration',
      '/security',
      '/deployment',
      '/operations',
      '/extending',
      '/cli',
      '/recipes'
    ],
    groups: [
      {
        order: 0,
        path: '/quick-start',
        title: 'Quick Start',
        icon: LuZap
      },
      {
        order: 1,
        path: '/getting-started',
        title: 'Getting Started',
        icon: BiRocket
      },
      {
        order: 2,
        path: '/configuration',
        title: 'Configuration',
        icon: BiCog
      },
      {
        order: 3,
        path: '/development',
        title: 'Development',
        icon: BiCode
      },
      {
        order: 4,
        path: '/compute',
        title: 'Compute',
        icon: LuCpu
      },
      {
        order: 5,
        path: '/databases',
        title: 'Databases',
        icon: BiData
      },
      {
        order: 6,
        path: '/networking',
        title: 'Networking',
        icon: LuNetwork
      },
      {
        order: 7,
        path: '/storage',
        title: 'Storage',
        icon: LuHardDrive
      },
      {
        order: 8,
        path: '/messaging',
        title: 'Messaging & Events',
        icon: LuMessageSquare
      },
      {
        order: 9,
        path: '/orchestration',
        title: 'Orchestration',
        icon: LuWorkflow
      },
      {
        order: 10,
        path: '/security',
        title: 'Security',
        icon: BiShield
      },
      {
        order: 11,
        path: '/deployment',
        title: 'Deployment',
        icon: LuPlay
      },
      {
        order: 12,
        path: '/operations',
        title: 'Operations',
        icon: MdOutlineMonitor
      },
      {
        order: 13,
        path: '/extending',
        title: 'Extending',
        icon: BiExtension
      },
      {
        order: 14,
        path: '/cli',
        title: 'CLI Reference',
        icon: BiTerminal
      },
      {
        order: 15,
        path: '/recipes',
        title: 'Recipes',
        icon: GrHelpBook
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
