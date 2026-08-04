# NixpacksPhase API Reference

## TypeScript definition

```typescript
type NixpacksPhase = {
  /** The name of the build phase. */
  name: string;
  /** A list of APT packages to install in this phase. */
  aptPkgs?: Array<string>;
  /** A list of directories to cache between builds to speed up subsequent builds. */
  cacheDirectories?: Array<string>;
  /** A list of shell commands to execute in this phase. */
  cmds?: Array<string>;
  /** A list of Nix libraries to include in this phase. */
  nixLibs?: Array<string>;
  /** A list of Nix overlay files to apply in this phase. */
  nixOverlay?: Array<string>;
  /** A list of Nix packages to install in this phase. */
  nixPkgs?: Array<string>;
  /** The Nixpkgs archive to use. */
  nixpkgsArchive?: string;
  /** A list of file paths to include in this phase; all other files will be excluded. */
  onlyIncludeFiles?: Array<string>;
};
```

## Property: `name`

- Required: yes
- Type: `string`

The name of the build phase.

### Example 1 (yaml)

```yaml
resources:
 worker:
   type: worker-service
   properties:
     packaging:
       type: nixpacks
       properties:
         sourceDirectoryPath: ./worker
         phases:
           - name: install
             cmds:
               - npm ci
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WorkerService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const worker = new WorkerService({
   packaging: {
     type: 'nixpacks',
     properties: {
       sourceDirectoryPath: './worker',
       phases: [
         {
           name: 'install',
           cmds: ['npm ci']
         }
       ]
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { worker } };
});
```

## Property: `aptPkgs`

- Required: no
- Type: `Array<string>`

A list of APT packages to install in this phase.

### Example 1 (yaml)

```yaml
resources:
 worker:
   type: worker-service
   properties:
     packaging:
       type: nixpacks
       properties:
         sourceDirectoryPath: ./worker
         phases:
           - name: setup
             aptPkgs:
               - libpq-dev
               - poppler-utils
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WorkerService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const worker = new WorkerService({
   packaging: {
     type: 'nixpacks',
     properties: {
       sourceDirectoryPath: './worker',
       phases: [
         {
           name: 'setup',
           aptPkgs: ['libpq-dev', 'poppler-utils']
         }
       ]
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { worker } };
});
```

## Property: `cacheDirectories`

- Required: no
- Type: `Array<string>`

A list of directories to cache between builds to speed up subsequent builds.

### Example 1 (yaml)

```yaml
resources:
 worker:
   type: worker-service
   properties:
     packaging:
       type: nixpacks
       properties:
         sourceDirectoryPath: ./worker
         phases:
           - name: install
             cmds:
               - npm ci
             cacheDirectories:
               - node_modules/.cache
               - /root/.npm
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WorkerService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const worker = new WorkerService({
   packaging: {
     type: 'nixpacks',
     properties: {
       sourceDirectoryPath: './worker',
       phases: [
         {
           name: 'install',
           cmds: ['npm ci'],
           cacheDirectories: ['node_modules/.cache', '/root/.npm']
         }
       ]
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { worker } };
});
```

## Property: `cmds`

- Required: no
- Type: `Array<string>`

A list of shell commands to execute in this phase.

### Example 1 (yaml)

```yaml
resources:
 worker:
   type: worker-service
   properties:
     packaging:
       type: nixpacks
       properties:
         sourceDirectoryPath: ./worker
         phases:
           - name: build
             cmds:
               - npm run build
               - npm prune --omit=dev
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WorkerService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const worker = new WorkerService({
   packaging: {
     type: 'nixpacks',
     properties: {
       sourceDirectoryPath: './worker',
       phases: [
         {
           name: 'build',
           cmds: ['npm run build', 'npm prune --omit=dev']
         }
       ]
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { worker } };
});
```

## Property: `nixLibs`

- Required: no
- Type: `Array<string>`

A list of Nix libraries to include in this phase.

### Example 1 (yaml)

```yaml
resources:
 worker:
   type: worker-service
   properties:
     packaging:
       type: nixpacks
       properties:
         sourceDirectoryPath: ./worker
         phases:
           - name: setup
             nixLibs:
               - openssl
               - zlib
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WorkerService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const worker = new WorkerService({
   packaging: {
     type: 'nixpacks',
     properties: {
       sourceDirectoryPath: './worker',
       phases: [
         {
           name: 'setup',
           nixLibs: ['openssl', 'zlib']
         }
       ]
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { worker } };
});
```

## Property: `nixOverlay`

- Required: no
- Type: `Array<string>`

A list of Nix overlay files to apply in this phase.

### Example 1 (yaml)

```yaml
resources:
 worker:
   type: worker-service
   properties:
     packaging:
       type: nixpacks
       properties:
         sourceDirectoryPath: ./worker
         phases:
           - name: setup
             nixOverlay:
               - ./nix/overlay.nix
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WorkerService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const worker = new WorkerService({
   packaging: {
     type: 'nixpacks',
     properties: {
       sourceDirectoryPath: './worker',
       phases: [
         {
           name: 'setup',
           nixOverlay: ['./nix/overlay.nix']
         }
       ]
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { worker } };
});
```

## Property: `nixPkgs`

- Required: no
- Type: `Array<string>`

A list of Nix packages to install in this phase.

### Example 1 (yaml)

```yaml
resources:
 worker:
   type: worker-service
   properties:
     packaging:
       type: nixpacks
       properties:
         sourceDirectoryPath: ./worker
         phases:
           - name: setup
             nixPkgs:
               - ffmpeg
               - imagemagick
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WorkerService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const worker = new WorkerService({
   packaging: {
     type: 'nixpacks',
     properties: {
       sourceDirectoryPath: './worker',
       phases: [
         {
           name: 'setup',
           nixPkgs: ['ffmpeg', 'imagemagick']
         }
       ]
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { worker } };
});
```

## Property: `nixpkgsArchive`

- Required: no
- Type: `string`

The Nixpkgs archive to use.

### Example 1 (yaml)

```yaml
resources:
 worker:
   type: worker-service
   properties:
     packaging:
       type: nixpacks
       properties:
         sourceDirectoryPath: ./worker
         phases:
           - name: setup
             nixPkgs:
               - nodejs_22
             nixpkgsArchive: bf3287dac860542719b3849d6970d22f635f9da1
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WorkerService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const worker = new WorkerService({
   packaging: {
     type: 'nixpacks',
     properties: {
       sourceDirectoryPath: './worker',
       phases: [
         {
           name: 'setup',
           nixPkgs: ['nodejs_22'],
           nixpkgsArchive: 'bf3287dac860542719b3849d6970d22f635f9da1'
         }
       ]
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { worker } };
});
```

## Property: `onlyIncludeFiles`

- Required: no
- Type: `Array<string>`

A list of file paths to include in this phase; all other files will be excluded.

### Example 1 (yaml)

```yaml
resources:
 worker:
   type: worker-service
   properties:
     packaging:
       type: nixpacks
       properties:
         sourceDirectoryPath: ./worker
         phases:
           - name: build
             cmds:
               - npm run build
             onlyIncludeFiles:
               - src
               - package.json
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WorkerService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const worker = new WorkerService({
   packaging: {
     type: 'nixpacks',
     properties: {
       sourceDirectoryPath: './worker',
       phases: [
         {
           name: 'build',
           cmds: ['npm run build'],
           onlyIncludeFiles: ['src', 'package.json']
         }
       ]
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { worker } };
});
```
