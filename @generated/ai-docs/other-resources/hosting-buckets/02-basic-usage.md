# Basic usage

You can configure a hosting bucket by simply providing the path to the directory you want to upload.

```yaml
resources:
  myWebsite:
    type: 'hosting-bucket'
    properties:
      uploadDirectoryPath: ./dist
```