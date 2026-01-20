import type { DevTuiState, Hook, LocalResource, Workload } from '../types';
import { Box, Text } from 'ink';
import React, { useEffect, useState } from 'react';
import { formatDuration } from './utils';

// Simple text-based spinner that has consistent width
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const SimpleSpinner: React.FC = () => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return <Text color="cyan">{SPINNER_FRAMES[frameIndex]}</Text>;
};

type StartupViewProps = {
  state: DevTuiState;
};

const ResourceTypeIcon: React.FC<{ type: LocalResource['type'] }> = ({ type }) => {
  const icons: Record<LocalResource['type'], string> = {
    postgres: 'PG',
    mysql: 'MY',
    redis: 'RD',
    dynamodb: 'DY'
  };
  return <Text color="gray">[{icons[type]}]</Text>;
};

const WorkloadTypeLabel: React.FC<{ type: Workload['type']; hostingContentType?: string }> = ({
  type,
  hostingContentType
}) => {
  if (type === 'hosting-bucket' && hostingContentType) {
    // Map hosting content types to display names
    const hostingLabels: Record<string, string> = {
      'single-page-app': 'SPA',
      'static-website': 'Static',
      custom: 'Custom'
    };
    return <Text color="gray">{hostingLabels[hostingContentType] || hostingContentType}</Text>;
  }

  const labels: Record<Workload['type'], string> = {
    container: 'Container',
    function: 'Function',
    'hosting-bucket': 'Static',
    'nextjs-web': 'Next.js'
  };
  return <Text color="gray">{labels[type]}</Text>;
};

const StatusIndicator: React.FC<{ status: string; isRunningState?: boolean }> = ({
  status,
  isRunningState = false
}) => {
  switch (status) {
    case 'pending':
      return <Text color="gray">○</Text>;
    case 'starting':
      return <SimpleSpinner />;
    case 'running':
      // For resources/workloads, "running" means it's up - show green indicator
      return isRunningState ? <SimpleSpinner /> : <Text color="green">●</Text>;
    case 'success':
      return <Text color="green">✓</Text>;
    case 'error':
    case 'stopped':
      return <Text color="red">✗</Text>;
    default:
      return <Text color="gray">○</Text>;
  }
};

const LocalResourceRow: React.FC<{ resource: LocalResource; isLast: boolean }> = ({ resource, isLast }) => {
  const prefix = isLast ? '└─' : '├─';
  const portDisplay = resource.port ? `:${resource.port}` : '';

  const getStatusContent = () => {
    switch (resource.status) {
      case 'running':
        return <Text color="cyan">localhost{portDisplay}</Text>;
      case 'starting':
        return <Text color="gray">Starting...</Text>;
      case 'error':
        return <Text color="red">{resource.error || 'Failed'}</Text>;
      default:
        return null;
    }
  };

  return (
    <Box>
      <Text color="gray">{prefix} </Text>
      <StatusIndicator status={resource.status} />
      <Text> </Text>
      <Box width={20}>
        <Text bold>{resource.name}</Text>
      </Box>
      <Box width={24}>{getStatusContent()}</Box>
    </Box>
  );
};

const HookRow: React.FC<{ hook: Hook; isLast: boolean }> = ({ hook, isLast }) => {
  const prefix = isLast ? '└─' : '├─';

  const getStatusContent = () => {
    switch (hook.status) {
      case 'success':
        return (
          <>
            {hook.message && <Text color="gray">{hook.message}</Text>}
            {hook.duration !== undefined && <Text color="yellow"> {formatDuration(hook.duration)}</Text>}
          </>
        );
      case 'running':
        return <Text color="gray">{hook.message || 'Running...'}</Text>;
      case 'error':
        return <Text color="red">{hook.error || 'Failed'}</Text>;
      default:
        return null;
    }
  };

  return (
    <Box>
      <Text color="gray">{prefix} </Text>
      <StatusIndicator status={hook.status} isRunningState={hook.status === 'running'} />
      <Text> </Text>
      <Box width={20}>
        <Text bold>{hook.name}</Text>
      </Box>
      <Box width={24}>{getStatusContent()}</Box>
    </Box>
  );
};

const WorkloadRow: React.FC<{ workload: Workload; isLast: boolean }> = ({ workload, isLast }) => {
  const prefix = isLast ? '└─' : '├─';

  // Determine the status text to show (fixed width for consistent rendering)
  const getStatusContent = () => {
    switch (workload.status) {
      case 'running':
        return <WorkloadTypeLabel type={workload.type} hostingContentType={workload.hostingContentType} />;
      case 'starting':
        return <Text color="gray">{workload.statusMessage || 'Starting...'}</Text>;
      case 'error':
        return <Text color="red">{workload.error || 'Failed'}</Text>;
      default:
        return null;
    }
  };

  return (
    <Box>
      <Text color="gray">{prefix} </Text>
      <StatusIndicator status={workload.status} isRunningState={workload.status === 'starting'} />
      <Text> </Text>
      <Box width={20}>
        <Text bold>{workload.name}</Text>
      </Box>
      <Box width={24}>{getStatusContent()}</Box>
    </Box>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="white" bold>
        {title}
      </Text>
      {children}
    </Box>
  );
};

export const StartupView: React.FC<StartupViewProps> = ({ state }) => {
  const { localResources, hooks, workloads } = state;

  // Always render all sections that have items registered
  // This keeps the line count stable and prevents Ink rendering issues
  return (
    <Box flexDirection="column" paddingX={1}>
      {localResources.length > 0 && (
        <Section title=" Local Resources">
          {localResources.map((resource, idx) => (
            <LocalResourceRow key={resource.name} resource={resource} isLast={idx === localResources.length - 1} />
          ))}
        </Section>
      )}

      {hooks.length > 0 && (
        <Section title=" Hooks">
          {hooks.map((hook, idx) => (
            <HookRow key={hook.name} hook={hook} isLast={idx === hooks.length - 1} />
          ))}
        </Section>
      )}

      {workloads.length > 0 && (
        <Section title=" Workloads">
          {workloads.map((workload, idx) => (
            <WorkloadRow key={workload.name} workload={workload} isLast={idx === workloads.length - 1} />
          ))}
        </Section>
      )}
    </Box>
  );
};
