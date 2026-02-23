import type { JsonlEvent } from './jsonl-types';

export const serializeJsonlEvent = (event: JsonlEvent): string => JSON.stringify(event);
