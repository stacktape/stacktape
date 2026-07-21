# PyLanguageSpecificConfig API Reference

## TypeScript definition

```typescript
type PyLanguageSpecificConfig = {
  /** Minify Python code to reduce package size. Makes production stack traces harder to read. */
  minify?: boolean;
  /** The Python package manager to use. */
  packageManager?: "uv";
  /** The path to your project&#39;s dependency file. */
  packageManagerFile?: string;
  /** The version of Python to use. */
  pythonVersion?: 2.7 | 3.11 | 3.12 | 3.13 | 3.14 | 3.6 | 3.7 | 3.8 | 3.9;
  /** Python server type: WSGI (Flask, Django) or ASGI (FastAPI, Starlette). */
  runAppAs?: "ASGI" | "WSGI";
  /** Only include these dependency groups from pyproject.toml. */
  uvOnlyGroups?: Array<string>;
  /** Optional dependency extras to include from pyproject.toml. */
  uvOptionalDependencies?: Array<string>;
  /** Dependency groups to include from pyproject.toml. */
  uvWithGroups?: Array<string>;
  /** Dependency groups to exclude from pyproject.toml. */
  uvWithoutGroups?: Array<string>;
};
```

## Property: `minify`

- Required: no
- Type: `boolean`
- Default: `true`

Minify Python code to reduce package size. Makes production stack traces harder to read.

### Example 1 (yaml)

```yaml
resources:
 pyApi:
   type: function
   properties:
     packaging:
       type: stacktape-lambda-buildpack
       properties:
         entryfilePath: app/main.py
         languageSpecificConfig:
           pythonVersion: 3.12
           minify: false
     memory: 512
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const pyApi = new LambdaFunction({
   packaging: {
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'app/main.py',
       languageSpecificConfig: {
         pythonVersion: 3.12,
         minify: false
       }
     }
   },
   memory: 512
 });
 return { resources: { pyApi } };
});
```

## Property: `packageManager`

- Required: no
- Type: `string = "uv"`

The Python package manager to use.

Stacktape uses `uv` for dependency resolution and installation. This option is kept
for compatibility and must be set to `uv` if provided.

### Example 1 (yaml)

```yaml
resources:
 pyApi:
   type: function
   properties:
     packaging:
       type: stacktape-lambda-buildpack
       properties:
         entryfilePath: app/main.py
         languageSpecificConfig:
           packageManager: uv
     memory: 512
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const pyApi = new LambdaFunction({
   packaging: {
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'app/main.py',
       languageSpecificConfig: {
         packageManager: 'uv'
       }
     }
   },
   memory: 512
 });
 return { resources: { pyApi } };
});
```

## Property: `packageManagerFile`

- Required: no
- Type: `string`

The path to your project's dependency file.

This can be a `requirements.txt`, `Pipfile`, or `pyproject.toml` file.

### Example 1 (yaml)

```yaml
resources:
 pyApi:
   type: function
   properties:
     packaging:
       type: stacktape-lambda-buildpack
       properties:
         entryfilePath: app/main.py
         languageSpecificConfig:
           packageManagerFile: app/pyproject.toml
     memory: 512
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const pyApi = new LambdaFunction({
   packaging: {
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'app/main.py',
       languageSpecificConfig: {
         packageManagerFile: 'app/pyproject.toml'
       }
     }
   },
   memory: 512
 });
 return { resources: { pyApi } };
});
```

## Property: `pythonVersion`

- Required: no
- Type: `number: 2.7 | 3.11 | 3.12 | 3.13 | 3.14 | 3.6 | 3.7 | 3.8 | 3.9`
- Default: `3.9`

The version of Python to use.

### Example 1 (yaml)

```yaml
resources:
 pyApi:
   type: function
   properties:
     packaging:
       type: stacktape-lambda-buildpack
       properties:
         entryfilePath: app/main.py
         languageSpecificConfig:
           pythonVersion: 3.12
     memory: 512
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const pyApi = new LambdaFunction({
   packaging: {
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'app/main.py',
       languageSpecificConfig: {
         pythonVersion: 3.12
       }
     }
   },
   memory: 512
 });
 return { resources: { pyApi } };
});
```

## Property: `runAppAs`

- Required: no
- Type: `string: "ASGI" | "WSGI"`

Python server type: `WSGI` (Flask, Django) or `ASGI` (FastAPI, Starlette).

Only for `stacktape-image-buildpack`. Auto-binds to the `PORT` env var.
Set `entryfilePath` to `module/file.py:app` (e.g., `app/main.py:app`).

### Example 1 (yaml)

```yaml
resources:
 fastapiService:
   type: web-service
   properties:
     packaging:
       type: stacktape-image-buildpack
       properties:
         entryfilePath: app/main.py:app
         languageSpecificConfig:
           pythonVersion: 3.12
           runAppAs: ASGI
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const fastapiService = new WebService({
   packaging: {
     type: 'stacktape-image-buildpack',
     properties: {
       entryfilePath: 'app/main.py:app',
       languageSpecificConfig: {
         pythonVersion: 3.12,
         runAppAs: 'ASGI'
       }
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { fastapiService } };
});
```

## Property: `uvOnlyGroups`

- Required: no
- Type: `Array<string>`

Only include these dependency groups from `pyproject.toml`.

Each value is passed to `uv pip compile` as `--only-group `.
This omits the project dependencies and default groups, matching `uv` behavior.

### Example 1 (yaml)

```yaml
resources:
 pyApi:
   type: function
   properties:
     packaging:
       type: stacktape-lambda-buildpack
       properties:
         entryfilePath: app/main.py
         languageSpecificConfig:
           packageManagerFile: app/pyproject.toml
           uvOnlyGroups:
             - runtime
     memory: 512
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const pyApi = new LambdaFunction({
   packaging: {
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'app/main.py',
       languageSpecificConfig: {
         packageManagerFile: 'app/pyproject.toml',
         uvOnlyGroups: ['runtime']
       }
     }
   },
   memory: 512
 });
 return { resources: { pyApi } };
});
```

## Property: `uvOptionalDependencies`

- Required: no
- Type: `Array<string>`

Optional dependency extras to include from `pyproject.toml`.

Each value is passed to `uv pip compile` as `--extra `.

### Example 1 (yaml)

```yaml
resources:
 pyApi:
   type: function
   properties:
     packaging:
       type: stacktape-lambda-buildpack
       properties:
         entryfilePath: app/main.py
         languageSpecificConfig:
           packageManagerFile: app/pyproject.toml
           uvOptionalDependencies:
             - postgres
             - redis
     memory: 512
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const pyApi = new LambdaFunction({
   packaging: {
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'app/main.py',
       languageSpecificConfig: {
         packageManagerFile: 'app/pyproject.toml',
         uvOptionalDependencies: ['postgres', 'redis']
       }
     }
   },
   memory: 512
 });
 return { resources: { pyApi } };
});
```

## Property: `uvWithGroups`

- Required: no
- Type: `Array<string>`

Dependency groups to include from `pyproject.toml`.

Each value is passed to `uv pip compile` as `--group `.

### Example 1 (yaml)

```yaml
resources:
 pyApi:
   type: function
   properties:
     packaging:
       type: stacktape-lambda-buildpack
       properties:
         entryfilePath: app/main.py
         languageSpecificConfig:
           packageManagerFile: app/pyproject.toml
           uvWithGroups:
             - prod
     memory: 512
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const pyApi = new LambdaFunction({
   packaging: {
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'app/main.py',
       languageSpecificConfig: {
         packageManagerFile: 'app/pyproject.toml',
         uvWithGroups: ['prod']
       }
     }
   },
   memory: 512
 });
 return { resources: { pyApi } };
});
```

## Property: `uvWithoutGroups`

- Required: no
- Type: `Array<string>`

Dependency groups to exclude from `pyproject.toml`.

Each value is passed to `uv pip compile` as `--no-group `.

### Example 1 (yaml)

```yaml
resources:
 pyApi:
   type: function
   properties:
     packaging:
       type: stacktape-lambda-buildpack
       properties:
         entryfilePath: app/main.py
         languageSpecificConfig:
           packageManagerFile: app/pyproject.toml
           uvWithoutGroups:
             - dev
             - test
     memory: 512
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const pyApi = new LambdaFunction({
   packaging: {
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'app/main.py',
       languageSpecificConfig: {
         packageManagerFile: 'app/pyproject.toml',
         uvWithoutGroups: ['dev', 'test']
       }
     }
   },
   memory: 512
 });
 return { resources: { pyApi } };
});
```
