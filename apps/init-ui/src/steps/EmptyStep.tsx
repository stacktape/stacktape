import { Button } from '@stacktape/ui-react/button';
import { Tabs } from '@stacktape/ui-react/tabs';
import { useState } from 'react';
import { BiFolder, BiSearchAlt } from 'react-icons/bi';
import { CommandLine } from '@stacktape/ui-react/command-line';
import { Row } from '../components/RowList';
import type { WizardState } from '../session';

/** Starter projects people most often want, by the ids `stacktape init --starterId` takes. */
const STARTERS = [
  { id: 'fullstack-nextjs-drizzle', name: 'Next.js', text: 'A full-stack Next.js app with Postgres and Drizzle.' },
  { id: 'expressjs-api-postgres', name: 'Express', text: 'A TypeScript REST API with Postgres and Prisma.' },
  { id: 'fastapi-api-postgres', name: 'FastAPI', text: 'A Python REST API with Postgres.' },
  { id: 'gin-api-postgres', name: 'Go (Gin)', text: 'A Go REST API with Postgres.' }
] as const;

type StarterId = (typeof STARTERS)[number]['id'];

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
  const agent = (state.agents ?? []).find((option) => option.id !== 'none' && option.installed !== false);
  const [starterId, setStarterId] = useState<StarterId>(STARTERS[0].id);
  const starter = STARTERS.find((entry) => entry.id === starterId) ?? STARTERS[0];

  const kinds = state.nearbyAppKinds ?? {};

  return (
    <div className="w-enter">
      <header className="w-hero">
        <h1 className="w-title">No app in this folder</h1>
        {state.repositoryPath !== undefined && <p className="w-hero-path">{state.repositoryPath}</p>}
        <p className="w-lede">Nothing here runs as a server, worker or website.</p>
      </header>

      {nearby.length > 0 && (
        <section className="w-section">
          <h2 className="w-section-title">
            {nearby.length === 1 ? 'Is this the app you want to deploy?' : 'Choose the app you want to deploy'}
          </h2>
          <p className="w-section-lede">Run its command in the terminal you started init from.</p>
          <ul className="w-card w-next">
            {nearby.map((folder) => (
              <Row
                icon={<BiFolder size={17} />}
                key={folder}
                title={
                  <span className="w-candidate">
                    <span className="w-mono">{folder}/</span>
                    {kinds[folder] !== undefined && <span className="w-candidate-kind">{kinds[folder]}</span>}
                  </span>
                }
              >
                <CommandLine command={`cd ${folder} && stacktape init`} label={`Copy the command for ${folder}`} />
              </Row>
            ))}
          </ul>
        </section>
      )}

      {!usedAgent && agent !== undefined && (
        <section className="w-section">
          <ul className="w-card w-next">
            <Row
              action={
                <Button isLoading={busy === 'start'} onClick={() => onAnalyzeWithAgent(agent.id)} variant="secondary">
                  Analyze with {agent.label}
                </Button>
              }
              description={`Only manifests and Dockerfiles were read. ${agent.label} reads the source too.`}
              icon={<BiSearchAlt size={17} />}
              title={`Read it again with ${agent.label}`}
            />
          </ul>
        </section>
      )}

      <section className="w-section w-starters">
        <h2 className="w-section-title">Or start from a working app</h2>
        <p className="w-section-lede">Run a starter’s command in a new, empty folder. It deploys as it is.</p>
        <div className="w-starter">
          <Tabs
            appearance="segmented"
            ariaLabel="Starter project"
            onValueChange={setStarterId}
            tabs={STARTERS.map((entry) => ({ value: entry.id, label: entry.name }))}
            value={starterId}
            width="fit"
          />
          <p className="w-starter-text">{starter.text}</p>
          <CommandLine command={`stacktape init --starterId ${starter.id}`} label="Copy the command" />
        </div>
      </section>
    </div>
  );
}
