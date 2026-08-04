import { describe, expect, test } from 'bun:test';
import {
  and,
  base64,
  condition,
  equals,
  findInMap,
  getAtt,
  getAzs,
  ifCondition,
  importValue,
  isIntrinsic,
  join,
  not,
  or,
  ref,
  select,
  split,
  sub
} from '../src/intrinsics.ts';

describe('CloudFormation intrinsic helpers', () => {
  test('produce the exact CloudFormation wire representation', () => {
    expect(ref('Bucket')).toEqual({ Ref: 'Bucket' });
    expect(condition('CreateBucket')).toEqual({ Condition: 'CreateBucket' });
    expect(base64('hello')).toEqual({ 'Fn::Base64': 'hello' });
    expect(findInMap('Regions', ref('AWS::Region'), 'AMI')).toEqual({
      'Fn::FindInMap': ['Regions', { Ref: 'AWS::Region' }, 'AMI']
    });
    expect(getAtt('Bucket', 'Arn')).toEqual({ 'Fn::GetAtt': ['Bucket', 'Arn'] });
    expect(getAzs()).toEqual({ 'Fn::GetAZs': '' });
    expect(importValue('SharedVpc')).toEqual({ 'Fn::ImportValue': 'SharedVpc' });
    expect(join(':', ['arn', ref('AWS::Partition')])).toEqual({
      'Fn::Join': [':', ['arn', { Ref: 'AWS::Partition' }]]
    });
    expect(select(0, split(',', 'a,b'))).toEqual({ 'Fn::Select': [0, { 'Fn::Split': [',', 'a,b'] }] });
    expect(sub('${Bucket}.s3.amazonaws.com')).toEqual({ 'Fn::Sub': '${Bucket}.s3.amazonaws.com' });
    expect(sub('${Name}-${Suffix}', { Name: ref('Name'), Suffix: 'logs' })).toEqual({
      'Fn::Sub': ['${Name}-${Suffix}', { Name: { Ref: 'Name' }, Suffix: 'logs' }]
    });
  });

  test('models condition functions as structural expressions', () => {
    const enabled = equals(ref('Environment'), 'production');
    expect(and([enabled, not(condition('Disabled'))])).toEqual({
      'Fn::And': [{ 'Fn::Equals': [{ Ref: 'Environment' }, 'production'] }, { 'Fn::Not': [{ Condition: 'Disabled' }] }]
    });
    expect(or([enabled, condition('Forced')])).toEqual({
      'Fn::Or': [{ 'Fn::Equals': [{ Ref: 'Environment' }, 'production'] }, { Condition: 'Forced' }]
    });
    expect(ifCondition('Enabled', 'yes', 'no')).toEqual({ 'Fn::If': ['Enabled', 'yes', 'no'] });
  });

  test('recognizes known and forward-compatible single-key intrinsic objects', () => {
    expect(isIntrinsic(ref('Bucket'))).toBe(true);
    expect(isIntrinsic({ 'Fn::GetAZs': '' })).toBe(true);
    expect(isIntrinsic({ 'Fn::Cidr': ['10.0.0.0/16', 4, 8] })).toBe(true);
    expect(isIntrinsic({ 'Fn::FutureFunction': { value: true } })).toBe(true);
    expect(isIntrinsic({ Ref: 'Bucket', extra: true })).toBe(false);
    expect(isIntrinsic({ NotAnIntrinsic: [] })).toBe(false);
    expect(isIntrinsic([])).toBe(false);
    expect(isIntrinsic(null)).toBe(false);
  });
});
