import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface GraphSnapshotProperties {
  GraphIdentifier?: Value<string>;
  SnapshotName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class GraphSnapshot extends ResourceBase<GraphSnapshotProperties> {
  constructor(properties: GraphSnapshotProperties) {
    super('AWS::NeptuneGraph::GraphSnapshot', properties);
  }
}
