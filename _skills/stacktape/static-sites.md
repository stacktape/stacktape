# Deploying Static Sites & SPAs

Deploy React, Vue, Svelte, or any static site with global CDN.

## Static Site (Vite, Create React App, etc.)

```yaml
resources:
  website:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist  # Your build output folder
      hostingContentType: single-page-app
```

That's it. Build and deploy:
```bash
npm run build
npx stacktape deploy --stage prod --region us-east-1
```

## With Custom Domain

```yaml
resources:
  website:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: single-page-app
      customDomains:
        - domainName: www.myapp.com
        - domainName: myapp.com
```

## SPA with API Backend

```yaml
resources:
  # Frontend (React, Vue, etc.)
  frontend:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./frontend/dist
      hostingContentType: single-page-app
      customDomains:
        - domainName: myapp.com

  # Backend API
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./backend/src/api.ts
      events:
        - type: http-api-gateway
          properties:
            path: /{proxy+}
            method: '*'
            httpApiGatewayName: apiGateway
      connectTo:
        - database

  apiGateway:
    type: http-api-gateway
    properties:
      customDomains:
        - domainName: api.myapp.com
      cors:
        enabled: true
        allowOrigins:
          - https://myapp.com
        allowMethods:
          - GET
          - POST
          - PUT
          - DELETE

  database:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql-serverless-v2
        properties:
          version: '16'
```

## Astro / Static Site Generator

```yaml
resources:
  blog:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: static-website
      cacheControl:
        - pattern: "**/*.html"
          maxAge: 0  # Always revalidate HTML
        - pattern: "**/*"
          maxAge: 31536000  # Cache assets for 1 year
```

## Marketing Site with Contact Form

```yaml
resources:
  # Static marketing pages
  website:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: static-website
      customDomains:
        - domainName: mycompany.com

  # Contact form API
  contactApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/contact.ts
      events:
        - type: http-api-gateway
          properties:
            path: /contact
            method: POST
            httpApiGatewayName: apiGateway
      connectTo:
        - aws:ses  # For sending emails

  apiGateway:
    type: http-api-gateway
    properties:
      customDomains:
        - domainName: api.mycompany.com
      cors:
        enabled: true
        allowOrigins:
          - https://mycompany.com
```

## Build Before Deploy

```yaml
hooks:
  beforeDeploy:
    - scriptName: build

scripts:
  build:
    type: local-script
    properties:
      executeCommand: npm run build
```
