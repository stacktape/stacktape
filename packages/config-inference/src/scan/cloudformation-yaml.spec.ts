import { describe, expect, it } from 'bun:test';
import { parseCloudFormationYaml } from './cloudformation-yaml';

describe('parseCloudFormationYaml', () => {
  it('reads short intrinsics as their long form, apart from literal strings', () => {
    expect(
      parseCloudFormationYaml(
        [
          'queue: !GetAtt Jobs.Arn',
          'table: !Ref Orders',
          'name: !Sub ${Stage}-orders',
          'prefix: !ImportValue SharedPrefix',
          'literal: Orders'
        ].join('\n')
      )
    ).toEqual({
      queue: { 'Fn::GetAtt': 'Jobs.Arn' },
      table: { Ref: 'Orders' },
      name: { 'Fn::Sub': '${Stage}-orders' },
      prefix: { 'Fn::ImportValue': 'SharedPrefix' },
      literal: 'Orders'
    });
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
      Value: { 'Fn::If': ['UsePrimary', { Ref: 'PrimaryQueue' }, { 'Fn::GetAtt': 'BackupQueue.Arn' }] },
      Message: 'the text !Ref stays text'
    });
  });

  it('does not print parser warnings for unsupported CloudFormation tags', () => {
    const originalWarn = console.warn;
    const warnings: unknown[] = [];
    console.warn = (...values: unknown[]) => warnings.push(...values);
    try {
      expect(parseCloudFormationYaml('Value: !FutureIntrinsic something\n')).toEqual({ Value: 'something' });
    } finally {
      console.warn = originalWarn;
    }
    expect(warnings).toEqual([]);
  });
});
