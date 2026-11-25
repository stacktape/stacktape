/*
 * Section packs for the home page: the words, the proof and the product picture for the eight capabilities, in the
 * voice of the README page's sections 01 and 02, which the owner approved (TASTE 26). Each pack leads with the best
 * part of its step in a title and a short text that stands on its own, then one to three points with the facts a
 * developer or a CTO decides on (TASTE 35). The structures read their words from here.
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
  /** The best part of the step, in two to four plain sentences that work without the points. Backticks mark code. */
  text: string;
  /** One to three facts a developer or a CTO decides on, each a full sentence. Backticks mark code. */
  gets: readonly string[];
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

/**
 * One benchmark group as a figure: Stacktape's median as the value and every tool's bar, fastest first. The copy
 * compares with the next fastest tool, never with a slower one picked for effect (TASTE 15).
 */
const benchmarkFigure = (comparison: string, view: string, app: string, label: string) => {
  const { group } = findGroup(comparison, view, app);
  const sorted = group.values.toSorted((left, right) => left.median - right.median);
  const stacktape = sorted.find((value) => value.tool === 'stacktape');
  const rival = sorted.find((value) => value.tool !== 'stacktape');
  if (!stacktape || !rival) throw new Error(`No ${comparison}/${app} values to compare`);
  const next = { tool: toolName(BENCHMARKS, rival.tool), seconds: rival.median.toFixed(1) };
  return {
    seconds: stacktape.median.toFixed(1),
    next,
    figure: {
      value: `${stacktape.median.toFixed(1)} s`,
      label,
      source: `bench ${comparison} / ${view} / ${app}`,
      runDate: benchmarkRun.label,
      link: '/benchmarks',
      bars: sorted.map((value) => ({
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
  'Packaging 25 Lambda functions with an empty build cache, median of 10 runs'
);
const deploying = benchmarkFigure(
  'lambda-deploy',
  'handler',
  'lambda-25',
  'Updating the code of 25 deployed Lambda functions from the CLI, until the new code answers, median of 10 runs'
);

export const SECTION_PACKS: SectionPack[] = [
  {
    id: 'designs',
    name: 'Designs',
    title: 'Designs the stack your app needs',
    text: 'Your app already tells us a lot: the framework, the database, the background jobs. Stacktape reads your repository and proposes an AWS setup. It can use Claude Code or Codex, or read only your manifests and deployment files. You review each resource and the monthly cost Stacktape can estimate. Then you save the YAML or TypeScript config in your repository and deploy when you’re ready.',
    gets: [
      'You need an AWS account to deploy. AWS bills you directly at AWS prices.',
      'Stacktape can deploy a Next.js site, an API, a queue worker and a Postgres database together.',
      'Init can read an existing Render manifest or Docker Compose file and propose a separate AWS stack from it.'
    ],
    picture: {
      desktop: crop(designsSmall, designsLarge, designsSmallPng, designsLargePng),
      phone: crop(designsPhoneSmall, designsPhoneLarge, designsPhoneSmallPng, designsPhoneLargePng),
      alt: 'The init wizard’s Review step for a Next.js app: a diagram with the site and a Postgres database, an estimated $32 a month, and the generated stacktape.yml.',
      from: 'designs-review-wizard-1440x900-main.png',
      note: 'Direction A’s hero and direction C already use this screen. The phone crop is the cost and resources column.'
    },
    sources: [
      'The first sentence is the README page’s section 01, approved by the owner (origin/main apps/website/src/variants/readme/data.ts).',
      'docs/cli/init.mdx:12-15 (Claude Code or Codex on your machine), :21-23 and :90 (Files only reads manifests and deployment files), :47-55 (estimate, YAML or TypeScript), :56-62 (deploy is a separate, confirmed step), :91-94 (imported deployment files; a separate stack)',
      'docs/managing-costs/overview.mdx:10, :26 (AWS bills your account directly)',
      'docs/resources/ (compute, frontend, databases, messaging, storage); docs/resources/triggers/schedule-triggers.mdx'
    ],
    doNotClaim: [
      'That no AI reads the code: Claude Code or Codex reads it locally and sends the files it reads to its own provider (docs/cli/init.mdx:18-21).',
      'That no data leaves the machine: init sends the generated configuration and region to the price estimator (docs/cli/init.mdx:16-17).',
      'Fixed prices: the estimate is from AWS list prices, plus usage.',
      'Private databases by default: the default accessibility mode is internet (docs/resources/databases/relational-database.mdx:252-257).'
    ]
  },
  {
    id: 'packages',
    name: 'Packages',
    title: 'Packages it',
    text: `Stacktape turns your code into Lambda packages and container images. You give it an entry file or a project directory. A container can also build from your own Dockerfile. Builds run in parallel and reuse cached work when the inputs haven’t changed. In our benchmark, packaging 25 Lambda functions from an empty cache took ${packaging.seconds} seconds with Stacktape and ${packaging.next.seconds} seconds with ${packaging.next.tool}, the next fastest tool.`,
    gets: [
      'You don’t need a Dockerfile for Node.js, Python, Go, Java, Ruby, PHP, .NET or Rust.',
      'For a Python Lambda, Stacktape builds the dependencies in AWS’s image for that Lambda runtime.'
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
      'docs/packaging/overview.mdx:36-37 (js-bundle; Lambda buildpack on the runtime’s build image), :72-74 (container buildpacks incl. PHP, Dockerfile), :108 (cache by input checksum), :126-130 (languages)',
      'bench packaging / empty-cache / lambda-25, preliminary run of 22 Oct 2026; AWS CDK is the next fastest tool'
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
    text: `Run \`stacktape deploy\` from your terminal or CI. The Stacktape Console, our web app, can also deploy every push to a branch you choose on GitHub, GitLab or Bitbucket. The builds use an EC2 machine in your AWS account. In our benchmark, a code change to 25 Lambda functions deployed from the CLI was live after ${deploying.seconds} seconds with Stacktape and ${deploying.next.seconds} seconds with ${deploying.next.tool}, the next fastest tool.`,
    gets: [
      'You can turn on a preview stage for pull requests. Stacktape can delete it when the pull request closes.',
      'A release command runs your migrations, and a failed one stops the deploy. Replacing a database needs your confirmation, or an explicit flag in CI.',
      '`stacktape dev` runs your containers on your machine, connected to the stack’s AWS resources, so you don’t redeploy for every edit.'
    ],
    figure: deploying.figure,
    picture: null,
    sources: [
      'bench lambda-deploy / handler / lambda-25, preliminary run of 22 Oct 2026; SST is the next fastest tool',
      'docs/ci-cd-and-gitops/gitops-with-console.mdx:10-19 (branch rules on GitHub, GitLab, Bitbucket; runner in your AWS account; previews), :117 (delete on close is an option)',
      'docs/deployment-and-lifecycle/release-commands.mdx:10 (runs on each deploy), :43 (a failure stops the deploy; old code keeps serving)',
      'docs/deployment-and-lifecycle/deploying-stacks.mdx:159, :163-170 (confirmation before a protected stateful resource is replaced; CI fails closed without --yes)',
      'docs/local-development/dev-mode-overview.mdx:10 (containers run locally against cloud resources)'
    ],
    doNotClaim: [
      'Automatic rollback of a failed deploy, or health checks on by default.',
      'Isolated stages. Separate stacks per stage are fine (docs/configuration/stages-and-environments.mdx:10).',
      'Code swap as the default: it is opt-in and covers code changes only.',
      'That every code change skips CloudFormation: aliases, blue/green deployments and some layer changes fall back to it.',
      'Container deploy speed from the Lambda figure: it covers Lambda functions only.',
      'Preview stages for every pull request by default: a rule for one base branch turns them on; fork pull requests get none.',
      'That the Lambda figure was measured on the Git runner: it is a CLI deploy from a dedicated EC2 machine.'
    ]
  },
  {
    id: 'monitors',
    name: 'Monitors',
    title: 'Monitors it',
    text: 'The Console shows each stack’s CloudWatch logs and metrics. It groups recurring errors and shows where they happened for Lambda functions in supported languages and Node.js containers built with Stacktape’s bundler. You don’t need an SDK. You can add a public URL to check it from several AWS regions, or schedule a browser test of your checkout.',
    gets: [
      'Uptime probes and browser tests run in your AWS account. AWS bills their usage.',
      'Turn on tracing for a supported Lambda function to see where a request spent its time. AWS stores the traces in your account.'
    ],
    picture: {
      desktop: crop(monitorsSmall, monitorsLarge, monitorsSmallPng, monitorsLargePng),
      phone: crop(monitorsPhoneSmall, monitorsPhoneLarge, monitorsPhoneSmallPng, monitorsPhoneLargePng),
      alt: 'The Console’s Metrics page: requests, errors, API latency and database CPU for the last 24 hours, above a table of functions and APIs with their errors, requests and latency.',
      from: 'monitors-metrics-tape-1440x900-main.png'
    },
    sources: [
      'docs/observability/overview.mdx:10-26 (logs and metrics in the Console and CLI; error tracking on by default)',
      'docs/observability/error-tracking.mdx:20 (no SDK, on by default with the Console), :49-53 (which Lambda functions and containers report)',
      'docs/observability/uptime-checks.mdx:10 (several regions, probes in your account); synthetic-tests.mdx:10-12 (scripted flows in your account)',
      'docs/observability/tracing.mdx:10 (one property, traces in your account), :76-78 (Node.js, Python, Java, .NET)'
    ],
    doNotClaim: [
      'That all data stays in AWS: error events and metrics go to the Console.',
      'A public status page: the docs do not describe one.',
      'That uptime checks and browser tests are on by default: you add them to the config.',
      'Error tracking without the Console: it is off without it.',
      'Error tracking for every workload: containers built from a buildpack, a Dockerfile or a prebuilt image, Rust and custom-artifact functions do not report.',
      'One-property tracing for containers: they need the OpenTelemetry SDK.',
      'No AWS charges for checks: uptime probes and browser tests are billed by AWS.'
    ]
  },
  {
    id: 'secures',
    name: 'Secures',
    title: 'Secures it',
    text: 'Listing a queue in a worker’s `connectTo` gives the worker the permissions and connection details for it. For a database, Stacktape also opens network access. In the Console, your organization can block deploys that would expose a database or use an unapproved region. A blocked deploy stops before anything in AWS changes.',
    gets: [
      'Store passwords and API keys in AWS Secrets Manager and reference them from your config.',
      'Scanning is on by default. The Console shows risky settings and vulnerable packages in deployed stacks and checks the latest package list again every night.'
    ],
    picture: {
      desktop: crop(securesSmall, securesLarge, securesSmallPng, securesLargePng),
      phone: crop(securesPhoneSmall, securesPhoneLarge, securesPhoneSmallPng, securesPhoneLargePng),
      alt: 'The Console’s Guardrails page with three rules on: a region restriction, “Keep SQL and OpenSearch private”, which blocks the next deploy of checkout-api, and a function memory limit.',
      from: 'secures-guardrails-tape-1440x900-main.png',
      note: 'A wide, short crop (about 3.4 : 1).'
    },
    sources: [
      'docs/configuration/connecting-resources.mdx:10 (IAM, environment variables, security groups for databases and Redis), :432',
      'docs/configuration/secrets.mdx:10-13',
      'docs/guardrails/overview.mdx:10 (organization rules in the Console, checked before changes)',
      'docs/stacktape-console/security-scanning.mdx:10-16 (on by default, reports only), :51-52 (nightly recheck)'
    ],
    doNotClaim: [
      'That scanning blocks deploys: it only reports (docs/stacktape-console/security-scanning.mdx:13).',
      'Fix pull requests for vulnerabilities, or SBOMs.',
      'SSO or SCIM on Free.',
      'That nobody writes IAM: `connectTo` is all-or-nothing per target, and narrower policies are written by hand.',
      'A fixed version for every vulnerability: some have no fix yet.'
    ]
  },
  {
    id: 'incidents',
    name: 'Incidents',
    title: 'Handles incidents',
    text: 'When errors, alarms and failed checks point to the same problem, Stacktape groups them into one incident with the release that was running. In the Stacktape Slack app, your team can acknowledge it or, with rollback access, restore the previous release. You can ask a coding agent to investigate. For a connected GitHub repository, it can also propose a fix as a pull request. Nothing is deployed until your team decides.',
    gets: [
      'Connect your organization’s Anthropic, OpenAI or xAI key to get automatic incident summaries.',
      'Investigations run in your AWS account. The agent can test the code and inspect AWS through read-only tools.'
    ],
    picture: null,
    sources: [
      'docs/observability/incidents.mdx:10-23 (signals correlated by project, stage, release, resource and time)',
      'docs/observability/alert-channels.mdx (Slack app: incident card buttons, Roll back to, release that was live)',
      'docs/observability/incident-ai.mdx:12-14 (briefing on your key; Investigate and Fix on request, on your runner, read-only AWS, deploys nothing), :123-127, :198 (Fix needs a GitHub repository connected through the Stacktape GitHub App), :134 (draft pull request)'
    ],
    doNotClaim: [
      'A free AI assessment with no setup: it needs the organization’s Anthropic, OpenAI or xAI key.',
      'An agent that deploys fixes: Fix with AI opens a draft pull request and deploys nothing.',
      'Fix pull requests on GitLab or Bitbucket: Fix with AI needs GitHub.',
      'That the agent cannot write anything: it edits its checkout and pushes one branch.'
    ]
  },
  {
    id: 'costs',
    name: 'Costs',
    title: 'Tracks costs',
    text: 'The Console shows what each project and stage cost, updated daily from your AWS cost reports. Open a stage to see the cost of each resource, plus costs not tied to one resource, such as data transfer. A budget on an AWS account alerts you when actual or forecast spend reaches a threshold you choose.',
    gets: ['Choose Show drivers on a Slack budget alert to see each stack’s spend compared with last month.'],
    picture: {
      desktop: crop(costsSmall, costsLarge, costsSmallPng, costsLargePng),
      phone: crop(costsPhoneSmall, costsPhoneLarge, costsPhoneSmallPng, costsPhoneLargePng),
      alt: 'The Console’s Costs page for the storefront project: $661.17 so far in November, spend month by month, and the split by stage with production at 62%.',
      from: 'costs-by-stage-tape-1440x900-main.png',
      note: 'The phone crop is the “by stage” panel; one demo stage is called dev-anna.'
    },
    sources: [
      'docs/managing-costs/per-resource-breakdown.mdx:10, :12 (project, stage, resource; daily reports)',
      'docs/managing-costs/budgets.mdx:10-14 (one AWS account, actual or forecast, percentage thresholds, alerts only)',
      'docs/observability/alert-channels.mdx (Slack budget cards: Show drivers); docs/managing-costs/budgets.mdx:79',
      'Console stage costs: apps/console/ui/src/pages/ProjectsPage/StageDetails/stage-cost-rows.ts:9 (“Not tied to one resource”); Explanations.tsx:324 (data transfer)'
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
    text: 'On Flexible, your team gets a shared Slack channel with the Stacktape founders. Ask us about a deploy, an AWS bill or a feature you need.',
    gets: [],
    picture: null,
    sources: ['apps/website/src/pages/pricing.astro:47, :58, :60 (Book a call: cal.com/stacktape/30min)'],
    doNotClaim: [
      'Calls on every plan.',
      'Response times on Flexible.',
      'Hands-on support on Free.',
      'A promise to build every requested feature.'
    ]
  }
];

/** A pack by id; the build fails if it is missing. */
export const sectionPack = (id: string) => {
  const found = SECTION_PACKS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No section pack ${id}`);
  return found;
};
