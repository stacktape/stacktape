// DeploymentUI component - main UI for deployment progress

import { Box, useStdout } from 'ink';
import { useEffect, useState } from 'react';
import type { DeploymentState } from '../types';
import { Header } from './Header';
import { PhaseSection } from './PhaseSection';
import { PackagingPhase } from './PackagingPhase';
import { Footer } from './Footer';

type DeploymentUIProps = {
  state: DeploymentState;
};

export const DeploymentUI = ({ state }: DeploymentUIProps) => {
  const { stdout } = useStdout();
  const [, setTick] = useState(0);
  const [terminalWidth, setTerminalWidth] = useState(stdout?.columns || 80);

  // Update terminal width on resize
  useEffect(() => {
    const handleResize = () => {
      setTerminalWidth(stdout?.columns || 80);
    };

    stdout?.on('resize', handleResize);
    return () => {
      stdout?.off('resize', handleResize);
    };
  }, [stdout]);

  // Force re-render for elapsed time (less frequent to reduce flickering)
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 250); // 250ms instead of 100ms
    return () => clearInterval(interval);
  }, []);

  // Calculate consistent width
  const width = Math.min(terminalWidth - 2, 80);

  return (
    <Box flexDirection="column" width={width}>
      {/* Header */}
      <Header state={state} />

      {/* Phases */}
      {state.phases.map((phase, index) => {
        const isActive = phase.id === state.currentPhaseId;

        // Use specialized view for build/package phase
        if (phase.id === 'build' && (phase.status === 'active' || phase.status === 'success')) {
          return <PackagingPhase key={phase.id} phase={phase} />;
        }

        // Default phase rendering
        return <PhaseSection key={phase.id} phase={phase} phaseNumber={index + 1} isActive={isActive} />;
      })}

      {/* Footer */}
      <Footer startedAt={state.startedAt} />
    </Box>
  );
};
