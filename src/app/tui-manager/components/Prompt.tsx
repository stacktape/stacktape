import type { TuiPrompt, TuiPromptConfirm, TuiPromptSelect, TuiPromptText } from '../types';
import { ConfirmInput, Select, TextInput } from '@inkjs/ui';
import { Box, Text } from 'ink';
import React from 'react';
import { tuiState } from '../state';

type PromptProps = {
  prompt: TuiPrompt;
};

const SelectPrompt: React.FC<{ prompt: TuiPromptSelect }> = ({ prompt }) => {
  const handleChange = (value: string) => {
    tuiState.clearActivePrompt();
    prompt.resolve(value);
  };

  return (
    <Box flexDirection="column" marginY={1}>
      <Text color="cyan">{prompt.message}</Text>
      <Box marginTop={1}>
        <Select options={prompt.options} onChange={handleChange} />
      </Box>
    </Box>
  );
};

const ConfirmPrompt: React.FC<{ prompt: TuiPromptConfirm }> = ({ prompt }) => {
  const handleConfirm = () => {
    tuiState.clearActivePrompt();
    prompt.resolve(true);
  };

  const handleCancel = () => {
    tuiState.clearActivePrompt();
    prompt.resolve(false);
  };

  return (
    <Box flexDirection="column" marginY={1}>
      <Text color="cyan">{prompt.message}</Text>
      <Box marginTop={1}>
        <ConfirmInput onConfirm={handleConfirm} onCancel={handleCancel} />
      </Box>
    </Box>
  );
};

const TextPrompt: React.FC<{ prompt: TuiPromptText }> = ({ prompt }) => {
  const handleSubmit = (value: string) => {
    tuiState.clearActivePrompt();
    prompt.resolve(value);
  };

  return (
    <Box flexDirection="column" marginY={1}>
      <Text color="cyan">{prompt.message}</Text>
      <Box marginTop={1}>
        <TextInput placeholder={prompt.placeholder} onSubmit={handleSubmit} />
      </Box>
    </Box>
  );
};

export const Prompt: React.FC<PromptProps> = ({ prompt }) => {
  switch (prompt.type) {
    case 'select':
      return <SelectPrompt prompt={prompt} />;
    case 'confirm':
      return <ConfirmPrompt prompt={prompt} />;
    case 'text':
      return <TextPrompt prompt={prompt} />;
    default:
      return null;
  }
};
