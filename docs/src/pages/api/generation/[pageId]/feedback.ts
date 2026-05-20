import { spawn } from 'node:child_process';
import { existsSync, openSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { NextApiRequest, NextApiResponse } from 'next';

const STATE_DIR = join(process.cwd(), 'scripts', 'generate-docs', '.state');
const DOCS_ROOT = process.cwd();
const SPAWN_LOG_DIR = join(STATE_DIR, 'review-spawns');

// Same identifier restriction the state-detail endpoint uses — keeps the spawned bun command's
// --onlyPage argument bounded to known-safe routes derived from pageId.
const PAGE_ID_PATTERN = /^[a-z0-9_]+$/;
const MAX_FEEDBACK_LENGTH = 10_000;

type RequestBody = {
  text?: string;
  // Optional flag to skip the spawn (just save the feedback). UI uses spawn=true by default.
  spawn?: boolean;
  // Optional iteration cap override. Defaults to currentIterations + 1, so a "re-iterate" click
  // adds exactly one iteration on top of what already ran.
  maxIterationsOverride?: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  const rawPageId = req.query.pageId;
  const pageId = Array.isArray(rawPageId) ? rawPageId[0] : rawPageId;
  if (!pageId || !PAGE_ID_PATTERN.test(pageId)) {
    return res.status(400).json({ error: 'invalid pageId' });
  }
  const path = join(STATE_DIR, `${pageId}.json`);
  if (!existsSync(path)) {
    return res.status(404).json({ error: 'state not found' });
  }
  const body = (req.body || {}) as RequestBody;
  const text = (body.text || '').trim();
  if (!text) {
    return res.status(400).json({ error: 'feedback text required' });
  }
  if (text.length > MAX_FEEDBACK_LENGTH) {
    return res.status(400).json({ error: `feedback too long (max ${MAX_FEEDBACK_LENGTH} chars)` });
  }

  try {
    const raw = await readFile(path, 'utf8');
    const state = JSON.parse(raw) as {
      pageRoute: string;
      iterations: Array<{ iteration: number }>;
      humanFeedback?: Array<{ addedAt: string; iterationAtTime: number; text: string }>;
    };
    const iterationAtTime = state.iterations.at(-1)?.iteration ?? 0;
    state.humanFeedback = [
      ...(state.humanFeedback || []),
      { addedAt: new Date().toISOString(), iterationAtTime, text }
    ];
    await writeFile(path, JSON.stringify(state, null, 2));

    const spawnIt = body.spawn !== false;
    let spawnInfo: { pid: number; logPath: string } | null = null;
    if (spawnIt) {
      const maxIterations =
        body.maxIterationsOverride && body.maxIterationsOverride > iterationAtTime
          ? body.maxIterationsOverride
          : iterationAtTime + 1;
      const route = state.pageRoute;
      // Sanity check: route should only contain segments from the page's pageId, so we can pass
      // it as a CLI argument safely without shell quoting risk. Route uses `/` as separator;
      // pageId uses `__`. Replace and compare.
      if (route.replaceAll('/', '__') !== pageId) {
        return res.status(400).json({ error: 'pageId/route mismatch' });
      }
      const { default: fsExtra } = await import('fs-extra');
      await fsExtra.ensureDir(SPAWN_LOG_DIR);
      const logPath = join(
        SPAWN_LOG_DIR,
        `${pageId}-${Date.now()}.log`
      );
      const out = openSync(logPath, 'a');
      const err = openSync(logPath, 'a');
      const child = spawn(
        'bun',
        [
          'run',
          'scripts/generate-docs/generate-pages.ts',
          '--onlyPage',
          route,
          '--continue',
          '--maxIterations',
          String(maxIterations)
        ],
        {
          cwd: DOCS_ROOT,
          detached: true,
          stdio: ['ignore', out, err],
          shell: false
        }
      );
      child.unref();
      spawnInfo = { pid: child.pid ?? -1, logPath };
    }

    res.status(200).json({
      ok: true,
      humanFeedbackCount: state.humanFeedback.length,
      spawned: spawnInfo
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}
