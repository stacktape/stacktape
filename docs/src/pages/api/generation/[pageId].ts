import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { NextApiRequest, NextApiResponse } from 'next';

const STATE_DIR = join(process.cwd(), 'scripts', 'generate-docs', '.state');

// Restrict pageId to the same character set the pipeline writes (lowercase alphanumeric + '_'),
// so a request can't escape the state directory via traversal.
const PAGE_ID_PATTERN = /^[a-z0-9_]+$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const rawPageId = req.query.pageId;
  const pageId = Array.isArray(rawPageId) ? rawPageId[0] : rawPageId;
  if (!pageId || !PAGE_ID_PATTERN.test(pageId)) {
    return res.status(400).json({ error: 'invalid pageId' });
  }
  const path = join(STATE_DIR, `${pageId}.json`);
  if (!existsSync(path)) {
    return res.status(404).json({ error: 'state not found' });
  }
  try {
    const raw = await readFile(path, 'utf8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(JSON.parse(raw));
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}
