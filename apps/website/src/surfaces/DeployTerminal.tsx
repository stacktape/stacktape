/*
 * `stacktape deploy`, mid-flight.
 *
 * A recreation of the CLI's live deploy view rather than a stylised "terminal look": the phase list,
 * the CloudFormation change summary, the segmented meter and the key bar are all things the real
 * command puts on screen, in the order it puts them there. The transcript is frozen at 91% on
 * purpose — a finished deploy is a receipt, but a running one shows the two facts the reader came
 * for, which is that Stacktape is driving CloudFormation and that it tells you what it is doing.
 *
 * Entirely server-rendered. Nothing here moves, and a spinner glyph that never advances is more
 * honest than one that spins forever next to a progress bar that never fills.
 */
import { TerminalFrame } from './frames/TerminalFrame';
import { PROJECT_NAME, REGION, RESOURCES } from './story';

/** The `⠿` the CLI parks on a phase that is still working, and the `✓` it leaves behind. */
const RUNNING_GLYPH = '⠿';
const DONE_GLYPH = '✓';

const TOTAL_RESOURCES = 33;
const CREATED_RESOURCES = 30;

/*
 * The order the CLI leaves the rows in: finished ones in the order they landed, with whatever is
 * still going at the bottom — which is why `cache` sits above `mainDatabase` here and below it in
 * the Console. The engine names come from the shared cast, so the transcript and the Console card
 * can never end up describing the same resource differently.
 */
const ROW_ORDER = ['web', 'apiService', 'worker', 'cache', 'mainDatabase', 'firewall'] as const;
const STILL_CREATING = new Set<string>(['mainDatabase', 'firewall']);

const RESOURCE_ROWS = ROW_ORDER.map((name) => {
  const resource = RESOURCES.find((candidate) => candidate.name === name);
  return {
    name,
    detail: resource?.terminalLabel ?? name,
    state: STILL_CREATING.has(name) ? ('creating' as const) : ('created' as const)
  };
});

const PHASES = [
  { label: 'Initialize', state: 'done' },
  { label: 'Package', state: 'done' },
  { label: 'Deploy', state: 'running', note: 'almost there' },
  { label: 'Outputs', state: 'pending' }
] as const;

export type DeployTerminalProps = {
  className?: string | undefined;
};

export function DeployTerminal({ className }: DeployTerminalProps) {
  return (
    <div className={['deploy-terminal', className].filter(Boolean).join(' ')}>
      <TerminalFrame title="stacktape — deploy · zsh">
        <div className="deploy-terminal__body">
          <p className="deploy-terminal__command">
            <span className="deploy-terminal__prompt">$</span> stacktape deploy --stage production --region {REGION}
          </p>

          <p className="deploy-terminal__status">
            <span className="deploy-terminal__verb">DEPLOYING</span>
            <span className="deploy-terminal__target">{PROJECT_NAME}</span>
            <span className="deploy-terminal__arrow">→</span>
            <span className="deploy-terminal__target">production</span>
            <span className="deploy-terminal__region">{REGION}</span>
            <span className="deploy-terminal__elapsed">3m 02s</span>
          </p>

          <ul className="deploy-terminal__phases">
            {PHASES.map((phase) => (
              <li className={`deploy-terminal__phase is-${phase.state}`} key={phase.label}>
                <span aria-hidden="true" className="deploy-terminal__phase-glyph">
                  {phase.state === 'done' ? DONE_GLYPH : phase.state === 'running' ? RUNNING_GLYPH : ''}
                </span>
                <span className="deploy-terminal__phase-label">{phase.label}</span>
                {'note' in phase && <span className="deploy-terminal__phase-note">{phase.note}</span>}
              </li>
            ))}
          </ul>

          <p className="deploy-terminal__change">
            <strong>Deploying via CloudFormation</strong>{' '}
            <span className="deploy-terminal__change-count">+33 create</span>
          </p>

          <p className="deploy-terminal__meter-row">
            <ProgressMeter created={CREATED_RESOURCES} total={TOTAL_RESOURCES} />
            <span className="deploy-terminal__percent">91%</span>
            <span className="deploy-terminal__count">
              ({CREATED_RESOURCES}/{TOTAL_RESOURCES} resources)
            </span>
          </p>

          <ul className="deploy-terminal__resources">
            {RESOURCE_ROWS.map((resource) => (
              <li className={`deploy-terminal__resource is-${resource.state}`} key={resource.name}>
                <span aria-hidden="true" className="deploy-terminal__resource-glyph">
                  {resource.state === 'created' ? DONE_GLYPH : RUNNING_GLYPH}
                </span>
                <span className="deploy-terminal__resource-name">{resource.name}</span>
                <span className="deploy-terminal__resource-detail">{resource.detail}</span>
                <span className="deploy-terminal__resource-state">
                  {resource.state === 'created' ? 'created' : 'creating…'}
                </span>
              </li>
            ))}
          </ul>

          <p className="deploy-terminal__keys">
            <span>
              <kbd>c</kbd> cancel &amp; rollback
            </span>
            <span>
              <kbd>ctrl+c</kbd> quit
            </span>
            <span>
              <kbd>⇅</kbd> scroll
            </span>
          </p>
        </div>
      </TerminalFrame>

      <RedeployNote />
    </div>
  );
}

/**
 * The meter, drawn as one cell per CloudFormation resource.
 *
 * A plain percentage bar would be a smoother picture and a worse one: the whole point of the CLI's
 * meter is that it advances in discrete steps, because CloudFormation reports whole resources.
 *
 * It carries no label of its own and is hidden from assistive technology, because the sentence
 * beside it — "91% (30/33 resources)" — already is the label, and announcing it twice is worse than
 * not announcing the decoration at all.
 */
function ProgressMeter({ created, total }: { created: number; total: number }) {
  return (
    <span aria-hidden="true" className="deploy-terminal__meter">
      {Array.from({ length: total }, (_, index) => (
        <span className={index < created ? 'is-filled' : 'is-empty'} key={index} />
      ))}
    </span>
  );
}

/**
 * The second deploy, and the reason the first one's length is forgivable.
 *
 * A full run rebuilds infrastructure; a code change does not, and the CLI knows the difference. This
 * panel exists so the reader never leaves the deploy story thinking every push costs three minutes.
 */
function RedeployNote() {
  return (
    <aside className="deploy-terminal__redeploy site-panel">
      <p className="deploy-terminal__redeploy-line">
        <span className="deploy-terminal__prompt">$</span> stacktape deploy
      </p>
      <p className="deploy-terminal__redeploy-line is-result">
        <span aria-hidden="true" className="deploy-terminal__resource-glyph">
          {DONE_GLYPH}
        </span>
        <span>
          <strong>worker</strong> updated in 4.0s
        </span>
      </p>
      <p className="deploy-terminal__redeploy-note">Skips CloudFormation when only the code changed.</p>
    </aside>
  );
}
