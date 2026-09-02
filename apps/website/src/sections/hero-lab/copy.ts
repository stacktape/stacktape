/*
 * The three claims, side by side.
 *
 * These pages are one messaging experiment: same structure, same styling, same product loop — the
 * only variable is how strongly the page claims the automation goes. Keeping all three sets of words
 * in one file is what makes that comparison readable, and what stops a "small fix" landing on one
 * page and quietly making it a fourth variant.
 *
 * Plain data, no dependencies: safe to import from `.astro` frontmatter and from the island alike.
 */

/** `bold` = autopilot, `balanced` = copilot, `safe` = expert-grade and human-led. */
export type HeroVariant = 'bold' | 'balanced' | 'safe';

/**
 * A bullet, split at the point where its weight changes. The lead phrase is the claim and is set in
 * the primary text colour; the remainder is the evidence and stays muted.
 */
export type HeroBullet = {
  lead: string;
  rest: string;
};

export type HeroCopy = {
  /** The document title, which is also what a link preview shows. */
  documentTitle: string;
  metaDescription: string;
  headline: string;
  subheadline: string;
  bullets: readonly HeroBullet[];
};

/** Identical on all three pages: the frame the claim is made inside. */
export const HERO_EYEBROW = 'AWS INFRASTRUCTURE, FROM REPO TO PRODUCTION';

/** Under the CTA block, on all three. The one sentence that lowers the stakes of trying it. */
export const CTA_MICROCOPY = 'The CLI is open source. Nothing is created on AWS until you say so.';

/*
 * The first three bullets are the same argument on the bold and balanced pages — the wizard, the
 * deploy, the observability — and only the fourth one moves. Shared rather than duplicated, so the
 * difference between those two pages is exactly one bullet and nothing else can drift.
 */
const SHARED_BULLETS: readonly HeroBullet[] = [
  {
    lead: 'The wizard writes the config.',
    rest: 'It reads your repo, proposes the architecture, and shows the monthly price — before anything exists.'
  },
  {
    lead: 'One command deploys everything.',
    rest: 'Compiled to plain CloudFormation, running in your own AWS account.'
  },
  {
    lead: 'Observability is already wired.',
    rest: 'Metrics, traces, logs and alarms — no setup, no third-party stitching.'
  }
];

export const HERO_COPY: Record<HeroVariant, HeroCopy> = {
  bold: {
    documentTitle: 'AWS DevOps, fully automated.',
    metaDescription:
      'An AI wizard writes your infrastructure config. One command deploys it — pipelines, metrics, traces and alarms included. And when production breaks, an agent that sees your whole stack investigates and fixes it.',
    headline: 'AWS DevOps, fully automated.',
    subheadline:
      'An AI wizard writes your infrastructure config. One command deploys it — pipelines, metrics, traces and alarms included. And when production breaks, an agent that sees your whole stack investigates and fixes it.',
    bullets: [
      ...SHARED_BULLETS,
      {
        lead: 'Incidents can fix themselves.',
        rest: "The agent starts with the whole picture — config, release diff, traces — and can ship the fix. You decide how much it's allowed to do."
      }
    ]
  },

  balanced: {
    documentTitle: 'DevOps for AWS. All of it, automated.',
    metaDescription:
      'The wizard writes your config, one command deploys it, and observability comes wired. When something breaks, an agent with the whole picture — config, releases, traces — hands you the diagnosis and the fix.',
    headline: 'DevOps for AWS. All of it, automated.',
    subheadline:
      'The wizard writes your config, one command deploys it, and observability comes wired. When something breaks, an agent with the whole picture — config, releases, traces — hands you the diagnosis and the fix. What ships is up to you.',
    bullets: [
      ...SHARED_BULLETS,
      {
        lead: 'Incidents come with the answer.',
        rest: 'The agent investigates with full context and proposes the fix. You approve what ships.'
      }
    ]
  },

  safe: {
    documentTitle: 'The DevOps work, automated. The decisions, yours.',
    metaDescription:
      'Stacktape generates the AWS setup an expert team would build — networking, pipelines, monitoring, alarms — and runs it from one console. Every change is explained, priced, and yours to approve.',
    headline: 'The DevOps work, automated. The decisions, yours.',
    subheadline:
      'Stacktape generates the AWS setup an expert team would build — networking, pipelines, monitoring, alarms — and runs it from one console. Every change is explained, priced, and yours to approve.',
    bullets: [
      {
        lead: 'Every decision explained.',
        rest: 'The wizard reads your repo, proposes the architecture, and says why — with the monthly price attached.'
      },
      {
        lead: 'Plain CloudFormation, your account.',
        rest: 'Read the template, diff it, keep it. Nothing proprietary runs in your stack.'
      },
      {
        lead: 'Observability is already wired.',
        rest: 'Metrics, traces, logs and alarms — from the first deploy.'
      },
      {
        lead: 'When something breaks, everything is in one place.',
        rest: 'The release that caused it, the traces, the metrics — and an agent to help when you want it.'
      }
    ]
  }
};

/**
 * The strip under the hero, identical on all three pages.
 *
 * Four facts a senior reader checks before they believe any of the claims above — set as engraved
 * lines rather than feature cards, because they are not features.
 */
export type ProofItem = {
  keyword: string;
  sentence: string;
};

export const PROOF_ITEMS: readonly ProofItem[] = [
  {
    keyword: 'CLOUDFORMATION',
    sentence:
      'Compiles to plain CloudFormation. Read it, diff it, eject with it — CDK and raw-CFN escape hatches included.'
  },
  {
    keyword: 'YOUR ACCOUNT',
    sentence: 'Runs in your own AWS account under your IAM. AWS bills you directly — no markup, no proxy.'
  },
  {
    keyword: 'HARD MODE',
    sentence:
      'VPCs, private-only services, bastions, GPU and Spot workloads — the architectures a senior team would design.'
  },
  {
    keyword: 'GOVERNANCE',
    sentence: 'RBAC, SSO, guardrails, budgets and audit trails — your platform team can still set the rules.'
  }
];
