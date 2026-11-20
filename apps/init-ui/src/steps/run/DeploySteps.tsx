import { ResourceIcon } from '@stacktape/ui-react/resource-icon';
import { Spinner } from '@stacktape/ui-react/spinner';
import { useState, type ReactNode } from 'react';
import { BiCheck, BiChevronRight, BiNetworkChart, BiX } from 'react-icons/bi';
import type { ConfigResources } from '../../config-resources';
import {
  clock,
  groupResources,
  SHARED_GROUP,
  spokenDuration,
  type DeployModel,
  type DeployPhase,
  type DeployResource,
  type DeployStep,
  type ResourceGroup,
  type StepStatus
} from '../../deploy-model';
import { partName } from '../../part-names';
import { awsTypeDescription, awsTypeName } from './aws-types';
import { useNow } from './use-now';

export type RunContext = {
  resources: ConfigResources;
  services: ReadonlyArray<{ name: string; framework?: string; language?: string }>;
};

const NONE: readonly string[] = [];

/** How many resources a group lists before "Show all". */
const GROUP_ROWS = 8;

export function StatusMark({ status, size = 'normal' }: { status: StepStatus | 'removed'; size?: 'normal' | 'small' }) {
  const icon = size === 'small' ? 15 : 17;
  return (
    <span aria-hidden className={`r-mark is-${status} is-${size}`}>
      {status === 'done' || status === 'removed' ? (
        <BiCheck size={icon} />
      ) : status === 'failed' ? (
        <BiX size={icon} />
      ) : status === 'running' ? (
        <Spinner />
      ) : (
        <span className="r-mark-dot" />
      )}
    </span>
  );
}

/** How long something took, or how long it has been running, for the time column. */
const timeText = (startedAt: number | undefined, endedAt: number | undefined, running: boolean, now: number) => {
  if (startedAt === undefined) return '';
  if (running) return clock(now - startedAt);
  return endedAt === undefined ? '' : spokenDuration(endedAt - startedAt);
};

const capitalized = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

/** "serverFunction" as words: "server function". */
const spokenInstance = (instance: string) =>
  instance
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll('-', ' ')
    .toLowerCase();

/**
 * Every step of the deploy: the phases in order, each with what it did, and the AWS resources by the part of the app
 * they belong to. The phase running now is open and the finished ones fold to one line with their time, so a deploy
 * in progress reads top to bottom as "done, done, this, then that"; each can be opened to see what it did.
 */
export function DeploySteps({
  model,
  context,
  live,
  failed = false,
  initiallyOpen = NONE,
  summary = false
}: {
  model: DeployModel;
  context: RunContext;
  /** The deploy is running: the open phase follows it and the times tick. */
  live: boolean;
  failed?: boolean;
  /** Phases open from the start on a finished deploy. */
  initiallyOpen?: readonly string[];
  /** One line per phase and nothing to open, beside a log that has the rest. */
  summary?: boolean;
}) {
  const now = useNow(live);
  const [opened, setOpened] = useState<Record<string, boolean>>({});

  return (
    <ol aria-label="Deploy steps" className={`r-phases${summary ? ' is-summary' : ''}`}>
      {model.phases.length === 0 && (
        <li className="r-phase is-running">
          <div className="r-phase-head is-static">
            <StatusMark status="running" />
            <span className="r-phase-label">Starting the deploy</span>
          </div>
        </li>
      )}
      {model.phases.map((phase) => {
        const isOpen =
          !summary &&
          phase.status !== 'pending' &&
          (opened[phase.id] ??
            (live
              ? phase.status === 'running' || phase.status === 'failed'
              : initiallyOpen.includes(phase.id) || phase.status === 'failed'));
        const isDeploy = phase.id === 'DEPLOY';
        const cloudformation = isDeploy ? model.cloudformation : undefined;
        return (
          <li className={`r-phase is-${phase.status}${isOpen ? ' is-open' : ''}`} data-phase={phase.id} key={phase.id}>
            {summary ? (
              <div className="r-phase-head is-static">
                <PhaseHeadContent cloudformation={cloudformation} live={live} now={now} phase={phase} />
              </div>
            ) : (
              <button
                aria-expanded={phase.status === 'pending' ? undefined : isOpen}
                className="r-phase-head"
                disabled={phase.status === 'pending'}
                onClick={() => setOpened({ ...opened, [phase.id]: !isOpen })}
                type="button"
              >
                <PhaseHeadContent cloudformation={cloudformation} live={live} now={now} phase={phase} />
                {phase.status !== 'pending' && <BiChevronRight aria-hidden className="r-chevron" size={18} />}
              </button>
            )}
            {isOpen && (
              <div className="r-phase-body">
                {isDeploy ? (
                  <DeployPhaseBody
                    context={context}
                    failed={failed}
                    live={live}
                    model={model}
                    now={now}
                    phase={phase}
                  />
                ) : (
                  <StepList live={live} model={model} now={now} steps={phase.steps} />
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** The last lines a workload's build printed, while it runs: what it is doing, in its own words. */
export const outputTail = (model: DeployModel, instance: string, count: number): string[] =>
  model.log
    .filter(
      (entry) => entry.level === 'output' && entry.source !== undefined && entry.source.split('.')[0] === instance
    )
    .slice(-count)
    .map((entry) => entry.text);

function PhaseHeadContent({
  phase,
  cloudformation,
  live,
  now
}: {
  phase: DeployPhase;
  cloudformation: DeployModel['cloudformation'];
  live: boolean;
  now: number;
}) {
  return (
    <>
      <StatusMark status={phase.status} />
      <span className="r-phase-label">{phase.label}</span>
      <span className="r-phase-meta">
        {cloudformation !== undefined && cloudformation.total > 0 && phase.status !== 'pending'
          ? `${cloudformation.completed} of ${cloudformation.total}`
          : ''}
      </span>
      <span className="r-time">
        {timeText(phase.startedAt, phase.endedAt, live && phase.status === 'running', now)}
      </span>
    </>
  );
}

function StepList({
  steps,
  live,
  now,
  model
}: {
  steps: readonly DeployStep[];
  live: boolean;
  now: number;
  model: DeployModel;
}) {
  if (steps.length === 0) return <p className="r-empty">Nothing to report.</p>;
  return (
    <ul className="r-steps">
      {steps.map((step) => (
        <StepRow
          key={step.key}
          live={live}
          now={now}
          step={step}
          tail={
            live && step.status === 'running' && step.instance !== undefined ? outputTail(model, step.instance, 2) : []
          }
        />
      ))}
    </ul>
  );
}

function StepRow({
  step,
  live,
  now,
  nested = false,
  tail = NONE
}: {
  step: DeployStep;
  live: boolean;
  now: number;
  nested?: boolean;
  tail?: readonly string[];
}) {
  const isWorkload = step.instance !== undefined && !nested;
  return (
    <li className={`r-step is-${step.status}${nested ? ' is-nested' : ''}`}>
      <div className="r-step-line">
        <StatusMark size="small" status={step.status} />
        <span className={`r-step-label${isWorkload ? ' is-code' : ''}`}>
          {nested ? spokenInstance(step.label) : step.label}
        </span>
        <span className="r-step-detail" title={step.detail}>
          {step.detail ?? ''}
        </span>
        <span className="r-time">{timeText(step.startedAt, step.endedAt, live && step.status === 'running', now)}</span>
      </div>
      {tail.length > 0 && (
        <pre aria-label={`Latest output of ${step.label}`} className="r-step-tail">
          {tail.join('\n')}
        </pre>
      )}
      {step.children.length > 0 && (
        <ul className="r-steps is-nested">
          {step.children.map((child) => (
            <StepRow key={child.key} live={live} nested now={now} step={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

function DeployPhaseBody({
  model,
  phase,
  context,
  live,
  failed,
  now
}: {
  model: DeployModel;
  phase: DeployPhase;
  context: RunContext;
  live: boolean;
  failed: boolean;
  now: number;
}) {
  const names = Object.keys(context.resources);
  const groups = groupResources(model.resources, names, failed && phase.status === 'failed');
  const total = model.cloudformation?.total ?? 0;
  const notStarted = phase.status === 'running' ? Math.max(0, total - model.resources.length) : 0;
  // CloudFormation's own operation is the groups below; anything else the phase ran (a release command) is a step.
  const otherSteps = phase.steps.filter((step) => !step.key.startsWith('UPDATE_STACK::'));
  return (
    <>
      {groups.length === 0 && phase.status === 'running' && (
        <p className="r-empty">
          <StatusMark size="small" status="running" />
          Waiting for CloudFormation to report its first resources
        </p>
      )}
      {groups.length > 0 && (
        <div className="r-groups">
          {groups.map((group) => (
            <GroupBlock context={context} group={group} key={group.name || 'shared'} live={live} now={now} />
          ))}
        </div>
      )}
      {notStarted > 0 && (
        <p className="r-not-started">
          {notStarted} more AWS {notStarted === 1 ? 'resource has' : 'resources have'} not started yet
        </p>
      )}
      {otherSteps.length > 0 && <StepList live={live} model={model} now={now} steps={otherSteps} />}
    </>
  );
}

const groupTitle = (group: ResourceGroup, context: RunContext): { title: string; icon: ReactNode } => {
  const resource = context.resources[group.name];
  if (group.name === SHARED_GROUP || resource === undefined) {
    return { title: 'Shared setup', icon: <BiNetworkChart size={16} /> };
  }
  return {
    title: capitalized(partName(group.name, resource, context.services)),
    icon: <ResourceIcon resourceType={resource.type} size={16} />
  };
};

const statusOf = (resource: DeployResource, failed: boolean): StepStatus | 'removed' =>
  resource.status === 'in-progress'
    ? failed
      ? 'failed'
      : 'running'
    : resource.action === 'DELETE'
      ? 'removed'
      : 'done';

const epoch = (iso: string | undefined) => (iso === undefined ? undefined : Date.parse(iso));

/**
 * One part of the app and the AWS resources it is made of. Open while CloudFormation works on it; what is in progress
 * leads, then what finished, newest first.
 */
function GroupBlock({
  group,
  context,
  live,
  now
}: {
  group: ResourceGroup;
  context: RunContext;
  live: boolean;
  now: number;
}) {
  const [userOpen, setUserOpen] = useState<boolean | undefined>(undefined);
  const [showAll, setShowAll] = useState(false);
  const isOpen = userOpen ?? (live && group.status === 'running');
  const { title, icon } = groupTitle(group, context);
  const failed = group.status === 'failed';
  const running = group.resources
    .filter((resource) => resource.status === 'in-progress')
    .toSorted((left, right) => (left.startedAt ?? '').localeCompare(right.startedAt ?? ''));
  const finished = group.resources
    .filter((resource) => resource.status === 'complete')
    .toSorted((left, right) => (right.endedAt ?? '').localeCompare(left.endedAt ?? ''));
  const ordered = [...running, ...finished];
  const shown = showAll ? ordered : ordered.slice(0, GROUP_ROWS);
  const removed = group.resources.every((resource) => resource.action === 'DELETE' && resource.status === 'complete');
  const count =
    group.running > 0
      ? `${group.running} in progress · ${group.done} done`
      : removed
        ? `${group.done} removed`
        : `${group.done} done`;

  return (
    <section aria-label={title} className={`r-group is-${group.status}${isOpen ? ' is-open' : ''}`}>
      <button aria-expanded={isOpen} className="r-group-head" onClick={() => setUserOpen(!isOpen)} type="button">
        <span aria-hidden className="r-group-icon">
          {icon}
        </span>
        <span className="r-group-title">
          <span className="r-group-part">{title}</span>
          {group.name !== SHARED_GROUP && <span className="r-group-name">{group.name}</span>}
        </span>
        <span className="r-group-count">{count}</span>
        <span className="r-time">
          {timeText(group.startedAt, group.endedAt, live && group.status === 'running', now)}
        </span>
        <BiChevronRight aria-hidden className="r-chevron" size={18} />
      </button>
      {isOpen && (
        <ul aria-label={`AWS resources of ${title}`} className="r-resources">
          {shown.map((resource) => {
            const status = statusOf(resource, failed);
            const started = epoch(resource.startedAt);
            return (
              <li className={`r-res is-${status}`} key={resource.id} title={awsTypeDescription(resource.type)}>
                <StatusMark size="small" status={status} />
                <span className="r-res-type">{awsTypeName(resource.type)}</span>
                <span className="r-res-id" title={resource.id}>
                  {resource.id}
                </span>
                <span className="r-time">
                  {status === 'removed'
                    ? 'removed'
                    : timeText(started, epoch(resource.endedAt), live && status === 'running', now)}
                </span>
              </li>
            );
          })}
          {ordered.length > GROUP_ROWS && (
            <li className="r-res-more">
              <button className="w-link w-small" onClick={() => setShowAll(!showAll)} type="button">
                {showAll ? 'Show fewer' : `Show all ${ordered.length}`}
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
