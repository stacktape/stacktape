import { Box, Text } from 'ink';
import React from 'react';

type HeaderProps = {
  projectName: string;
  stageName: string;
};

export const Header: React.FC<HeaderProps> = ({ projectName, stageName }) => {
  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={2} justifyContent="center" marginBottom={1}>
      <Text bold color="cyan">
        STACKTAPE DEV
      </Text>
      <Text color="gray"> </Text>
      <Text color="white">
        {projectName} · {stageName}
      </Text>
    </Box>
  );
};
