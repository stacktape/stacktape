import { describe, expect, it } from 'bun:test';
import {
  ABSENT,
  conditionHolds,
  declaredNumber,
  declaredSwitch,
  resolveDeclaredValue,
  selectBranch,
  UNRESOLVED,
  type TemplateScope
} from './declared-function';

const scope: TemplateScope = {
  parameters: {
    Prefix: { Type: 'String', Default: 'incoming/' },
    Enabled: { Type: 'String', Default: 'true' },
    Timeout: { Type: 'Number', Default: 240 },
    Stage: { Type: 'String' },
    Public: { Type: 'String', Default: 'yes' }
  },
  logicalIds: new Set(['Uploads']),
  conditions: {
    IsPublic: { 'Fn::Equals': [{ Ref: 'Public' }, 'yes'] },
    IsProd: { 'Fn::Equals': [{ Ref: 'Stage' }, 'prod'] },
    Never: { 'Fn::Equals': ['no', 'yes'] },
    NotPublic: { 'Fn::Not': [{ Condition: 'IsPublic' }] },
    PublicOrProd: { 'Fn::Or': [{ Condition: 'IsPublic' }, { Condition: 'IsProd' }] },
    NeverAndProd: { 'Fn::And': [{ Condition: 'Never' }, { Condition: 'IsProd' }] },
    InRegion: { 'Fn::Equals': [{ Ref: 'AWS::Region' }, 'eu-west-1'] }
  },
  self: { custom: { jobTimeout: 300, computed: '${env:TIMEOUT}' } }
};

describe('resolveDeclaredValue', () => {
  it.each([
    ['a plain string, even one named like a parameter', 'Prefix', 'Prefix'],
    ['a parameter reference', { Ref: 'Prefix' }, 'incoming/'],
    ['a numeric parameter', { Ref: 'Timeout' }, 240],
    ['a parameter without a default', { Ref: 'Stage' }, UNRESOLVED],
    ['a resource reference', { Ref: 'Uploads' }, UNRESOLVED],
    ['a pseudo parameter', { Ref: 'AWS::Region' }, UNRESOLVED],
    ['an import', { 'Fn::ImportValue': 'SharedPrefix' }, UNRESOLVED],
    ['a Sub without substitutions', { 'Fn::Sub': 'incoming/' }, 'incoming/'],
    ['a Sub of a parameter', { 'Fn::Sub': '${Prefix}raw/' }, 'incoming/raw/'],
    ['a Sub of a resource', { 'Fn::Sub': '${Uploads}/raw' }, UNRESOLVED],
    ['the true side of a condition', { 'Fn::If': ['IsPublic', 'open', 'closed'] }, 'open'],
    ['the false side of a condition', { 'Fn::If': ['Never', 'open', 'closed'] }, 'closed'],
    ['a condition init cannot evaluate', { 'Fn::If': ['IsProd', 'open', 'closed'] }, UNRESOLVED],
    ['a Serverless self reference to a literal', '${self:custom.jobTimeout}', 300],
    ['a Serverless self reference to another variable', '${self:custom.computed}', UNRESOLVED],
    ['a Serverless variable from elsewhere', '${env:TIMEOUT}', UNRESOLVED],
    ['AWS::NoValue', { Ref: 'AWS::NoValue' }, ABSENT]
  ])('%s', (_label, value, expected) => {
    expect(resolveDeclaredValue(value, scope)).toEqual(expected);
  });

  it('drops absent members and refuses a structure with an unresolved member', () => {
    expect(resolveDeclaredValue({ a: { Ref: 'Prefix' }, b: { Ref: 'AWS::NoValue' } }, scope)).toEqual({
      a: 'incoming/'
    });
    expect(resolveDeclaredValue([{ Ref: 'Prefix' }, { Ref: 'Uploads' }], scope)).toBe(UNRESOLVED);
  });

  it('prefers the values a parent template passes over defaults', () => {
    expect(resolveDeclaredValue({ Ref: 'Public' }, { ...scope, parameterValues: { Public: 'no' } })).toBe('no');
    expect(conditionHolds('IsPublic', { ...scope, parameterValues: { Public: 'no' } })).toBe(false);
    expect(conditionHolds('IsPublic', { ...scope, parameterValues: { Public: UNRESOLVED } })).toBeUndefined();
  });
});

describe('conditionHolds', () => {
  it.each([
    ['IsPublic', true],
    ['Never', false],
    ['IsProd', undefined],
    ['NotPublic', false],
    ['PublicOrProd', true],
    ['NeverAndProd', false],
    ['InRegion', undefined],
    ['Missing', undefined]
  ] as const)('%s is %p', (name, expected) => {
    expect(conditionHolds(name, scope)).toBe(expected);
  });
});

describe('switches, numbers and branches', () => {
  it('reads switches without inverting the unknown ones', () => {
    expect(declaredSwitch({ Ref: 'Enabled' }, scope)).toBe(true);
    expect(declaredSwitch(false, scope)).toBe(false);
    expect(declaredSwitch('${self:custom.unset}', scope)).toBe(UNRESOLVED);
    expect(declaredSwitch(undefined, scope)).toBeUndefined();
  });

  it('reads whole numbers', () => {
    expect(declaredNumber({ Ref: 'Timeout' }, scope)).toBe(240);
    expect(declaredNumber('30', scope)).toBe(30);
    expect(declaredNumber('${self:custom.jobTimeout}', scope)).toBe(300);
    expect(declaredNumber({ Ref: 'Stage' }, scope)).toBe(UNRESOLVED);
  });

  it('selects the side of a conditional declaration', () => {
    expect(selectBranch({ 'Fn::If': ['Never', { Type: 'Schedule' }, { Ref: 'AWS::NoValue' }] }, scope)).toBe(ABSENT);
    expect(selectBranch({ 'Fn::If': ['IsProd', { Type: 'Schedule' }, { Ref: 'AWS::NoValue' }] }, scope)).toBe(
      UNRESOLVED
    );
    expect(selectBranch({ Ref: 'Uploads' }, scope)).toEqual({ Ref: 'Uploads' });
  });
});
