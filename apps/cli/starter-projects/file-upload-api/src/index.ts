import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { S3Client, ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({});
const bucketName = process.env.STP_FILES_BUCKET_NAME!;

const app = new Hono();

app.get('/', (c) => {
  return c.json({
    message: 'File Upload API',
    endpoints: {
      'GET /files': 'List all files',
      'GET /upload-url?filename=x': 'Get a presigned URL to upload a file',
      'GET /download-url?key=x': 'Get a presigned URL to download a file',
      'DELETE /files/:key': 'Delete a file'
    }
  });
});

app.get('/files', async (c) => {
  const result = await s3.send(new ListObjectsV2Command({ Bucket: bucketName }));
  const files = (result.Contents || []).map((item) => ({
    key: item.Key,
    size: item.Size,
    lastModified: item.LastModified?.toISOString()
  }));
  return c.json({ data: files });
});

app.get('/upload-url', async (c) => {
  const filename = c.req.query('filename');
  if (!filename) {
    return c.json({ error: 'Missing filename query parameter' }, 400);
  }

  const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket: bucketName, Key: filename }), { expiresIn: 3600 });
  return c.json({ uploadUrl: url, key: filename });
});

app.get('/download-url', async (c) => {
  const key = c.req.query('key');
  if (!key) {
    return c.json({ error: 'Missing key query parameter' }, 400);
  }

  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucketName, Key: key }), { expiresIn: 3600 });
  return c.json({ downloadUrl: url, key });
});

app.delete('/files/:key', async (c) => {
  const key = c.req.param('key');
  await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
  return c.json({ message: `Deleted ${key}` });
});

export const handler = handle(app);
