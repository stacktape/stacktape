import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class RepositoryCatalogData {
  AboutText?: Value<string>;
  OperatingSystems?: List<Value<string>>;
  UsageText?: Value<string>;
  RepositoryDescription?: Value<string>;
  Architectures?: List<Value<string>>;
  constructor(properties: RepositoryCatalogData) {
    Object.assign(this, properties);
  }
}
export interface PublicRepositoryProperties {
  RepositoryPolicyText?: { [key: string]: any };
  RepositoryName?: Value<string>;
  RepositoryCatalogData?: RepositoryCatalogData;
  Tags?: List<ResourceTag>;
}
export default class PublicRepository extends ResourceBase<PublicRepositoryProperties> {
  static RepositoryCatalogData = RepositoryCatalogData;
  constructor(properties?: PublicRepositoryProperties) {
    super('AWS::ECR::PublicRepository', properties || {});
  }
}
