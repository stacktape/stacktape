import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class BotVersionLocaleDetails {
  SourceBotVersion!: Value<string>;
  constructor(properties: BotVersionLocaleDetails) {
    Object.assign(this, properties);
  }
}

export class BotVersionLocaleSpecification {
  LocaleId!: Value<string>;
  BotVersionLocaleDetails!: BotVersionLocaleDetails;
  constructor(properties: BotVersionLocaleSpecification) {
    Object.assign(this, properties);
  }
}
export interface BotVersionProperties {
  Description?: Value<string>;
  BotId: Value<string>;
  BotVersionLocaleSpecification: List<BotVersionLocaleSpecification>;
}
export default class BotVersion extends ResourceBase<BotVersionProperties> {
  static BotVersionLocaleDetails = BotVersionLocaleDetails;
  static BotVersionLocaleSpecification = BotVersionLocaleSpecification;
  constructor(properties: BotVersionProperties) {
    super('AWS::Lex::BotVersion', properties);
  }
}
