# PythonBuildpackConfig API Reference

Python options of the Lambda buildpack.

## TypeScript definition

```typescript
type PythonBuildpackConfig = {
  /** The path to your project's dependency file. */
  packageManagerFile?: string;
  /** Only include these dependency groups from `pyproject.toml`. */
  uvOnlyGroups?: Array<string>;
  /** Optional dependency extras to include from `pyproject.toml`. */
  uvOptionalDependencies?: Array<string>;
  /** Dependency groups to include from `pyproject.toml`. */
  uvWithGroups?: Array<string>;
  /** Dependency groups to exclude from `pyproject.toml`. */
  uvWithoutGroups?: Array<string>;
};
```

## Property: `packageManagerFile`

- Required: no
- Type: `string`

The path to your project's dependency file.

This can be a `requirements.txt`, `Pipfile`, `pyproject.toml`, or `uv.lock` file. When both
`pyproject.toml` and `uv.lock` exist, Stacktape uses the lock file by default.

### Example 1 (yaml)

```yaml
resources:
 pyApi:
   type: function
   properties:
     packaging:
       type: buildpack
       properties:
         entryfilePath: app/main.py
         python:
           packageManagerFile: app/pyproject.toml
     memory: 512
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const pyApi = new LambdaFunction({
   packaging: {
     type: 'buildpack',
     properties: {
       entryfilePath: 'app/main.py',
       python: {
         packageManagerFile: 'app/pyproject.toml'
       }
     }
   },
   memory: 512
 });
 return { resources: { pyApi } };
});
```

## Property: `uvOnlyGroups`

- Required: no
- Type: `Array<string>`

Only include these dependency groups from `pyproject.toml`.

Each value is passed to `uv pip compile` as `--only-group <name>`.
This omits the project dependencies and default groups, matching `uv` behavior.

### Example 1 (yaml)

```yaml
resources:
 pyApi:
   type: function
   properties:
     packaging:
       type: buildpack
       properties:
         entryfilePath: app/main.py
         python:
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
     type: 'buildpack',
     properties: {
       entryfilePath: 'app/main.py',
       python: {
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

Each value is passed to `uv pip compile` as `--extra <name>`.

### Example 1 (yaml)

```yaml
resources:
 pyApi:
   type: function
   properties:
     packaging:
       type: buildpack
       properties:
         entryfilePath: app/main.py
         python:
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
     type: 'buildpack',
     properties: {
       entryfilePath: 'app/main.py',
       python: {
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

Each value is passed to `uv pip compile` as `--group <name>`.

### Example 1 (yaml)

```yaml
resources:
 pyApi:
   type: function
   properties:
     packaging:
       type: buildpack
       properties:
         entryfilePath: app/main.py
         python:
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
     type: 'buildpack',
     properties: {
       entryfilePath: 'app/main.py',
       python: {
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

Each value is passed to `uv pip compile` as `--no-group <name>`.

### Example 1 (yaml)

```yaml
resources:
 pyApi:
   type: function
   properties:
     packaging:
       type: buildpack
       properties:
         entryfilePath: app/main.py
         python:
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
     type: 'buildpack',
     properties: {
       entryfilePath: 'app/main.py',
       python: {
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
