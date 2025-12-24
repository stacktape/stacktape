// DeploymentUI component - main UI for deployment progress

import type { DeploymentState, Phase, Task } from '../types';
import { Box, Static, Text, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import { useEffect, useState } from 'react';
import { colors, symbols } from '../theme';
import { formatDuration, formatTime } from '../utils';

type DeploymentUIProps = {
  state: DeploymentState;
};

const TaskRow = ({ task, indent = 0 }: { task: Task; indent?: number }) => {
  const { name, status, duration, message } = task;

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <Text color={colors.success}>{symbols.success}</Text>;
      case 'error':
        return <Text color={colors.error}>{symbols.error}</Text>;
      case 'active':
        return (
          <Text color={colors.primary}>
            <Spinner type="dots" />
          </Text>
        );
      default:
        return <Text color={colors.gray600}>{symbols.pending}</Text>;
    }
  };

  const indentStr = '  '.repeat(indent);

  return (
    <Box>
      <Text>{indentStr}</Text>
      {getStatusIcon()}
      <Text> </Text>
      <Text color={status === 'pending' ? colors.gray500 : colors.white}>{name}</Text>
      {message && status === 'active' && (
        <Text color={colors.gray500}>
          {' '}
          {symbols.arrowRight} {message}
        </Text>
      )}
      {status === 'success' && duration !== undefined && (
        <Text color={colors.gray500}> {formatDuration(duration)}</Text>
      )}
    </Box>
  );
};

const ChildTasks = ({ children }: { children: Task[] }) => {
  if (!children || children.length === 0) return null;

  // Show children indented under parent
  return (
    <Box flexDirection="column" marginLeft={2}>
      {children.map((child) => (
        <TaskRow key={child.id} task={child} indent={1} />
      ))}
    </Box>
  );
};

const PhaseBlock = ({ phase, phaseNumber }: { phase: Phase; phaseNumber: number }) => {
  const { stdout } = useStdout();
  const { name, status, tasks, startedAt, duration } = phase;
  const now = Date.now();

  const terminalWidth = stdout?.columns || 80;
  const width = Math.min(terminalWidth - 4, 76);

  // Calculate elapsed time
  const elapsedMs = status === 'success' && duration ? duration : startedAt ? now - startedAt : 0;
  const timeDisplay = status === 'pending' ? '' : formatTime(elapsedMs);

  const nameColor = status === 'pending' ? colors.gray500 : colors.white;

  // Don't show pending phases with no tasks
  if (status === 'pending' && tasks.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Phase header */}
      <Box>
        <Text color={colors.gray500}>
          PHASE {phaseNumber} {symbols.bullet}{' '}
        </Text>
        <Text bold color={nameColor}>
          {name}
        </Text>
        <Box flexGrow={1} />
        <Text color={status === 'pending' ? colors.gray600 : colors.gray400}>{timeDisplay}</Text>
      </Box>

      {/* Separator line */}
      <Text color={colors.gray700}>{symbols.lineDash.repeat(width)}</Text>

      {/* Tasks */}
      {status !== 'pending' && (
        <Box flexDirection="column" marginLeft={2}>
          {tasks.map((task) => (
            <Box key={task.id} flexDirection="column">
              <TaskRow task={task} />
              {task.children && task.children.length > 0 && <ChildTasks children={task.children} />}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

const Header = ({ state }: { state: DeploymentState }) => {
  const { stdout } = useStdout();
  const { command, stackName, stage, region, completedAt } = state;

  const terminalWidth = stdout?.columns || 80;
  const width = Math.min(terminalWidth - 4, 76);
  const horizontalLine = symbols.horizontal.repeat(width);

  const statusText = completedAt ? (command === 'delete' ? 'DELETED' : 'DEPLOYED') : `${command.toUpperCase()}ING`;
  const statusColor = completedAt ? colors.success : colors.primary;

  // Don't show header if no stack info yet
  if (!stackName) {
    return null;
  }

  return (
    <Box flexDirection="column">
      <Text color={colors.gray700}>
        {symbols.topLeft}
        {horizontalLine}
        {symbols.topRight}
      </Text>
      <Box>
        <Text color={colors.gray700}>{symbols.vertical} </Text>
        <Text bold color={statusColor}>
          {statusText}
        </Text>
        <Box flexGrow={1} />
        <Text color={colors.gray700}> {symbols.vertical}</Text>
      </Box>
      <Box>
        <Text color={colors.gray700}>{symbols.vertical} </Text>
        <Text color={colors.white}>{stackName}</Text>
        <Text color={colors.gray500}>
          {' '}
          {symbols.arrowRight} {stage}
        </Text>
        <Text color={colors.gray600}> ({region})</Text>
        <Box flexGrow={1} />
        <Text color={colors.gray700}> {symbols.vertical}</Text>
      </Box>
      <Text color={colors.gray700}>
        {symbols.bottomLeft}
        {horizontalLine}
        {symbols.bottomRight}
      </Text>
    </Box>
  );
};

export const DeploymentUI = ({ state }: DeploymentUIProps) => {
  const { stdout } = useStdout();
  const [, setTick] = useState(0);
  const [terminalWidth, setTerminalWidth] = useState(stdout?.columns || 80);

  useEffect(() => {
    const handleResize = () => {
      setTerminalWidth(stdout?.columns || 80);
    };
    stdout?.on('resize', handleResize);
    return () => {
      stdout?.off('resize', handleResize);
    };
  }, [stdout]);

  // Force re-render for elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const width = Math.min(terminalWidth - 2, 80);

  // Separate completed and active phases for Static rendering
  const completedPhases = state.phases.filter((p) => p.status === 'success' || p.status === 'error');
  const activePhases = state.phases.filter(
    (p) => p.status === 'active' || (p.status === 'pending' && p.tasks.length > 0)
  );

  return (
    <Box flexDirection="column" width={width}>
      <Header state={state} />

      {/* Completed phases - use Static to prevent jumping */}
      <Static items={completedPhases}>
        {(phase) => {
          const phaseIndex = state.phases.findIndex((p) => p.id === phase.id);
          return <PhaseBlock key={phase.id} phase={phase} phaseNumber={phaseIndex + 1} />;
        }}
      </Static>

      {/* Active phases */}
      {activePhases.map((phase) => {
        const phaseIndex = state.phases.findIndex((p) => p.id === phase.id);
        return <PhaseBlock key={phase.id} phase={phase} phaseNumber={phaseIndex + 1} />;
      })}
    </Box>
  );
};
