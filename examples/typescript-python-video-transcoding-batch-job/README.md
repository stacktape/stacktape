## Stacktape project typescript-python-video-transcoding-batch-job

### Description

Video transcoder implemented in python using ffmpeg. Transcoding runs in a batch job in response to video upload to S3 bucket. Frontend is a lambda function implemented using typescript and server-side React.

### Deployed resources

- `bucket` which is used for both uploading raw videos (`raw-videos` directory) and outputing transcoded videos (`transcoded` directory)
- `batch-job` which is triggered once a video is uploaded into bucket `raw-videos` directory. batch-job then transcodes uploaded video and uploads it into `transcoded` directory
- `http-api-gateway` which serves as entrypoint for the frontend lambda function
- `function` which server-side renders front-end dashboard for overview of transcoding

### Before deploy

#### 1. Install all Stacktape's prerequisities

To learn about Stacktape's prerequisities, visit [Stacktape docs](https://docs.stacktape.com/getting-started/1-install)

#### 2. Install project's dependencies locally

```bash
yarn install or npm install or pnpm install
```

### After deploy

Visit front-end on url of http-api-gateway. After deployment the url of the gateway should be visible in your terminal among stack outputs.
