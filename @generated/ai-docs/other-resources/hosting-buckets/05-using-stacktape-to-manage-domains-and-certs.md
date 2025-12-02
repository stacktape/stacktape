# Using Stacktape to manage domains and certs

```yaml
resources:
  myWebsite:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: single-page-app
      # {start-highlight}
      customDomains:
        - domainName: example.com
      # {stop-highlight}
```