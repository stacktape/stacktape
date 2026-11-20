import { BiFolder } from 'react-icons/bi';
import { AnalyzerName, AnalyzerOptions, ChangeAnalyzer, modelWords } from './analyzer';
import { journey, NO_ACCOUNT, NOTHING_CHANGES, StartButton, type StartProps, StartTitle, Telemetry } from './parts';

/**
 * G2, timeline and card: the steps run down the left as a vertical timeline (stop, name, one line, rough time on the
 * right). On the right a raised card holds what this screen acts on: the project, who analyzes it, the button and two
 * short assurances. On narrow screens the card follows the steps.
 */
export function StartG2({ state, choice, onStart, isBusy, isLocked }: StartProps) {
  return (
    <div className="w-start w-sg2 w-enter">
      <section className="w-sg2-story">
        <div className="w-sg-head">
          <StartTitle projectName={state.projectName} />
          <p className="w-sg-lede">Four steps, about 15 minutes. Nothing happens on AWS until you say so.</p>
        </div>
        <ol aria-label="From here to a running app" className="w-sg2-steps">
          {journey(choice).map((step, index) => (
            <li className={`w-sg2-step${index === 0 ? ' is-next' : ''}`} key={step.id}>
              <span aria-hidden className="w-sg-stop">
                {index + 1}
              </span>
              <div className="w-sg2-step-body">
                <span className="w-sg-name">{step.name}</span>
                <p className="w-sg-text">{step.text}</p>
              </div>
              <span className="w-sg-time">{step.time}</span>
            </li>
          ))}
        </ol>
      </section>

      <aside aria-label="Your project" className="w-card w-sg2-card">
        <div className="w-sg2-project">
          <span aria-hidden className="w-sg2-folder">
            <BiFolder size={20} />
          </span>
          <div className="w-sg2-project-text">
            <span className="w-sg2-project-name">{state.projectName}</span>
            {state.repositoryPath !== undefined && <span className="w-sg2-path">{state.repositoryPath}</span>}
          </div>
        </div>
        <div className="w-analyzer-line is-card">
          <p>
            Analyzed by{' '}
            <strong>
              <AnalyzerName choice={choice} repositoryPath={state.repositoryPath} />
            </strong>
            <span className="w-sg2-model">{choice.usesAi ? `with ${modelWords(choice)}` : 'without AI'}</span>
          </p>
          <ChangeAnalyzer choice={choice} />
        </div>
        <AnalyzerOptions choice={choice} />
        <StartButton isBusy={isBusy} isLocked={isLocked} onStart={onStart} />
        <ul className="w-sg2-assure">
          <li>{NOTHING_CHANGES}</li>
          <li>{NO_ACCOUNT}</li>
        </ul>
      </aside>

      <p className="w-sg-foot">
        <Telemetry />
      </p>
    </div>
  );
}
