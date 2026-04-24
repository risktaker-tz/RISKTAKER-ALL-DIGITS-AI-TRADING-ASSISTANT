import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

const uploadSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/webm",
    "audio/mpeg",
    "audio/mp4",
    "audio/wav"
  ]),
  contentLength: z.number().max(1024 * 1024 * 250)
});

function getS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(process.env.AWS_S3_ENDPOINT),
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
          }
        : undefined
  });
}

export async function createSignedUploadUrl(input: z.infer<typeof uploadSchema>) {
  const parsed = uploadSchema.parse(input);
  const storageKey = `uploads/${Date.now()}-${parsed.fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: storageKey,
    ContentType: parsed.contentType
  });

  const signedUrl = await getSignedUrl(getS3Client(), command, { expiresIn: 60 });

  return {
    signedUrl,
    storageKey
  };
}
