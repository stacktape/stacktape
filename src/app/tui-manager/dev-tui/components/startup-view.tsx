/** @jsxImportSource @opentui/react */

import { useState, useEffect, useSyncExternalStore } from 'react';
import { devTuiState } from '../state';
import { formatDuration } from '../utils';
import type { Hook, LocalResource, SetupStep, Workload } from '../types';

const subscribe = (listener: () => void) => devTuiState.subscribe(listener);
const useStateSlice = <T,>(selector: () => T): T => useSyncExternalStore(subscribe, selector, selector);

// ─── Shared icons ────────────────────────────────────────

const BRAILLE_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const DevSpinner = () => {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % BRAILLE_FRAMES.length), 80);
    return () => clearInterval(id);
  }, []);
  return <text fg="#06b6d4">{BRAILLE_FRAMES[frame]}</text>;
};

const PendingIcon = () => <text fg="#6b7280">○</text>;
const ErrorIcon = () => <text fg="#ef4444">✗</text>;
const ReadyIcon = () => <text fg="#22c55e">✓</text>;

const BranchPrefix = ({ isLast }: { isLast: boolean }) => <text fg="#6b7280">{` ${isLast ? '└─' : '├─'} `}</text>;

// ─── Section icon ────────────────────────────────────────

const SectionIcon = ({ status }: { status: 'pending' | 'running' | 'success' | 'error' }) => {
  if (status === 'success') return <ReadyIcon />;
  if (status === 'error') return <ErrorIcon />;
  if (status === 'running') return <DevSpinner />;
  return <PendingIcon />;
};

// ─── Row components ──────────────────────────────────────

const LocalResourceRow = ({ resource, isLast }: { resource: LocalResource; isLast: boolean }) => {
  const icon =
    resource.status === 'running' ? (
      <ReadyIcon />
    ) : resource.status === 'error' ? (
      <ErrorIcon />
    ) : resource.status === 'starting' ? (
      <DevSpinner />
    ) : (
      <PendingIcon />
    );

  const details =
    resource.status === 'running'
      ? resource.port
        ? `localhost:${resource.port}`
        : 'Ready'
      : resource.status === 'starting'
        ? 'Starting...'
        : resource.status === 'error'
          ? resource.error || 'Failed'
          : '';

  const detailColor = resource.status === 'error' ? '#ef4444' : '#6b7280';

  return (
    <box flexDirection="row">
      <BranchPrefix isLast={isLast} />
      {icon}
      <text> </text>
      <text>
        <b>{resource.name.padEnd(18)}</b>
      </text>
      {details ? <text fg={detailColor}>{` ${details}`}</text> : null}
    </box>
  );
};

const SetupStepRow = ({ step, isLast }: { step: SetupStep; isLast: boolean }) => {
  const icon =
    step.status === 'done' ? (
      <ReadyIcon />
    ) : step.status === 'running' ? (
      <DevSpinner />
    ) : step.status === 'skipped' ? (
      <text fg="#6b7280">−</text>
    ) : (
      <PendingIcon />
    );

  const details = step.detail || '';

  return (
    <box flexDirection="row">
      <BranchPrefix isLast={isLast} />
      {icon}
      <text> </text>
      <text>{step.label.padEnd(18)}</text>
      {details ? <text fg="#6b7280">{` ${details}`}</text> : null}
    </box>
  );
};

const HookRow = ({ hook, isLast }: { hook: Hook; isLast: boolean }) => {
  const icon =
    hook.status === 'success' ? (
      <ReadyIcon />
    ) : hook.status === 'error' ? (
      <ErrorIcon />
    ) : hook.status === 'running' ? (
      <DevSpinner />
    ) : (
      <PendingIcon />
    );

  const details =
    hook.status === 'success'
      ? hook.duration
        ? formatDuration(hook.duration)
        : 'Done'
      : hook.status === 'running'
        ? hook.message || 'Running...'
        : hook.status === 'error'
          ? hook.error || 'Failed'
          : '';

  const detailColor = hook.status === 'error' ? '#ef4444' : '#6b7280';

  return (
    <box flexDirection="row">
      <BranchPrefix isLast={isLast} />
      {icon}
      <text> </text>
      <text>
        <b>{hook.name.padEnd(18)}</b>
      </text>
      {details ? <text fg={detailColor}>{` ${details}`}</text> : null}
    </box>
  );
};

const WorkloadRow = ({ workload, isLast }: { workload: Workload; isLast: boolean }) => {
  const icon =
    workload.status === 'running' ? (
      <ReadyIcon />
    ) : workload.status === 'error' ? (
      <ErrorIcon />
    ) : workload.status === 'starting' ? (
      <DevSpinner />
    ) : (
      <PendingIcon />
    );

  const details =
    workload.status === 'running'
      ? workload.url
        ? workload.url
        : workload.size || 'Ready'
      : workload.status === 'starting'
        ? workload.statusMessage || 'Starting...'
        : workload.status === 'error'
          ? workload.error || 'Failed'
          : '';

  const detailColor = workload.status === 'error' ? '#ef4444' : '#6b7280';

  return (
    <box flexDirection="row">
      <BranchPrefix isLast={isLast} />
      {icon}
      <text> </text>
      <text>
        <b>{workload.name.padEnd(18)}</b>
      </text>
      {details ? <text fg={detailColor}>{` ${details}`}</text> : null}
    </box>
  );
};

// ─── Section status helper ───────────────────────────────

const getSectionStatus = ({
  hasRunning,
  hasError,
  isDone
}: {
  hasRunning: boolean;
  hasError: boolean;
  isDone: boolean;
}) => {
  if (hasError) return 'error' as const;
  if (isDone) return 'success' as const;
  if (hasRunning) return 'running' as const;
  return 'pending' as const;
};

// ─── Sections ────────────────────────────────────────────

const LocalResourcesSection = () => {
  const resources = useStateSlice(() => devTuiState.getState().localResources);
  if (resources.length === 0) return null;

  const status = getSectionStatus({
    hasRunning: resources.some((r) => r.status === 'starting'),
    hasError: resources.some((r) => r.status === 'error'),
    isDone: resources.every((r) => r.status === 'running' || r.status === 'error' || r.status === 'stopped')
  });

  return (
    <box flexDirection="column">
      <box flexDirection="row">
        <SectionIcon status={status} />
        <text> Starting local resources</text>
      </box>
      {resources.map((resource, index) => (
        <LocalResourceRow key={resource.name} resource={resource} isLast={index === resources.length - 1} />
      ))}
      <text> </text>
    </box>
  );
};

const SetupStepsSection = () => {
  const steps = useStateSlice(() => devTuiState.getState().setupSteps);
  if (steps.length === 0) return null;

  const status = getSectionStatus({
    hasRunning: steps.some((s) => s.status === 'running'),
    hasError: false,
    isDone: steps.every((s) => s.status === 'done' || s.status === 'skipped')
  });

  return (
    <box flexDirection="column">
      <box flexDirection="row">
        <SectionIcon status={status} />
        <text> Creating tunnels</text>
      </box>
      {steps.map((step, index) => (
        <SetupStepRow key={step.id} step={step} isLast={index === steps.length - 1} />
      ))}
      <text> </text>
    </box>
  );
};

const HooksSection = () => {
  const hooks = useStateSlice(() => devTuiState.getState().hooks);
  if (hooks.length === 0) return null;

  const status = getSectionStatus({
    hasRunning: hooks.some((h) => h.status === 'running'),
    hasError: hooks.some((h) => h.status === 'error'),
    isDone: hooks.every((h) => h.status === 'success' || h.status === 'error')
  });

  return (
    <box flexDirection="column">
      <box flexDirection="row">
        <SectionIcon status={status} />
        <text> Executing hooks</text>
      </box>
      {hooks.map((hook, index) => (
        <HookRow key={hook.name} hook={hook} isLast={index === hooks.length - 1} />
      ))}
      <text> </text>
    </box>
  );
};

const WorkloadsSection = () => {
  const workloads = useStateSlice(() => devTuiState.getState().workloads);
  if (workloads.length === 0) return null;

  const status = getSectionStatus({
    hasRunning: workloads.some((w) => w.status === 'starting'),
    hasError: workloads.some((w) => w.status === 'error'),
    isDone: workloads.every((w) => w.status === 'running' || w.status === 'error' || w.status === 'stopped')
  });

  return (
    <box flexDirection="column">
      <box flexDirection="row">
        <SectionIcon status={status} />
        <text> Starting workloads</text>
      </box>
      {workloads.map((workload, index) => (
        <WorkloadRow key={workload.name} workload={workload} isLast={index === workloads.length - 1} />
      ))}
    </box>
  );
};

// ─── Root view ───────────────────────────────────────────

export const DevStartupView = () => {
  return (
    <box flexDirection="column">
      <LocalResourcesSection />
      <SetupStepsSection />
      <HooksSection />
      <WorkloadsSection />
    </box>
  );
};
