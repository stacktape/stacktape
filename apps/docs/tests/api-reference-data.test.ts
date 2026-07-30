import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CLI_API_REFERENCE_DATA } from '../src/build/cli-generated-inputs.ts';
import { sanitizeHtml, stripHtml } from '../src/utils/api-reference-text.ts';
import type { ApiReferenceData } from '../src/utils/api-reference-dto.ts';

/**
 * The API reference is data, not an algorithm this application owns. These tests pin the two things
 * that can silently break: the shape the DTOs promise, and the text flattening the reader sees.
 */

const readArtifact = (): ApiReferenceData => {
  assert.ok(
    existsSync(CLI_API_REFERENCE_DATA),
    `${CLI_API_REFERENCE_DATA} is missing; run \`pnpm exec turbo run generate:llm-docs --filter @stacktape/cli\``
  );
  return JSON.parse(readFileSync(CLI_API_REFERENCE_DATA, 'utf8')) as ApiReferenceData;
};

test('the generated artifact matches the DTOs the renderer relies on', () => {
  const data = readArtifact();
  const names = Object.keys(data);
  assert.ok(names.length > 100, 'the reference should cover the configuration model');

  for (const name of names) {
    const definition = data[name];
    assert.equal(definition.definitionName, name, `${name}: key and definitionName must agree`);
    assert.ok(Array.isArray(definition.properties), `${name}: properties must be an array`);
    assert.equal(
      definition.stats.requiredCount + definition.stats.optionalCount,
      definition.properties.length,
      `${name}: stats must account for every property`
    );
    assert.equal(typeof definition.typeDeclaration, 'string', `${name}: needs a rendered type declaration`);
  }
});

test('flattening description HTML decodes entities and drops the internal required marker', () => {
  // Verbatim shape of a real generated description (`ApplicationLoadBalancerListener.defaultAction`).
  const generated = '<p> Action for requests that don&#39;t match any integration. Supports <code>redirect</code>.</p>';

  assert.equal(stripHtml(generated), "Action for requests that don't match any integration. Supports redirect.");
  assert.equal(stripHtml('<p>a &amp; b &lt;c&gt; &quot;d&quot;</p>'), 'a & b <c> "d"');
  assert.equal(stripHtml('--stp-required--<p>Required.</p>'), 'Required.');
  assert.equal(stripHtml(), '');

  // The HTML path leaves entities alone — the browser decodes them when it parses the markup.
  assert.equal(sanitizeHtml(generated), generated);
  assert.equal(sanitizeHtml('--stp-required--<p>Required.</p>'), '<p>Required.</p>');
});

test('no generated description reaches a reader as a raw entity', () => {
  const data = readArtifact();
  const entity = /&(?:quot|apos|amp|lt|gt|#\d+|#x[0-9a-f]+);/i;

  const offenders: string[] = [];
  for (const [name, definition] of Object.entries(data)) {
    for (const property of definition.properties) {
      for (const text of [stripHtml(property.shortDescription), stripHtml(property.longDescription)]) {
        if (entity.test(text)) offenders.push(`${name}.${property.name}`);
      }
    }
  }

  assert.deepEqual(offenders.slice(0, 10), [], 'flattened descriptions must never show a raw HTML entity');
});
