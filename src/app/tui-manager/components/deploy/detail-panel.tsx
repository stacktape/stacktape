import { Show, Switch, Match } from 'solid-js';
import type { TuiPhase } from '../../types';
import { PHASE_NAMES } from '../../types';
import { COLORS } from '../shared/colors';
import { createTuiSignal } from './use-deploy-state';
import { EventTree } from './event-tree';
import { DeployPhaseDetail } from './deploy-progress';

const BuildPackageDetail = (props: { phase: TuiPhase }) => {
  const total = () => props.phase.events.reduce((sum, e) => sum + e.children.length + 1, 0);
  const done = () =>
    props.phase.events.reduce(
      (sum, e) =>
        sum +
        (e.status === 'success' || e.status === 'error' ? 1 : 0) +
        e.children.filter((c) => c.status === 'success' || c.status === 'error').length,
      0
    );

  return (
    <>
      <box flexDirection="row" height={1}>
        <text flexShrink={0} wrapMode="none" fg={COLORS.textBright}>
          <b>{PHASE_NAMES.BUILD_AND_PACKAGE}</b>
        </text>
        <Show when={total() > 0}>
          <text flexShrink={0} wrapMode="none" fg={COLORS.dim}>
            {'  '}
            {done()}/{total()} done
          </text>
        </Show>
      </box>
      <scrollbox flexGrow={1} stickyScroll={true} viewportCulling={true} focused={true}>
        <EventTree events={props.phase.events} />
      </scrollbox>
    </>
  );
};

const UploadDetail = (props: { phase: TuiPhase }) => {
  return (
    <>
      <box height={1}>
        <text fg={COLORS.textBright}>
          <b>Upload Artifacts</b>
        </text>
      </box>
      <scrollbox flexGrow={1} stickyScroll={true} viewportCulling={true} focused={true}>
        <EventTree events={props.phase.events} />
      </scrollbox>
    </>
  );
};

const GenericPhaseDetail = (props: { phase: TuiPhase }) => {
  return (
    <>
      <box height={1}>
        <text fg={COLORS.textBright}>
          <b>{props.phase.name}</b>
        </text>
      </box>
      <scrollbox flexGrow={1} stickyScroll={true} viewportCulling={true} focused={true}>
        <EventTree events={props.phase.events} />
      </scrollbox>
    </>
  );
};

const PostDeployDetail = (props: { phase: TuiPhase }) => {
  const total = () => props.phase.events.reduce((sum, e) => sum + e.children.length + 1, 0);
  const done = () =>
    props.phase.events.reduce(
      (sum, e) =>
        sum +
        (e.status === 'success' || e.status === 'error' ? 1 : 0) +
        e.children.filter((c) => c.status === 'success' || c.status === 'error').length,
      0
    );

  return (
    <>
      <box flexDirection="row" height={1}>
        <text flexShrink={0} wrapMode="none" fg={COLORS.textBright}>
          <b>Finalize</b>
        </text>
        <Show when={total() > 0}>
          <text flexShrink={0} wrapMode="none" fg={COLORS.dim}>
            {'  '}
            {done()}/{total()} done
          </text>
        </Show>
      </box>
      <scrollbox flexGrow={1} stickyScroll={true} viewportCulling={true} focused={true}>
        <EventTree events={props.phase.events} />
      </scrollbox>
    </>
  );
};

const PhaseDetailRouter = (props: { phase: TuiPhase }) => {
  return (
    <Switch fallback={<GenericPhaseDetail phase={props.phase} />}>
      <Match when={props.phase.id === 'BUILD_AND_PACKAGE'}>
        <BuildPackageDetail phase={props.phase} />
      </Match>
      <Match when={props.phase.id === 'UPLOAD'}>
        <UploadDetail phase={props.phase} />
      </Match>
      <Match when={props.phase.id === 'DEPLOY'}>
        <DeployPhaseDetail phase={props.phase} />
      </Match>
      <Match when={props.phase.id === 'POST_DEPLOY'}>
        <PostDeployDetail phase={props.phase} />
      </Match>
    </Switch>
  );
};

export const DetailPanel = () => {
  const phases = createTuiSignal((s) => s.phases);
  const currentPhaseId = createTuiSignal((s) => s.currentPhase);
  const action = createTuiSignal((s) => s.header?.action);

  const activePhase = () => phases().find((p) => p.id === currentPhaseId());

  return (
    <Show
      when={activePhase()}
      fallback={
        <box
          flexDirection="column"
          flexGrow={1}
          borderStyle="single"
          borderColor={COLORS.border}
          paddingX={1}
          justifyContent="center"
          alignItems="center"
        >
          <text fg={COLORS.dim}>
            {action() === 'DELETING' ? 'Waiting for deletion to start...' : 'Waiting for deployment to start...'}
          </text>
        </box>
      }
    >
      {(phase) => (
        <box flexDirection="column" flexGrow={1} borderStyle="single" borderColor={COLORS.border} paddingX={1}>
          <PhaseDetailRouter phase={phase()} />
        </box>
      )}
    </Show>
  );
};
