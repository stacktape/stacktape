import { Button } from '@stacktape/ui-react/button';
import { CopyableCommand } from '../components/CopyableCommand';
import type { WizardState } from '../session';

/** Starter projects people most often want, by the ids `stacktape init --starterId` takes. */
const STARTERS = [
  { id: 'fullstack-nextjs-drizzle', name: 'Next.js with Postgres', text: 'A full-stack Next.js app with Drizzle.' },
  { id: 'expressjs-api-postgres', name: 'Express API with Postgres', text: 'A TypeScript REST API with Prisma.' },
  { id: 'fastapi-api-postgres', name: 'FastAPI with Postgres', text: 'A Python REST API.' },
  { id: 'gin-api-postgres', name: 'Go (Gin) with Postgres', text: 'A Go REST API.' }
];

/**
 * The analysis found nothing to run here. Not a dead end: the app may be one folder down, or there is no app yet and a
 * starter project gets one deployed.
 */
export function EmptyStep({
  state,
  busy,
  onAnalyzeWithAgent
}: {
  state: WizardState;
  busy: string | undefined;
  onAnalyzeWithAgent: (agentId: string) => void;
}) {
  const nearby = state.nearbyApps ?? [];
  const usedAgent = state.choice !== undefined && state.choice.agentId !== 'none';
  const agent = (state.agents ?? []).find((option) => option.id !== 'none');
  return (
    <div className="w-enter mx-auto max-w-[880px]">
      <header className="w-hero">
        <p className="w-eyebrow">Review</p>
        <h1 className="w-title">No app at this folder's root</h1>
        <p className="w-lede">
          Nothing here runs as a server, worker or website
          {state.repositoryPath === undefined ? '' : ` (${state.repositoryPath})`}, so there is nothing to deploy yet.
        </p>
      </header>

      {nearby.length > 0 && (
        <section className="mb-8">
          <h2 className="w-section-title">These folders look like apps</h2>
          <div className="w-options-grid">
            {nearby.map((folder) => (
              <div className="w-card w-option" key={folder}>
                <h3 className="w-code self-start">{folder}/</h3>
                <p>Run init there instead:</p>
                <CopyableCommand command={`cd ${folder} && stacktape init`} />
              </div>
            ))}
          </div>
        </section>
      )}

      {!usedAgent && agent !== undefined && (
        <section className="mb-8">
          <h2 className="w-section-title">Or read it again with {agent.label}</h2>
          <p className="w-muted mt-0 mb-3 text-[13px]">
            Without AI only manifests and Dockerfiles were read. {agent.label} reads the source too.
          </p>
          <Button isLoading={busy === 'start'} onClick={() => onAnalyzeWithAgent(agent.id)} variant="primary">
            Analyze with {agent.label}
          </Button>
        </section>
      )}

      <section>
        <h2 className="w-section-title">No app yet? Start from a working one</h2>
        <p className="w-muted mt-0 mb-3 text-[13px]">
          Each starter is a small app that deploys as it is. Run the command in an empty folder.
        </p>
        <div className="w-options-grid">
          {STARTERS.map((starter) => (
            <div className="w-card w-option" key={starter.id}>
              <h3>{starter.name}</h3>
              <p>{starter.text}</p>
              <CopyableCommand command={`stacktape init --starterId ${starter.id}`} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
