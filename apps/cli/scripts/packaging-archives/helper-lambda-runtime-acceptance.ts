/**
 * The CDN edge helper Lambdas, built as a release builds them, run in the Lambda runtime with CloudFront events.
 *
 * `cdnOriginRequestLambda` and `cdnOriginResponseLambda` are deployed into every customer account with a CDN. They
 * run at the CloudFront edge, where a load error or a wrong rewrite breaks every request of a site, and the edge
 * runtime cannot be observed locally except by running the artifact. The helper ZIPs are built here with the CLI's
 * release helper packaging (or supplied with `--helper-lambdas-dir`), verified, extracted with `unzip` and invoked
 * in the official Lambda Node.js 22 image, the helpers' deployed runtime, as an unprivileged user that owns none of
 * the files, with the origin-request and origin-response events CloudFront sends:
 *
 * - a single-page-application bucket origin: a route without an extension is rewritten to `/index.html`, a file with
 *   an extension is left alone;
 * - a bucket origin without URL normalization: the URI is left alone;
 * - a custom origin with the rewrite-host header: the `Host` header becomes the configured value; without it, the
 *   request is forwarded unchanged;
 * - a bucket origin response: `x-amz-meta-*` headers lose their prefix, other headers keep their key and value; a
 *   custom origin response is returned unchanged.
 *
 * The service helper (custom resources) is covered by `test:asset-replacer`; the batch job trigger and the uptime
 * prober need Step Functions, SSM and the Console API and are qualified live.
 *
 *   pnpm --filter @stacktape/cli run test:helper-lambda-runtime -- [--out <dir>] [--helper-lambdas-dir <dir>]
 *
 * Needs Docker and `unzip`; contacts no AWS service.
 */
import { mkdir, readdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadHelperLambdaDetailsFromDir } from '@utils/helper-lambdas';
import { stacktapeCloudfrontHeaders } from '@helper-lambdas/cloudfront/cloudfront-origin-headers';
import { HELPER_LAMBDAS_FOLDER_NAME } from 'src/config/project-paths';
import yargsParser from 'yargs-parser';
import { packageHelperLambdas } from '../package-helper-lambdas';
import { outputTail } from '../qualification/process';
import { writeJsonAtomic } from '../qualification/report';
import { verifyHelperLambdaArtifacts } from '../verify-helper-lambda-artifacts';
import { ensureLambdaImage, extractZip, invokeInLambdaRuntime, listLeftoverContainers } from './lambda-runtime';

const CLI_ROOT = resolve(import.meta.dir, '..', '..');
/** The runtime the CLI deploys helper Lambdas with (`config-manager`: `nodejs22.x`). */
const HELPER_IMAGE = 'public.ecr.aws/lambda/nodejs:22';

const checks: { check: string; ok: boolean; detail: string }[] = [];
const check = (name: string, ok: boolean, detail: string) => {
  checks.push({ check: name, ok, detail });
  console.log(`${ok ? 'ok    ' : 'FAILED'}  ${name} — ${outputTail(detail, 400)}`);
};

type CloudFrontHeaders = Record<string, { key: string; value: string }[]>;
const header = (name: string, value: string): CloudFrontHeaders => ({ [name.toLowerCase()]: [{ key: name, value }] });

const bucketOrigin = ({ spa, normalizeUrls }: { spa: boolean; normalizeUrls: boolean }) => ({
  s3: {
    authMethod: 'origin-access-identity',
    customHeaders: {
      ...header(stacktapeCloudfrontHeaders.originType(), 'bucket'),
      ...header(stacktapeCloudfrontHeaders.spaHeader(), String(spa)),
      ...header(stacktapeCloudfrontHeaders.urlOptimization(), String(normalizeUrls))
    },
    domainName: 'site-bucket.s3.eu-west-1.amazonaws.com',
    path: '',
    region: 'eu-west-1'
  }
});

const customOrigin = ({ rewriteHost }: { rewriteHost?: string }) => ({
  custom: {
    customHeaders: {
      ...header(stacktapeCloudfrontHeaders.originType(), 'http-api-gateway'),
      ...(rewriteHost === undefined ? {} : header(stacktapeCloudfrontHeaders.rewriteHostHeader(), rewriteHost))
    },
    domainName: 'abc123.execute-api.eu-west-1.amazonaws.com',
    keepaliveTimeout: 5,
    path: '',
    port: 443,
    protocol: 'https',
    readTimeout: 30,
    sslProtocols: ['TLSv1.2']
  }
});

const requestEvent = ({ uri, origin, method = 'GET' }: { uri: string; origin: unknown; method?: string }) => ({
  Records: [
    {
      cf: {
        config: {
          distributionDomainName: 'd111111abcdef8.cloudfront.net',
          distributionId: 'EDFDVBD6EXAMPLE',
          eventType: 'origin-request',
          requestId: 'request-id'
        },
        request: {
          clientIp: '203.0.113.178',
          headers: { ...header('Host', 'd111111abcdef8.cloudfront.net'), ...header('User-Agent', 'acceptance') },
          method,
          querystring: '',
          uri,
          origin
        }
      }
    }
  ]
});

const responseEvent = ({ origin, headers }: { origin: unknown; headers: CloudFrontHeaders }) => ({
  Records: [
    {
      cf: {
        config: {
          distributionDomainName: 'd111111abcdef8.cloudfront.net',
          distributionId: 'EDFDVBD6EXAMPLE',
          eventType: 'origin-response',
          requestId: 'request-id'
        },
        request: {
          clientIp: '203.0.113.178',
          headers: header('Host', 'd111111abcdef8.cloudfront.net'),
          method: 'GET',
          querystring: '',
          uri: '/index.html',
          origin
        },
        response: { status: '200', statusDescription: 'OK', headers }
      }
    }
  ]
});

type Request = { uri: string; headers: CloudFrontHeaders };
type Response = { status: string; headers: CloudFrontHeaders };

const main = async () => {
  const args = yargsParser(process.argv.slice(2), { string: ['out', 'helper-lambdas-dir'] });
  const outDirectory = resolve(
    args.out ??
      join(CLI_ROOT, '.stacktape', 'helper-lambda-runtime-acceptance', new Date().toISOString().replace(/[:.]/g, '-'))
  );
  await mkdir(outDirectory, { recursive: true });
  if ((await readdir(outDirectory)).length > 0) throw new Error(`Refusing to write into ${outDirectory}: not empty.`);
  const image = ensureLambdaImage(HELPER_IMAGE);

  const suppliedHelperDirectory = args['helper-lambdas-dir'] ? resolve(args['helper-lambdas-dir']) : null;
  const helperLambdasDir = suppliedHelperDirectory ?? join(outDirectory, 'helper-build', HELPER_LAMBDAS_FOLDER_NAME);
  if (!suppliedHelperDirectory) await packageHelperLambdas({ distFolderPath: join(outDirectory, 'helper-build') });
  const verified = await verifyHelperLambdaArtifacts({ helperLambdasDir });
  const details = await loadHelperLambdaDetailsFromDir({ helperLambdasDir });
  const report: Record<string, unknown> = {
    image,
    helpers: suppliedHelperDirectory ? 'supplied' : 'built from this checkout',
    verified,
    invocations: [] as unknown[]
  };
  const invocations = report.invocations as unknown[];

  const extracted = new Map<string, string>();
  try {
    for (const name of ['cdnOriginRequestLambda', 'cdnOriginResponseLambda'] as const) {
      extracted.set(name, await extractZip(details[name].artifactPath));
    }
    const invoke = async <Result>(name: 'cdnOriginRequestLambda' | 'cdnOriginResponseLambda', event: unknown) => {
      const invocation = await invokeInLambdaRuntime({
        functionDirectory: extracted.get(name)!,
        handler: details[name].handler,
        image: HELPER_IMAGE,
        event
      });
      invocations.push({ name, status: invocation.status, body: invocation.body.slice(0, 2_000) });
      if (invocation.status !== 200) {
        throw new Error(`${name} returned HTTP ${invocation.status}: ${invocation.body}\n${invocation.logs.stderr}`);
      }
      const result = JSON.parse(invocation.body) as Result & { errorMessage?: string };
      if (result.errorMessage !== undefined) {
        throw new Error(`${name} failed: ${invocation.body}\n${invocation.logs.stdout}`);
      }
      return result;
    };

    const spaRoute = await invoke<Request>(
      'cdnOriginRequestLambda',
      requestEvent({ uri: '/dashboard/settings', origin: bucketOrigin({ spa: true, normalizeUrls: false }) })
    );
    check(
      'SPA bucket origin: a route without an extension serves /index.html',
      spaRoute.uri === '/index.html',
      `uri=${spaRoute.uri}`
    );

    const spaAsset = await invoke<Request>(
      'cdnOriginRequestLambda',
      requestEvent({ uri: '/assets/app.3f2a1c.css', origin: bucketOrigin({ spa: true, normalizeUrls: false }) })
    );
    check(
      'SPA bucket origin: a file with an extension is left alone',
      spaAsset.uri === '/assets/app.3f2a1c.css',
      `uri=${spaAsset.uri}`
    );

    const plainBucket = await invoke<Request>(
      'cdnOriginRequestLambda',
      requestEvent({ uri: '/docs/getting-started', origin: bucketOrigin({ spa: false, normalizeUrls: false }) })
    );
    check(
      'bucket origin without URL normalization: the URI is forwarded unchanged',
      plainBucket.uri === '/docs/getting-started',
      `uri=${plainBucket.uri}`
    );

    const rewritten = await invoke<Request>(
      'cdnOriginRequestLambda',
      requestEvent({ uri: '/api/items', origin: customOrigin({ rewriteHost: 'api.example.com' }) })
    );
    check(
      'custom origin with the rewrite-host header: the Host header becomes the configured value',
      rewritten.headers.host?.[0]?.value === 'api.example.com' && rewritten.uri === '/api/items',
      `host=${JSON.stringify(rewritten.headers.host)} uri=${rewritten.uri}`
    );

    const forwarded = await invoke<Request>(
      'cdnOriginRequestLambda',
      requestEvent({ uri: '/api/items', origin: customOrigin({}) })
    );
    check(
      'custom origin without the rewrite-host header: the request is forwarded unchanged',
      forwarded.headers.host?.[0]?.value === 'd111111abcdef8.cloudfront.net' && forwarded.uri === '/api/items',
      `host=${JSON.stringify(forwarded.headers.host)} uri=${forwarded.uri}`
    );

    const bucketResponse = await invoke<Response>(
      'cdnOriginResponseLambda',
      responseEvent({
        origin: bucketOrigin({ spa: false, normalizeUrls: false }),
        headers: {
          ...header('x-amz-meta-cache-control', 'public, max-age=31536000, immutable'),
          ...header('x-amz-meta-x-robots-tag', 'noindex'),
          ...header('Content-Type', 'text/html; charset=utf-8'),
          ...header('ETag', '"abc"')
        }
      })
    );
    check(
      'bucket origin response: x-amz-meta-* headers lose their prefix and the others stay',
      bucketResponse.status === '200' &&
        bucketResponse.headers['cache-control']?.[0]?.key === 'cache-control' &&
        bucketResponse.headers['cache-control']?.[0]?.value === 'public, max-age=31536000, immutable' &&
        bucketResponse.headers['x-robots-tag']?.[0]?.value === 'noindex' &&
        bucketResponse.headers['content-type']?.[0]?.key === 'Content-Type' &&
        bucketResponse.headers.etag?.[0]?.value === '"abc"' &&
        !('x-amz-meta-cache-control' in bucketResponse.headers),
      JSON.stringify(bucketResponse.headers)
    );

    const customHeaders = {
      ...header('x-amz-meta-cache-control', 'no-store'),
      ...header('Content-Type', 'application/json')
    };
    const customResponse = await invoke<Response>(
      'cdnOriginResponseLambda',
      responseEvent({ origin: customOrigin({}), headers: customHeaders })
    );
    check(
      'custom origin response: returned unchanged',
      customResponse.status === '200' && JSON.stringify(customResponse.headers) === JSON.stringify(customHeaders),
      JSON.stringify(customResponse.headers)
    );
  } finally {
    await Promise.all([...extracted.values()].map((directory) => rm(directory, { recursive: true, force: true })));
    const leftovers = listLeftoverContainers();
    check('no acceptance container is left behind', leftovers.length === 0, leftovers.join(', ') || 'none');
    report.checks = checks;
    await writeJsonAtomic(join(outDirectory, 'report.json'), report);
  }
  const failed = checks.filter((entry) => !entry.ok);
  if (failed.length > 0) {
    throw new Error(`${failed.length} check(s) failed: ${failed.map((entry) => entry.check).join('; ')}`);
  }
  console.log(`Helper Lambda runtime acceptance passed; report at ${join(outDirectory, 'report.json')}`);
};

void main().catch((error: unknown) => {
  console.error(outputTail(error instanceof Error ? (error.stack ?? error.message) : String(error), 12_000));
  process.exitCode = 1;
});
