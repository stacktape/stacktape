/*
 * Section packs for the home page: the words, the proof and the product picture for the eight capabilities, in the
 * voice of the README page's sections 01 and 02, which the owner approved (TASTE 26). Each pack says what problem the
 * section removes, what Stacktape does and what you get, in a title, a short text and three concrete points. The
 * structures read their words from here.
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

type Figure = {
  /** The number, short enough to set large. */
  value: string;
  /** What the value measures, in words. */
  label: string;
  source: string;
  /** The run date, shown next to the figure, and the page it links to. */
  runDate: string;
  link: string;
  /** Every tool's value, fastest first, for a bar chart. */
  bars: { tool: string; seconds: number; stacktape: boolean }[];
};

type SectionPack = {
  id: 'designs' | 'packages' | 'deploys' | 'monitors' | 'secures' | 'incidents' | 'costs' | 'expert-help';
  /** The capability's name, for the section's tape label. */
  name: string;
  /** What Stacktape does, as the README page's sections name it. */
  title: string;
  /** The problem, what Stacktape does and what you get, in two to four plain sentences. */
  text: string;
  /** Three concrete things you get. Backticks mark code. */
  gets: [string, string, string];
  /** A benchmark figure, for the sections whose claim is a measured time. */
  figure?: Figure;
  /** Structures with their own screen for a section (Deploys, Incidents) leave this empty. */
  picture: Picture | null;
  /** Where each statement comes from. */
  sources: string[];
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

/** One benchmark group as a figure: Stacktape's median as the value and every tool's bar, fastest first. */
const benchmarkFigure = (comparison: string, view: string, app: string, describe: (cdk: string) => string) => {
  const { group } = findGroup(comparison, view, app);
  const median = (tool: string) => {
    const value = group.values.find((candidate) => candidate.tool === tool);
    if (!value) throw new Error(`No ${comparison}/${app} value for ${tool}`);
    return value.median.toFixed(1);
  };
  return {
    seconds: median,
    figure: {
      value: `${median('stacktape')} s`,
      label: describe(median('cdk')),
      source: `bench ${comparison} / ${view} / ${app}`,
      runDate: benchmarkRun.label,
      link: '/benchmarks',
      bars: group.values
        .toSorted((left, right) => left.median - right.median)
        .map((value) => ({
          tool: toolName(BENCHMARKS, value.tool),
          seconds: value.median,
          stacktape: value.tool === 'stacktape'
        }))
    }
  };
};

const packaging = benchmarkFigure(
  'packaging',
  'empty-cache',
  'lambda-25',
  (cdk) => `25 Lambda functions packaged from an empty build cache, median of 10 runs. AWS CDK takes ${cdk} s.`
);
const deploying = benchmarkFigure(
  'lambda-deploy',
  'handler',
  'lambda-25',
  (cdk) => `A code change to 25 Lambda functions, until the new code answers. AWS CDK takes ${cdk} s.`
);

export const SECTION_PACKS: SectionPack[] = [
  {
    id: 'designs',
    name: 'Designs',
    title: 'Designs the stack your app needs',
    text: 'Your app already tells us a lot: the framework, the database, the background jobs. Stacktape reads your repository with your coding agent and proposes an AWS setup with sensible defaults. Review why each resource is there, how it connects to your code, and what the setup is likely to cost.',
    gets: [
      'Private networking, database recovery and scaling settings in the same stack. Review the choices and their costs.',
      'Services, databases and queues connected, including their permissions and connection settings.',
      'One YAML or TypeScript config you own. Add native AWS resources or CDK constructs as your app grows.'
    ],
    picture: {
      desktop: crop(designsSmall, designsLarge, designsSmallPng, designsLargePng),
      phone: crop(designsPhoneSmall, designsPhoneLarge, designsPhoneSmallPng, designsPhoneLargePng),
      alt: 'The init wizard’s Review step for a Next.js app: a diagram with the site and a Postgres database, an estimated $32 a month, and the generated stacktape.yml.',
      from: 'designs-review-wizard-1440x900-main.png',
      note: 'Direction A’s hero and direction C already use this screen. The phone crop is the cost and resources column.'
    },
    sources: [
      'The README page’s section 01, approved by the owner (origin/main apps/website/src/variants/readme/data.ts).',
      'docs/cli/init.mdx:12-15 (Claude Code or Codex reads the code on your machine), :47-52 (reason, code line, estimate)',
      'docs/configuration/connecting-resources.mdx:10; docs/configuration/overrides-and-escape-hatches.mdx:4'
    ],
    doNotClaim: [
      'That no AI reads the code: Claude Code or Codex reads it locally and sends the files it reads to its own provider (docs/cli/init.mdx:18-21).',
      'That no data leaves the machine: init sends the generated configuration and region to the price estimator (docs/cli/init.mdx:16-17).',
      'Fixed prices: the estimate is from AWS list prices, plus usage.'
    ]
  },
  {
    id: 'packages',
    name: 'Packages',
    title: 'Packages it',
    text: 'Stacktape turns your code into Lambda packages and container images. Point it at an entry file and the built-in buildpacks handle the build, or use your own Dockerfile. Builds run in parallel, with caching that reuses work from previous releases. Stacktape handles packaging and uploads as part of the deploy.',
    gets: [
      'Built-in builds for Node.js, Python, Java, Go, Ruby, PHP and .NET, or your own Dockerfile or prebuilt image.',
      'Parallel builds, dependency caches and reuse of unchanged artifacts.',
      'Hosted builds and a managed image registry in your AWS account.'
    ],
    figure: packaging.figure,
    picture: {
      desktop: crop(packagesSmall, packagesLarge, packagesSmallPng, packagesLargePng),
      phone: crop(packagesPhoneSmall, packagesPhoneLarge, packagesPhoneSmallPng, packagesPhoneLargePng),
      alt: 'A deploy’s steps in the Stacktape Console: Initialize, Build & package with invoiceWorker packaged at 3.4 MB, and Upload artifacts.',
      from: 'packages-build-and-package-tape-1440x900-main.png',
      note: 'The crop leaves out the step timings: the demo data shows 19 s for Build & package, which reads against the benchmark. The benchmark bars (figure.bars) prove the claim better than this screen.'
    },
    sources: [
      'The README page’s section 02, approved by the owner (origin/main apps/website/src/variants/readme/data.ts).',
      'docs/packaging/overview.mdx:37 (Lambda buildpacks), :72 (container buildpacks incl. PHP), :108 (reuse of unchanged artifacts)',
      'bench packaging / empty-cache / lambda-25, preliminary run of 22 Oct 2026'
    ],
    doNotClaim: [
      'Container packaging speed: the figure covers Lambda functions only.',
      'A lead after a source change: every tool takes about the same time (bench packaging notes).',
      'Any figure without its run date and a link to /benchmarks, until the rerun on the released CLI (L24).',
      'That builds need no Docker: Python, Java, Go, Ruby, .NET and Rust functions compile in Docker, just without a Dockerfile.'
    ]
  },
  {
    id: 'deploys',
    name: 'Deploys',
    title: 'Deploys it',
    text: `Deploy with one command from your terminal or CI. A code change to 25 Lambda functions is live in ${deploying.seconds('stacktape')} seconds. AWS CDK takes ${deploying.seconds('cdk')}. Or connect GitHub, GitLab or Bitbucket: every push deploys from a build runner in your own AWS account, and each pull request can get its own preview stage.`,
    gets: [
      'Push-to-deploy and pull request previews, deleted when the pull request closes.',
      'Release commands, such as database migrations, run before any service gets the new code.',
      '`stacktape rollback` redeploys an earlier release from its stored artifacts, without a rebuild.'
    ],
    figure: deploying.figure,
    picture: null,
    sources: [
      'bench lambda-deploy / handler / lambda-25, preliminary run of 22 Oct 2026',
      'docs/ci-cd-and-gitops/gitops-with-console.mdx:5, :11 (GitHub, GitLab, Bitbucket; runner in your AWS account), :117 (delete on close)',
      'docs/deployment-and-lifecycle/deploying-stacks.mdx:47 (release commands); rollbacks.mdx:10'
    ],
    doNotClaim: [
      'Automatic rollback of a failed deploy, or health checks on by default.',
      'Isolated stages.',
      'Code swap as the default: it is opt-in and covers code changes only.',
      'That the Lambda figure was measured on the Git runner: it is a CLI deploy from a dedicated EC2 machine.'
    ]
  },
  {
    id: 'monitors',
    name: 'Monitors',
    title: 'Monitors it',
    text: 'Monitoring usually means another vendor and an SDK in every service. Stacktape shows the logs and metrics of every stack in the Console. With the Console, error tracking is also on by default, with no SDK to add. Uptime checks and scripted browser tests run from your own AWS account, and alerts go to Slack, Teams, email or a webhook.',
    gets: [
      'Logs and metrics for your functions, containers and databases in one place.',
      'Runtime errors grouped into issues, with stack traces and how often each happens.',
      'Uptime checks from several AWS regions and scheduled browser and API tests, with no per-check fee.'
    ],
    picture: {
      desktop: crop(monitorsSmall, monitorsLarge, monitorsSmallPng, monitorsLargePng),
      phone: crop(monitorsPhoneSmall, monitorsPhoneLarge, monitorsPhoneSmallPng, monitorsPhoneLargePng),
      alt: 'The Console’s Metrics page: requests, errors, API latency and database CPU for the last 24 hours, above a table of functions and APIs with their errors, requests and latency.',
      from: 'monitors-metrics-tape-1440x900-main.png'
    },
    sources: [
      'docs/observability/error-tracking.mdx:12 (issues), :30 (no SDK), :34 (on by default with the Console), :72 (stack frames)',
      'docs/observability/uptime-checks.mdx:10; docs/observability/synthetic-tests.mdx:5',
      'docs/observability/alert-channels.mdx:12 (Slack, Microsoft Teams, Discord, email, webhook)'
    ],
    doNotClaim: [
      'That all data stays in AWS: error events and metrics go to the Console.',
      'A public status page: the docs do not describe one.',
      'That uptime checks and browser tests are on by default: you add them to the config.',
      'Error tracking without the Console: it is off without it.'
    ]
  },
  {
    id: 'secures',
    name: 'Secures',
    title: 'Secures it',
    text: 'Each service gets only the IAM permissions and network access it needs for the resources in its `connectTo`. Passwords and keys live in AWS Secrets Manager and the config references them. Guardrails, such as no public databases or EU regions only, are checked before every deploy, and a deploy that breaks one is blocked.',
    gets: [
      'IAM policies, security group rules and connection settings generated from `connectTo`.',
      'Organization guardrails for regions, stages, resource types and settings, checked before anything in AWS changes.',
      'Every deploy checked for risky settings and vulnerable packages, with a recheck every night.'
    ],
    picture: {
      desktop: crop(securesSmall, securesLarge, securesSmallPng, securesLargePng),
      phone: crop(securesPhoneSmall, securesPhoneLarge, securesPhoneSmallPng, securesPhoneLargePng),
      alt: 'The Console’s Guardrails page with three rules on: a region restriction, “Keep SQL and OpenSearch private”, which blocks the next deploy of checkout-api, and a function memory limit.',
      from: 'secures-guardrails-tape-1440x900-main.png',
      note: 'A wide, short crop (about 3.4 : 1).'
    },
    sources: [
      'docs/configuration/connecting-resources.mdx:10',
      'docs/configuration/secrets.mdx:10, :20',
      'docs/guardrails/overview.mdx:10; docs/guardrails/security-and-data-protection.mdx:61',
      'docs/stacktape-console/security-scanning.mdx:10-11, :131 (nightly re-check)'
    ],
    doNotClaim: [
      'That scanning blocks deploys: it only reports (docs/stacktape-console/security-scanning.mdx:14).',
      'Fix pull requests for vulnerabilities, or SBOMs.',
      'SSO or SCIM on Free.'
    ]
  },
  {
    id: 'incidents',
    name: 'Incidents',
    title: 'Handles incidents',
    text: 'When something breaks, you get one incident instead of a dozen alerts. Stacktape groups the related errors, alarms and failed checks, and shows the release that was live when it started. Acknowledge it, mute it or roll back to the release before from the incident’s card in Slack.',
    gets: [
      'Incidents from errors, alarms, failed uptime checks and tests, unhealthy stacks and expiring certificates.',
      'Slack cards with Acknowledge, Mute, Resolve and Roll back, and alerts to Teams, email or a webhook.',
      'An AI assessment of each incident on your Anthropic, OpenAI or xAI key. Ask, and a coding agent opens a draft fix pull request.'
    ],
    picture: null,
    sources: [
      'docs/observability/incidents.mdx:10, :16-23',
      'docs/observability/alert-channels.mdx:12, :38',
      'docs/observability/incident-ai.mdx:12-16'
    ],
    doNotClaim: [
      'A free AI assessment with no setup: it needs the organization’s Anthropic, OpenAI or xAI key.',
      'An agent that deploys fixes: Fix with AI opens a draft pull request and deploys nothing.'
    ]
  },
  {
    id: 'costs',
    name: 'Costs',
    title: 'Tracks costs',
    text: 'The AWS bill tells you what each AWS service cost, not what each app or environment cost. Stacktape breaks your spend down by project, stage and resource, from your own AWS cost data, updated daily. Set a budget and you get an alert when actual or forecast spend crosses your threshold.',
    gets: [
      'Spend by project, stage and resource, updated daily.',
      'Budget alerts on actual and forecast spend for each AWS account.',
      'A monthly estimate for each resource in the init wizard, before you deploy anything.'
    ],
    picture: {
      desktop: crop(costsSmall, costsLarge, costsSmallPng, costsLargePng),
      phone: crop(costsPhoneSmall, costsPhoneLarge, costsPhoneSmallPng, costsPhoneLargePng),
      alt: 'The Console’s Costs page for the storefront project: $661.17 so far in November, spend month by month, and the split by stage with production at 62%.',
      from: 'costs-by-stage-tape-1440x900-main.png',
      note: 'The phone crop is the “by stage” panel; one demo stage is called dev-anna.'
    },
    sources: [
      'docs/managing-costs/per-resource-breakdown.mdx:10, :12',
      'docs/managing-costs/budgets.mdx:9-10, :34',
      'docs/cli/init.mdx:47'
    ],
    doNotClaim: [
      'That budgets cap or stop spend: they only alert.',
      'That a budget is per project or stage: it watches one connected AWS account (docs/managing-costs/budgets.mdx:9).',
      'Real-time costs: reports are daily.',
      'Savings figures.'
    ]
  },
  {
    id: 'expert-help',
    name: 'Help',
    title: 'Talk to us when you get stuck',
    text: 'Some AWS questions have no answer in the docs. When you hit one, ask the people who build Stacktape, in a Slack channel shared with your team.',
    gets: [
      'Flexible: a shared Slack channel with the founders.',
      'Enterprise: up to 24×7 premium support.',
      'A 30-minute call with a founder before you decide.'
    ],
    picture: null,
    sources: ['apps/website/src/pages/pricing.astro:47, :58, :60 (Book a call: cal.com/stacktape/30min)'],
    doNotClaim: ['Calls on every plan.', 'Response times on Flexible.', 'Hands-on support on Free.']
  }
];

/** A pack by id; the build fails if it is missing. */
export const sectionPack = (id: string) => {
  const found = SECTION_PACKS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No section pack ${id}`);
  return found;
};
