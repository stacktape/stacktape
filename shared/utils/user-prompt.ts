import type { PromptObject } from 'prompts';
import prompts from 'prompts';

/**
 * @param questions possible types: https://github.com/terkelg/prompts#-types
 */
export const userPrompt = (questions: PromptObject<string>) => {
  return prompts(questions, { onCancel: () => process.emit('SIGINT' as any) });
};
