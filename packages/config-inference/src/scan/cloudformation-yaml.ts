/** Parse CloudFormation-flavoured YAML without executing or resolving intrinsics. */

import yaml from 'yaml';

const SHORT_INTRINSICS = new Set([
  'Ref',
  'GetAtt',
  'Sub',
  'Join',
  'FindInMap',
  'GetAZs',
  'ImportValue',
  'Select',
  'Split',
  'Base64',
  'Cidr',
  'Transform',
  'And',
  'Equals',
  'If',
  'Not',
  'Or',
  'Condition'
]);

/** Remove intrinsic tag markers outside YAML strings/comments, including tags nested in flow lists. */
const stripShortIntrinsicTags = (contents: string): string => {
  let result = '';
  let singleQuoted = false;
  let doubleQuoted = false;
  let comment = false;
  let escaped = false;

  for (let index = 0; index < contents.length; index += 1) {
    const character = contents[index]!;
    if (character === '\n') comment = false;
    if (comment) {
      result += character;
      continue;
    }
    if (doubleQuoted) {
      result += character;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') doubleQuoted = false;
      continue;
    }
    if (singleQuoted) {
      result += character;
      if (character === "'" && contents[index + 1] === "'") {
        result += contents[index + 1];
        index += 1;
      } else if (character === "'") singleQuoted = false;
      continue;
    }
    if (character === '#') {
      comment = true;
      result += character;
      continue;
    }
    if (character === '"') {
      doubleQuoted = true;
      result += character;
      continue;
    }
    if (character === "'") {
      singleQuoted = true;
      result += character;
      continue;
    }
    if (character === '!') {
      const tag = /^[A-Za-z]+/.exec(contents.slice(index + 1))?.[0];
      if (tag !== undefined && SHORT_INTRINSICS.has(tag)) {
        index += tag.length;
        continue;
      }
    }
    result += character;
  }
  return result;
};

/**
 * YAML 1.2 does not know CloudFormation's `!Ref`/`!GetAtt` shorthand. The parser otherwise falls
 * back to strings but prints a warning for every tag — noisy in the wizard and test output. Removing
 * only the tag marker preserves the literal scalar/sequence we need for reference matching. No
 * intrinsic is evaluated and no external state is consulted.
 */
export const parseCloudFormationYaml = (contents: string): unknown => {
  // `parse()` writes every unknown-tag warning to stderr. Even after stripping the ordinary forms,
  // a future intrinsic or unusual quoting style should degrade to inert data without dumping a
  // parser stack trace into the init wizard. `parseDocument()` returns the same warnings as data.
  const document = yaml.parseDocument(stripShortIntrinsicTags(contents));
  if (document.errors.length > 0) throw document.errors[0];
  return document.toJSON() as unknown;
};
