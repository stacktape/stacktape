# Connecting to an OpenSearch domain

You can connect to your OpenSearch domain either from anywhere on the internet or exclusively from resources within your stack's _VPC_, depending on your [accessibility](./09-restrict-access.md) configuration.

In either case, you need valid _IAM_ credentials. You can grant these to your stack's resources using the `connectTo` property.

```yaml
resources:
  myOpenSearch:
    type: open-search-domain
    properties:
      accessibility:
        accessibilityMode: vpc

  webService:
    type: web-service
    properties:
      # ...
      # {start-highlight}
      connectTo:
        - myOpenSearch
      # {stop-highlight}
```

> A web service connected to an OpenSearch domain.

```ts
import { Client, Connection } from "@opensearch-project/opensearch";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import aws4 from "aws4";

// The OpenSearch domain endpoint is automatically injected as an environment variable
const host = `https://${process.env.STP_MY_OPEN_SEARCH_DOMAIN_ENDPOINT}`;

const createAwsConnector = (credentials, region) => {
  class AmazonConnection extends Connection {
    buildRequestObject(params) {
      const request = super.buildRequestObject(params) as any;
      request.service = "es";
      request.region = region;
      request.headers = request.headers || {};
      request.headers["host"] = request.hostname;

      return aws4.sign(request, credentials);
    }
  }
  return {
    Connection: AmazonConnection
  };
};

const getClient = async () => {
  const credentials = await defaultProvider()();
  return new Client({
    ...createAwsConnector(credentials, "eu-west-1"),
    node: host
  });
};

async function search() {
  const client = await getClient();
  await client.indices.create({
    index: "test-index"
  });
}
```

> Example code for connecting to an OpenSearch domain.