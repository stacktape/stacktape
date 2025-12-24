// TaskItem component - renders a single task with status and optional children

import type { Task } from '../types';
import { Box, Text } from 'ink';
import { colors, symbols } from '../theme';
import { formatDuration } from '../utils';
import { ProgressBar } from './ProgressBar';
import { StatusIcon } from './StatusIcon';

type TaskItemProps = {
  task: Task;
  indent?: number;
  isLast?: boolean;
  showTree?: boolean;
};

export const TaskItem = ({ task, indent = 0, isLast = false, showTree = false }: TaskItemProps) => {
  const { name, status, message, duration, progress, children } = task;

  // Tree prefix for nested items
  const treePrefix = showTree ? `${isLast ? symbols.treeCorner : symbols.treeBranch} ` : '';

  return (
    <Box flexDirection="column">
      {/* Main task row */}
      <Box>
        {/* Indentation */}
        {indent > 0 && <Text>{' '.repeat(indent)}</Text>}

        {/* Tree connector */}
        {showTree && <Text color={colors.gray600}>{treePrefix}</Text>}

        {/* Status icon */}
        <StatusIcon status={status} />
        <Text> </Text>

        {/* Task name */}
        <Text color={status === 'pending' ? colors.gray500 : colors.white}>{name}</Text>

        {/* Message (if any) */}
        {message && <Text color={colors.gray400}> {message}</Text>}

        {/* Duration (if completed) */}
        {duration !== undefined && <Text color={colors.gray500}> {formatDuration(duration)}</Text>}
      </Box>

      {/* Progress bar (if active with progress) */}
      {status === 'active' && progress && (
        <Box marginLeft={indent + 4}>
          <ProgressBar
            current={progress.current}
            total={progress.total}
            width={30}
            label={
              progress.unit
                ? `${progress.current.toFixed(1)} ${progress.unit} / ${progress.total.toFixed(1)} ${progress.unit}`
                : undefined
            }
            showPercentage={!progress.unit}
          />
        </Box>
      )}

      {/* Children tasks */}
      {children && children.length > 0 && (
        <Box flexDirection="column" marginLeft={indent + 2}>
          {children.map((child, index) => (
            <TaskItem key={child.id} task={child} indent={2} isLast={index === children.length - 1} showTree />
          ))}
        </Box>
      )}
    </Box>
  );
};
