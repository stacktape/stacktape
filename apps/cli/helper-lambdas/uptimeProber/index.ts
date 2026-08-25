import type { IncomingMessage } from 'node:http';
import http from 'node:http';
import https from 'node:https';
import type { TLSSocket } from 'node:tls';
import { GetParametersByPathCommand, SSMClient } from '@aws-sdk/client-ssm';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import type { ReportUptimeResultsParams } from '@stacktape/console-api/aws-identity';
import { helperLambdaAwsResourceNames } from '@stacktape/naming/helper-lambda-resource-names';
import { AwsIdentityProtectedClient } from '@stacktape-api/aws-identity-protected';
import type { UptimeCheckManifestEntry } from './manifest';

const MANIFEST_CACHE_TTL_MS = 2 * 60 * 1000;
const SECOND_ROUND_OFFSET_MS = 30 * 1000;
// If the first round ran this long, the +30s round would bleed into the next tick — skip it instead.
const SECOND_ROUND_DEADLINE_MS = 35 * 1000;
// Probes not started by these budgets are skipped, and in-flight probe timeouts are additionally
// capped by the round's hard stop: with a 55s function timeout, an overloaded round must shed load
// and shorten timeouts instead of dying mid-report and losing everything.
const FIRST_ROUND_BUDGET_MS = 25 * 1000;
const SECOND_ROUND_BUDGET_MS = 50 * 1000;
const FIRST_ROUND_HARD_STOP_MS = 27 * 1000;
const SECOND_ROUND_HARD_STOP_MS = 52 * 1000;
const MIN_PROBE_TIME_MS = 1500;
const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 512 * 1024;
const PROBE_CONCURRENCY = 10;
const REPORT_BATCH_SIZE = 500;

const ssmClient = new SSMClient({});

let manifestCache: { fetchedAt: number; entries: UptimeCheckManifestEntry[] } | undefined;

type ProbeResult = ReportUptimeResultsParams['results'][number];

export default async (event: { time?: string }) => {
  const invocationStart = Date.now();
  const scheduledTick = toMinuteIso(event?.time || new Date().toISOString());
  // Credentials rotate under warm containers, so the reporting client is rebuilt per invocation.
  const reporter = await createReporter();

  const entries = (await loadManifest()).filter(({ enabled }) => enabled);
  if (!entries.length) {
    return;
  }

  const firstRound = await probeAll({
    entries,
    scheduledTick,
    probeOrdinal: 0,
    startDeadline: invocationStart + FIRST_ROUND_BUDGET_MS,
    hardStopAt: invocationStart + FIRST_ROUND_HARD_STOP_MS
  });
  await report(reporter, firstRound);

  const halfMinuteEntries = entries.filter(({ intervalSeconds }) => intervalSeconds === 30);
  if (!halfMinuteEntries.length) {
    return;
  }
  const elapsed = Date.now() - invocationStart;
  if (elapsed > SECOND_ROUND_DEADLINE_MS) {
    console.info(`Skipping the +30s probe round: the first round took ${elapsed}ms.`);
    return;
  }
  await wait(Math.max(0, SECOND_ROUND_OFFSET_MS - elapsed));
  const secondRound = await probeAll({
    entries: halfMinuteEntries,
    scheduledTick,
    probeOrdinal: 1,
    startDeadline: invocationStart + SECOND_ROUND_BUDGET_MS,
    hardStopAt: invocationStart + SECOND_ROUND_HARD_STOP_MS
  });
  await report(reporter, secondRound);
};

const loadManifest = async (): Promise<UptimeCheckManifestEntry[]> => {
  if (manifestCache && Date.now() - manifestCache.fetchedAt < MANIFEST_CACHE_TTL_MS) {
    return manifestCache.entries;
  }
  try {
    const entries: UptimeCheckManifestEntry[] = [];
    let nextToken: string | undefined;
    do {
      const page = await ssmClient.send(
        new GetParametersByPathCommand({
          Path: helperLambdaAwsResourceNames.uptimeManifestParameterPrefix(),
          Recursive: true,
          NextToken: nextToken
        })
      );
      for (const parameter of page.Parameters || []) {
        try {
          const parsed = JSON.parse(parameter.Value || '') as UptimeCheckManifestEntry;
          if (parsed?.v === 1 && parsed.url && parsed.checkName) {
            entries.push(parsed);
          }
        } catch {
          console.error(`Ignoring unparsable uptime manifest parameter ${parameter.Name}.`);
        }
      }
      nextToken = page.NextToken;
    } while (nextToken);
    manifestCache = { fetchedAt: Date.now(), entries };
    return entries;
  } catch (err) {
    console.error(`Failed to load the uptime manifest from SSM: ${err}`);
    // Keep probing with the last known definitions rather than going silent.
    return manifestCache?.entries || [];
  }
};

const probeAll = async ({
  entries,
  scheduledTick,
  probeOrdinal,
  startDeadline,
  hardStopAt
}: {
  entries: UptimeCheckManifestEntry[];
  scheduledTick: string;
  probeOrdinal: 0 | 1;
  startDeadline: number;
  hardStopAt: number;
}): Promise<ProbeResult[]> => {
  const queue = [...entries];
  const results: ProbeResult[] = [];
  let shed = 0;
  await Promise.all(
    Array.from({ length: Math.min(PROBE_CONCURRENCY, queue.length) }, async () => {
      for (let entry = queue.shift(); entry; entry = queue.shift()) {
        if (Date.now() > startDeadline || hardStopAt - Date.now() < MIN_PROBE_TIME_MS) {
          shed += 1;
          continue;
        }
        results.push(await probe({ entry, scheduledTick, probeOrdinal, hardStopAt }));
      }
    })
  );
  if (shed) {
    console.error(`Shed ${shed} probes in round ${probeOrdinal}: the round exceeded its time budget.`);
  }
  return results;
};

const probe = async ({
  entry,
  scheduledTick,
  probeOrdinal,
  hardStopAt
}: {
  entry: UptimeCheckManifestEntry;
  scheduledTick: string;
  probeOrdinal: 0 | 1;
  hardStopAt: number;
}): Promise<ProbeResult> => {
  const base: Omit<ProbeResult, 'status'> = {
    project: entry.project,
    stage: entry.stage,
    checkName: entry.checkName,
    revision: entry.revision,
    scheduledTick,
    probeOrdinal
  };
  const startedAt = Date.now();
  try {
    const needsBody = entry.method === 'GET' && (entry.assertions || []).some(({ type }) => type === 'body-contains');
    const response = await request({
      url: entry.url,
      method: entry.method,
      // The round's hard stop caps the configured timeout so an in-flight slow endpoint can never
      // push the invocation past the Lambda timeout with unreported results.
      timeoutMs: Math.max(1000, Math.min(entry.timeoutSeconds * 1000, hardStopAt - Date.now())),
      followRedirects: entry.followRedirects,
      readBody: needsBody
    });
    const latencyMs = Date.now() - startedAt;
    const failureReason = evaluateAssertions({ entry, response });
    return {
      ...base,
      status: failureReason ? 'down' : 'up',
      httpStatus: response.statusCode,
      latencyMs,
      timings: response.timings,
      ...(failureReason ? { failureReason } : {}),
      ...(response.certExpiresAt ? { certExpiresAt: response.certExpiresAt } : {})
    };
  } catch (err) {
    return {
      ...base,
      status: 'down',
      latencyMs: Date.now() - startedAt,
      failureReason: String(err instanceof Error ? err.message : err).slice(0, 500)
    };
  }
};

const evaluateAssertions = ({
  entry,
  response
}: {
  entry: UptimeCheckManifestEntry;
  response: ProbeResponse;
}): string | undefined => {
  const statusAssertion = (entry.assertions || []).find((assertion) => assertion.type === 'status-code');
  if (statusAssertion) {
    if (!statusAssertion.properties.accepted.includes(response.statusCode)) {
      return `Status ${response.statusCode} is not among accepted [${statusAssertion.properties.accepted.join(', ')}].`;
    }
  } else if (response.statusCode < 200 || response.statusCode >= 400) {
    return `Status ${response.statusCode} is not a 2xx/3xx response.`;
  }
  for (const assertion of entry.assertions || []) {
    if (assertion.type === 'body-contains' && !(response.body || '').includes(assertion.properties.value)) {
      return `Response body does not contain "${assertion.properties.value}".`;
    }
  }
  return undefined;
};

type ProbeResponse = {
  statusCode: number;
  body?: string;
  certExpiresAt?: string;
  timings: { dnsMs?: number; connectMs?: number; tlsMs?: number; ttfbMs?: number };
};

const request = ({
  url,
  method,
  timeoutMs,
  followRedirects,
  readBody,
  redirectsLeft = MAX_REDIRECTS,
  deadline = Date.now() + timeoutMs
}: {
  url: string;
  method: 'GET' | 'HEAD';
  timeoutMs: number;
  followRedirects: boolean;
  readBody: boolean;
  redirectsLeft?: number;
  deadline?: number;
}): Promise<ProbeResponse> => {
  return new Promise((resolve, reject) => {
    let target: URL;
    try {
      target = new URL(url);
    } catch {
      reject(new Error(`Invalid URL: ${url}`));
      return;
    }
    if (target.protocol !== 'https:' && target.protocol !== 'http:') {
      reject(new Error(`Unsupported protocol: ${target.protocol}`));
      return;
    }
    const transport = target.protocol === 'https:' ? https : http;
    const startedAt = Date.now();
    // Millisecond marks per connection phase; deltas are computed at the end so a reused socket
    // (whose events never fire) simply reports no phase data instead of nonsense.
    const marks: { lookup?: number; connect?: number; secureConnect?: number; firstByte?: number } = {};
    const buildTimings = (): ProbeResponse['timings'] => {
      const timings: ProbeResponse['timings'] = {};
      if (marks.lookup !== undefined) timings.dnsMs = marks.lookup - startedAt;
      if (marks.connect !== undefined) timings.connectMs = marks.connect - (marks.lookup ?? startedAt);
      if (marks.secureConnect !== undefined) timings.tlsMs = marks.secureConnect - (marks.connect ?? startedAt);
      if (marks.firstByte !== undefined) {
        timings.ttfbMs = marks.firstByte - (marks.secureConnect ?? marks.connect ?? startedAt);
      }
      return timings;
    };
    let certExpiresAt: string | undefined;
    let settled = false;

    const req = transport.request(
      target,
      { method, headers: { 'user-agent': 'stacktape-uptime-prober/1' } },
      (res: IncomingMessage) => {
        marks.firstByte = Date.now();
        const statusCode = res.statusCode || 0;
        if (followRedirects && statusCode >= 300 && statusCode < 400 && res.headers.location && redirectsLeft === 0) {
          res.resume();
          clearTimeout(timer);
          settled = true;
          reject(new Error(`Stopped after ${MAX_REDIRECTS} redirects without reaching a final response.`));
          return;
        }
        if (followRedirects && statusCode >= 300 && statusCode < 400 && res.headers.location && redirectsLeft > 0) {
          res.resume();
          clearTimeout(timer);
          settled = true;
          resolve(
            request({
              url: new URL(res.headers.location, target).toString(),
              method,
              timeoutMs: Math.max(1, deadline - Date.now()),
              followRedirects,
              readBody,
              redirectsLeft: redirectsLeft - 1,
              deadline
            }).then((redirected) => ({
              ...redirected,
              timings: { ...buildTimings(), ...redirected.timings },
              certExpiresAt: redirected.certExpiresAt || certExpiresAt
            }))
          );
          return;
        }
        if (!readBody) {
          res.destroy();
          clearTimeout(timer);
          settled = true;
          resolve({ statusCode, timings: buildTimings(), ...(certExpiresAt ? { certExpiresAt } : {}) });
          return;
        }
        let bodyBytes = 0;
        const chunks: Buffer[] = [];
        const finish = () => {
          if (settled) return;
          clearTimeout(timer);
          settled = true;
          resolve({
            statusCode,
            body: Buffer.concat(chunks).toString('utf8'),
            timings: buildTimings(),
            ...(certExpiresAt ? { certExpiresAt } : {})
          });
        };
        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk.subarray(0, MAX_BODY_BYTES - bodyBytes));
          bodyBytes += chunk.length;
          if (bodyBytes >= MAX_BODY_BYTES) {
            // Everything the assertions can use has arrived; stop draining a potentially huge body.
            finish();
            res.destroy();
          }
        });
        res.on('end', finish);
        res.on('error', (err) => {
          if (!settled) {
            clearTimeout(timer);
            settled = true;
            reject(err);
          }
        });
      }
    );

    const timer = setTimeout(
      () => {
        if (!settled) {
          settled = true;
          req.destroy(new Error(`Request timed out after ${timeoutMs}ms.`));
          reject(new Error(`Request timed out after ${timeoutMs}ms.`));
        }
      },
      Math.max(1, deadline - Date.now())
    );

    req.on('socket', (socket) => {
      socket.once('lookup', () => {
        marks.lookup = Date.now();
      });
      socket.once('connect', () => {
        marks.connect = Date.now();
      });
      socket.once('secureConnect', () => {
        marks.secureConnect = Date.now();
        const cert = (socket as TLSSocket).getPeerCertificate();
        if (cert?.valid_to) {
          const expiry = new Date(cert.valid_to);
          if (!Number.isNaN(expiry.getTime())) {
            certExpiresAt = expiry.toISOString();
          }
        }
      });
    });
    req.on('error', (err) => {
      if (!settled) {
        clearTimeout(timer);
        settled = true;
        reject(err);
      }
    });
    req.end();
  });
};

const createReporter = async (): Promise<{ client: AwsIdentityProtectedClient; proberRegion: string } | undefined> => {
  const proberRegion = process.env.AWS_REGION;
  const apiUrl = process.env.STACKTAPE_TRPC_API_ENDPOINT;
  if (!proberRegion || !apiUrl) {
    console.error('Uptime prober is missing STACKTAPE_TRPC_API_ENDPOINT or AWS_REGION; results will be dropped.');
    return undefined;
  }
  const client = new AwsIdentityProtectedClient();
  await client.init({ credentials: await defaultProvider()(), region: proberRegion, apiUrl });
  return { client, proberRegion };
};

const report = async (reporter: Awaited<ReturnType<typeof createReporter>>, results: ProbeResult[]) => {
  if (!reporter || !results.length) {
    return;
  }
  for (let offset = 0; offset < results.length; offset += REPORT_BATCH_SIZE) {
    const batch = results.slice(offset, offset + REPORT_BATCH_SIZE);
    try {
      await withOneRetry(() =>
        reporter.client.reportUptimeResults.mutate({ proberRegion: reporter.proberRegion, results: batch })
      );
    } catch (err) {
      // Never fail the invocation over reporting: the Console's silence detection covers extended outages.
      console.error(`Failed to report ${batch.length} uptime results: ${err}`);
    }
  }
};

const withOneRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch {
    await wait(1000);
    return fn();
  }
};

const toMinuteIso = (time: string) => {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) {
    return new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
  }
  date.setUTCSeconds(0, 0);
  return date.toISOString();
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
