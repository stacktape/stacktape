import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface GraphQLSchemaProperties {
  Definition?: Value<string>;
  DefinitionS3Location?: Value<string>;
  ApiId: Value<string>;
}
export default class GraphQLSchema extends ResourceBase<GraphQLSchemaProperties> {
  constructor(properties: GraphQLSchemaProperties) {
    super('AWS::AppSync::GraphQLSchema', properties);
  }
}
