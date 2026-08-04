- AI agent with tool calling and conversation memory, built with the [Vercel AI SDK](https://sdk.vercel.ai/) and
  [Amazon Bedrock](https://aws.amazon.com/bedrock/) (Claude).
- Runs serverlessly in [AWS Lambda](https://docs.stacktape.com/compute-resources/lambda-functions/) with
  [Lambda URL](https://docs.stacktape.com/compute-resources/lambda-functions/#lambda-url) and response streaming.
- Conversation history is persisted in [DynamoDB](https://docs.stacktape.com/resources/dynamo-db-tables/) so the agent
  remembers context across requests.
