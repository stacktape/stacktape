## Stacktape project Lambda Api Postgres Prisma Auth

### Description

Simple HTTP CRUD API implemented in typescript.
Every API operation runs in separate lambda functions and is accessed using HTTP API Gateway.
Data is stored in a Postgres database and accessed using Prisma.

### Before deploy

Make sure you have all of the [stacktape's prerequisites](https://docs.stacktape.com/getting-started/1-install).

### Deploy

```
stacktape deploy --region your-region --stage your-stage
```

### After deploy

After the deployment is finished, Stacktape will print relevant information about the deployed stack to the console,
including URLs of the deployed resources, links to logs, links to monitoring dashboard, etc.

You can also print this information using the following command:

```
stacktape stack-info
```

The URL of the deployed API is printed in the console (myGateway->url).
You can test the deployed API using a provided script (located in `scripts/test-api.ts`). You can use Stacktape to execute the script:

```
stacktape exec-script --sourcePath scripts/test-api.ts --env STAGE=(your-stage) --env REGION=(your-region)
```

Api exposes following routes:

- `POST /post` - creates a post (request must contain JSON body with following parameters: `title`, `content`, `authorEmail`)
- `GET /post/{id}` - gets post with specified id
- `PUT /post/{id}` - updates post with specified id (request must contain JSON body with following parameters: `title`, `content`, `authorEmail`)
- `DELETE /post/{id}` - deletes post with specified id
- `GET /post` - returns array of all posts

### Deployed resources

- `http-api-gateway` - routes requests to the container workload
- `getPost lambda-function` - used to get a single post
- `getPosts lambda-function` - used to get multiple post
- `createPost lambda-function` - used to create a post
- `updatePost lambda-function` - used to updated a post
- `deletePost lambda-function` - used to delete a post
- `relational-database` - stores the data
