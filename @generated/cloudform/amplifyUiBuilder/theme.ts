import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ThemeValue {
  Value?: Value<string>;
  Children?: List<ThemeValues>;
  constructor(properties: ThemeValue) {
    Object.assign(this, properties);
  }
}

export class ThemeValues {
  Value?: ThemeValue;
  Key?: Value<string>;
  constructor(properties: ThemeValues) {
    Object.assign(this, properties);
  }
}
export interface ThemeProperties {
  AppId?: Value<string>;
  EnvironmentName?: Value<string>;
  Values?: List<ThemeValues>;
  Overrides?: List<ThemeValues>;
  Tags?: { [key: string]: Value<string> };
  Name?: Value<string>;
}
export default class Theme extends ResourceBase<ThemeProperties> {
  static ThemeValue = ThemeValue;
  static ThemeValues = ThemeValues;
  constructor(properties?: ThemeProperties) {
    super('AWS::AmplifyUIBuilder::Theme', properties || {});
  }
}
