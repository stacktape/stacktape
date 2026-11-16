import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import posthog from '@posthog/rollup-plugin';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import { apiReferenceDataPlugin } from './src/build/api-reference-data.ts';
import { REPO_ROOT } from './src/build/cli-generated-inputs.ts';
import { generatedRuntimeAssets } from './src/build/generated-runtime-assets.ts';
import { getGitLastModified } from './src/utils/git-dates.ts';
import { rehypeDocsLinks } from './src/utils/rehype-docs-links.ts';
import { remarkCodeToComponent } from './src/utils/remark-code-to-component.ts';
import { remarkDocsTransforms } from './src/utils/remark-docs-transforms.ts';
import { remarkFixJsxTemplateIndent } from './src/utils/remark-fix-jsx-template-indent.ts';

const SITE_URL = 'https://docs.stacktape.com';

// v3 docs URLs that have a v4 page about the same thing: old links, search results and v3 CLI messages land on the
// current docs. Keep this to genuine equivalents; a v3 page without one belongs to the v3 archive.
const v3PagesWithV4Equivalent = {
  '/3rd-party-resources/mongo-db-atlas-clusters/': '/resources/databases/mongodb-atlas/',
  '/3rd-party-resources/upstash-redises/': '/resources/databases/upstash-redis/',
  '/cli/commands/aws-profile-create/': '/cli/aws-profile-create/',
  '/cli/commands/aws-profile-delete/': '/cli/aws-profile-delete/',
  '/cli/commands/aws-profile-list/': '/cli/aws-profile-list/',
  '/cli/commands/aws-profile-update/': '/cli/aws-profile-update/',
  '/cli/commands/bastion-session/': '/cli/bastion-session/',
  '/cli/commands/bastion-tunnel/': '/cli/bastion-tunnel/',
  '/cli/commands/bucket-sync/': '/cli/bucket-sync/',
  '/cli/commands/cf-module-update/': '/cli/cf-module-update/',
  '/cli/commands/compile-template/': '/cli/synth/',
  '/cli/commands/container-session/': '/cli/container-session/',
  '/cli/commands/defaults-configure/': '/cli/defaults-configure/',
  '/cli/commands/defaults-list/': '/cli/defaults-list/',
  '/cli/commands/delete/': '/cli/delete/',
  '/cli/commands/deploy/': '/cli/deploy/',
  '/cli/commands/deployment-script-run/': '/cli/deployment-script-run/',
  '/cli/commands/dev/': '/cli/dev/',
  '/cli/commands/domain-add/': '/cli/domain-add/',
  '/cli/commands/help/': '/cli/help/',
  '/cli/commands/init/': '/cli/init/',
  '/cli/commands/login/': '/cli/login/',
  '/cli/commands/logout/': '/cli/logout/',
  '/cli/commands/logs/': '/cli/logs/',
  '/cli/commands/package-workloads/': '/cli/package/',
  '/cli/commands/param-get/': '/cli/param-get/',
  '/cli/commands/preview-changes/': '/cli/diff/',
  '/cli/commands/rollback/': '/cli/rollback/',
  '/cli/commands/script-run/': '/cli/script-run/',
  '/cli/commands/secret-create/': '/cli/secret-set/',
  '/cli/commands/secret-delete/': '/cli/secret-delete/',
  '/cli/commands/secret-get/': '/cli/secret-get/',
  '/cli/commands/stack-info/': '/cli/info-stack/',
  '/cli/commands/stack-list/': '/cli/info-stacks/',
  '/cli/commands/version/': '/cli/version/',
  '/compute-resources/batch-jobs/': '/resources/compute/batch-job/',
  '/compute-resources/edge-lambda-functions/': '/resources/compute/edge-function/',
  '/compute-resources/functions/': '/resources/compute/lambda-function/',
  '/compute-resources/multi-container-workloads/': '/resources/compute/multi-container-workload/',
  '/compute-resources/nextjs-website/': '/resources/frontend/nextjs/',
  '/compute-resources/private-services/': '/resources/compute/private-service/',
  '/compute-resources/web-services/': '/resources/compute/web-service/',
  '/compute-resources/worker-services/': '/resources/compute/worker-service/',
  '/configuration/alarms/': '/observability/alarms/',
  '/configuration/budget-control/': '/managing-costs/budgets/',
  '/configuration/hooks/': '/configuration/hooks-and-scripts/',
  '/configuration/log-forwarding/': '/observability/log-forwarding/',
  '/configuration/overrides/': '/configuration/overrides-and-escape-hatches/',
  '/configuration/packaging/': '/packaging/overview/',
  '/configuration/progress-notifications/': '/observability/notifications/',
  '/configuration/referencing-parameters/': '/configuration/referenceable-parameters/',
  '/configuration/scripts/': '/configuration/hooks-and-scripts/',
  '/database-resources/dynamo-db-tables/': '/resources/databases/dynamodb/',
  '/database-resources/open-search-domains/': '/resources/databases/opensearch/',
  '/database-resources/redis-clusters/': '/resources/databases/redis/',
  '/database-resources/relational-databases/': '/resources/databases/relational-database/',
  '/extending/aws-cdk-constructs/': '/resources/advanced/aws-cdk-constructs/',
  '/extending/aws-cloudformation-resources/': '/resources/advanced/raw-cloudformation-resources/',
  '/extending/custom-resources/': '/resources/advanced/custom-resources/',
  '/getting-started/configuration/': '/getting-started/configure-your-stack/',
  '/getting-started/deployment/': '/getting-started/deploy-your-first-stage/',
  '/getting-started/development-mode/': '/getting-started/use-the-dev-mode/',
  '/other-resources/application-load-balancers/': '/resources/networking/application-load-balancer/',
  '/other-resources/buckets/': '/resources/storage/s3-bucket/',
  '/other-resources/cdns/': '/resources/networking/cdn/',
  '/other-resources/deployment-scripts/': '/resources/advanced/deployment-scripts/',
  '/other-resources/domains-and-certificates/': '/resources/networking/custom-domains/',
  '/other-resources/efs-filesystems/': '/resources/storage/efs-filesystem/',
  '/other-resources/event-buses/': '/resources/messaging/event-bus/',
  '/other-resources/hosting-buckets/': '/resources/frontend/static-hosting/',
  '/other-resources/http-api-gateways/': '/resources/networking/http-api-gateway/',
  '/other-resources/network-load-balancers/': '/resources/networking/network-load-balancer/',
  '/other-resources/sns-topics/': '/resources/messaging/sns-topic/',
  '/other-resources/sqs-queues/': '/resources/messaging/sqs-queue/',
  '/other-resources/state-machines/': '/resources/orchestration/state-machine/',
  '/security-resources/bastions/': '/resources/security/bastion-host/',
  '/security-resources/secrets/': '/configuration/secrets/',
  '/security-resources/user-auth-pools/': '/resources/security/user-auth-pool/',
  '/security-resources/web-app-firewalls/': '/resources/security/web-application-firewall/',
  '/user-guides/connect-aws-account/': '/stacktape-console/connecting-your-aws-account/',
  '/user-guides/development-mode/': '/local-development/dev-mode-overview/',
  '/user-guides/enabling-budgeting/': '/managing-costs/budgets/',
  '/user-guides/mongo-db-atlas-credentials/': '/resources/databases/mongodb-atlas/',
  '/user-guides/vpcs/': '/configuration/connecting-resources/',
  '/user-guides/writing-config-in-typescript/': '/configuration/configuration-files/'
};
const posthogSourceMapsEnabled = Boolean(process.env.POSTHOG_API_KEY && process.env.POSTHOG_PROJECT_ID);
const posthogSourceMapPlugin = posthogSourceMapsEnabled
  ? posthog({
      personalApiKey: process.env.POSTHOG_API_KEY,
      projectId: process.env.POSTHOG_PROJECT_ID,
      host: process.env.POSTHOG_HOST || 'https://eu.posthog.com',
      sourcemaps: {
        releaseName: 'stacktape-docs',
        releaseVersion: process.env.POSTHOG_RELEASE_VERSION || 'local',
        deleteAfterUpload: true
      }
    })
  : null;

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  // Pages renamed or merged in v4. The old URLs are linked from older blog posts, issues and search results.
  redirects: {
    '/packaging/containers/nixpacks/': '/packaging/containers/buildpack/',
    '/packaging/containers/external-buildpack/': '/packaging/containers/buildpack/',
    '/packaging/containers/custom-dockerfile/': '/packaging/containers/dockerfile/',
    '/packaging/containers/stacktape-buildpack/': '/packaging/containers/js-bundle/',
    '/packaging/function/stacktape-buildpack/': '/packaging/function/js-bundle/',
    '/stacktape-console/visual-config-editor/': '/stacktape-console/console-overview/',
    '/using-with-ai/config-generation-from-repository/': '/cli/init/',
    '/using-with-ai/ai-coding-assistant-integrations/': '/using-with-ai/mcp-server-setup/',
    // v3 (3.7.1) pages whose topic has a v4 page. Old v3 pages without a v4 counterpart are not listed here.
    ...v3PagesWithV4Equivalent
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover'
  },
  markdown: {
    // Our own <CodeBlock> island handles syntax highlighting (Shiki + Twoslash in the browser), so
    // Astro's compile-time Shiki is disabled. Smartquotes would corrupt code and inline text.
    // Astro 7 replaced `markdown.{remarkPlugins,rehypePlugins,gfm,smartypants}` with a single
    // `processor` built via `unified({...})`; the MDX integration inherits the processor's plugins,
    // so these still apply to every `.mdx` page.
    syntaxHighlight: false,
    processor: unified({
      gfm: true,
      smartypants: false,
      // Astro auto-injects heading ids and collects `headings` (used for the TOC), so no
      // slug/autolink plugins are needed. remark order matters: fix-jsx-template-indent (restores
      // verbatim code in `<CodeBlock tabs>` template literals, undoing MDX's multi-line dedent) →
      // docs transforms → code-to-component (last, so it converts every resulting code node).
      remarkPlugins: [remarkFixJsxTemplateIndent, remarkDocsTransforms, remarkCodeToComponent],
      rehypePlugins: [rehypeDocsLinks]
    })
  },
  integrations: [
    react(),
    mdx(),
    generatedRuntimeAssets(),
    sitemap({
      serialize(item) {
        const pathname = new URL(item.url).pathname;
        const sourcePath = pathname === '/' ? 'content/index.mdx' : `content${pathname.replace(/\/$/, '')}.mdx`;
        const lastModified = getGitLastModified(sourcePath);
        return lastModified ? { ...item, lastmod: new Date(lastModified) } : item;
      }
    })
  ],
  vite: {
    plugins: [apiReferenceDataPlugin(), tailwindcss(), ...(posthogSourceMapPlugin ? [posthogSourceMapPlugin] : [])],
    resolve: {
      // Force a single React copy. Without this, a mid-session dep re-optimization can momentarily
      // resolve a second React instance for some islands → "Invalid hook call / more than one copy
      // of React" during SSR.
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime']
    },
    optimizeDeps: {
      // Pre-bundle the heavy code-highlighting deps at server start so Vite does NOT re-optimize
      // mid-session. A mid-session re-optimization changes the `?v=` hash and 404s Shiki's
      // already-resolved grammar URLs in `.vite/deps` ("Failed to fetch dynamically imported
      // module" → yaml/json highlighting breaks after a tab switch). The CodeBlock also preloads
      // every grammar up front (see SHIKI_LANGS) so none are fetched lazily after that point.
      include: ['shiki', '@shikijs/twoslash', 'twoslash', 'typescript']
    },
    server: {
      // `src/utils/starter-projects.ts` reads generated metadata from `apps/cli`.
      fs: { allow: [REPO_ROOT] }
    }
  }
});
