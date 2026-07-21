# DockerBuildArg API Reference

## TypeScript definition

```typescript
type DockerBuildArg = {
  /** Argument name */
  argName: string;
  /** Argument value */
  value: string;
};
```

## Property: `argName`

- Required: yes
- Type: `string`

Argument name

### Example 1 (yaml)

```yaml
resources:
 processor:
   type: batch-job
   properties:
     container:
       packaging:
         type: custom-dockerfile
         properties:
           buildContextPath: ./worker
           buildArgs:
             - argName: PYTHON_VERSION
               value: "3.12"
     resources:
       cpu: 1
       memory: 2048
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const processor = new BatchJob({
   container: {
     packaging: {
       type: 'custom-dockerfile',
       properties: {
         buildContextPath: './worker',
         buildArgs: [
           {
             argName: 'PYTHON_VERSION',
             value: '3.12'
           }
         ]
       }
     }
   },
   resources: {
     cpu: 1,
     memory: 2048
   }
 });
 return { resources: { processor } };
});
```

## Property: `value`

- Required: yes
- Type: `string`

Argument value

### Example 1 (yaml)

```yaml
resources:
 processor:
   type: batch-job
   properties:
     container:
       packaging:
         type: custom-dockerfile
         properties:
           buildContextPath: ./worker
           buildArgs:
             - argName: PYTHON_VERSION
               value: "3.12"
     resources:
       cpu: 1
       memory: 2048
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const processor = new BatchJob({
   container: {
     packaging: {
       type: 'custom-dockerfile',
       properties: {
         buildContextPath: './worker',
         buildArgs: [
           {
             argName: 'PYTHON_VERSION',
             value: '3.12'
           }
         ]
       }
     }
   },
   resources: {
     cpu: 1,
     memory: 2048
   }
 });
 return { resources: { processor } };
});
```
