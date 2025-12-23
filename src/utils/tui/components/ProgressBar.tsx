// Progress bar component

import { Box, Text } from 'ink';
import { colors, symbols } from '../theme';
import { createProgressBar } from '../utils';

type ProgressBarProps = {
  current: number;
  total: number;
  width?: number;
  showPercentage?: boolean;
  label?: string;
};

export const ProgressBar = ({ current, total, width = 30, showPercentage = true, label }: ProgressBarProps) => {
  const { filled, empty } = createProgressBar(current, total, width);
  const percentage = Math.round((current / total) * 100);

  return (
    <Box>
      {label && <Text color={colors.gray400}>{label} </Text>}
      <Text color={colors.primary}>{symbols.progressFull.repeat(filled)}</Text>
      <Text color={colors.gray700}>{symbols.progressEmpty.repeat(empty)}</Text>
      {showPercentage && <Text color={colors.gray400}> {percentage}%</Text>}
    </Box>
  );
};
