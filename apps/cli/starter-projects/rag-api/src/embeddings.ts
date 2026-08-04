import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrock = new BedrockRuntimeClient({});
const EMBEDDING_MODEL = 'amazon.titan-embed-text-v2:0';

export const getEmbedding = async (text: string): Promise<number[]> => {
  const response = await bedrock.send(
    new InvokeModelCommand({
      modelId: EMBEDDING_MODEL,
      contentType: 'application/json',
      body: JSON.stringify({ inputText: text })
    })
  );
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.embedding;
};

export const cosineSimilarity = (a: number[], b: number[]): number => {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};
