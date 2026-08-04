import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { getEmbedding } from './embeddings';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.STP_CHUNKS_NAME!;

const splitIntoChunks = (text: string, chunkSize: number, overlap: number): string[] => {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push(text.slice(i, i + chunkSize));
    if (i + chunkSize >= text.length) break;
  }
  return chunks;
};

const handler = async (event: { body: string }) => {
  const { text, documentId } = JSON.parse(event.body);

  if (!text || !documentId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing text or documentId' })
    };
  }

  // Split text into ~500 char chunks with 50 char overlap
  const chunks = splitIntoChunks(text, 500, 50);

  // Generate embeddings and store each chunk
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await getEmbedding(chunks[i]);
    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          documentId,
          chunkId: `chunk-${i}`,
          text: chunks[i],
          embedding: JSON.stringify(embedding)
        }
      })
    );
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `Ingested ${chunks.length} chunks from document ${documentId}` })
  };
};

export default handler;
