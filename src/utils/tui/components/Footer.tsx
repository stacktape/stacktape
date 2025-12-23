// Footer component - shows elapsed time

import { Box, Text, useStdout } from 'ink';
import { colors, symbols } from '../theme';
import { formatTime } from '../utils';

type FooterProps = {
  startedAt: number;
};

export const Footer = ({ startedAt }: FooterProps) => {
  const { stdout } = useStdout();
  const elapsed = Date.now() - startedAt;

  // Calculate width
  const terminalWidth = stdout?.columns || 80;
  const width = Math.min(terminalWidth - 4, 76);
  const horizontalLine = symbols.horizontal.repeat(width);

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Top border */}
      <Text color={colors.gray700}>
        {symbols.topLeft}
        {horizontalLine}
        {symbols.topRight}
      </Text>

      {/* Content */}
      <Box>
        <Text color={colors.gray700}>{symbols.vertical}</Text>
        <Text> </Text>
        <Text color={colors.gray400}>{symbols.clock} Elapsed: </Text>
        <Text color={colors.white}>{formatTime(elapsed)}</Text>
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
