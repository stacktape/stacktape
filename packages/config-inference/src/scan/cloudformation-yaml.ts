/** Parse CloudFormation-flavoured YAML without executing or resolving intrinsics. */

import yaml from 'yaml';
import { Pair, Scalar, YAMLMap, YAMLSeq } from 'yaml/types';

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

/** `!Ref X` is `{ Ref: X }`, `!Condition X` is `{ Condition: X }`, and every other short form is `{ 'Fn::Name': ... }`. */
const longFormKey = (tag: string): string => (tag === 'Ref' || tag === 'Condition' ? tag : `Fn::${tag}`);

/** Replace each node tagged with a short intrinsic by the long-form map CloudFormation reads it as. */
const expandShortIntrinsics = (node: unknown): unknown => {
  if (node instanceof Pair) {
    node.value = expandShortIntrinsics(node.value);
    return node;
  }
  if (node instanceof YAMLMap || node instanceof YAMLSeq) {
    node.items = node.items.map((item: unknown) => expandShortIntrinsics(item));
  }
  if (typeof node !== 'object' || node === null) return node;
  const tag = (node as { tag?: unknown }).tag;
  if (typeof tag !== 'string' || !tag.startsWith('!')) return node;
  const name = tag.slice(1);
  delete (node as { tag?: string }).tag;
  if (!SHORT_INTRINSICS.has(name)) return node;
  const map = new YAMLMap();
  map.items.push(new Pair(new Scalar(longFormKey(name)), node));
  return map;
};

/**
 * YAML 1.2 does not know CloudFormation's `!Ref`/`!GetAtt` shorthand. Each tagged value becomes the long form
 * CloudFormation itself reads it as, so `!Ref Prefix` stays distinguishable from the literal string `Prefix` and
 * `!ImportValue Shared` from `Shared`. No intrinsic is evaluated and no external state is consulted. An unknown tag
 * degrades to its plain value.
 */
export const parseCloudFormationYaml = (contents: string): unknown => {
  // `parse()` writes every unknown-tag warning to stderr; `parseDocument()` returns them as data.
  const document = yaml.parseDocument(contents);
  if (document.errors.length > 0) throw document.errors[0];
  document.contents = expandShortIntrinsics(document.contents) as typeof document.contents;
  return document.toJSON() as unknown;
};
