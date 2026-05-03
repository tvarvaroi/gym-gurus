import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

const ALLOWED_FOLDERS = [
  'profiles',
  'progress',
  'exercises',
  'biometrics',
  'biometrics-thumbnails',
] as const;
type UploadFolder = (typeof ALLOWED_FOLDERS)[number];

function getR2Client(): S3Client | null {
  if (!process.env.CLOUDFLARE_R2_ACCOUNT_ID) return null;
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * Upload an image buffer to Cloudflare R2.
 * Resizes to maxWidthPx and converts to WebP for optimal storage.
 * Returns the public URL of the uploaded file.
 * Throws if R2 is not configured.
 */
export async function uploadImage(
  buffer: Buffer,
  folder: UploadFolder,
  _mimeType: string,
  maxWidthPx = 1200
): Promise<string> {
  const r2 = getR2Client();
  if (!r2) throw new Error('R2 not configured');

  const bucket = process.env.CLOUDFLARE_R2_BUCKET!;
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL!;

  // Explicit EXIF/GPS strip — photos may contain location data from camera apps.
  // Sharp's webp encoder strips most metadata by default, but explicit
  // .withMetadata({}) is defence-in-depth (Sprint 1.5 audit C1).
  const optimized = await sharp(buffer)
    .rotate() // honour EXIF orientation BEFORE stripping it
    .resize({ width: maxWidthPx, withoutEnlargement: true })
    .withMetadata({})
    .webp({ quality: 82 })
    .toBuffer();

  const key = `${folder}/${randomUUID()}.webp`;

  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: optimized,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000',
    })
  );

  return `${publicUrl}/${key}`;
}

/**
 * Delete a previously uploaded image by its public URL.
 * Silently ignores errors (e.g., file already deleted).
 */
export async function deleteImage(publicImageUrl: string): Promise<void> {
  const r2 = getR2Client();
  if (!r2) return;

  const bucket = process.env.CLOUDFLARE_R2_BUCKET!;
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL!;

  if (!publicImageUrl.startsWith(publicUrl)) return;

  const key = publicImageUrl.slice(publicUrl.length + 1);

  try {
    await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch {
    // Non-critical — best effort deletion
  }
}

export function isR2Configured(): boolean {
  return Boolean(process.env.CLOUDFLARE_R2_ACCOUNT_ID);
}
