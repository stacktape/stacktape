import { expect, test } from 'bun:test';
import { calibrateClock, passesServingGate, percentile } from './analyze';
test('the serving gate keeps tails, failures in sample count, and both matched-image ratios', () => {
  expect(
    percentile(
      Array.from({ length: 20 }, (_, i) => i + 1),
      0.95
    )
  ).toBe(19);
  const swap = { n: 20, p50: 5, p95: 15, max: 25 },
    image = { n: 20, p50: 10, p95: 30 };
  expect(passesServingGate(swap, image)).toBe(true);
  for (const candidate of [
    { ...swap, n: 19 },
    { ...swap, p50: 5.01 },
    { ...swap, p95: 15.01 },
    { ...swap, max: 25.01 }
  ])
    expect(passesServingGate(candidate, image)).toBe(false);
  expect(passesServingGate(swap, { ...image, p50: 9.9 })).toBe(false);
  expect(passesServingGate(swap, { ...image, p95: 29.9 })).toBe(false);
});
test('clock calibration measures the rate instead of assuming the historical 9.6 percent correction', () => {
  const polls = Array.from({ length: 200 }, (_, i) => ({
    hostMs: 1000 + i * 500 * 1.096 + 20,
    awsMs: 1792300000000 + i * 500,
    rttMs: 40,
    status: 200
  }));
  expect(calibrateClock(polls).rate).toBeCloseTo(1.096, 6);
  expect(() => calibrateClock(polls.slice(0, 5))).toThrow('Insufficient');
});

test('per-edit fits handle gradual clock-rate changes that invalidate one long-run fit', () => {
  const windows = Array.from({ length: 10 }, (_, window) =>
    Array.from({ length: 200 }, (_, i) => {
      const seconds = window * 250000 + i * 40;
      return {
        hostMs: 1000 + 1.09 * seconds + (0.005 * seconds * seconds) / 2000000 + 20,
        awsMs: 1792300000000 + seconds,
        rttMs: 40,
        status: 200
      };
    })
  );
  expect(() => calibrateClock(windows.flat())).toThrow('Clock discontinuity');
  for (const window of windows) {
    const fit = calibrateClock(window, 3000);
    const middle = (window[0]!.awsMs + window.at(-1)!.awsMs) / 2 - 1792300000000;
    expect(fit.rate).toBeCloseTo(1.09 + (0.01 * middle) / 2000000, 5);
    expect(fit.maxResidualMs).toBeLessThan(1);
  }
});
