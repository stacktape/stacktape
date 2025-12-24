// PackagingPhase component - specialized view for the packaging phase
// Shows detailed progress for each workload being packaged

import type { Phase, Task } from '../types';
import { Box, Text, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import { colors, symbols } from '../theme';
import { formatDuration, formatTime } from '../utils';

type PackagingPhaseProps = {
  phase: Phase;
};

const PackagingTaskRow = ({ task }: { task: Task }) => {
  const { name, status, duration, message } = task;

  // Status indicator
  const getStatusIndicator = () => {
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

  return (
    <Box>
      {getStatusIndicator()}
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

export const PackagingPhase = ({ phase }: PackagingPhaseProps) => {
  const { stdout } = useStdout();
  const { name, status, tasks, startedAt, duration } = phase;
  const now = Date.now();

  // Calculate width
  const terminalWidth = stdout?.columns || 80;
  const width = Math.min(terminalWidth - 4, 76);

  // Calculate elapsed time - use duration if completed, otherwise calculate live
  const elapsedMs = status === 'success' && duration ? duration : startedAt ? now - startedAt : 0;
  const timeDisplay = status === 'pending' ? '' : formatTime(elapsedMs);

  // Calculate totals for summary
  const completedTasks = tasks.filter((t) => t.status === 'success').length;
  const totalTasks = tasks.length;

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Phase header */}
      <Box>
        <Text color={colors.gray500}>PHASE 2 {symbols.bullet} </Text>
        <Text bold color={status === 'pending' ? colors.gray500 : colors.white}>
          {name}
        </Text>
        <Box flexGrow={1} />
        <Text color={status === 'pending' ? colors.gray600 : colors.gray400}>{timeDisplay}</Text>
      </Box>

      {/* Separator */}
      <Text color={colors.gray700}>{symbols.lineDash.repeat(width)}</Text>

      {/* Tasks */}
      {status !== 'pending' && (
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          {tasks.map((task) => (
            <PackagingTaskRow key={task.id} task={task} />
          ))}
        </Box>
      )}

      {/* Summary line */}
      {status === 'success' && totalTasks > 0 && (
        <Box marginTop={1} marginLeft={2}>
          <Text color={colors.gray500}>
            {completedTasks}/{totalTasks} workloads packaged
          </Text>
        </Box>
      )}

      {/* Pending state */}
      {status === 'pending' && (
        <Box marginLeft={2}>
          <Text color={colors.gray600}>{symbols.pending} Waiting for build phase to complete...</Text>
        </Box>
      )}
    </Box>
  );
};
