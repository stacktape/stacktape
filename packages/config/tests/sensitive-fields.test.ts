import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sensitiveFields from '@stacktape/config/sensitive-fields.json';
import configSchema from '../generated/config-schema.json';

/**
 * `@sensitive` marks a config field whose value is a credential. The Console hides those values from members who may not
 * view secrets, using `generated/sensitive-fields.json`, so a mark that does not reach the schema, or a new credential
 * field without one, would show a password to a Viewer.
 */

type SchemaNode = { [key: string]: unknown };
const isNode = (value: unknown): value is SchemaNode => Boolean(value) && typeof value === 'object';
const definitions = (configSchema as unknown as { definitions: Record<string, SchemaNode> }).definitions;
const SOURCE = join(import.meta.dir, '..', 'src');

/** Each `@sensitive` tag in the source: the interface it is in and the property it marks. */
const taggedProperties = () =>
  readdirSync(SOURCE)
    .filter((file) => file.endsWith('.ts'))
    .flatMap((file) => {
      const lines = readFileSync(join(SOURCE, file), 'utf8').split('\n');
      let owner = '';
      return lines.flatMap((line, index) => {
        owner = line.match(/^export interface (\w+)/)?.[1] ?? owner;
        if (!/^\s*\* @sensitive\s*$/.test(line)) return [];
        const declaration = lines.slice(index + 1).find((next) => !/^\s*\*/.test(next));
        const property = declaration?.match(/^\s*(\w+)\??:/)?.[1] ?? `(no property after line ${index + 1})`;
        return [{ file, owner, property }];
      });
    });

/** Every closed object type's property whose name says it may hold a credential, and whether it is marked. */
const credentialLikeProperties = () => {
  const found = new Map<string, boolean>();
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!isNode(node)) return;
    if (isNode(node.properties) && node.additionalProperties === false) {
      for (const [name, property] of Object.entries(node.properties)) {
        if (!/passw|secret|token|apikey|privatekey|accesskey|webhook|credential/i.test(name.replaceAll('_', '')))
          continue;
        found.set(name, (found.get(name) ?? false) || (isNode(property) && property.sensitive === true));
      }
    }
    for (const [key, value] of Object.entries(node)) if (key !== 'description') visit(value);
  };
  visit(configSchema);
  return found;
};

/** Names that sound like credentials but hold none: lifetimes, switches, rules, hook names and references. */
const REVIEWED_NOT_CREDENTIALS = new Set([
  'accessTokenValiditySeconds',
  'adminUserCredentials',
  'allowCredentials',
  'authenticationSecretArn',
  'credentials',
  'generateClientSecret',
  'idTokenValiditySeconds',
  'passwordPolicy',
  'preTokenGeneration',
  'refreshTokenValidityDays',
  'repositoryCredentialsSecretArn',
  'secrets',
  'temporaryPasswordValidityDays',
  'tokenDomains'
]);

describe('credential fields of the config', () => {
  test('every @sensitive tag reaches its property in the schema', () => {
    const tagged = taggedProperties();
    expect(tagged.length).toBeGreaterThan(10);
    for (const { file, owner, property } of tagged) {
      const definition = definitions[owner];
      expect({ file, owner, property, inSchema: Boolean(definition) }).toEqual({
        file,
        owner,
        property,
        inSchema: true
      });
      const schemaProperty = (definition!.properties as Record<string, SchemaNode>)[property];
      expect({ owner, property, sensitive: schemaProperty?.sensitive }).toEqual({ owner, property, sensitive: true });
    }
  });

  test('the generated list names every marked field', () => {
    const marked = new Set(taggedProperties().map(({ property }) => property));
    expect(new Set(sensitiveFields.map(({ field }) => field))).toEqual(marked);
  });

  test('a property whose name says it holds a credential is marked, or reviewed as holding none', () => {
    const unclassified = [...credentialLikeProperties()]
      .filter(([name, isMarked]) => !isMarked && !REVIEWED_NOT_CREDENTIALS.has(name))
      .map(([name]) => name);
    expect(unclassified).toEqual([]);
  });
});
