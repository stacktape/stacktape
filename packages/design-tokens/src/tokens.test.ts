import assert from 'node:assert/strict';
import { test } from 'node:test';

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
      '--stp-control-height-medium',
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
