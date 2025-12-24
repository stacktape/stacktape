// BorderBox component - renders a box with rounded borders

import type { ReactNode } from 'react';
import { Box, Text, useStdout } from 'ink';
import { colors, symbols } from '../theme';

type BorderBoxProps = {
  children: ReactNode;
  borderColor?: string;
  title?: string;
};

export const BorderBox = ({ children, borderColor = colors.gray600, title }: BorderBoxProps) => {
  const { stdout } = useStdout();
  const width = Math.min(stdout?.columns || 80, 80) - 4;

  return (
    <Box flexDirection="column" width={width + 2}>
      {/* Top border */}
      <Box>
        <Text color={borderColor}>{symbols.topLeft}</Text>
        {title ? (
          <>
            <Text color={borderColor}>{symbols.horizontal.repeat(2)}</Text>
            <Text color={colors.white} bold>
              {' '}
              {title}{' '}
            </Text>
            <Text color={borderColor}>{symbols.horizontal.repeat(Math.max(0, width - title.length - 5))}</Text>
          </>
        ) : (
          <Text color={borderColor}>{symbols.horizontal.repeat(width)}</Text>
        )}
        <Text color={borderColor}>{symbols.topRight}</Text>
      </Box>

      {/* Content with side borders */}
      <Box>
        <Text color={borderColor}>{symbols.vertical}</Text>
        <Box flexGrow={1} paddingX={1}>
          {children}
        </Box>
        <Text color={borderColor}>{symbols.vertical}</Text>
      </Box>

      {/* Bottom border */}
      <Box>
        <Text color={borderColor}>{symbols.bottomLeft}</Text>
        <Text color={borderColor}>{symbols.horizontal.repeat(width)}</Text>
        <Text color={borderColor}>{symbols.bottomRight}</Text>
      </Box>
    </Box>
  );
};
