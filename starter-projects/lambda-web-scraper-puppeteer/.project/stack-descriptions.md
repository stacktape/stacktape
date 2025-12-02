### 1.1 HTTP API Gateway

API Gateway receives requests and invokes our scraper function.

You can specify [more properties](https://docs.stacktape.com/resources/http-api-gateways/) on the gateway, in our case
we are going with the default setup.

```yml
resources:
  mainApiGateway:
    type: http-api-gateway
```

### 1.2 Function

Core of our application is a lambda function `scrapeLinks` which can scrape links from arbitrary webpage.

The function is configured as follows:

- **Packaging** - determines how the lambda artifact is built. The easiest and most optimized way to build the lambda
  from Typescript/Javascript is using `stacktape-lambda-buildpack`. We only need to configure `entryfilePath`. Stacktape
  automatically transpiles and builds the application code with all of its dependencies, creates the lambda zip
  artifact, and uploads it to a pre-created S3 bucket on AWS. You can also use
  [other types of packaging](https://docs.stacktape.com/configuration/packaging/#packaging-lambda-functions).
- **Events** - Events determine how is function triggered. In this case, we are triggering the function when an event
  (HTTP request) is delivered to the HTTP API gateway to URL path `/scrape-links/{url}`, where `{url}` is a path
  parameter(url can be arbitrary URL of page, i.e `stacktape.com/blog`). The event(request) including the path parameter
  is passed to the function handler as an argument.

```yml
scrapeLinks:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: src/scrape-links.ts
        excludeDependencies:
          - puppeteer
    events:
      - type: http-api-gateway
        properties:
          httpApiGatewayName: mainApiGateway
          path: /scrape-links/{url}
          method: GET
```
