import { V3_ARCHIVE_REDIRECTS, V3_REDIRECTS_TO_V4 } from './v3-archive-routes.ts';

/** Pages renamed or merged in v4. The old URLs are linked from older blog posts, issues and search results. */
export const V4_RENAMED_PAGES: Record<string, string> = {
  '/packaging/containers/nixpacks/': '/packaging/containers/buildpack/',
  '/packaging/containers/external-buildpack/': '/packaging/containers/buildpack/',
  '/packaging/containers/custom-dockerfile/': '/packaging/containers/dockerfile/',
  '/packaging/containers/stacktape-buildpack/': '/packaging/containers/js-bundle/',
  '/packaging/function/stacktape-buildpack/': '/packaging/function/js-bundle/',
  '/stacktape-console/visual-config-editor/': '/stacktape-console/console-overview/',
  '/using-with-ai/config-generation-from-repository/': '/cli/init/',
  '/using-with-ai/ai-coding-assistant-integrations/': '/using-with-ai/mcp-server-setup/',
  // Docs structure, November 2026: merged duplicate pages and moved deployed-stack debugging to Observability.
  '/deployment-and-lifecycle/deploy-time-parameters/': '/configuration/directives/',
  '/managing-costs/per-resource-breakdown/': '/managing-costs/dashboards/',
  '/local-development/debugging-containers/': '/observability/debugging-containers/',
  '/local-development/debug-commands-reference/': '/observability/debug-commands/'
};

/**
 * Every redirect the site serves, keyed by old URL with a trailing slash. Astro renders each one as a meta-refresh page
 * and the production CDN answers the same paths with a 301 (`stacktape.ts`).
 *
 * v3 (3.7.1) pages whose topic has a v4 page land on it; the same map drives the v3 banner and the version switcher.
 * The other old v3 URLs, and links printed by the 3.7.1 CLI, go to the /v3/ archive.
 */
export const SITE_REDIRECTS: Record<string, string> = {
  ...V4_RENAMED_PAGES,
  ...V3_REDIRECTS_TO_V4,
  ...V3_ARCHIVE_REDIRECTS
};
