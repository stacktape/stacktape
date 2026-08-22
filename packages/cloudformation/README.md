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

The generator emits one module per resource, so subpath imports do not load unrelated service definitions. The central
resource map references every module to provide type-name autocomplete to `cfnResource`; profile the package typecheck
before adding another aggregate generated map.
