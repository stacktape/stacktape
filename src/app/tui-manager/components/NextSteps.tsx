import { Box, Text } from 'ink';
import React from 'react';

export type NextStep = {
  /** Main instruction text */
  text: string;
  /** Optional command to highlight */
  command?: string;
  /** Additional details or sub-items */
  details?: string[];
  /** Links to display */
  links?: string[];
};

type NextStepsProps = {
  steps: NextStep[];
};

const StepItem: React.FC<{ step: NextStep; index: number }> = ({ step, index }) => {
  return (
    <Box flexDirection="column" marginLeft={2}>
      <Box>
        <Text color="cyan">{index + 1}. </Text>
        <Text>{step.text}</Text>
        {step.command && <Text> {step.command}</Text>}
      </Box>
      {step.details?.map((detail, i) => (
        <Box key={i} marginLeft={3}>
          <Text color="gray">→ </Text>
          <Text>{detail}</Text>
        </Box>
      ))}
      {step.links?.map((link, i) => (
        <Box key={i} marginLeft={3}>
          <Text color="gray">→ </Text>
          <Text>{link}</Text>
        </Box>
      ))}
    </Box>
  );
};

export const NextSteps: React.FC<NextStepsProps> = ({ steps }) => {
  return (
    <Box flexDirection="column" marginY={1}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          Next steps:
        </Text>
      </Box>
      {steps.map((step, index) => (
        <StepItem key={index} step={step} index={index} />
      ))}
    </Box>
  );
};

/**
 * Render next steps to a plain string (for non-TTY mode).
 */
export const renderNextStepsToString = (
  steps: NextStep[],
  colorize: (color: string, text: string) => string,
  makeBold: (text: string) => string
): string => {
  const lines: string[] = [];

  lines.push('');
  lines.push(colorize('cyan', makeBold('Next steps:')));

  steps.forEach((step, index) => {
    let stepLine = `  ${colorize('cyan', `${index + 1}.`)} ${step.text}`;
    if (step.command) {
      // Command is already pre-formatted with colors
      stepLine += ` ${step.command}`;
    }
    lines.push(stepLine);

    step.details?.forEach((detail) => {
      lines.push(`     ${colorize('gray', '→')} ${detail}`);
    });

    step.links?.forEach((link) => {
      // Links may already be pre-formatted
      lines.push(`     ${colorize('gray', '→')} ${link}`);
    });
  });

  lines.push('');

  return lines.join('\n');
};
