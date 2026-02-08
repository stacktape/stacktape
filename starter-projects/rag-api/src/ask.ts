import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getEmbedding, cosineSimilarity } from './embeddings';

const bedrock = new BedrockRuntimeClient({});
const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.STP_CHUNKS_NAME!;
const LLM_MODEL = 'anthropic.claude-3-haiku-20240307-v1:0';

const handler = async (event: { body: string }) => {
  const { question } = JSON.parse(event.body);

  if (!question) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing question' })
    };
  }

  // Generate embedding for the question
  const questionEmbedding = await getEmbedding(question);

  // Retrieve all chunks (for production, use pgvector or OpenSearch instead)
  const result = await client.send(new ScanCommand({ TableName: tableName }));
  const items = result.Items || [];

  // Rank chunks by cosine similarity and take top 3
  const scored = items
    .map((item) => ({
      text: item.text as string,
      score: cosineSimilarity(questionEmbedding, JSON.parse(item.embedding as string))
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const context = scored.map((s) => s.text).join('\n\n');

  // Generate answer using Claude via Bedrock
  const response = await bedrock.send(
    new InvokeModelCommand({
      modelId: LLM_MODEL,
      contentType: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Answer the following question based on the provided context. If the context doesn't contain relevant information, say so.\n\nContext:\n${context}\n\nQuestion: ${question}`
          }
        ]
      })
    })
  );

  const llmResult = JSON.parse(new TextDecoder().decode(response.body));
  const answer = llmResult.content[0].text;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answer,
      sources: scored.map((s) => ({ text: s.text.slice(0, 100) + '...', score: s.score }))
    })
  };
};

export default handler;
