const RELEASE = 'initial';

export const handler = async () => ({
  statusCode: 200,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ release: RELEASE, feature: process.env.FEATURE ?? null })
});
