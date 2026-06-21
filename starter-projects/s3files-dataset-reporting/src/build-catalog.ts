import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join, relative } from 'node:path';

type DatasetEntry = {
  name: string;
  path: string;
  format: string;
  sizeBytes: number;
  records: number | null;
  sample: unknown[];
  updatedAt: string;
};

const datasetRoot = process.env.DATASET_ROOT || '/mnt/datasets';
const rawDir = join(datasetRoot, 'raw');
const catalogDir = join(datasetRoot, 'catalog');
const catalogPath = join(catalogDir, 'catalog.json');

export const handler = async () => {
  const datasets = await scanDatasets(rawDir);
  const catalog = {
    generatedAt: new Date().toISOString(),
    datasetRoot,
    datasets
  };

  await mkdir(catalogDir, { recursive: true });
  await writeFile(catalogPath, JSON.stringify(catalog, null, 2));

  return {
    datasets: datasets.length,
    catalogPath,
    generatedAt: catalog.generatedAt
  };
};

const scanDatasets = async (dir: string): Promise<DatasetEntry[]> => {
  const entries = await listFiles(dir);
  const supportedFiles = entries.filter((filePath) => ['.csv', '.json', '.jsonl'].includes(extname(filePath)));
  const datasets = await Promise.all(supportedFiles.map(inspectDataset));
  return datasets.sort((a, b) => a.path.localeCompare(b.path));
};

const listFiles = async (dir: string): Promise<string[]> => {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map((entry) => {
        const entryPath = join(dir, entry.name);
        return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
      })
    );
    return nested.flat();
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

const inspectDataset = async (filePath: string): Promise<DatasetEntry> => {
  const [fileStats, contents] = await Promise.all([stat(filePath), readFile(filePath, 'utf8')]);
  const format = extname(filePath).slice(1);
  const sample = parseSample(format, contents);

  return {
    name: basename(filePath),
    path: relative(rawDir, filePath).replace(/\\/g, '/'),
    format,
    sizeBytes: fileStats.size,
    records: countRecords(format, contents),
    sample,
    updatedAt: fileStats.mtime.toISOString()
  };
};

const countRecords = (format: string, contents: string): number | null => {
  if (format === 'csv') {
    return Math.max(contents.trim().split(/\r?\n/).length - 1, 0);
  }
  if (format === 'jsonl') {
    return contents.trim() ? contents.trim().split(/\r?\n/).length : 0;
  }
  if (format === 'json') {
    const parsed = JSON.parse(contents);
    return Array.isArray(parsed) ? parsed.length : 1;
  }
  return null;
};

const parseSample = (format: string, contents: string): unknown[] => {
  if (format === 'csv') {
    const [headerLine, ...rows] = contents.trim().split(/\r?\n/);
    const headers = splitCsvLine(headerLine || '');
    return rows.slice(0, 5).map((row) => {
      const values = splitCsvLine(row);
      return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
    });
  }
  if (format === 'jsonl') {
    return contents
      .trim()
      .split(/\r?\n/)
      .slice(0, 5)
      .map((line) => JSON.parse(line));
  }
  const parsed = JSON.parse(contents);
  return Array.isArray(parsed) ? parsed.slice(0, 5) : [parsed];
};

const splitCsvLine = (line: string) => line.split(',').map((value) => value.trim());
