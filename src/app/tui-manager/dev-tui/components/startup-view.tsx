import type { Hook, LocalResource, SetupStep, Workload } from '../types';
import { Spinner } from '@inkjs/ui';
import { Box, Text } from 'ink';
import React, { useSyncExternalStore } from 'react';
import { devTuiState } from '../state';
import { formatDuration } from '../utils';

const subscribe = (listener: () => void) => devTuiState.subscribe(listener);

const useStateSlice = <T,>(selector: () => T): T => useSyncExternalStore(subscribe, selector, selector);

const BranchPrefix: React.FC<{ isLast: boolean }> = ({ isLast }) => <Text color="gray"> {isLast ? '└─' : '├─'} </Text>;

const PendingIcon = () => <Text color="gray">○</Text>;
const ErrorIcon = () => <Text color="red">✗</Text>;
const ReadyIcon = () => <Text color="green">✓</Text>;
const RunningIcon = () => <Spinner type="dots" />;

const SectionIcon: React.FC<{ status: 'pending' | 'running' | 'success' | 'error' }> = ({ status }) => {
  if (status === 'success') return <ReadyIcon />;
  if (status === 'error') return <ErrorIcon />;
  if (status === 'running') return <RunningIcon />;
  return <PendingIcon />;
};

const LocalResourceRow: React.FC<{ resource: LocalResource; isLast: boolean }> = ({ resource, isLast }) => {
  const icon =
    resource.status === 'running' ? (
      <ReadyIcon />
    ) : resource.status === 'error' ? (
      <ErrorIcon />
    ) : resource.status === 'starting' ? (
      <RunningIcon />
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

  return (
    <Box>
      <BranchPrefix isLast={isLast} />
      {icon}
      <Text> </Text>
      <Text bold>{resource.name.padEnd(18)}</Text>
      {details ? <Text color={resource.status === 'error' ? 'red' : 'gray'}> {details}</Text> : null}
    </Box>
  );
};

const SetupStepRow: React.FC<{ step: SetupStep; isLast: boolean }> = ({ step, isLast }) => {
  const icon =
    step.status === 'done' ? (
      <ReadyIcon />
    ) : step.status === 'running' ? (
      <RunningIcon />
    ) : step.status === 'skipped' ? (
      <Text color="gray">−</Text>
    ) : (
      <PendingIcon />
    );

  const details = step.detail || '';

  return (
    <Box>
      <BranchPrefix isLast={isLast} />
      {icon}
      <Text> </Text>
      <Text>{step.label.padEnd(18)}</Text>
      {details ? <Text color="gray"> {details}</Text> : null}
    </Box>
  );
};

const HookRow: React.FC<{ hook: Hook; isLast: boolean }> = ({ hook, isLast }) => {
  const icon =
    hook.status === 'success' ? (
      <ReadyIcon />
    ) : hook.status === 'error' ? (
      <ErrorIcon />
    ) : hook.status === 'running' ? (
      <RunningIcon />
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

  return (
    <Box>
      <BranchPrefix isLast={isLast} />
      {icon}
      <Text> </Text>
      <Text bold>{hook.name.padEnd(18)}</Text>
      {details ? <Text color={hook.status === 'error' ? 'red' : 'gray'}> {details}</Text> : null}
    </Box>
  );
};

const WorkloadRow: React.FC<{ workload: Workload; isLast: boolean }> = ({ workload, isLast }) => {
  const icon =
    workload.status === 'running' ? (
      <ReadyIcon />
    ) : workload.status === 'error' ? (
      <ErrorIcon />
    ) : workload.status === 'starting' ? (
      <RunningIcon />
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

  return (
    <Box>
      <BranchPrefix isLast={isLast} />
      {icon}
      <Text> </Text>
      <Text bold>{workload.name.padEnd(18)}</Text>
      {details ? <Text color={workload.status === 'error' ? 'red' : 'gray'}> {details}</Text> : null}
    </Box>
  );
};

const getSectionStatus = ({
  hasRunning,
  hasError,
  isDone
}: {
  hasRunning: boolean;
  hasError: boolean;
  isDone: boolean;
}) => {
  if (hasError) return 'error';
  if (isDone) return 'success';
  if (hasRunning) return 'running';
  return 'pending';
};

const LocalResourcesSection: React.FC = () => {
  const resources = useStateSlice(() => devTuiState.getState().localResources);
  if (resources.length === 0) return null;

  const status = getSectionStatus({
    hasRunning: resources.some((r) => r.status === 'starting'),
    hasError: resources.some((r) => r.status === 'error'),
    isDone: resources.every((r) => r.status === 'running' || r.status === 'error' || r.status === 'stopped')
  });

  return (
    <Box flexDirection="column">
      <Box>
        <SectionIcon status={status} />
        <Text> Starting local resources</Text>
      </Box>
      {resources.map((resource, index) => (
        <LocalResourceRow key={resource.name} resource={resource} isLast={index === resources.length - 1} />
      ))}
      <Text> </Text>
    </Box>
  );
};

const SetupStepsSection: React.FC = () => {
  const steps = useStateSlice(() => devTuiState.getState().setupSteps);
  if (steps.length === 0) return null;

  const status = getSectionStatus({
    hasRunning: steps.some((s) => s.status === 'running'),
    hasError: false,
    isDone: steps.every((s) => s.status === 'done' || s.status === 'skipped')
  });

  return (
    <Box flexDirection="column">
      <Box>
        <SectionIcon status={status} />
        <Text> Creating tunnels</Text>
      </Box>
      {steps.map((step, index) => (
        <SetupStepRow key={step.id} step={step} isLast={index === steps.length - 1} />
      ))}
      <Text> </Text>
    </Box>
  );
};

const HooksSection: React.FC = () => {
  const hooks = useStateSlice(() => devTuiState.getState().hooks);
  if (hooks.length === 0) return null;

  const status = getSectionStatus({
    hasRunning: hooks.some((h) => h.status === 'running'),
    hasError: hooks.some((h) => h.status === 'error'),
    isDone: hooks.every((h) => h.status === 'success' || h.status === 'error')
  });

  return (
    <Box flexDirection="column">
      <Box>
        <SectionIcon status={status} />
        <Text> Executing hooks</Text>
      </Box>
      {hooks.map((hook, index) => (
        <HookRow key={hook.name} hook={hook} isLast={index === hooks.length - 1} />
      ))}
      <Text> </Text>
    </Box>
  );
};

const WorkloadsSection: React.FC = () => {
  const workloads = useStateSlice(() => devTuiState.getState().workloads);
  if (workloads.length === 0) return null;

  const status = getSectionStatus({
    hasRunning: workloads.some((w) => w.status === 'starting'),
    hasError: workloads.some((w) => w.status === 'error'),
    isDone: workloads.every((w) => w.status === 'running' || w.status === 'error' || w.status === 'stopped')
  });

  return (
    <Box flexDirection="column">
      <Box>
        <SectionIcon status={status} />
        <Text> Starting workloads</Text>
      </Box>
      {workloads.map((workload, index) => (
        <WorkloadRow key={workload.name} workload={workload} isLast={index === workloads.length - 1} />
      ))}
    </Box>
  );
};

export const DevStartupView: React.FC = () => {
  return (
    <Box flexDirection="column">
      <LocalResourcesSection />
      <SetupStepsSection />
      <HooksSection />
      <WorkloadsSection />
    </Box>
  );
};
