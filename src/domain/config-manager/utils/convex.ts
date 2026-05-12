/**
 * Convex config preprocessing.
 *
 * ====================================================================================
 * IMPLEMENTATION STATUS: VALIDATION SKELETON.
 * ====================================================================================
 *
 * Mirrors `nextjs-webs.ts`: per-resource validation called during config-manager
 * preprocessing. Concrete `StpConvex` graph construction (the `_nestedResources`
 * fan-out: backend + dashboard container workloads, RDS, five buckets, ALB) belongs
 * in `src/domain/config-manager/index.ts` as a `convexes` getter — see the
 * `nextjsWebs` getter (~lines 594–700) for the structural pattern.
 */

import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { dirExists, isFileAccessible } from '@shared/utils/fs-utils';

export const validateConvexConfig = ({ resource }: { resource: StpConvex }) => {
  const absoluteAppDirectory = join(globalStateManager.workingDir, resource.appDirectory);

  if (!dirExists(absoluteAppDirectory)) {
    // TODO(convex): register a real error code in src/config/error-messages.ts
    // (e.g., e200 — "Convex appDirectory does not exist") and throw via stpErrors.
    throw new Error(
      `Convex resource '${resource.name}': appDirectory '${resource.appDirectory}' does not exist ` +
        `(resolved to '${absoluteAppDirectory}'). Create a 'convex/' directory in your project root ` +
        `containing your schema.ts and function files.`
    );
  }

  if (!isFileAccessible(join(absoluteAppDirectory, 'schema.ts'))) {
    // TODO(convex): register e201 — "Convex appDirectory missing schema.ts"
    throw new Error(
      `Convex resource '${resource.name}': appDirectory '${resource.appDirectory}' must contain a ` +
        `'schema.ts' file. See the Convex starter project for an example.`
    );
  }

  // Single-instance correctness invariant (see Q6 design discussion). The type system
  // prevents `replicas` from being set, but if a user pokes via `overrides`, surface a
  // clear error. Left as a runtime check to be added in the resolver template-override
  // phase, where the final task-definition desiredCount is observable.

  // Custom domains are required for production. If omitted, warn (not error) — the ALB
  // DNS fallback works for staging but is unstable across stack recreations.
  if (!resource.customDomains) {
    // TODO(convex): wire into tuiManager.warn once the resolver runs.
  }
};
