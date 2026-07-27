## Resources

### apiGateway (HTTP API Gateway)

HTTP API Gateway that serves as the entry point for all API requests. Provides two endpoints: `POST /ingest` for
uploading and processing documents, and `POST /ask` for submitting questions. CORS is enabled for browser-based clients.

### chunks (DynamoDB Table)

Stores document chunks along with their vector embeddings. Each item is keyed by `documentId` (partition key) and
`chunkId` (sort key), and contains the chunk text and its serialized embedding vector. Used as a simple vector store —
the `/ask` endpoint scans all chunks and computes cosine similarity in code. For production workloads, consider
replacing this with pgvector or OpenSearch for efficient approximate nearest-neighbor search.

### ingest (Lambda Function)

Handles `POST /ingest` requests. Accepts a JSON body with `text` and `documentId`, splits the text into overlapping
~500-character chunks, generates an embedding for each chunk using Amazon Titan Embed via Bedrock, and stores the chunks
with their embeddings in the `chunks` DynamoDB table.

### ask (Lambda Function)

Handles `POST /ask` requests. Accepts a JSON body with a `question`, generates an embedding for the question, retrieves
all stored chunks from DynamoDB, ranks them by cosine similarity, and sends the top 3 most relevant chunks as context to
Claude (via Amazon Bedrock) to generate a grounded answer. Returns the answer along with source snippets and similarity
scores.

## IAM Permissions

Both Lambda functions include IAM role statements granting `bedrock:InvokeModel` access (and
`bedrock:InvokeModelWithResponseStream` for the ask function) so they can call Amazon Bedrock embedding and LLM models.
