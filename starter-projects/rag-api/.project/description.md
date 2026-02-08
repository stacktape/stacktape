- Retrieval-Augmented Generation (RAG) API for question answering over your documents.
- Uses [Amazon Bedrock](https://aws.amazon.com/bedrock/) for embeddings and LLM responses, with
  [DynamoDB](https://docs.stacktape.com/resources/dynamo-db-tables/) for vector storage and
  [S3](https://docs.stacktape.com/resources/buckets/) for document uploads.
- Runs serverlessly in [AWS Lambda](https://docs.stacktape.com/compute-resources/lambda-functions/). Upload documents,
  then ask questions — the API retrieves relevant context and generates answers.
