import { AnalyzerLine, AnalyzerOptions } from './analyzer';
import { journey, NO_ACCOUNT, NOTHING_CHANGES, StartButton, type StartProps, StartTitle, Telemetry } from './parts';

/**
 * G1, the big timeline: the four steps are the centrepiece, a large copy of the header's track across the middle of the
 * page (numbered stops on one line, each with its name, rough time and one line on what happens). The button and the
 * analyzer sit centred under it. On a phone the track turns vertical.
 */
export function StartG1({ state, choice, onStart, isBusy, isLocked }: StartProps) {
  return (
    <div className="w-start w-sg1 w-enter">
      <div className="w-sg-head is-centred">
        <StartTitle projectName={state.projectName} />
        <p className="w-sg-lede">
          You'll see exactly what gets created and what it costs before anything happens. About 15 minutes from here to
          a running app.
        </p>
      </div>

      <ol aria-label="From here to a running app" className="w-sg1-track">
        {journey(choice).map((step, index) => (
          <li className={`w-sg1-step${index === 0 ? ' is-next' : ''}`} key={step.id}>
            <span aria-hidden className="w-sg-stop">
              {index + 1}
            </span>
            <span className="w-sg-name">{step.name}</span>
            <span className="w-sg-time">{step.time}</span>
            <p className="w-sg-text">{step.text}</p>
          </li>
        ))}
      </ol>

      <div className="w-sg1-go">
        <StartButton isBusy={isBusy} isLocked={isLocked} onStart={onStart} />
        <AnalyzerLine choice={choice} repositoryPath={state.repositoryPath} />
        <AnalyzerOptions choice={choice} />
      </div>

      <p className="w-sg-foot">
        <span className="w-sg-foot-line">
          {NOTHING_CHANGES} {NO_ACCOUNT}
        </span>
        <span className="w-sg-foot-line">
          <Telemetry />
        </span>
      </p>
    </div>
  );
}
