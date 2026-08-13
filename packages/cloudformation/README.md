# `@stacktape/cloudformation`

Typed CloudFormation resources without runtime resource classes or a construct graph.

```ts
import { getAtt } from '@stacktape/cloudformation/intrinsics';
import { cfnResource } from '@stacktape/cloudformation/resource';
import type { Code } from '@stacktape/cloudformation/resources/aws-lambda-function';

const code: Code = { S3Bucket: 'artifacts', S3Key: 'function.zip' };
const fn = cfnResource('AWS::Lambda::Function', {
  Code: code,
  Role: getAtt('ExecutionRole', 'Arn')
});
fn.DependsOn = 'ExecutionRole';
```

`cfnResourceUnchecked` is the explicit escape hatch for private registry, third-party or newly released types that are
not in the pinned specification. Generated modules contain only writable properties and definitions reachable from those
properties; read-only resource attributes are not accepted as template input.

The generated layout intentionally uses one module per resource. This keeps nested property imports local and avoids
loading unrelated service definitions when a consumer imports a resource subpath. The central resource map necessarily
references every module to provide type-name autocomplete to `cfnResource`; its compiler cost is measured as part of the
package typecheck when the pinned schema is updated.

With service specification `0.1.199`, the committed output is 1,722 resource modules and approximately 3.5 MB. A warm
full package typecheck, including the central map, took approximately two seconds on the migration workstation. This is
an observation rather than a CI timing threshold; a material regression should prompt profiling before adding another
aggregate generated map.
