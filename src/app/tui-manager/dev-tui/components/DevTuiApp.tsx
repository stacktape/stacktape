import type { DevTuiState } from '../types';
import { Box } from 'ink';
import React, { useEffect, useState } from 'react';
import { devTuiState } from '../state';
import { StartupView } from './StartupView';

type DevTuiAppProps = {
  onCommand: (command: string) => void;
};

/**
 * Dev TUI App - Only renders during startup phase.
 * Once startup completes, the Ink TUI is unmounted and we switch to console logging.
 */
export const DevTuiApp: React.FC<DevTuiAppProps> = ({ onCommand: _onCommand }) => {
  const [state, setState] = useState<DevTuiState>(devTuiState.getState());

  useEffect(() => {
    return devTuiState.subscribe(setState);
  }, []);

  // Only show startup view - running phase uses console logging
  if (state.phase !== 'startup') {
    return null;
  }

  return (
    <Box flexDirection="column">
      <StartupView state={state} />
    </Box>
  );
};
