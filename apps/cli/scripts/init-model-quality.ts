/** Opt-in provider qualification; normal tests never start a live model. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { detectAgents } from '../src/init/agent/detect';
import { runAgentSessionWithRetry } from '../src/init/agent/session-runner';
import { spawnProcess } from '../src/init/agent/transports/claude-cli';
import {
  evaluateModelQuality,
  modelQualityCases,
  modelQualityTranscriptEvents,
  type ModelQualityScore
} from '../src/init/eval/model-quality';
import { runEvalCase } from '../src/init/eval/harness';

const main = async () => {
  const argv = process.argv.slice(2);
  const value = (flag: string) => argv[argv.indexOf(flag) + 1];
  if (!argv.includes('--live'))
    throw new Error('Model qualification requires --live; it consumes your provider allowance.');
  const provider = value('--provider');
  const model = value('--model');
  const reportPath = value('--out');
  if (
    !argv.includes('--provider') ||
    (provider !== 'claude-code' && provider !== 'codex') ||
    !argv.includes('--model') ||
    !model ||
    !argv.includes('--out') ||
    !reportPath
  ) {
    throw new Error(
      'Use --live --provider claude-code|codex --model <model-id> --out <report.json> [--compare <previous-report.json>].'
    );
  }
  const agent = (await detectAgents()).find((candidate) => candidate.id === provider);
  if (!agent) throw new Error(`The requested ${provider} CLI is not installed.`);
  const scores: ModelQualityScore[] = [];
  const baseline = [];
  const cancellation = new AbortController();
  let cancelledSignal: NodeJS.Signals | undefined;
  const cancel = (signal: NodeJS.Signals) => {
    cancelledSignal = signal;
    cancellation.abort();
  };
  const onSigint = () => cancel('SIGINT');
  const onSigterm = () => cancel('SIGTERM');
  process.once('SIGINT', onSigint);
  process.once('SIGTERM', onSigterm);
  try {
    for (const evalCase of modelQualityCases) {
      if (cancellation.signal.aborted) break;
      baseline.push(await runEvalCase(evalCase));
      if (cancellation.signal.aborted) break;
      scores.push(
        await evaluateModelQuality(evalCase, (input, hooks) =>
          runAgentSessionWithRetry(
            { ...input, signal: cancellation.signal, budget: { maxTurns: 12, wallClockMs: 90_000 } },
            hooks,
            {
              provider,
              executable: agent.executable,
              model,
              retryDelaysMs: [],
              spawner: async (spawnInput) => {
                const result = await spawnProcess(spawnInput);
                for (const event of modelQualityTranscriptEvents(result.stdout)) hooks.onEvent(event);
                return result;
              }
            }
          ).catch((error: unknown) => {
            if (cancellation.signal.aborted)
              return { stopReason: 'cancelled' as const, usage: { inputTokens: 0, outputTokens: 0 } };
            throw error;
          })
        )
      );
    }
  } finally {
    process.off('SIGINT', onSigint);
    process.off('SIGTERM', onSigterm);
  }
  const regressions: string[] = [];
  if (argv.includes('--compare')) {
    const previous = JSON.parse(await readFile(value('--compare'), 'utf8')) as { scores: ModelQualityScore[] };
    for (const score of scores) {
      if (previous.scores.find((old) => old.name === score.name)?.passed && !score.passed) regressions.push(score.name);
    }
  }
  const report = {
    provider,
    version: agent.version,
    model,
    baseline,
    scores,
    regressions,
    passed:
      !cancelledSignal &&
      scores.length === modelQualityCases.length &&
      scores.every((score) => score.passed) &&
      regressions.length === 0,
    ...(cancelledSignal ? { cancelledSignal } : {})
  };
  // Contains scores and metadata only, never prompts, tool results or credentials.
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.info(
    `${provider} ${model}: ${scores.filter((score) => score.passed).length}/${scores.length} cases passed. Report: ${reportPath}`
  );
  if (!report.passed) process.exitCode = cancelledSignal === 'SIGINT' ? 130 : cancelledSignal === 'SIGTERM' ? 143 : 1;
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
