import { Button } from '@stacktape/ui-react/button';
import { Tabs } from '@stacktape/ui-react/tabs';
import { useState } from 'react';
import { BiFolder, BiSearchAlt } from 'react-icons/bi';
import { CopyableCommand } from '../components/CopyableCommand';
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
  const agent = (state.agents ?? []).find((option) => option.id !== 'none');
  const [starterId, setStarterId] = useState<StarterId>(STARTERS[0].id);
  const starter = STARTERS.find((entry) => entry.id === starterId) ?? STARTERS[0];

  return (
    <div className="w-enter">
      <header className="w-hero">
        <h1 className="w-title">No app in this folder</h1>
        <p className="w-lede">Nothing here runs as a server, worker or website, so there is nothing to deploy yet.</p>
      </header>

      {(nearby.length > 0 || (!usedAgent && agent !== undefined)) && (
        <section className="w-section">
          <h2 className="w-section-title">{nearby.length > 0 ? 'These folders look like apps' : 'Look again'}</h2>
          <ul className="w-card w-next">
            {nearby.map((folder) => (
              <Row icon={<BiFolder size={17} />} key={folder} title={<span className="w-mono">{folder}/</span>}>
                <CopyableCommand command={`cd ${folder} && stacktape init`} />
              </Row>
            ))}
            {!usedAgent && agent !== undefined && (
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
            )}
          </ul>
        </section>
      )}

      <section className="w-section">
        <h2 className="w-section-title">No app yet? Start from a working one</h2>
        <div className="w-card flex flex-col gap-3 p-5">
          <Tabs
            appearance="segmented"
            ariaLabel="Starter project"
            onValueChange={setStarterId}
            tabs={STARTERS.map((entry) => ({ value: entry.id, label: entry.name }))}
            value={starterId}
            width="fit"
          />
          <p className="w-quiet">{starter.text} It deploys as it is. Run this in an empty folder:</p>
          <CopyableCommand command={`stacktape init --starterId ${starter.id}`} />
        </div>
      </section>
    </div>
  );
}
