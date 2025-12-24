// PhaseSection component - renders a phase with its tasks

import type { Phase } from '../types';
import { Box, Text, useStdout } from 'ink';
import { colors, symbols } from '../theme';
import { formatTime } from '../utils';
import { TaskItem } from './TaskItem';

type PhaseSectionProps = {
  phase: Phase;
  phaseNumber?: number;
  isActive: boolean;
};

export const PhaseSection = ({ phase, phaseNumber, isActive: _isActive }: PhaseSectionProps) => {
  const { stdout } = useStdout();
  const { name, status, tasks, startedAt, duration } = phase;
  const now = Date.now();

  // Calculate width
  const terminalWidth = stdout?.columns || 80;
  const width = Math.min(terminalWidth - 4, 76);

  // Calculate elapsed time for phase - use duration if completed, otherwise calculate live
  const elapsedMs = status === 'success' && duration ? duration : startedAt ? now - startedAt : 0;
  const timeDisplay = status === 'pending' ? '' : formatTime(elapsedMs);

  // Determine phase name color
  const nameColor = status === 'pending' ? colors.gray500 : colors.white;

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Phase header */}
      <Box>
        {phaseNumber !== undefined && (
          <Text color={colors.gray500}>
            PHASE {phaseNumber} {symbols.bullet}{' '}
          </Text>
        )}
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
            <TaskItem key={task.id} task={task} />
          ))}
        </Box>
      )}

      {/* Pending state message */}
      {status === 'pending' && tasks.length > 0 && (
        <Box marginLeft={2}>
          <Text color={colors.gray600}>
            {symbols.pending} {tasks.map((t) => t.name).join(', ')}
          </Text>
        </Box>
      )}
    </Box>
  );
};
