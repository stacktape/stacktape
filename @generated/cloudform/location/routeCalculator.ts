import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface RouteCalculatorProperties {
  CalculatorName: Value<string>;
  Description?: Value<string>;
  PricingPlan?: Value<string>;
  Tags?: List<ResourceTag>;
  DataSource: Value<string>;
}
export default class RouteCalculator extends ResourceBase<RouteCalculatorProperties> {
  constructor(properties: RouteCalculatorProperties) {
    super('AWS::Location::RouteCalculator', properties);
  }
}
