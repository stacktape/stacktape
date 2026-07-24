import assert from 'node:assert/strict';
import test from 'node:test';
import { pascalCase as referencePascalCase, snakeCase as referenceSnakeCase } from 'change-case';
import { pascalCase, snakeCase } from '@stacktape/naming/case';

const fixedCorpus = [
  '',
  'orders.api_v2',
  'XMLHttpRequest',
  'version 42 endpoint',
  'Žluťoučký-kůň',
  '東京-api',
  'emoji-🚀-service',
  '__leading_and_trailing__',
  '99-bottles',
  'a1B2C3',
  'multiple...separators///together',
  'İstanbul',
  'straße'
];

const randomCorpus = (): readonly string[] => {
  const alphabet = Array.from(
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._:/ !@#$%^&*()[]{}Žůň東京🚀'
  );
  let state = 0x17ae_f681;
  const next = (): number => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state;
  };
  return Array.from({ length: 1_000 }, () => {
    const length = next() % 48;
    return Array.from({ length }, () => alphabet[next() % alphabet.length]).join('');
  });
};

test('matches exact change-case 5.4.4 behavior', () => {
  for (const input of [...fixedCorpus, ...randomCorpus()]) {
    assert.equal(pascalCase(input), referencePascalCase(input), `pascalCase(${JSON.stringify(input)})`);
    assert.equal(snakeCase(input), referenceSnakeCase(input), `snakeCase(${JSON.stringify(input)})`);
  }
});
