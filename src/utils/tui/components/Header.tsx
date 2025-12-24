// Header component - shows the deployment header with status

import type { DeploymentState } from '../types';
import { Box, Text, useStdout } from 'ink';
import { colors, symbols } from '../theme';

type HeaderProps = {
  state: DeploymentState;
};

export const Header = ({ state }: HeaderProps) => {
  const { stdout } = useStdout();
  const { command, stackName, stage, region, error, completedAt } = state;

  // Calculate width
  const terminalWidth = stdout?.columns || 80;
  const width = Math.min(terminalWidth - 4, 76);

  // Determine status text and color
  let statusText: string;
  let statusColor: string;

  if (error) {
    statusText = command === 'delete' ? 'DELETE FAILED' : 'DEPLOYMENT FAILED';
    statusColor = colors.error;
  } else if (completedAt) {
    statusText = command === 'delete' ? 'DELETE COMPLETE' : 'DEPLOYMENT COMPLETE';
    statusColor = colors.success;
  } else {
    statusText = command === 'delete' ? 'DELETING' : 'DEPLOYING';
    statusColor = colors.primary;
  }

  const horizontalLine = symbols.horizontal.repeat(width);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Top border */}
      <Text color={colors.gray700}>
        {symbols.topLeft}
        {horizontalLine}
        {symbols.topRight}
      </Text>

      {/* Status line */}
      <Box>
        <Text color={colors.gray700}>{symbols.vertical}</Text>
        <Text> </Text>
        <Text bold color={statusColor}>
          {statusText}
        </Text>
        <Box flexGrow={1} />
        <Text color={colors.gray700}>{symbols.vertical}</Text>
      </Box>

      {/* Stack info line */}
      <Box>
        <Text color={colors.gray700}>{symbols.vertical}</Text>
        <Text> </Text>
        <Text color={colors.white}>{stackName}</Text>
        <Text color={colors.gray500}> {symbols.arrowRight} </Text>
        <Text color={colors.primary}>{stage}</Text>
        <Text color={colors.gray500}> ({region})</Text>
        <Box flexGrow={1} />
        <Text color={colors.gray700}>{symbols.vertical}</Text>
      </Box>

      {/* Bottom border */}
      <Text color={colors.gray700}>
        {symbols.bottomLeft}
        {horizontalLine}
        {symbols.bottomRight}
      </Text>
    </Box>
  );
};
