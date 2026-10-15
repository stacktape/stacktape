import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

import { designTokens, flattenTokens, tokenVar } from './tokens.ts';

test('every token has a CSS custom property named after its path', () => {
  assert.deepEqual(
    flattenTokens(designTokens).map(({ name }) => name),
    [
      '--stp-color-brand',
      '--stp-surface-page',
      '--stp-surface-element',
      '--stp-surface-modal',
      '--stp-surface-input',
      '--stp-text-primary',
      '--stp-text-secondary',
      '--stp-text-headline',
      '--stp-text-muted',
      '--stp-text-subtle',
      '--stp-text-faint',
      '--stp-border-strong',
      '--stp-border-subtle',
      '--stp-interactive-primary',
      '--stp-interactive-primary-light',
      '--stp-interactive-accent',
      '--stp-field-focus-border',
      '--stp-field-focus-ring',
      '--stp-status-error',
      '--stp-status-success',
      '--stp-aws-category-compute',
      '--stp-aws-category-database',
      '--stp-aws-category-integration',
      '--stp-aws-category-security',
      '--stp-aws-category-storage',
      '--stp-aws-category-network',
      '--stp-radius-small',
      '--stp-radius-medium',
      '--stp-radius-large',
      '--stp-focus-outline-width',
      '--stp-focus-outline-offset',
      '--stp-motion-duration-fast',
      '--stp-motion-duration-base',
      '--stp-motion-easing'
    ]
  );
});

test('tokenVar references exactly the variables the literal tree declares', () => {
  const expected = new Map(flattenTokens(designTokens).map(({ name }) => [name, `var(${name})`]));

  assert.deepEqual(
    new Map(flattenTokens(tokenVar).map(({ name, value }) => [name, value])),
    expected,
    'tokenVar drifted from designTokens: add, remove or rename the matching entry in both trees.'
  );
});

test('literal tokens contain direct CSS values rather than token references', () => {
  for (const { name, value } of flattenTokens(designTokens)) {
    assert.ok(!value.includes('var('), `${name} must hold a literal value so JS-side consumers can read it.`);
  }
});

test('shipped CSS declares each typed token value and resolves every typed reference', async () => {
  const css = await readFile(new URL('../generated/tokens.css', import.meta.url), 'utf8');
  const declarations = [...css.matchAll(/(--stp-[a-z-]+):\s*([^;]+);/g)];
  const actual = new Map(declarations.map((match) => [match[1], match[2]]));
  assert.equal(actual.size, declarations.length, 'CSS must not redeclare a token');
  const expected = new Map<string, string>();
  const visit = (literals: Record<string, unknown>, references: Record<string, unknown>, path: string[]) => {
    assert.deepEqual(
      Object.keys(references),
      Object.keys(literals),
      'Typed reference and value trees must have identical paths'
    );
    for (const [key, value] of Object.entries(literals)) {
      const reference = references[key];
      const nextPath = [...path, key];
      if (typeof value === 'string') {
        const name =
          '--stp-' + nextPath.map((part) => part.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase())).join('-');
        expected.set(name, value);
        assert.equal(
          reference,
          `var(${name})`,
          `Reference at ${nextPath.join('.')} must resolve to its CSS declaration`
        );
        assert.equal(actual.get(name), value, `${name} must ship the same value JS consumers receive`);
      } else {
        assert(value && typeof value === 'object' && reference && typeof reference === 'object');
        visit(value as Record<string, unknown>, reference as Record<string, unknown>, nextPath);
      }
    }
  };
  visit(designTokens, tokenVar, []);
  assert.deepEqual(actual, expected, 'CSS must contain exactly the typed token inventory');
});
