import type { CSSProperties, ReactNode } from 'react';
import { BiCheck, BiFile, BiFolder } from 'react-icons/bi';
import { AnalyzerLine, AnalyzerOptions } from './analyzer';
import {
  journey,
  type JourneyStep,
  NO_ACCOUNT,
  NOTHING_CHANGES,
  StartButton,
  type StartProps,
  StartTitle,
  Telemetry
} from './parts';

/**
 * G3, four cards: each step is a large raised card with a small picture of what that step looks like, its number and
 * name, rough time and one line. The pictures are generic (they show the kind of screen, not this project's result):
 * only the project's name is real, and the price is marked as an example. The button and the analyzer follow the cards.
 */
export function StartG3({ state, choice, onStart, isBusy, isLocked }: StartProps) {
  const art: Record<JourneyStep['id'], ReactNode> = {
    analyze: <TreeArt projectName={state.projectName} />,
    review: <ReviewArt />,
    deploy: <DeployArt />,
    live: <LiveArt />
  };
  return (
    <div className="w-start w-sg3 w-enter">
      <div className="w-sg-head is-centred">
        <StartTitle projectName={state.projectName} />
        <p className="w-sg-lede">
          About 15 minutes from here to a running app. You approve everything before it's created.
        </p>
      </div>

      <ol aria-label="From here to a running app" className="w-sg3-cards">
        {journey(choice).map((step, index) => (
          <li className={`w-sg3-card${index === 0 ? ' is-next' : ''}`} key={step.id}>
            {art[step.id]}
            <div className="w-sg3-card-head">
              <span className="w-sg-name">
                <span aria-hidden className="w-sg3-number">
                  {index + 1}
                </span>
                {step.name}
              </span>
              <span className="w-sg-time">{step.time}</span>
            </div>
            <p className="w-sg-text">{step.text}</p>
          </li>
        ))}
      </ol>

      <div className="w-sg3-go">
        <div className="w-sg3-go-row">
          <StartButton isBusy={isBusy} isLocked={isLocked} onStart={onStart} />
          <div className="w-sg3-go-lines">
            <AnalyzerLine choice={choice} repositoryPath={state.repositoryPath} />
            <p className="w-sg3-promise">{NOTHING_CHANGES}</p>
          </div>
        </div>
        <AnalyzerOptions choice={choice} />
      </div>

      <p className="w-sg-foot">
        {NO_ACCOUNT} <Telemetry />
      </p>
    </div>
  );
}

/** A file tree being read: the project's folder, file rows drawn as bars, the scanner line on the row being read. */
function TreeArt({ projectName }: { projectName: string }) {
  const rows: { depth: number; width: string; folder?: boolean; read?: boolean; reading?: boolean }[] = [
    { depth: 1, width: '54%', read: true },
    { depth: 1, width: '30%', folder: true },
    { depth: 2, width: '46%', reading: true },
    { depth: 2, width: '36%' },
    { depth: 1, width: '42%', read: true }
  ];
  return (
    <div aria-hidden className="w-sg3-art is-tree">
      <div className="w-sg3-tree-row is-root">
        <BiFolder size={13} />
        <span className="w-sg3-tree-name">{projectName}</span>
      </div>
      {rows.map((row, index) => (
        <div
          className={`w-sg3-tree-row${row.reading === true ? ' is-reading' : ''}`}
          // oxlint-disable-next-line react/no-array-index-key -- a fixed picture.
          key={index}
          style={{ '--w-depth': row.depth, '--w-bar': row.width } as CSSProperties}
        >
          {row.folder === true ? <BiFolder size={12} /> : <BiFile size={12} />}
          <span className="w-sg3-bar" />
          {row.read === true && <BiCheck className="w-sg3-tick" size={14} />}
        </div>
      ))}
      <span className="w-sg3-scan" />
    </div>
  );
}

/** The architecture as two blocks, and where the monthly price shows. */
function ReviewArt() {
  return (
    <div aria-hidden className="w-sg3-art is-review">
      <div className="w-sg3-blocks">
        <IsoBlock tone="a" />
        <IsoBlock tone="b" />
      </div>
      <div className="w-sg3-price">
        <span>Monthly price</span>
        <span>
          <span className="w-sg3-eg">e.g.</span> $31/month
        </span>
      </div>
    </div>
  );
}

function IsoBlock({ tone }: { tone: 'a' | 'b' }) {
  return (
    <svg className={`w-sg3-iso is-${tone}`} height="46" viewBox="0 0 56 48" width="54">
      <path className="w-sg3-iso-top" d="M28 6l22 12-22 12L6 18z" />
      <path className="w-sg3-iso-left" d="M6 18v10l22 12V30z" />
      <path className="w-sg3-iso-right" d="M50 18v10L28 40V30z" />
    </svg>
  );
}

/** Two resources being created: one ready, one on its way. */
function DeployArt() {
  return (
    <div aria-hidden className="w-sg3-art is-deploy">
      <div className="w-sg3-progress">
        <span>Web app</span>
        <span className="is-ready">Ready</span>
      </div>
      <span className="w-sg3-meter" style={{ '--w-done': '100%' } as CSSProperties} />
      <div className="w-sg3-progress">
        <span>Database</span>
        <span className="is-creating">Creating…</span>
      </div>
      <span className="w-sg3-meter" style={{ '--w-done': '55%' } as CSSProperties} />
    </div>
  );
}

/** The app's address. */
function LiveArt() {
  return (
    <div aria-hidden className="w-sg3-art is-live">
      <span className="w-sg3-url">https://d3k9…cloudfront.net</span>
    </div>
  );
}
