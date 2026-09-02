/*
 * One pull request, from opened to deployed.
 *
 * The whole argument of this surface is that the boxes are the same product as everything else on
 * the page: the preview environment is a stage called `pr-128`, the production deploy is the same
 * `stacktape deploy` the terminal surface shows, and both run on a runner inside the customer's own
 * AWS account. Console configures this as a table of triggers ("PR Opened", "Push to Branch"); a
 * table is the right shape for editing it and the wrong shape for explaining it, so it is drawn here
 * as the sequence it actually is.
 *
 * The production step is mid-flight on purpose — `production` is deploying on every surface of this
 * site, and the preview teardown behind it has not happened yet because the PR has only just merged.
 *
 * The runner facts in the chip row are the only numbers on this surface that are claims rather than
 * story, and each is one Stacktape publishes.
 */

type Step = {
  title: string;
  /** The line under the title: what this step operated on. */
  detail: string;
  /** Duration, stage name, or whatever the step's own footnote is. */
  meta?: string;
  state: 'done' | 'running' | 'queued';
  /** Console's own trigger badge, on the step that has one. */
  badge?: string;
};

const STEPS: readonly Step[] = [
  {
    title: 'Pull request #128',
    detail: 'feat: checkout flow',
    meta: 'opened by dana',
    state: 'done',
    badge: 'PR Opened'
  },
  { title: 'Build', detail: 'EC2 runner · cache hit', meta: '1m 42s', state: 'done' },
  { title: 'Preview environment', detail: 'pr-128.preview.acme.com', meta: 'stage pr-128 · 2m 08s', state: 'done' },
  {
    title: 'Merged to main',
    detail: '2 approvals, checks green',
    meta: 'by dana',
    state: 'done',
    badge: 'Push to Branch'
  },
  { title: 'Production deploy', detail: 'acme-project · eu-west-1', meta: '3m 02s', state: 'running' },
  { title: 'Preview deleted', detail: 'stage pr-128 torn down', meta: 'when the PR closes', state: 'queued' }
];

/** Each of these is a published Stacktape claim about its own runners, not a story detail. */
const RUNNER_FACTS = [
  '2–5× faster than CodeBuild',
  'Wakes from hibernation in ~10 s',
  '~$3/mo when idle',
  'Powers GitHub Actions runners'
] as const;

export type CicdPanelProps = {
  className?: string | undefined;
};

export function CicdPanel({ className }: CicdPanelProps) {
  return (
    <section className={['cicd', className].filter(Boolean).join(' ')}>
      <header className="cicd__header">
        <h3 className="cicd__title">acme/acme-project</h3>
        <span className="cicd__runner">
          Runner type
          <b>EC2 runner</b>
        </span>
      </header>

      <ol className="cicd__flow">
        {STEPS.map((step) => (
          <li className={`cicd-step is-${step.state}`} key={step.title}>
            <span aria-hidden="true" className="cicd-step__marker">
              {step.state === 'done' ? '✓' : ''}
            </span>
            <p className="cicd-step__title">{step.title}</p>
            <p className="cicd-step__detail">{step.detail}</p>
            {step.meta !== undefined && <p className="cicd-step__meta">{step.meta}</p>}
            {step.badge !== undefined && <span className="cicd-step__badge">{step.badge}</span>}
          </li>
        ))}
      </ol>

      <ul className="cicd__facts">
        {RUNNER_FACTS.map((fact) => (
          <li className="cicd__fact" key={fact}>
            {fact}
          </li>
        ))}
      </ul>
    </section>
  );
}
