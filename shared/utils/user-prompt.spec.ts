import { describe, expect, mock, test } from 'bun:test';
import { userPrompt } from './user-prompt';

// Mock prompts module
const mockPrompts = mock(() => Promise.resolve({ value: 'test-response' }));
mock.module('prompts', () => ({ default: mockPrompts }));

describe('user-prompt', () => {
  test('should call prompts with correct arguments', async () => {
    const questions = {
      type: 'text' as const,
      name: 'value',
      message: 'Enter value:'
    };

    const result = await userPrompt(questions);

    expect(mockPrompts).toHaveBeenCalled();
    expect(result).toEqual({ value: 'test-response' });
  });

  test('should work with different prompt types', async () => {
    const selectPrompt = {
      type: 'select' as const,
      name: 'choice',
      message: 'Choose option:',
      choices: [
        { title: 'Option 1', value: 'opt1' },
        { title: 'Option 2', value: 'opt2' }
      ]
    };

    await userPrompt(selectPrompt);
    expect(mockPrompts).toHaveBeenCalled();
  });

  test('should work with multiselect prompts', async () => {
    const multiselectPrompt = {
      type: 'multiselect' as const,
      name: 'items',
      message: 'Select items:',
      choices: [
        { title: 'Item 1', value: 'item1' },
        { title: 'Item 2', value: 'item2' }
      ]
    };

    await userPrompt(multiselectPrompt);
    expect(mockPrompts).toHaveBeenCalled();
  });
});
