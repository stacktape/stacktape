/**
 * Source text with comments, and optionally string contents, blanked out.
 *
 * A probe that reads raw text takes a commented-out `app.listen(3000)` for a server, and a tutorial string holding
 * `export const handler = async (event) => ...` for a Lambda handler. The masked text keeps every offset and line break,
 * so a match found in it can be cited on the original line.
 */

import type { Citation } from '../facts/citation';
import { citeLine } from './probe';

export type MaskedLanguage = 'javascript' | 'python' | 'go';

/** The masking a file gets, by extension; undefined when its comments and strings are not understood here. */
const maskedLanguageOf = (path: string): MaskedLanguage | undefined =>
  /\.(?:[cm]?[jt]sx?)$/.test(path)
    ? 'javascript'
    : path.endsWith('.py')
      ? 'python'
      : path.endsWith('.go')
        ? 'go'
        : undefined;

/** Keywords after which a `/` starts a regular expression rather than a division. */
const REGEX_KEYWORD = /(?:^|[^\w$])(?:return|typeof|case|do|else|in|of|new|delete|void|throw|yield|await)$/;

const blank = (text: string): string => text.replace(/[^\n]/g, ' ');

/**
 * `raw` with comments replaced by spaces, and string, template and regular-expression contents too when `strings` is
 * `blank`. Quote characters stay, so `listen(":8080")` keeps its shape. Template substitutions (`${...}`) stay code.
 */
export const maskSource = (
  raw: string,
  language: MaskedLanguage,
  { strings }: { strings: 'keep' | 'blank' }
): string => {
  const out: string[] = [];
  const keepOrBlank = (text: string) => (strings === 'keep' ? text : blank(text));
  // Brace depths at which a template literal's `${` substitution returns to the template.
  const templates: number[] = [];
  let depth = 0;
  let index = 0;
  const lastCode = () => {
    for (let back = out.length - 1; back >= 0; back -= 1) {
      const trimmed = out[back]!.trimEnd();
      if (trimmed !== '')
        return out
          .slice(Math.max(0, back - 8), back + 1)
          .join('')
          .trimEnd();
    }
    return '';
  };

  /** Scans a quoted string from `index` (on the opening quote) and returns the index after it. */
  const quoted = (quote: string, escapes: boolean, multiline: boolean): number => {
    let end = index + quote.length;
    while (end < raw.length) {
      const character = raw[end]!;
      if (escapes && character === '\\') {
        end += 2;
        continue;
      }
      if (raw.startsWith(quote, end)) return end + quote.length;
      // An unterminated single-line string ends at its line; the next line is code again.
      if (character === '\n' && !multiline) return end;
      end += 1;
    }
    return raw.length;
  };

  /** Scans a template literal from `index` up to its end or its next `${`, and returns where scanning resumes. */
  const template = (start: number): number => {
    let end = start;
    while (end < raw.length) {
      const character = raw[end]!;
      if (character === '\\') {
        end += 2;
        continue;
      }
      if (character === '`') {
        out.push(keepOrBlank(raw.slice(start, end)), '`');
        return end + 1;
      }
      if (character === '$' && raw[end + 1] === '{') {
        out.push(keepOrBlank(raw.slice(start, end)), '${');
        templates.push(depth);
        depth += 1;
        return end + 2;
      }
      end += 1;
    }
    out.push(keepOrBlank(raw.slice(start)));
    return raw.length;
  };

  while (index < raw.length) {
    const character = raw[index]!;
    const next = raw[index + 1];

    if (language === 'python' && character === '#') {
      const end = raw.indexOf('\n', index);
      const stop = end === -1 ? raw.length : end;
      out.push(blank(raw.slice(index, stop)));
      index = stop;
      continue;
    }
    if (language !== 'python' && character === '/' && (next === '/' || next === '*')) {
      const end = next === '/' ? raw.indexOf('\n', index) : raw.indexOf('*/', index + 2);
      const stop = end === -1 ? raw.length : next === '/' ? end : end + 2;
      out.push(blank(raw.slice(index, stop)));
      index = stop;
      continue;
    }
    if (language === 'python' && (character === '"' || character === "'")) {
      const quote = raw.startsWith(character.repeat(3), index) ? character.repeat(3) : character;
      const end = quoted(quote, true, quote.length === 3);
      const closed = raw.startsWith(quote, end - quote.length) && end - quote.length > index;
      const inner = raw.slice(index + quote.length, closed ? end - quote.length : end);
      out.push(quote, keepOrBlank(inner), closed ? quote : '');
      index = end;
      continue;
    }
    if (language === 'go' && (character === '"' || character === "'" || character === '`')) {
      const end = quoted(character, character !== '`', character === '`');
      const closed = raw[end - 1] === character && end - 1 > index;
      // Escapes become two spaces, as the escape and its character were two.
      out.push(character, keepOrBlank(raw.slice(index + 1, closed ? end - 1 : end)), closed ? character : '');
      index = end;
      continue;
    }
    if (language === 'javascript') {
      if (character === '"' || character === "'") {
        const end = quoted(character, true, false);
        const closed = raw[end - 1] === character && end - 1 > index;
        out.push(character, keepOrBlank(raw.slice(index + 1, closed ? end - 1 : end)), closed ? character : '');
        index = end;
        continue;
      }
      if (character === '`') {
        out.push('`');
        index = template(index + 1);
        continue;
      }
      if (character === '{') depth += 1;
      if (character === '}') {
        depth -= 1;
        if (templates.at(-1) === depth) {
          templates.pop();
          out.push('}');
          index = template(index + 1);
          continue;
        }
      }
      if (character === '/' && (/(?:^|[(,=:[!&|?{};+\-*%<>~^])$/.test(lastCode()) || REGEX_KEYWORD.test(lastCode()))) {
        // A regular expression literal: up to its closing slash, outside a character class, on this line.
        let end = index + 1;
        let inClass = false;
        while (end < raw.length && raw[end] !== '\n') {
          const current = raw[end]!;
          if (current === '\\') {
            end += 2;
            continue;
          }
          if (current === '[') inClass = true;
          else if (current === ']') inClass = false;
          else if (current === '/' && !inClass) break;
          end += 1;
        }
        if (raw[end] === '/') {
          out.push('/', keepOrBlank(raw.slice(index + 1, end)), '/');
          index = end + 1;
          continue;
        }
      }
    }
    out.push(character);
    index += 1;
  }
  return out.join('');
};

/** `maskSource` for the file's language, or the file unchanged when its language is not understood here. */
export const maskFile = (path: string, raw: string, strings: 'keep' | 'blank'): string => {
  const language = maskedLanguageOf(path);
  return language === undefined ? raw : maskSource(raw, language, { strings });
};

/** Cite the original line of the first line of `masked` that matches `pattern`. */
export const citeFirstCodeMatch = (
  file: string,
  raw: string,
  masked: string,
  pattern: RegExp,
  field?: string
): Citation | undefined => {
  const matcher = new RegExp(pattern.source, pattern.flags.replaceAll('g', '').replaceAll('y', ''));
  const index = masked.split(/\r?\n/).findIndex((line) => matcher.test(line));
  return index === -1 ? undefined : citeLine(file, raw.split(/\r?\n/), index, field);
};
