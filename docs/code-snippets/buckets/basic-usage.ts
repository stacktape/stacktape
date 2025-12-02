import { S3 } from '@aws-sdk/client-s3';

const s3 = new S3({});

// getObject returns a readable stream, so we need to transform it to string
const streamToString = (stream) => {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
};

const handler = async (event, context) => {
  await s3.putObject({
    Bucket: process.env.BUCKET_NAME,
    Key: 'my-file.json',
    Body: JSON.stringify({ message: 'hello' }) // or fs.createReadStream('my-source-file.json')
  });

  const res = await s3.getObject({
    Bucket: process.env.BUCKET_NAME,
    Key: 'my-file.json'
  });
  const body = await streamToString(res.Body);
};

export default handler;
