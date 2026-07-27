import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({});
const bucketName = process.env.STP_IMAGES_BUCKET_NAME!;

const app = new Hono();

// Get a presigned URL for uploading an image
app.get('/upload-url', async (c) => {
  const filename = c.req.query('filename');
  if (!filename) return c.json({ error: 'filename query param required' }, 400);

  const key = `uploads/${Date.now()}-${filename}`;
  const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket: bucketName, Key: key }), { expiresIn: 3600 });

  return c.json({ uploadUrl: url, key });
});

// List processed images
app.get('/images', async (c) => {
  const result = await s3.send(new ListObjectsV2Command({ Bucket: bucketName, Prefix: 'processed/' }));
  const images = (result.Contents || []).map((obj) => ({
    key: obj.Key,
    size: obj.Size,
    lastModified: obj.LastModified?.toISOString()
  }));

  return c.json({ images });
});

// Get a presigned download URL for a processed image
app.get('/download-url', async (c) => {
  const key = c.req.query('key');
  if (!key) return c.json({ error: 'key query param required' }, 400);

  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucketName, Key: key }), { expiresIn: 3600 });
  return c.json({ downloadUrl: url });
});

app.get('/', (c) => c.json({ service: 's3-image-processor', endpoints: ['GET /upload-url?filename=x', 'GET /images', 'GET /download-url?key=x'] }));

export const handler = handle(app);
