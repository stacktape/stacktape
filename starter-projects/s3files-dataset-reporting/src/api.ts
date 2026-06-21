import { readFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';

type Catalog = {
  generatedAt: string;
  datasetRoot: string;
  datasets: {
    name: string;
    path: string;
    format: string;
    sizeBytes: number;
    records: number | null;
    sample: unknown[];
    updatedAt: string;
  }[];
};

const datasetRoot = process.env.DATASET_ROOT || '/mnt/datasets';
const catalogPath = join(datasetRoot, 'catalog', 'catalog.json');
const rawDir = join(datasetRoot, 'raw');

export const handler = async (event: any) => {
  const method = event.requestContext?.http?.method || 'GET';
  const path = event.rawPath || '/';

  if (method === 'GET' && path === '/') {
    return json({ routes: ['GET /catalog', 'GET /sample?dataset=relative/path.csv&limit=5'] });
  }

  if (method === 'GET' && path === '/catalog') {
    return json(await readCatalog());
  }

  if (method === 'GET' && path === '/sample') {
    const dataset = event.queryStringParameters?.dataset;
    const limit = Number(event.queryStringParameters?.limit || 5);

    if (!dataset) {
      return json({ error: "Query parameter 'dataset' is required." }, 400);
    }

    const filePath = resolveDatasetPath(dataset);
    const contents = await readFile(filePath, 'utf8');
    return json({
      dataset,
      sample: contents
        .trim()
        .split(/\r?\n/)
        .slice(0, Number.isFinite(limit) ? limit : 5)
    });
  }

  return json({ error: 'Not found' }, 404);
};

const readCatalog = async (): Promise<Catalog | { generated: false; message: string }> => {
  try {
    return JSON.parse(await readFile(catalogPath, 'utf8')) as Catalog;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {
        generated: false,
        message: 'Catalog has not been generated yet. Invoke the scheduled buildCatalog function first.'
      };
    }
    throw error;
  }
};

const resolveDatasetPath = (dataset: string) => {
  const normalized = normalize(dataset).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(rawDir, normalized);

  if (!filePath.startsWith(rawDir)) {
    throw new Error('Invalid dataset path.');
  }

  return filePath;
};

const json = (body: unknown, statusCode = 200) => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body)
});
