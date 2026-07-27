import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

type ModelManifest = {
  modelId: string;
  version: string;
  labelsFile: string;
  weightsFile: string;
  updatedAt?: string;
};

type ScoreRequest = {
  customerId?: string;
  features?: string[];
};

type LoadedModel = {
  manifest: ModelManifest;
  labels: string[];
  weights: Record<string, Record<string, number>>;
  source: 'mounted-s3-files' | 'demo-fallback';
};

const modelDir = process.env.MODEL_DIR || '/mnt/models/churn-risk';
let cachedModel: LoadedModel | undefined;

export const handler = async (event: any) => {
  const method = event.requestContext?.http?.method || 'GET';
  const path = event.rawPath || '/';

  if (method === 'GET' && path === '/') {
    return json({
      routes: ['GET /model', 'POST /score'],
      expectedFiles: [join(modelDir, 'manifest.json'), join(modelDir, 'labels.json'), join(modelDir, 'weights.json')]
    });
  }

  if (method === 'GET' && path === '/model') {
    const model = await loadModel();
    return json({
      source: model.source,
      manifest: model.manifest,
      labels: model.labels
    });
  }

  if (method === 'POST' && path === '/score') {
    const body = parseBody<ScoreRequest>(event.body);
    if (!Array.isArray(body.features) || body.features.length === 0) {
      return json({ error: "Request body must include a non-empty 'features' array." }, 400);
    }

    const model = await loadModel();
    const scores = scoreLabels(model, body.features);

    return json({
      customerId: body.customerId || null,
      modelId: model.manifest.modelId,
      version: model.manifest.version,
      source: model.source,
      scores
    });
  }

  return json({ error: 'Not found' }, 404);
};

const loadModel = async (): Promise<LoadedModel> => {
  if (cachedModel) {
    return cachedModel;
  }

  try {
    const manifest = await readJson<ModelManifest>(join(modelDir, 'manifest.json'));
    const labels = await readJson<string[]>(join(modelDir, manifest.labelsFile));
    const weights = await readJson<Record<string, Record<string, number>>>(join(modelDir, manifest.weightsFile));
    cachedModel = { manifest, labels, weights, source: 'mounted-s3-files' };
    return cachedModel;
  } catch {
    cachedModel = {
      manifest: {
        modelId: 'demo-churn-risk',
        version: 'local-fallback',
        labelsFile: 'labels.json',
        weightsFile: 'weights.json'
      },
      labels: ['low-risk', 'medium-risk', 'high-risk'],
      weights: {
        'low-risk': { active_subscription: 0.6, high_usage: 0.4, recent_login: 0.2 },
        'medium-risk': { low_usage: 0.35, support_ticket: 0.25 },
        'high-risk': { late_payment: 0.65, no_recent_login: 0.45, low_usage: 0.3 }
      },
      source: 'demo-fallback'
    };
    return cachedModel;
  }
};

const scoreLabels = (model: LoadedModel, features: string[]) => {
  const normalizedFeatures = new Set(features.map((feature) => feature.trim()).filter(Boolean));

  return model.labels
    .map((label) => {
      const labelWeights = model.weights[label] || {};
      const score = Object.entries(labelWeights).reduce((total, [feature, weight]) => {
        return normalizedFeatures.has(feature) ? total + weight : total;
      }, 0);

      return { label, score: Number(score.toFixed(3)) };
    })
    .sort((a, b) => b.score - a.score);
};

const readJson = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, 'utf8')) as T;

const parseBody = <T>(body?: string): T => {
  if (!body) {
    return {} as T;
  }
  return JSON.parse(body) as T;
};

const json = (body: unknown, statusCode = 200) => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body)
});
