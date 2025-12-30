import type { TuiSummary } from '../types';
import { Box, Text } from 'ink';
import Link from 'ink-link';
import React from 'react';

type SummaryProps = {
  summary: TuiSummary;
};

export const Summary: React.FC<SummaryProps> = ({ summary }) => {
  const { success, message, links, consoleUrl } = summary;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text bold color={success ? 'green' : 'red'}>
          {success ? '✓' : '✗'} {message}
        </Text>
      </Box>
      <Text color="gray">{'─'.repeat(54)}</Text>

      {links.map((link, index) => (
        <Box key={index} marginLeft={1}>
          <Text>• </Text>
          <Link url={link.url}>
            <Text color="cyan">{link.label}</Text>
          </Link>
          <Text> {link.url}</Text>
        </Box>
      ))}

      {consoleUrl && (
        <Box marginTop={1}>
          <Link url={consoleUrl}>
            <Text color="cyan">Stack details</Text>
          </Link>
        </Box>
      )}

      <Text> </Text>
    </Box>
  );
};
