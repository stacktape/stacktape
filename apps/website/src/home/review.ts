import { heroes } from './heroes/registry';
import { structures } from './structures/registry';

// Let builders preview their part independently while the other registry is empty.
export const reviewStructures = structures.length
  ? structures
  : [{ id: 'preview', title: 'Hero preview', line: 'Show the hero below the site header.', load: undefined }];

export const reviewHeroes = heroes.length
  ? heroes
  : [{ id: 'preview', title: 'Empty hero slot', line: 'Preview the page structure.', load: undefined }];

export const hasReviewParts = structures.length > 0 || heroes.length > 0;
