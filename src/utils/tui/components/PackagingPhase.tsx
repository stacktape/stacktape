// PackagingPhase component - specialized view for the packaging phase
// Shows detailed progress for each workload being packaged

import { Box, Text, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import type { Phase, Task } from '../types';
import { colors, symbols } from '../theme';
import { formatDuration, formatTime, formatBytes } from '../utils';

type PackagingPhaseProps = {
  phase: Phase;
};

const PackagingTaskRow = ({ task }: { task: Task }) => {
  const { name, status, duration, progress, message } = task;

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

  // Progress bar for active tasks
  const renderProgressBar = () => {
    if (status !== 'active' || !progress) return null;

    const { current, total } = progress;
    const ratio = Math.min(current / total, 1);
    const barWidth = 20;
    const filled = Math.round(ratio * barWidth);
    const empty = barWidth - filled;
    const percent = Math.round(ratio * 100);

    return (
      <Box marginLeft={4}>
        <Text color={colors.primary}>{symbols.progressFull.repeat(filled)}</Text>
        <Text color={colors.gray700}>{symbols.progressEmpty.repeat(empty)}</Text>
        <Text color={colors.gray400}> {percent}%</Text>
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      <Box>
        {getStatusIndicator()}
        <Text> </Text>
        <Text color={status === 'pending' ? colors.gray500 : colors.white}>{name}</Text>
        {message && status === 'active' && <Text color={colors.gray500}> {message}</Text>}
        {duration !== undefined && <Text color={colors.gray500}> {formatDuration(duration)}</Text>}
      </Box>
      {renderProgressBar()}

      {/* Child tasks (individual files being packaged) */}
      {task.children && task.children.length > 0 && (
        <Box flexDirection="column" marginLeft={2}>
          {task.children.map((child, index) => {
            const isLast = index === task.children!.length - 1;
            const prefix = isLast ? symbols.treeCorner : symbols.treeBranch;

            return (
              <Box key={child.id}>
                <Text color={colors.gray600}>{prefix} </Text>
                {child.status === 'active' ? (
                  <Text color={colors.primary}>
                    <Spinner type="dots" />
                  </Text>
                ) : child.status === 'success' ? (
                  <Text color={colors.success}>{symbols.success}</Text>
                ) : (
                  <Text color={colors.gray600}>{symbols.pending}</Text>
                )}
                <Text color={colors.gray400}> {child.name}</Text>
                {child.duration !== undefined && <Text color={colors.gray600}> {formatDuration(child.duration)}</Text>}
              </Box>
            );
          })}
        </Box>
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

  // Calculate elapsed time
  const elapsedMs = startedAt ? duration || now - startedAt : 0;
  const timeDisplay = status === 'pending' ? 'waiting' : formatTime(elapsedMs);

  // Calculate totals for summary
  const completedTasks = tasks.filter((t) => t.status === 'success').length;
  const totalTasks = tasks.length;

  // Calculate total size if available
  const totalBytes = tasks.reduce((acc, task) => {
    if (task.progress?.total && task.progress.unit === 'MB') {
      return acc + task.progress.total * 1024 * 1024;
    }
    return acc;
  }, 0);

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
      {status !== 'pending' && totalTasks > 0 && (
        <Box marginTop={1} marginLeft={2}>
          <Text color={colors.gray500}>
            {completedTasks}/{totalTasks} packages
            {totalBytes > 0 && ` • ${formatBytes(totalBytes)} total`}
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
