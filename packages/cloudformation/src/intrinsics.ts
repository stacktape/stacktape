/** A value that CloudFormation may resolve while processing a template. */
export type CloudFormationValue<T> = T | Intrinsic;

/** A list that CloudFormation may resolve as a whole or one item at a time. */
export type CloudFormationList<T> = Array<CloudFormationValue<T>> | Intrinsic;

export type CloudFormationTag = {
  Key: CloudFormationValue<string>;
  Value: CloudFormationValue<string>;
};

/**
 * An opaque value accepted by resource-schema properties declared as JSON.
 *
 * `object` intentionally accepts named interfaces without requiring an index signature. Individual provider schemas
 * do not describe the shape of JSON fields, so pretending to validate their keys here would reject valid policy,
 * event-pattern and state-machine interfaces while adding no real safety.
 */
export type CloudFormationJson = string | number | boolean | null | object;

export type RefIntrinsic = { Ref: string };
export type ConditionIntrinsic = { Condition: string };
export type Base64Intrinsic = { 'Fn::Base64': CloudFormationValue<string> };
export type FindInMapIntrinsic = {
  'Fn::FindInMap': [CloudFormationValue<string>, CloudFormationValue<string>, CloudFormationValue<string>];
};
export type GetAttIntrinsic = {
  'Fn::GetAtt': [CloudFormationValue<string>, CloudFormationValue<string>];
};
export type GetAzsIntrinsic = { 'Fn::GetAZs': CloudFormationValue<string> };
export type ImportValueIntrinsic = { 'Fn::ImportValue': CloudFormationValue<string> };
export type JoinIntrinsic = {
  'Fn::Join': [CloudFormationValue<string>, CloudFormationList<string | number>];
};
export type SelectIntrinsic = {
  'Fn::Select': [CloudFormationValue<number | string>, readonly unknown[] | Intrinsic];
};
export type SplitIntrinsic = {
  'Fn::Split': [CloudFormationValue<string>, CloudFormationValue<string>];
};
export type SubIntrinsic = {
  'Fn::Sub':
    | CloudFormationValue<string>
    | [CloudFormationValue<string>, Record<string, CloudFormationValue<string | number | boolean>>];
};
export type AndIntrinsic = { 'Fn::And': ConditionExpression[] };
export type EqualsIntrinsic = {
  'Fn::Equals': [CloudFormationValue<unknown>, CloudFormationValue<unknown>];
};
export type IfIntrinsic<IfTrue = unknown, IfFalse = unknown> = {
  'Fn::If': [string, IfTrue, IfFalse];
};
export type NotIntrinsic = { 'Fn::Not': [ConditionExpression] };
export type OrIntrinsic = { 'Fn::Or': ConditionExpression[] };

export type ConditionExpression = ConditionIntrinsic | AndIntrinsic | EqualsIntrinsic | NotIntrinsic | OrIntrinsic;

/**
 * Intrinsic functions represented exactly as they appear in a serialized CloudFormation template.
 *
 * These are intentionally plain objects. No `toJSON` hook or runtime class is needed to emit a template.
 */
export type Intrinsic =
  | RefIntrinsic
  | ConditionExpression
  | Base64Intrinsic
  | FindInMapIntrinsic
  | GetAttIntrinsic
  | GetAzsIntrinsic
  | ImportValueIntrinsic
  | JoinIntrinsic
  | SelectIntrinsic
  | SplitIntrinsic
  | SubIntrinsic
  | IfIntrinsic;

/**
 * A structurally recognized intrinsic, including functions newer than the package's typed helper set.
 *
 * Keep this broader than `Intrinsic`: template walkers need to preserve forward-compatible `Fn::*` objects, while
 * authored resource properties and helper signatures should retain their precise known intrinsic types.
 */
export type StructuralIntrinsic =
  | Intrinsic
  | { Ref: unknown }
  | { Condition: unknown }
  | { [key: `Fn::${string}`]: unknown };

export function isIntrinsic(value: unknown): value is StructuralIntrinsic {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const keys = Object.keys(value);
  const key = keys[0];
  return keys.length === 1 && key !== undefined && (key === 'Ref' || key === 'Condition' || key.startsWith('Fn::'));
}

export function ref(logicalName: string): RefIntrinsic {
  return { Ref: logicalName };
}

export function condition(conditionName: string): ConditionIntrinsic {
  return { Condition: conditionName };
}

export function base64(value: CloudFormationValue<string>): Base64Intrinsic {
  return { 'Fn::Base64': value };
}

export function findInMap(
  mapName: CloudFormationValue<string>,
  topLevelKey: CloudFormationValue<string>,
  secondLevelKey: CloudFormationValue<string>
): FindInMapIntrinsic {
  return { 'Fn::FindInMap': [mapName, topLevelKey, secondLevelKey] };
}

export function getAtt(
  resourceLogicalName: CloudFormationValue<string>,
  attributeName: CloudFormationValue<string>
): GetAttIntrinsic {
  return { 'Fn::GetAtt': [resourceLogicalName, attributeName] };
}

export function getAzs(region: CloudFormationValue<string> = ''): GetAzsIntrinsic {
  return { 'Fn::GetAZs': region };
}

export function importValue(value: CloudFormationValue<string>): ImportValueIntrinsic {
  return { 'Fn::ImportValue': value };
}

export function join(
  delimiter: CloudFormationValue<string>,
  values: CloudFormationList<string | number>
): JoinIntrinsic {
  return { 'Fn::Join': [delimiter, values] };
}

export function select(
  index: CloudFormationValue<number | string>,
  values: readonly unknown[] | Intrinsic
): SelectIntrinsic {
  return { 'Fn::Select': [index, values] };
}

export function split(delimiter: CloudFormationValue<string>, source: CloudFormationValue<string>): SplitIntrinsic {
  return { 'Fn::Split': [delimiter, source] };
}

export function sub(template: CloudFormationValue<string>): SubIntrinsic;
export function sub(
  template: CloudFormationValue<string>,
  variables: Record<string, CloudFormationValue<string | number | boolean>>
): SubIntrinsic;
export function sub(
  template: CloudFormationValue<string>,
  variables?: Record<string, CloudFormationValue<string | number | boolean>>
): SubIntrinsic {
  return variables === undefined ? { 'Fn::Sub': template } : { 'Fn::Sub': [template, variables] };
}

export function and(conditions: ConditionExpression[]): AndIntrinsic {
  return { 'Fn::And': conditions };
}

export function equals(left: CloudFormationValue<unknown>, right: CloudFormationValue<unknown>): EqualsIntrinsic {
  return { 'Fn::Equals': [left, right] };
}

export function ifCondition<IfTrue, IfFalse>(
  conditionName: string,
  valueIfTrue: IfTrue,
  valueIfFalse: IfFalse
): IfIntrinsic<IfTrue, IfFalse> {
  return { 'Fn::If': [conditionName, valueIfTrue, valueIfFalse] };
}

export function not(conditionExpression: ConditionExpression): NotIntrinsic {
  return { 'Fn::Not': [conditionExpression] };
}

export function or(conditions: ConditionExpression[]): OrIntrinsic {
  return { 'Fn::Or': conditions };
}
