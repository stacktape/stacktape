import type { LogEntry } from '../dev-tui/types';

type FilterToken =
  | { type: 'include'; value: string }
  | { type: 'exclude'; value: string }
  | { type: 'phrase'; value: string }
  | { type: 'workload'; value: string }
  | { type: 'level'; value: string };

/**
 * Parses a log filter query string into structured tokens.
 *
 * Supported syntax:
 *   error           — case-insensitive substring match
 *   error timeout   — AND: both terms must be present
 *   !healthcheck    — exclude logs containing the term
 *   "exact phrase"  — quoted phrase match
 *   @api            — workload/source filter
 *   level:error     — filter by log level
 */
export const parseFilterTokens = (query: string): FilterToken[] => {
  const tokens: FilterToken[] = [];
  let i = 0;
  const len = query.length;

  while (i < len) {
    // Skip whitespace
    while (i < len && query[i] === ' ') i++;
    if (i >= len) break;

    const ch = query[i];

    // Quoted phrase: "..."
    if (ch === '"') {
      i++; // skip opening quote
      let phrase = '';
      while (i < len && query[i] !== '"') {
        phrase += query[i];
        i++;
      }
      if (i < len) i++; // skip closing quote
      if (phrase) tokens.push({ type: 'phrase', value: phrase.toLowerCase() });
      continue;
    }

    // Negation: !term
    if (ch === '!') {
      i++; // skip !
      let word = '';
      while (i < len && query[i] !== ' ') {
        word += query[i];
        i++;
      }
      if (word) tokens.push({ type: 'exclude', value: word.toLowerCase() });
      continue;
    }

    // Workload filter: @name
    if (ch === '@') {
      i++; // skip @
      let word = '';
      while (i < len && query[i] !== ' ') {
        word += query[i];
        i++;
      }
      if (word) tokens.push({ type: 'workload', value: word.toLowerCase() });
      continue;
    }

    // Regular word (may have level: prefix)
    let word = '';
    while (i < len && query[i] !== ' ') {
      word += query[i];
      i++;
    }

    if (!word) continue;

    // Level filter: level:xxx
    if (word.startsWith('level:')) {
      const level = word.slice(6).toLowerCase();
      if (level) tokens.push({ type: 'level', value: level });
      continue;
    }

    tokens.push({ type: 'include', value: word.toLowerCase() });
  }

  return tokens;
};

/**
 * Compiles a filter query into a predicate function.
 * Returns null if query is empty (no filtering).
 */
export const compileLogFilter = (query: string): ((entry: LogEntry) => boolean) | null => {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const tokens = parseFilterTokens(trimmed);
  if (tokens.length === 0) return null;

  return (entry: LogEntry): boolean => {
    const msgLower = entry.message.toLowerCase();
    const srcLower = entry.source.toLowerCase();

    for (const token of tokens) {
      switch (token.type) {
        case 'include':
          if (!msgLower.includes(token.value) && !srcLower.includes(token.value)) return false;
          break;
        case 'exclude':
          if (msgLower.includes(token.value) || srcLower.includes(token.value)) return false;
          break;
        case 'phrase':
          if (!msgLower.includes(token.value)) return false;
          break;
        case 'workload':
          if (!srcLower.includes(token.value)) return false;
          break;
        case 'level':
          if (entry.level !== token.value) return false;
          break;
      }
    }
    return true;
  };
};

/**
 * Describes the active filter in a human-readable label for the UI.
 */
export const describeFilter = (query: string): string => {
  const tokens = parseFilterTokens(query.trim());
  if (tokens.length === 0) return '';

  const parts: string[] = [];
  for (const t of tokens) {
    switch (t.type) {
      case 'include':
        parts.push(t.value);
        break;
      case 'exclude':
        parts.push(`!${t.value}`);
        break;
      case 'phrase':
        parts.push(`"${t.value}"`);
        break;
      case 'workload':
        parts.push(`@${t.value}`);
        break;
      case 'level':
        parts.push(`level:${t.value}`);
        break;
    }
  }
  return parts.join(' ');
};
