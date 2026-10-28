/**
 * The key a DynamoDB table's items are addressed by, read from the requests the code sends.
 *
 * A table created with the wrong key rejects every `GetItem`, `UpdateItem` and `Query` the application makes, so the
 * key names in `Key: { id }` (JavaScript and Go) or `Key={'id': ...}` (Python), and the attribute a
 * `KeyConditionExpression` compares with `=`, decide the table's primary key. Requests that disagree mean several
 * tables or a guess, and leave the default in place.
 *
 * An item the code writes does not say which of its attributes is the key (`{ id, expiresAt }` could be keyed by
 * either), so its attributes are only reported when no request names the key.
 */

import type { DependencyFact } from '../facts/dependency';

type ItemKey = NonNullable<DependencyFact['itemKey']>;

/** `Key: {`, Go's `Key: map[string]types.AttributeValue{` and Python's `Key={`. `ExclusiveStartKey` is not one. */
const KEY_OBJECT = /\bKey\s*(?::\s*(?:map\[string\][\w.]+\s*)?|=\s*)\{/g;
/** The item a `PutItem` writes, in the same three spellings. */
const ITEM_OBJECT = /\bItem\s*(?::\s*(?:map\[string\][\w.]+\s*)?|=\s*)\{/g;
const KEY_CONDITION = /\bKeyConditionExpression\s*[:=]\s*['"`]\s*(#?[\w]+)\s*=\s*:/g;
/** boto3's condition builder: `Key('id').eq(order_id)`. */
const BOTO3_KEY_CONDITION = /\bKey\(\s*['"](\w+)['"]\s*\)\s*\.eq\(/g;
const MAX_OBJECT_LENGTH = 400;

/** The property names at the top level of the object literal that opens at `start`. */
const topLevelNames = (text: string, start: number): string[] => {
  const names: string[] = [];
  let depth = 0;
  let expectingName = false;
  for (let index = start; index < Math.min(text.length, start + MAX_OBJECT_LENGTH); index += 1) {
    const character = text[index]!;
    if ('{[('.includes(character)) {
      depth += 1;
      if (depth === 1) expectingName = true;
      continue;
    }
    if ('}])'.includes(character)) {
      depth -= 1;
      if (depth === 0) return names;
      continue;
    }
    if (depth !== 1 || /\s/.test(character)) continue;
    if (character === ',') {
      expectingName = true;
      continue;
    }
    if (expectingName) {
      const name = /^(?:['"]([\w.-]+)['"]|([A-Za-z_$][\w$]*))/.exec(text.slice(index));
      if (name !== null) {
        names.push(name[1] ?? name[2]!);
        index += name[0].length - 1;
      }
      expectingName = false;
      continue;
    }
    // A string value can hold commas and braces of its own.
    if ('\'"`'.includes(character)) {
      const end = text.indexOf(character, index + 1);
      if (end === -1) return names;
      index = end;
    }
  }
  return [];
};

export type ItemKeyObservations = { keyObjects: string[][]; conditionKeys: string[]; itemAttributes: string[] };

export const emptyItemKeyObservations = (): ItemKeyObservations => ({
  keyObjects: [],
  conditionKeys: [],
  itemAttributes: []
});

/** Add what one source file says about item keys, when it talks to DynamoDB at all. */
export const observeItemKeys = (contents: string, observations: ItemKeyObservations): void => {
  if (!/dynamo/i.test(contents)) return;
  for (const match of contents.matchAll(KEY_OBJECT)) {
    const names = topLevelNames(contents, (match.index ?? 0) + match[0].length - 1);
    if (names.length === 1 || names.length === 2) observations.keyObjects.push(names);
  }
  for (const match of contents.matchAll(KEY_CONDITION)) {
    const attribute = match[1]!;
    if (!attribute.startsWith('#')) {
      observations.conditionKeys.push(attribute);
      continue;
    }
    // `#pk = :pk` with `ExpressionAttributeNames: { '#pk': 'id' }`.
    const alias = new RegExp(`['"]${attribute}['"]\\s*:\\s*['"](\\w+)['"]`).exec(contents)?.[1];
    if (alias !== undefined) observations.conditionKeys.push(alias);
  }
  for (const match of contents.matchAll(BOTO3_KEY_CONDITION)) observations.conditionKeys.push(match[1]!);
  for (const match of contents.matchAll(ITEM_OBJECT)) {
    for (const name of topLevelNames(contents, (match.index ?? 0) + match[0].length - 1)) {
      if (!observations.itemAttributes.includes(name)) observations.itemAttributes.push(name);
    }
  }
};

/** The one key every observed request agrees on, or undefined when they disagree or there are none. */
export const agreedItemKey = ({ keyObjects, conditionKeys }: ItemKeyObservations): ItemKey | undefined => {
  const signatures = new Set(keyObjects.map((names) => names.toSorted().join(',')));
  const partitions = new Set(conditionKeys);
  if (signatures.size > 1 || partitions.size > 1) return undefined;
  const [names] = keyObjects;
  const [conditionPartition] = partitions;
  if (names === undefined) return conditionPartition === undefined ? undefined : { partitionKey: conditionPartition };
  if (conditionPartition !== undefined && !names.includes(conditionPartition)) return undefined;
  // A query names the partition key; without one, the order the code writes them in.
  const partitionKey = conditionPartition ?? names[0]!;
  const sortKey = names.find((name) => name !== partitionKey);
  return sortKey === undefined ? { partitionKey } : { partitionKey, sortKey };
};
