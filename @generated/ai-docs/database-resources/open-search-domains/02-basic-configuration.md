# Basic configuration

To set up a basic OpenSearch domain, you only need to specify the resource type and the desired OpenSearch version.

```yaml
resources:
  myOpenSearch:
    type: open-search-domain
    properties:
      version: "2.17"
```