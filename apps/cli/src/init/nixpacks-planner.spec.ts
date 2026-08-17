/**
 * The oracle's parsing: whatever `nixpacks plan` prints, the scan gets a command or nothing.
 *
 * The binary itself is deliberately not executed here — its presence varies by checkout, and the
 * planner's contract is that every failure shape is an absent answer, never a failed scan.
 */

import { describe, expect, it } from 'bun:test';
import { parsePlannedStartCommand } from './nixpacks-planner';

describe('parsePlannedStartCommand', () => {
  it('extracts the planned start command', () => {
    const plan = JSON.stringify({
      providers: ['python'],
      phases: { setup: {}, install: { cmds: ['pip install -r requirements.txt'] } },
      start: { cmd: 'python manage.py runserver 0.0.0.0:8000' }
    });

    expect(parsePlannedStartCommand(plan)).toBe('python manage.py runserver 0.0.0.0:8000');
  });

  it('returns nothing for every malformed shape', () => {
    expect(parsePlannedStartCommand('not json at all')).toBeNull();
    expect(parsePlannedStartCommand('null')).toBeNull();
    expect(parsePlannedStartCommand(JSON.stringify({ start: {} }))).toBeNull();
    expect(parsePlannedStartCommand(JSON.stringify({ start: { cmd: 42 } }))).toBeNull();
    expect(parsePlannedStartCommand(JSON.stringify({ start: { cmd: '   ' } }))).toBeNull();
  });

  it('refuses a command longer than a person would review', () => {
    expect(parsePlannedStartCommand(JSON.stringify({ start: { cmd: 'x '.repeat(200) } }))).toBeNull();
  });
});
