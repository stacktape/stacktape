import { afterAll, expect, test } from 'bun:test';
import { formatIsoLocalTime, formatTimeWithZone } from './formatting';

// "since 6:14:43 PM" and "10/24/2026, 6:12:58 PM" named no zone, so an agent or a colleague elsewhere read another time.
const originalTimeZone = process.env.TZ;
afterAll(() => {
  if (originalTimeZone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimeZone;
});

test.each([
  ['Europe/Bratislava', '2026-10-24T16:12:58.042Z', '2026-10-24T18:12:58.042+02:00', '18:12:58 UTC+02:00'],
  ['America/St_Johns', '2026-10-24T16:12:58.042Z', '2026-10-24T13:42:58.042-02:30', '13:42:58 UTC-02:30'],
  ['UTC', '2026-10-24T16:12:58.042Z', '2026-10-24T16:12:58.042+00:00', '16:12:58 UTC']
])('in %s, %s is %s', (timeZone, instant, iso, short) => {
  process.env.TZ = timeZone;
  const date = new Date(instant);
  expect(formatIsoLocalTime(date)).toBe(iso);
  expect(new Date(formatIsoLocalTime(date)).getTime()).toBe(date.getTime());
  expect(formatTimeWithZone(date, new Date('2026-10-24T20:00:00Z'))).toBe(short);
});

test('a time of another day carries its date', () => {
  process.env.TZ = 'Europe/Bratislava';
  expect(formatTimeWithZone(new Date('2026-10-23T16:12:58Z'), new Date('2026-10-24T08:00:00Z'))).toBe(
    '2026-10-23 18:12:58 UTC+02:00'
  );
});
