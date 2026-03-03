/** @jsxImportSource @opentui/react */

import type { TuiPhase } from '../../types';
import { useTuiState } from './use-tui-state';
import { EventTree } from './EventTree';
import { DeployPhaseDetail } from './DeployProgress';

const BuildPackageDetail = ({ phase }: { phase: TuiPhase }) => {
  const total = phase.events.reduce((sum, e) => sum + e.children.length + 1, 0);
  const done = phase.events.reduce(
    (sum, e) =>
      sum +
      (e.status === 'success' || e.status === 'error' ? 1 : 0) +
      e.children.filter((c) => c.status === 'success' || c.status === 'error').length,
    0
  );

  return (
    <>
      <box flexDirection="row" height={1}>
        <text fg="#e5e7eb">
          <b>Build &amp; Package</b>
        </text>
        {total > 0 ? (
          <text fg="#6b7280">
            {'  '}
            {done}/{total} done
          </text>
        ) : null}
      </box>
      <scrollbox flexGrow={1} stickyScroll={true} viewportCulling={true} focused={true}>
        <EventTree events={phase.events} />
      </scrollbox>
    </>
  );
};

const UploadDetail = ({ phase }: { phase: TuiPhase }) => {
  return (
    <>
      <box height={1}>
        <text fg="#e5e7eb">
          <b>Upload Artifacts</b>
        </text>
      </box>
      <scrollbox flexGrow={1} stickyScroll={true} viewportCulling={true} focused={true}>
        <EventTree events={phase.events} />
      </scrollbox>
    </>
  );
};

const GenericPhaseDetail = ({ phase }: { phase: TuiPhase }) => {
  return (
    <>
      <box height={1}>
        <text fg="#e5e7eb">
          <b>{phase.name}</b>
        </text>
      </box>
      <scrollbox flexGrow={1} stickyScroll={true} viewportCulling={true} focused={true}>
        <EventTree events={phase.events} />
      </scrollbox>
    </>
  );
};

const PostDeployDetail = ({ phase }: { phase: TuiPhase }) => {
  const total = phase.events.reduce((sum, e) => sum + e.children.length + 1, 0);
  const done = phase.events.reduce(
    (sum, e) =>
      sum +
      (e.status === 'success' || e.status === 'error' ? 1 : 0) +
      e.children.filter((c) => c.status === 'success' || c.status === 'error').length,
    0
  );

  return (
    <>
      <box flexDirection="row" height={1}>
        <text fg="#e5e7eb">
          <b>Finalize</b>
        </text>
        {total > 0 ? (
          <text fg="#6b7280">
            {'  '}
            {done}/{total} done
          </text>
        ) : null}
      </box>
      <scrollbox flexGrow={1} stickyScroll={true} viewportCulling={true} focused={true}>
        <EventTree events={phase.events} />
      </scrollbox>
    </>
  );
};

const PhaseDetailRouter = ({ phase }: { phase: TuiPhase }) => {
  switch (phase.id) {
    case 'BUILD_AND_PACKAGE':
      return <BuildPackageDetail phase={phase} />;
    case 'UPLOAD':
      return <UploadDetail phase={phase} />;
    case 'DEPLOY':
      return <DeployPhaseDetail phase={phase} />;
    case 'POST_DEPLOY':
      return <PostDeployDetail phase={phase} />;
    default:
      return <GenericPhaseDetail phase={phase} />;
  }
};

export const DetailPanel = () => {
  const phases = useTuiState((s) => s.phases);
  const currentPhaseId = useTuiState((s) => s.currentPhase);
  const action = useTuiState((s) => s.header?.action);

  const activePhase = phases.find((p) => p.id === currentPhaseId);

  if (!activePhase) {
    const waitingText =
      action === 'DELETING' ? 'Waiting for deletion to start...' : 'Waiting for deployment to start...';
    return (
      <box
        flexDirection="column"
        flexGrow={1}
        borderStyle="single"
        borderColor="#374151"
        paddingX={1}
        justifyContent="center"
        alignItems="center"
      >
        <text fg="#4b5563">{waitingText}</text>
      </box>
    );
  }

  return (
    <box flexDirection="column" flexGrow={1} borderStyle="single" borderColor="#374151" paddingX={1}>
      <PhaseDetailRouter phase={activePhase} />
    </box>
  );
};
