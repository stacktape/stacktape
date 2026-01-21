import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

// ============ Types ============

interface ConfigGenTuiProps {
  phase: string;
  message: string;
  totalFiles: number;
  selectedFiles: string[];
  filesRead: number;
  filesToRead: number;
  error: string | null;
  completed: boolean;
  success: boolean;
}

// ============ Phase Steps ============

const PHASES = [
  { key: 'Scanning files', label: 'Scan project files' },
  { key: 'Reading files', label: 'Read selected files' },
  { key: 'Analyzing code', label: 'Analyze deployment requirements' },
  { key: 'Generating config', label: 'Generate configuration' },
  { key: 'Configuring env vars', label: 'Configure environment variables' }
];

// ============ Main Component ============

export const ConfigGenTui: React.FC<ConfigGenTuiProps> = ({
  phase,
  message,
  totalFiles,
  selectedFiles,
  filesRead,
  filesToRead,
  error,
  completed,
  success
}) => {
  const currentPhaseIndex = PHASES.findIndex((p) => p.key === phase);

  return (
    <Box flexDirection="column" paddingLeft={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Generating Stacktape Configuration
        </Text>
      </Box>

      {/* Phase list */}
      <Box flexDirection="column" marginBottom={1}>
        {PHASES.map((p, index) => {
          const isActive = p.key === phase && !completed;
          const isCompleted = index < currentPhaseIndex || (completed && success);
          const isFailed = completed && !success && index === currentPhaseIndex;

          let icon: React.ReactNode;
          let color: string;

          if (isFailed) {
            icon = <Text color="red">{'\u2716'}</Text>;
            color = 'red';
          } else if (isCompleted) {
            icon = <Text color="green">{'\u2714'}</Text>;
            color = 'green';
          } else if (isActive) {
            icon = <Spinner type="dots" />;
            color = 'yellow';
          } else {
            icon = <Text color="gray">{'\u25CB'}</Text>;
            color = 'gray';
          }

          return (
            <Box key={p.key}>
              <Box width={3}>{icon}</Box>
              <Text color={color}>{p.label}</Text>
              {isActive && p.key === 'Scanning files' && totalFiles > 0 && (
                <Text color="gray"> ({totalFiles} files found)</Text>
              )}
              {isActive && p.key === 'Reading files' && filesToRead > 0 && (
                <Text color="gray">
                  {' '}
                  ({filesRead}/{filesToRead})
                </Text>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Selected files preview */}
      {selectedFiles.length > 0 && !completed && (
        <Box flexDirection="column" marginLeft={3} marginBottom={1}>
          <Text color="gray" dimColor>
            Selected files for analysis:
          </Text>
          {selectedFiles.slice(0, 5).map((file, i) => (
            <Text key={i} color="gray" dimColor>
              {'\u{1F4C4}'} {file}
            </Text>
          ))}
          {selectedFiles.length > 5 && (
            <Text color="gray" dimColor>
              ... and {selectedFiles.length - 5} more
            </Text>
          )}
        </Box>
      )}

      {/* Error message */}
      {error && (
        <Box marginTop={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {/* Status message */}
      {!completed && (
        <Box marginTop={1}>
          <Text color="gray">{message}</Text>
        </Box>
      )}
    </Box>
  );
};
