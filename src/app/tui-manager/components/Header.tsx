import type { TuiDeploymentHeader } from '../types';
import { COMMAND_HEADER_BOX_MIN_WIDTH } from '../command-header';
import { Box, Text } from 'ink';
import React from 'react';

type HeaderProps = {
  header: TuiDeploymentHeader;
};

export const Header: React.FC<HeaderProps> = ({ header }) => {
  const { projectName, stageName, region, action } = header;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box borderStyle="round" paddingX={1} paddingY={0} flexDirection="column" width={COMMAND_HEADER_BOX_MIN_WIDTH}>
        <Text bold color="cyan">
          {action}
        </Text>
        <Text>
          {projectName} <Text color="gray">→</Text> {stageName} <Text color="gray">({region})</Text>
        </Text>
      </Box>
    </Box>
  );
};
