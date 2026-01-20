import type { DevTuiState, LogEntry, Workload } from '../types';
import { Box, Text, useInput, useStdout } from 'ink';
import React, { useMemo } from 'react';
import { formatTime, getWorkloadColor, truncate } from './utils';

type RunningViewProps = {
  state: DevTuiState;
  onCommand: (command: string) => void;
};

const StatusBar: React.FC<{ workloads: Workload[]; projectName: string; stageName: string }> = ({
  workloads,
  projectName,
  stageName
}) => {
  return (
    <Box borderStyle="single" borderBottom={false} borderLeft={false} borderRight={false} paddingX={1}>
      <Box flexGrow={1}>
        <Text bold color="cyan">
          STACKTAPE DEV
        </Text>
        <Text color="gray"> </Text>
        {workloads.map((w, idx) => (
          <React.Fragment key={w.name}>
            {idx > 0 && <Text color="gray"> </Text>}
            <Text color={w.status === 'running' ? 'green' : w.status === 'error' ? 'red' : 'gray'}>●</Text>
            <Text color="gray"> </Text>
            <Text color={getWorkloadColor(w.name)}>{truncate(w.name, 12)}</Text>
            {w.port && <Text color="gray">:{w.port}</Text>}
          </React.Fragment>
        ))}
      </Box>
      <Box>
        <Text color="gray">
          {projectName} · {stageName}
        </Text>
      </Box>
    </Box>
  );
};

const LogLine: React.FC<{ entry: LogEntry; sourceWidth: number }> = ({ entry, sourceWidth }) => {
  const timeStr = formatTime(entry.timestamp);
  const sourceColor = entry.sourceType === 'system' ? 'gray' : getWorkloadColor(entry.source);

  const levelColor = {
    info: 'white',
    warn: 'yellow',
    error: 'red',
    debug: 'gray'
  }[entry.level];

  return (
    <Box>
      <Text color="gray">{timeStr}</Text>
      <Text color="gray"> </Text>
      <Box width={sourceWidth + 2}>
        <Text color={sourceColor}>[{truncate(entry.source, sourceWidth)}]</Text>
      </Box>
      <Text> </Text>
      <Text color={levelColor} wrap="truncate-end">
        {entry.message}
      </Text>
    </Box>
  );
};

const HelpBar: React.FC<{ inputBuffer: string }> = ({ inputBuffer }) => {
  return (
    <Box
      borderStyle="single"
      borderTop={false}
      borderLeft={false}
      borderRight={false}
      paddingX={1}
      justifyContent="space-between"
    >
      <Box>
        {inputBuffer ? (
          <Text>
            <Text color="cyan">&gt; </Text>
            <Text>{inputBuffer}</Text>
            <Text color="gray">_</Text>
          </Text>
        ) : (
          <Text color="gray">Type 'rs' to rebuild all, 'rs [name]' to rebuild one, 'q' to quit</Text>
        )}
      </Box>
    </Box>
  );
};

export const RunningView: React.FC<RunningViewProps> = ({ state, onCommand }) => {
  const { workloads, logs, projectName, stageName, inputBuffer, selectedLogFilter } = state;

  const { stdout } = useStdout();
  const terminalHeight = stdout?.rows || 24;

  // Filter logs if a filter is set
  const filteredLogs = useMemo(() => {
    if (!selectedLogFilter) return logs;
    return logs.filter((log) => log.source === selectedLogFilter);
  }, [logs, selectedLogFilter]);

  // Calculate how many log lines we can show
  // Reserve: 3 for status bar, 3 for help bar, 1 buffer
  const maxLogLines = Math.max(5, terminalHeight - 7);
  const visibleLogs = filteredLogs.slice(-maxLogLines);

  // Calculate the max source name width for alignment
  const sourceWidth = Math.min(14, Math.max(6, ...workloads.map((w) => w.name.length)));

  // Handle keyboard input
  useInput((input, key) => {
    if (key.return) {
      if (inputBuffer.trim()) {
        onCommand(inputBuffer.trim());
      }
      return;
    }

    if (key.backspace || key.delete) {
      if (inputBuffer.length > 0) {
        onCommand(`__setInput:${inputBuffer.slice(0, -1)}`);
      }
      return;
    }

    if (key.escape) {
      onCommand('__setInput:');
      return;
    }

    // Regular character input
    if (input && !key.ctrl && !key.meta) {
      onCommand(`__setInput:${inputBuffer}${input}`);
    }
  });

  return (
    <Box flexDirection="column" height={terminalHeight}>
      <StatusBar workloads={workloads} projectName={projectName} stageName={stageName} />

      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {visibleLogs.length === 0 ? (
          <Box justifyContent="center" alignItems="center" flexGrow={1}>
            <Text color="gray">Waiting for logs...</Text>
          </Box>
        ) : (
          visibleLogs.map((log) => <LogLine key={log.id} entry={log} sourceWidth={sourceWidth} />)
        )}
      </Box>

      <HelpBar inputBuffer={inputBuffer} />
    </Box>
  );
};
