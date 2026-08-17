import { describe, expect, it } from 'bun:test';
import { parseCloudFormationYaml } from './cloudformation-yaml';

describe('parseCloudFormationYaml', () => {
  it('keeps short intrinsic targets as inert data', () => {
    expect(
      parseCloudFormationYaml(
        ['queue: !GetAtt Jobs.Arn', 'table: !Ref Orders', 'name: !Sub ${Stage}-orders'].join('\n')
      )
    ).toEqual({ queue: 'Jobs.Arn', table: 'Orders', name: '${Stage}-orders' });
  });

  it('handles nested flow tags without changing quoted text', () => {
    expect(
      parseCloudFormationYaml(
        [
          'Value: !If [UsePrimary, !Ref PrimaryQueue, !GetAtt BackupQueue.Arn]',
          'Message: "the text !Ref stays text"',
          '# !Ref in a comment is untouched',
          ''
        ].join('\n')
      )
    ).toEqual({
      Value: ['UsePrimary', 'PrimaryQueue', 'BackupQueue.Arn'],
      Message: 'the text !Ref stays text'
    });
  });
});
