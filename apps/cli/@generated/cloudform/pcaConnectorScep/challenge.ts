import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface ChallengeProperties {
  ConnectorArn: Value<string>;
  Tags?: { [key: string]: Value<string> };
}
export default class Challenge extends ResourceBase<ChallengeProperties> {
  constructor(properties: ChallengeProperties) {
    super('AWS::PCAConnectorSCEP::Challenge', properties);
  }
}
