import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { feeBandFor, flexibleFeeUsd } from './billing.js';

describe('Flexible fee bands', () => {
  test('one rate, chosen by the whole month, with each upper bound inside its band', () => {
    const cases = [
      [0, 25],
      [1_000, 25],
      [2_000, 25],
      [2_000.01, 23],
      [5_000, 23],
      [5_000.01, 21],
      [10_000, 21],
      [10_000.01, 20],
      [25_000, 20],
      [25_000.01, 19],
      [1_000_000, 19]
    ] as const;
    for (const [spend, percentage] of cases) assert.equal(feeBandFor(spend).percentage, percentage, `$${spend}`);
  });

  test('the rate applies to the whole spend, as the plans page examples say', () => {
    assert.equal(flexibleFeeUsd(1_000), 250);
    assert.equal(flexibleFeeUsd(3_000), 690);
    assert.equal(flexibleFeeUsd(8_000), 1_680);
    assert.equal(flexibleFeeUsd(15_000), 3_000);
    assert.equal(flexibleFeeUsd(40_000), 7_600);
    assert.equal(flexibleFeeUsd(212.34), 53.09);
  });
});
