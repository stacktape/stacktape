/*
 * Section packs for the home page: the words, the proof and the product picture for six capabilities
 * (Designs, Packages, Monitors, Secures, Costs, Expert help), ready for whichever direction is built.
 *
 * Sources are on `origin/main` at a23cad8ce. `docs/` is `apps/docs/content/`. `bench` is
 * `src/data/deploy-benchmarks.json`, read here through the existing helpers, so the page shows the file's
 * numbers instead of copies. Pictures are plain files imported for their URL and size; render them with a
 * plain <img>/<picture> (no astro:assets transforms, so the build needs no Sharp).
 */
import type { ImageMetadata } from 'astro';
import { BENCHMARKS, findGroup, toolName } from '../variants/readme/benchmarks';
import costsPhoneSmallPng from './assets/costs-phone-400.png';
import costsPhoneSmall from './assets/costs-phone-400.webp';
import costsPhoneLargePng from './assets/costs-phone-800.png';
import costsPhoneLarge from './assets/costs-phone-800.webp';
import costsSmallPng from './assets/costs-1182.png';
import costsSmall from './assets/costs-1182.webp';
import costsLargePng from './assets/costs-2364.png';
import costsLarge from './assets/costs-2364.webp';
import designsPhoneSmallPng from './assets/designs-phone-388.png';
import designsPhoneSmall from './assets/designs-phone-388.webp';
import designsPhoneLargePng from './assets/designs-phone-776.png';
import designsPhoneLarge from './assets/designs-phone-776.webp';
import designsSmallPng from './assets/designs-1200.png';
import designsSmall from './assets/designs-1200.webp';
import designsLargePng from './assets/designs-2400.png';
import designsLarge from './assets/designs-2400.webp';
import monitorsPhoneSmallPng from './assets/monitors-phone-400.png';
import monitorsPhoneSmall from './assets/monitors-phone-400.webp';
import monitorsPhoneLargePng from './assets/monitors-phone-800.png';
import monitorsPhoneLarge from './assets/monitors-phone-800.webp';
import monitorsSmallPng from './assets/monitors-1182.png';
import monitorsSmall from './assets/monitors-1182.webp';
import monitorsLargePng from './assets/monitors-2364.png';
import monitorsLarge from './assets/monitors-2364.webp';
import packagesPhoneSmallPng from './assets/packages-phone-400.png';
import packagesPhoneSmall from './assets/packages-phone-400.webp';
import packagesPhoneLargePng from './assets/packages-phone-800.png';
import packagesPhoneLarge from './assets/packages-phone-800.webp';
import packagesSmallPng from './assets/packages-742.png';
import packagesSmall from './assets/packages-742.webp';
import packagesLargePng from './assets/packages-1484.png';
import packagesLarge from './assets/packages-1484.webp';
import securesPhoneSmallPng from './assets/secures-phone-400.png';
import securesPhoneSmall from './assets/secures-phone-400.webp';
import securesPhoneLargePng from './assets/secures-phone-800.png';
import securesPhoneLarge from './assets/secures-phone-800.webp';
import securesSmallPng from './assets/secures-1182.png';
import securesSmall from './assets/secures-1182.webp';
import securesLargePng from './assets/secures-2364.png';
import securesLarge from './assets/secures-2364.webp';

/** One crop at 1× and 2×, each as WebP with a PNG fallback. */
type Crop = { small: ImageMetadata; large: ImageMetadata; smallPng: ImageMetadata; largePng: ImageMetadata };

type Picture = {
  /** For a slot about 1200 px wide. */
  desktop: Crop;
  /** A tighter crop for phones, where the desktop crop's text would be unreadable. */
  phone: Crop;
  alt: string;
  /** The capture in `<W>/shots/product/` the crops were cut from. */
  from: string;
  /** What a builder should know before using the picture. */
  note?: string;
};

type Fact = { text: string; source: string };

type Figure = {
  /** The number or fact, short enough to set large. */
  value: string;
  /** What the value measures, in words. */
  label: string;
  source: string;
  /** Benchmark figures: the run date, shown next to the figure, and the page it links to. */
  runDate?: string;
  link?: string;
  /** Benchmark figures: every tool's value, fastest first, for a bar chart. */
  bars?: { tool: string; seconds: number; stacktape: boolean }[];
};

type SectionPack = {
  id: 'designs' | 'packages' | 'monitors' | 'secures' | 'costs' | 'expert-help';
  /** The capability's name, as in `MESSAGE.md`. */
  name: string;
  /** The claim, eight words at most. */
  title: string;
  /** One supporting line, 18 words at most. */
  line: string;
  figure: Figure;
  /** Further facts a layout may show next to the picture, each with its source. */
  facts: Fact[];
  picture: Picture | null;
  /** Why there is no picture, when there is none. */
  noPicture?: string;
  /** Things the product does not do, so the section must not say them. */
  doNotClaim: string[];
};

const crop = (small: ImageMetadata, large: ImageMetadata, smallPng: ImageMetadata, largePng: ImageMetadata): Crop => ({
  small,
  large,
  smallPng,
  largePng
});

const benchmarkRun = BENCHMARKS.runs[0];
if (!benchmarkRun) throw new Error('The benchmark data has no run');

const packaging = findGroup('packaging', 'empty-cache', 'lambda-25');
const packagingBars = packaging.group.values
  .toSorted((left, right) => left.median - right.median)
  .map((value) => ({
    tool: toolName(BENCHMARKS, value.tool),
    seconds: value.median,
    stacktape: value.tool === 'stacktape'
  }));
const packagingFor = (tool: string) => {
  const value = packaging.group.values.find((candidate) => candidate.tool === tool);
  if (!value) throw new Error(`No packaging value for ${tool}`);
  return value.median.toFixed(1);
};
const packagedFunctions = packaging.group.label.split(' ')[0];

export const SECTION_PACKS: SectionPack[] = [
  {
    id: 'designs',
    name: 'Designs',
    title: 'Reads your repo and proposes the AWS setup',
    line: 'Each resource shows why it’s there, the line of code behind it and its monthly cost.',
    figure: {
      value: 'No source code goes to Stacktape',
      label: 'The coding agent you already use reads the repo on your machine. No account is needed.',
      source: 'docs/cli/init.mdx:12-15'
    },
    facts: [
      {
        text: 'Every resource comes with the reason it exists, the line of code behind it and a monthly estimate from AWS list prices.',
        source: 'docs/cli/init.mdx:47-48'
      },
      {
        text: 'Opens a wizard in your browser. Nothing is created until you confirm.',
        source: 'docs/cli/init.mdx:56-60'
      }
    ],
    picture: {
      desktop: crop(designsSmall, designsLarge, designsSmallPng, designsLargePng),
      phone: crop(designsPhoneSmall, designsPhoneLarge, designsPhoneSmallPng, designsPhoneLargePng),
      alt: 'The init wizard’s Review step for a Next.js app: a diagram with the site and a Postgres database, an estimated $32 a month, and the generated stacktape.yml.',
      from: 'designs-review-wizard-1440x900-main.png',
      note: 'Direction A’s hero and direction C already use this screen. The phone crop is the cost and resources column.'
    },
    doNotClaim: [
      'That no AI reads the code: Claude Code or Codex reads it locally and sends the files it reads to its own provider (docs/cli/init.mdx:18-21).',
      'That no data leaves the machine: init sends the generated configuration and region to the price estimator (docs/cli/init.mdx:16-17).',
      'Fixed prices: the estimate is from AWS list prices, plus usage.',
      '“Like a senior DevOps team” as a fact. It is fine as the owner’s opinion.'
    ]
  },
  {
    id: 'packages',
    name: 'Packages',
    title: `${packagedFunctions} Lambda functions packaged in ${packagingFor('stacktape')} seconds`,
    line: `Same ${packagedFunctions} functions, empty build cache: AWS CDK takes ${packagingFor('cdk')} s. Python, Go and Rust build without a Dockerfile.`,
    figure: {
      value: `${packagingFor('stacktape')} s`,
      label: `Packaging ${packaging.group.label} with an empty build cache, median of 10 runs`,
      source: 'bench packaging / empty-cache / lambda-25',
      runDate: benchmarkRun.label,
      link: '/benchmarks',
      bars: packagingBars
    },
    facts: [
      {
        text: 'Python, Java, Go, Ruby, .NET and Rust functions build without a Dockerfile.',
        source: 'docs/packaging/overview.mdx:37'
      },
      {
        text: 'Code shared between functions goes into a shared layer.',
        source: 'docs/packaging/overview.mdx:36'
      }
    ],
    picture: {
      desktop: crop(packagesSmall, packagesLarge, packagesSmallPng, packagesLargePng),
      phone: crop(packagesPhoneSmall, packagesPhoneLarge, packagesPhoneSmallPng, packagesPhoneLargePng),
      alt: 'A deploy’s steps in the Stacktape Console: Initialize, Build & package with invoiceWorker packaged at 3.4 MB, and Upload artifacts.',
      from: 'packages-build-and-package-tape-1440x900-main.png',
      note: 'The crop leaves out the step timings: the demo data shows 19 s for Build & package, which reads against the benchmark. The card is cut on the right. The benchmark bars (figure.bars) prove the claim better than this screen; use the screen as a secondary picture or not at all.'
    },
    doNotClaim: [
      'Container packaging speed: the figure covers Lambda functions only.',
      'A lead after a source change: every tool takes about the same time (bench packaging notes).',
      'Any figure without its run date and a link to /benchmarks, until the rerun on the released CLI (L24).',
      'That builds need no Docker: Python, Java, Go, Ruby, .NET and Rust functions compile in Docker, just without a Dockerfile.'
    ]
  },
  {
    id: 'monitors',
    name: 'Monitors',
    title: 'Monitoring comes with the stack',
    line: 'See logs and metrics, then add tracing and uptime checks in your config.',
    figure: {
      value: 'Error tracking',
      label: 'On by default with the Console for supported workloads.',
      source: 'docs/observability/error-tracking.mdx:34, :47-53'
    },
    facts: [
      {
        text: 'Uptime checks probe your endpoints from several AWS regions, from a small Lambda in your own account. No per-check fee.',
        source: 'docs/observability/uptime-checks.mdx:10'
      },
      {
        text: 'Scripted browser and API tests run on a schedule from your AWS account.',
        source: 'docs/observability/synthetic-tests.mdx:5'
      }
    ],
    picture: {
      desktop: crop(monitorsSmall, monitorsLarge, monitorsSmallPng, monitorsLargePng),
      phone: crop(monitorsPhoneSmall, monitorsPhoneLarge, monitorsPhoneSmallPng, monitorsPhoneLargePng),
      alt: 'The Console’s Metrics page: requests, errors, API latency and database CPU for the last 24 hours, above a table of functions and APIs with their errors, requests and latency.',
      from: 'monitors-metrics-tape-1440x900-main.png',
      note: 'Direction B uses the error tracking screen. The uptime screen is the alternative, but its demo rows include a paused check and a check with no data.'
    },
    doNotClaim: [
      'That all data stays in AWS: error events and metrics go to the Console.',
      'A public status page: the docs do not describe one.',
      'That uptime checks and browser tests are on by default: you add them to the config.'
    ]
  },
  {
    id: 'secures',
    name: 'Secures',
    title: 'Least access by default. Rules checked before deploy.',
    line: 'Each workload gets only the access it needs. Guardrails block a public database or the wrong region.',
    figure: {
      value: 'Blocked before deploy',
      label: 'Guardrails check stages, regions, commands, resource types and settings before anything in AWS changes.',
      source: 'docs/guardrails/overview.mdx:10'
    },
    facts: [
      {
        text: '`connectTo` grants only the IAM permissions and network access a workload needs.',
        source: 'docs/configuration/connecting-resources.mdx:10, :136'
      },
      {
        text: 'Every deploy is scanned, and packages are checked again every night for new vulnerabilities.',
        source: 'docs/stacktape-console/security-scanning.mdx:10-11, :51-52'
      },
      {
        text: 'Single sign-on and SCIM on Flexible.',
        source: 'apps/website/src/pages/pricing.astro:49'
      }
    ],
    picture: {
      desktop: crop(securesSmall, securesLarge, securesSmallPng, securesLargePng),
      phone: crop(securesPhoneSmall, securesPhoneLarge, securesPhoneSmallPng, securesPhoneLargePng),
      alt: 'The Console’s Guardrails page with three rules on: a region restriction, “Keep SQL and OpenSearch private”, which blocks the next deploy of checkout-api, and a function memory limit.',
      from: 'secures-guardrails-tape-1440x900-main.png',
      note: 'A wide, short crop (about 3.4 : 1). The Security findings page is the fuller alternative, but it shows scanning, which never blocks a deploy.'
    },
    doNotClaim: [
      'That scanning blocks deploys: it only reports (docs/stacktape-console/security-scanning.mdx:14).',
      'Fix pull requests for vulnerabilities, or SBOMs.',
      'SSO or SCIM on Free.'
    ]
  },
  {
    id: 'costs',
    name: 'Costs',
    title: 'AWS spend per project, stage and resource',
    line: 'From your AWS cost data, updated daily. Budgets alert on actual and forecast spend.',
    figure: {
      value: 'Per resource',
      label: 'Your AWS spend broken down by project, stage and individual resource, generated daily.',
      source: 'docs/managing-costs/per-resource-breakdown.mdx:10, :12'
    },
    facts: [
      {
        text: 'A budget alerts when spend or the month’s forecast crosses a share of its limit. Forecast alerts are on by default.',
        source: 'docs/managing-costs/budgets.mdx:10, :34'
      },
      {
        text: 'The init wizard estimates the monthly cost before anything is created.',
        source: 'docs/cli/init.mdx:47'
      },
      {
        text: 'AWS bills you directly. Stacktape’s fee is a separate invoice.',
        source: 'docs/managing-costs/overview.mdx:10, :26'
      }
    ],
    picture: {
      desktop: crop(costsSmall, costsLarge, costsSmallPng, costsLargePng),
      phone: crop(costsPhoneSmall, costsPhoneLarge, costsPhoneSmallPng, costsPhoneLargePng),
      alt: 'The Console’s Costs page for the storefront project: $661.17 so far in November, spend month by month, and the split by stage with production at 62%.',
      from: 'costs-by-stage-tape-1440x900-main.png',
      note: 'Direction B uses a costs screen too. The phone crop is the “by stage” panel; one demo stage is called dev-anna.'
    },
    doNotClaim: [
      'That budgets cap or stop spend: they only alert.',
      'That a budget is per project or stage: it watches one connected AWS account (docs/managing-costs/budgets.mdx:9).',
      'Real-time costs: reports are daily.',
      'Savings figures.'
    ]
  },
  {
    id: 'expert-help',
    name: 'Expert help',
    title: 'Questions go to the engineers who build it',
    line: 'On Flexible, you get a shared Slack channel with the founders who build Stacktape.',
    figure: {
      value: 'A shared Slack channel',
      label: 'With the founders, on the Flexible plan.',
      source: 'apps/website/src/pages/pricing.astro:50'
    },
    facts: [
      {
        text: 'Enterprise includes up to 24×7 premium support.',
        source: 'apps/website/src/pages/pricing.astro:61'
      }
    ],
    picture: null,
    noPicture:
      'The product has no screen for this. Show the founders or plain text; no invented chat or Slack screenshot.',
    doNotClaim: ['Calls on every plan.', 'Response times on Flexible.', 'Hands-on support on Free.']
  }
];
