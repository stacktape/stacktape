// `IntrinsicFunction`, `Value` and `List` are the authored CloudFormation value vocabulary and are owned by
// @stacktape/config. They are re-exported here because the generated resource modules in @generated/cloudform
// import them from this path; `DataType` and `ConditionIntrinsicFunction` are emission machinery and stay.
export { IntrinsicFunction, type List, type Value } from '@stacktape/config/cloudformation';
import { IntrinsicFunction } from '@stacktape/config/cloudformation';
import type { Value } from '@stacktape/config/cloudformation';

enum DataType {
  String = 'String',
  Number = 'Number',
  ListOfNumbers = 'List<Number>',
  CommaDelimitedList = 'CommaDelimitedList'
}

export default DataType;

export class ConditionIntrinsicFunction extends IntrinsicFunction {
  constructor(name: string, payload: any) {
    super(name, payload);
  }
}

export type Condition = ConditionIntrinsicFunction | { Condition: Value<string> };
