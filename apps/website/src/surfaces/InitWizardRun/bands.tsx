/*
 * The `stacktape init` wizard, condensed into one readable document.
 *
 * The real thing is a localhost page that grows downwards as a run progresses: a rail on the left
 * saying where you are, and four bands — Start, Analyze, Review, Deploy — that appear and never
 * disappear. This is that page with the waiting removed: a completed run, all four bands present,
 * read top to bottom.
 *
 * Every heading, lede and promise below is the product's own copy, taken from `apps/init-ui`. That
 * is the point of the surface. The wizard's argument — nothing leaves your machine, nothing is
 * billed yet, every choice shows the line of your code that caused it — is already the strongest
 * thing the homepage can say, and it says it better than marketing copy would.
 *
 * All of it is server-rendered. Only the diagram in the Review band is an island, and the `.astro`
 * file next to this one mounts it.
 */

export function WizardMasthead() {
  return (
    <header className="wizard-masthead">
      <p className="wizard-eyebrow">acme-project</p>
      <h2 className="wizard-title">Put this project on AWS</h2>
      <p className="wizard-lede">
        We read your code on this machine, work out the AWS setup it needs, and hand you one file. Nothing runs and
        nothing is billed unless you press Deploy.
      </p>
    </header>
  );
}

type RailStep = {
  title: string;
  /** The one-line record the rail keeps once a band is behind you. */
  summary: string;
  isCurrent?: boolean;
};

const RAIL_STEPS: readonly RailStep[] = [
  { title: 'Start', summary: 'Claude Code' },
  { title: 'Analyze', summary: '3 services, 2 dependencies' },
  { title: 'Review', summary: '6 resources' },
  { title: 'Deploy', summary: 'live', isCurrent: true }
];

/**
 * The rail: where you are, not where you may go.
 *
 * In the product it follows the scroll and every band is always reachable — it is a guide, not a
 * gate. Frozen at the end of a run, all four markers are filled and the last one is the one you are
 * on, which is exactly what the reader should take from it: the run finished.
 */
export function WizardRail() {
  return (
    <nav aria-label="Progress" className="wizard-rail">
      <ol>
        {RAIL_STEPS.map((step) => (
          <li className={`wizard-rail__step is-done${step.isCurrent === true ? ' is-current' : ''}`} key={step.title}>
            <span aria-hidden="true" className="wizard-rail__marker">
              ✓
            </span>
            <span className="wizard-rail__label">
              {step.title}
              <span className="wizard-rail__summary">{step.summary}</span>
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function StartBand() {
  return (
    <section className="wizard-band">
      <BandHeader eyebrow="Start" title="What happens next" />

      <ol className="wizard-promises">
        <li>
          <strong>No code is sent to Stacktape.</strong> Your own Claude Code reads the project right here, under the
          account you already have with it, with read-only tools — it cannot run scripts or install anything.
        </li>
        <li>
          <strong>Nothing is created on AWS and nothing is billed.</strong> The result is one file in your project. AWS
          only comes into it if you press Deploy at the end, and that step says so before it does anything.
        </li>
        <li>
          <strong>You will see everything before you commit to it.</strong> Every piece of infrastructure comes with the
          place in your own code that made us propose it, what it costs per month, and a way to change it.
        </li>
      </ol>

      <p className="wizard-action">
        <span className="wizard-button is-primary">Analyze my project</span>
        <span className="wizard-action__aside">Usually under a minute, on your own Claude Code plan.</span>
      </p>
    </section>
  );
}

type Finding = {
  /** What was concluded, in the product's plain voice. */
  claim: string;
  file: string;
  line: number;
  /** The line of the user's own code that produced the claim. */
  quote: string;
};

/*
 * The evidence contract, which is the whole reason this band is on the homepage: a developer who
 * does not want to learn what a VPC is will still believe "you need a Postgres database" when the
 * sentence under it is a line they wrote, with its filename and line number next to it.
 */
const FINDINGS: readonly Finding[] = [
  { claim: 'A Next.js app in ./web', file: 'web/package.json', line: 14, quote: '"next": "15.5.4"' },
  {
    claim: 'An Express API with its own Dockerfile',
    file: 'api/Dockerfile',
    line: 1,
    quote: 'FROM node:22-alpine'
  },
  {
    claim: 'Postgres — your Prisma schema names it',
    file: 'api/prisma/schema.prisma',
    line: 6,
    quote: 'provider = "postgresql"'
  },
  {
    claim: 'Redis, used for sessions',
    file: 'api/src/session.ts',
    line: 4,
    quote: 'createClient({ url: process.env.REDIS_URL })'
  },
  {
    claim: 'A worker that runs once per queued job',
    file: 'api/src/worker.ts',
    line: 11,
    quote: "new Worker('emails', handleEmail)"
  }
];

export function AnalyzeBand() {
  return (
    <section className="wizard-band">
      <BandHeader eyebrow="Analyze" title="Reading your project" />
      <p className="wizard-recap">Opened 34 files in 41s, all on this machine.</p>

      <ul className="wizard-findings">
        {FINDINGS.map((finding) => (
          <li className="wizard-finding" key={finding.file}>
            <span className="wizard-finding__claim">{finding.claim}</span>
            <span className="wizard-finding__cite">
              <span className="wizard-finding__file">
                {finding.file}:{finding.line}
              </span>
              <span className="wizard-finding__quote">{finding.quote}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The Review band's opening: the one sentence someone reads if they read nothing else. */
export function ReviewIntro() {
  return (
    <>
      <BandHeader
        eyebrow="Review"
        lede="Everything below came from your own code. Look at it, change anything — the file and the price follow."
        title="Here’s your app on AWS"
      />
      <p className="wizard-summary">
        A Next.js app with an Express API and a background worker, using a Postgres database and a Redis cache. About{' '}
        <strong>$118/mo</strong> to run.
      </p>
    </>
  );
}

type Decision = {
  summary: string;
  detail: string;
  /** The ones that bite later get an accent edge — a glance, not an alarm. */
  isNotable?: boolean;
};

const DECISIONS: readonly Decision[] = [
  {
    summary: 'The SQL database is reachable only from this private network',
    detail: 'No public address. Adds one small keyless jump box so local tools and generated migrations can tunnel in.',
    isNotable: true
  },
  {
    summary: 'The API runs on Fargate rather than as a function',
    detail:
      'Your Dockerfile builds a long-running server, so it runs as one. Moving it to Lambda would mean rewriting the entry point.'
  },
  {
    summary: 'Two copies of the API, in two availability zones',
    detail:
      'Redundancy costs more because AWS keeps another copy ready. One copy is cheaper and can drop requests while it restarts.'
  }
];

export function ReviewDetails() {
  return (
    <>
      <p className="wizard-total-cost">
        <strong>$118/mo</strong> in fixed monthly costs, at AWS list prices for eu-west-1. Traffic, storage and requests
        add usage on top — this is the floor, not a bill.
      </p>

      <section className="wizard-subsection">
        <h3 className="wizard-subheading">Decided for you</h3>
        <p className="wizard-lede wizard-lede--tight">
          Your code did not say, so we picked. Every one of these can be changed, and the file changes with it.
        </p>

        <div className="wizard-decisions">
          {DECISIONS.map((decision) => (
            <article
              className={`wizard-decision${decision.isNotable === true ? ' is-notable' : ''}`}
              key={decision.summary}
            >
              <div className="wizard-decision__text">
                <p className="wizard-decision__summary">{decision.summary}</p>
                <p className="wizard-decision__detail">{decision.detail}</p>
              </div>
              <span className="wizard-decision__toggle">Change</span>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export function DeployBand() {
  return (
    <section className="wizard-band wizard-band--last">
      <BandHeader eyebrow="Deploy" title="It’s live" />

      <p className="wizard-live">
        <span aria-hidden="true" className="wizard-live__dot" />
        <span className="wizard-live__url">https://acme.com</span>
      </p>

      <dl className="wizard-facts">
        <div>
          <dt>Stage</dt>
          <dd>staging</dd>
        </div>
        <div>
          <dt>Region</dt>
          <dd>eu-west-1</dd>
        </div>
        <div>
          <dt>Resources</dt>
          <dd>33 created</dd>
        </div>
        <div>
          <dt>Took</dt>
          <dd>4m 11s</dd>
        </div>
      </dl>

      <p className="wizard-next">
        The same command deploys it again. <code>stacktape deploy --stage production</code>
      </p>
    </section>
  );
}

function BandHeader({ eyebrow, title, lede }: { eyebrow: string; title: string; lede?: string }) {
  return (
    <header className="wizard-band__header">
      <p className="wizard-eyebrow">{eyebrow}</p>
      <h3 className="wizard-band__title">{title}</h3>
      {lede !== undefined && <p className="wizard-lede">{lede}</p>}
    </header>
  );
}
