# PhpLanguageSpecificConfig API Reference

## TypeScript definition

```typescript
type PhpLanguageSpecificConfig = {
  /** The version of PHP to use. */
  phpVersion?: 8.2 | 8.3;
};
```

## Property: `phpVersion`

- Required: no
- Type: `number: 8.2 | 8.3`
- Default: `8.3`

The version of PHP to use.

### Example 1 (yaml)

```yaml
resources:
 phpApi:
   type: web-service
   properties:
     packaging:
       type: stacktape-image-buildpack
       properties:
         entryfilePath: public/index.php
         languageSpecificConfig:
           phpVersion: 8.3
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const phpApi = new WebService({
   packaging: {
     type: 'stacktape-image-buildpack',
     properties: {
       entryfilePath: 'public/index.php',
       languageSpecificConfig: {
         phpVersion: 8.3
       }
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { phpApi } };
});
```
