import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const s3 = new S3Client({});
const bucketName = process.env.STP_IMAGES_BUCKET_NAME!;

const SIZES = [
  { name: 'thumb', width: 150 },
  { name: 'medium', width: 600 },
  { name: 'large', width: 1200 }
];

const handler = async (event: { Records: Array<{ s3: { bucket: { name: string }; object: { key: string } } }> }) => {
  for (const record of event.Records) {
    const sourceKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    const filename = sourceKey.split('/').pop()!;

    console.log(`Processing image: ${sourceKey}`);

    // Download the original image
    const { Body } = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: sourceKey }));
    const imageBuffer = Buffer.from(await Body!.transformToByteArray());

    // Resize to each target size and upload
    for (const size of SIZES) {
      const resized = await sharp(imageBuffer).resize(size.width).jpeg({ quality: 85 }).toBuffer();
      const destKey = `processed/${size.name}/${filename}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: destKey,
          Body: resized,
          ContentType: 'image/jpeg'
        })
      );

      console.log(`Created ${size.name} (${size.width}px): ${destKey}`);
    }
  }

  return { statusCode: 200, body: 'Processing complete' };
};

export default handler;
