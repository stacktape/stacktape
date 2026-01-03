/** @jsxImportSource @opentui/react */
import React from 'react';
import { stripAnsi } from '../utils';

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
    <box flexDirection="column" marginLeft={2}>
      <box flexDirection="row">
        <text fg="cyan">{index + 1}. </text>
        <text>
          {stripAnsi(step.text)}
          {step.command && ` ${stripAnsi(step.command)}`}
        </text>
      </box>
      {step.details?.map((detail, i) => (
        <box key={i} marginLeft={3}>
          <text fg="gray">- </text>
          <text>{stripAnsi(detail)}</text>
        </box>
      ))}
      {step.links?.map((link, i) => (
        <box key={i} marginLeft={3}>
          <text fg="gray">- </text>
          <text>{stripAnsi(link)}</text>
        </box>
      ))}
    </box>
  );
};

export const NextSteps: React.FC<NextStepsProps> = ({ steps }) => {
  return (
    <box flexDirection="column" marginTop={1} marginBottom={1}>
      <box marginBottom={1}>
        <text fg="cyan">
          <strong>Next steps:</strong>
        </text>
      </box>
      {steps.map((step, index) => (
        <StepItem key={index} step={step} index={index} />
      ))}
    </box>
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
      lines.push(`     ${colorize('gray', '-')} ${detail}`);
    });

    step.links?.forEach((link) => {
      // Links may already be pre-formatted
      lines.push(`     ${colorize('gray', '-')} ${link}`);
    });
  });

  lines.push('');

  return lines.join('\n');
};
