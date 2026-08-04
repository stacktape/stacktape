# CustomArtifactLambdaPackagingProps API Reference

## TypeScript definition

```typescript
type CustomArtifactLambdaPackagingProps = {
  /** The path to a pre-built deployment package. */
  packagePath: string;
  /** The handler function to be executed when the Lambda is invoked. */
  handler?: string;
};
```

## Property: `packagePath`

- Required: yes
- Type: `string`

The path to a pre-built deployment package.

If the path points to a directory or a non-zip file, Stacktape will automatically zip it for you.

### Example 1 (yaml)

```yaml
resources:
 apiFunction:
   type: function
   properties:
     packaging:
       type: custom-artifact
       properties:
         packagePath: ./dist/lambda.zip
         handler: index.js:handler
     memory: 512
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const apiFunction = new LambdaFunction({
   packaging: {
     type: 'custom-artifact',
     properties: {
       packagePath: './dist/lambda.zip',
       handler: 'index.js:handler'
     }
   },
   memory: 512
 });
 return { resources: { apiFunction } };
});
```

## Property: `handler`

- Required: no
- Type: `string`

The handler function to be executed when the Lambda is invoked.

The syntax is `{{filepath}}:{{functionName}}`.

Example: `my-lambda/index.js:default`

### Example 1 (yaml)

```yaml
resources:
 apiFunction:
   type: function
   properties:
     packaging:
       type: custom-artifact
       properties:
         packagePath: ./dist/lambda.zip
         handler: my-lambda/index.js:default
     memory: 512
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const apiFunction = new LambdaFunction({
   packaging: {
     type: 'custom-artifact',
     properties: {
       packagePath: './dist/lambda.zip',
       handler: 'my-lambda/index.js:default'
     }
   },
   memory: 512
 });
 return { resources: { apiFunction } };
});
```
