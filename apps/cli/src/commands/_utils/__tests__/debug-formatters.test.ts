import { expect, test } from 'bun:test';
import { renderSparkline } from '../debug-formatters';

test('sparkline scales signed, constant and sampled values to terminal cells', () => {
  for (const [values, width, expected] of [
    [[], 60, ''],
    [[5], 60, '▁'],
    [[10, 10, 10], 60, '▁▁▁'],
    [[-100, -50, 0, 50, 100], 60, '▁▃▅▆█'],
    [[0.1, 0.5, 0.9], 60, '▁▅█'],
    [[100, 75, 50, 25, 0], 60, '█▆▅▃▁'],
    [[0, 0, 100, 100], 2, '▁█']
  ] as Array<[number[], number, string]>)
    expect(renderSparkline(values, width)).toBe(expected);
});
