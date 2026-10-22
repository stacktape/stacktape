/**
 * Disposable real-AWS fixture for `scripts/real-aws/static-site-canary.ts`: one hosting bucket behind CloudFront with
 * the default `static-website` preset. There is no build step: the canary writes `./site` before each deploy, so it can
 * show that content changed by a redeploy is what the CDN serves next.
 *
 * The canary sets the owner variable below; the default only keeps the file loadable on its own.
 */
import { defineConfig, HostingBucket } from '@stacktape/config-authoring';

export default defineConfig(() => {
  const canaryOwner = process.env.STP_AWS_STATIC_CANARY_OWNER ?? 'local';
  const site = new HostingBucket({ uploadDirectoryPath: './site', hostingContentType: 'static-website' });

  return {
    resources: { site },
    stackConfig: { tags: [{ name: 'stacktape-canary-owner', value: canaryOwner }] }
  };
});
