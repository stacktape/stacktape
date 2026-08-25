/** Repository paths that conventionally contain runnable test harnesses, not production services. */

const NON_PRODUCTION_DIRECTORY =
  /(?:^|\/)(?:__tests__|cypress|e2e|fixtures?|integration-tests?|playwright|test|tests|testing)(?:\/|$)/i;

/**
 * Whether a repository-relative path belongs to a conventional test or end-to-end fixture scope.
 *
 * These directories often contain complete package manifests, Dockerfiles, Compose files and
 * realistic environment values. Reading any one of those files as production evidence can deploy
 * the test runner and provision every database engine its compatibility suite exercises. The
 * predicate is intentionally directory-only: ordinary workspace applications under `apps/api` or
 * `services/worker` remain eligible, even when their manifests contain test scripts.
 */
export const isNonProductionFixturePath = (path: string): boolean => NON_PRODUCTION_DIRECTORY.test(path);
