# Hosting content type

You can specify the type of content you are hosting. Based on this, Stacktape will configure the HTTP headers of the uploaded files and the _CDN_ behavior.

```yaml
resources:
  myWebsite:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      # {start-highlight}
      hostingContentType: single-page-app
      # {stop-highlight}
```