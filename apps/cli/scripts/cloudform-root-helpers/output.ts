import type { Value } from './dataTypes';

type Output = {
  Description?: Value<string>;
  Value: any;
  Export?: {
    Name: Value<string>;
  };
  Condition?: Value<string>;
};
export default Output;
