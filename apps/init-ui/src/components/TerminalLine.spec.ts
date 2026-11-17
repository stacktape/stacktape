import { describe, expect, it } from 'bun:test';
import { commandGroups } from './TerminalLine';

describe('where a command may wrap', () => {
  it('keeps each flag with its value, and a lone flag on its own', () => {
    expect(commandGroups('stacktape deploy --config stacktape.yml --stage dev --region eu-west-1')).toEqual([
      ['stacktape'],
      ['deploy'],
      ['--config', 'stacktape.yml'],
      ['--stage', 'dev'],
      ['--region', 'eu-west-1']
    ]);
    expect(commandGroups('stacktape secret set auth_secret --region eu-west-1')).toEqual([
      ['stacktape'],
      ['secret'],
      ['set'],
      ['auth_secret'],
      ['--region', 'eu-west-1']
    ]);
    expect(commandGroups('stacktape delete --force --stage dev')).toEqual([
      ['stacktape'],
      ['delete'],
      ['--force'],
      ['--stage', 'dev']
    ]);
  });
});
