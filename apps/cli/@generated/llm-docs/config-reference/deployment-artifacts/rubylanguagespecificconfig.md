# RubyLanguageSpecificConfig API Reference

## TypeScript definition

```typescript
type RubyLanguageSpecificConfig = {
  /** The version of Ruby to use. */
  rubyVersion?: 3.2 | 3.3;
};
```

## Property: `rubyVersion`

- Required: no
- Type: `number: 3.2 | 3.3`
- Default: `3.3`

The version of Ruby to use.

### Example 1 (yaml)

```yaml
resources:
 rubyApi:
   type: web-service
   properties:
     packaging:
       type: stacktape-image-buildpack
       properties:
         entryfilePath: config.ru
         languageSpecificConfig:
           rubyVersion: 3.3
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const rubyApi = new WebService({
   packaging: {
     type: 'stacktape-image-buildpack',
     properties: {
       entryfilePath: 'config.ru',
       languageSpecificConfig: {
         rubyVersion: 3.3
       }
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { rubyApi } };
});
```
