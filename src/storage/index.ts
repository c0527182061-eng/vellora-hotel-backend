import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

// שכבת אחסון תמונות. השרת לא יודע איזה שירות בשימוש – רק קורא ל־upload / remove / publicUrl.
// הבחירה נעשית במשתנה הסביבה STORAGE_PROVIDER: r2 | cloudinary | local

export type UploadInput = { buffer: Buffer; mime: string; ext: string };

export interface ImageStorage {
  readonly provider: string;
  /** מעלה תמונה ומחזיר מזהה (key) לשמירה במסד הנתונים */
  upload(file: UploadInput): Promise<string>;
  remove(key: string): Promise<void>;
  publicUrl(key: string): string;
}

const newKey = (ext: string) => `rooms/${randomUUID()}.${ext}`;

/** Cloudflare R2 – תואם S3 */
class R2Storage implements ImageStorage {
  readonly provider = 'r2';
  private client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY! },
  });

  async upload(file: UploadInput) {
    const key = newKey(file.ext);
    await this.client.send(
      new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: key, Body: file.buffer, ContentType: file.mime, CacheControl: 'public, max-age=31536000, immutable' }),
    );
    return key;
  }

  async remove(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
  }

  publicUrl(key: string) {
    return `${env.R2_PUBLIC_URL!.replace(/\/$/, '')}/${key}`;
  }
}

/** Cloudinary – חלופה בלי כרטיס אשראי */
class CloudinaryStorage implements ImageStorage {
  readonly provider = 'cloudinary';
  constructor() {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  upload(file: UploadInput) {
    return new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `${env.CLOUDINARY_FOLDER}/rooms`, resource_type: 'image', public_id: randomUUID() },
        (err, result) => (err || !result ? reject(err ?? new Error('Cloudinary upload failed')) : resolve(result.public_id)),
      );
      stream.end(file.buffer);
    });
  }

  async remove(key: string) {
    await cloudinary.uploader.destroy(key, { resource_type: 'image' });
  }

  publicUrl(key: string) {
    // JPG קבוע (ולא f_auto): פורמטים חדשים כמו AVIF נחסמים בחלק מסינוני האינטרנט
    return cloudinary.url(key, { secure: true, fetch_format: 'jpg' });
  }
}

/**
 * שמירה בתיקייה מקומית – לפיתוח על המחשב ולבדיקות בלבד.
 * לא מתאים ל־Render: הקבצים נמחקים בכל הפעלה מחדש של השרת.
 */
class LocalStorage implements ImageStorage {
  readonly provider = 'local';
  readonly dir = path.resolve(env.LOCAL_UPLOAD_DIR);

  async upload(file: UploadInput) {
    const key = newKey(file.ext);
    const full = path.join(this.dir, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, file.buffer);
    return key;
  }

  async remove(key: string) {
    const full = path.join(this.dir, key);
    if (!full.startsWith(this.dir + path.sep)) return;
    await fs.rm(full, { force: true });
  }

  publicUrl(key: string) {
    const base = (env.PUBLIC_SERVER_URL ?? `http://localhost:${env.PORT}`).replace(/\/$/, '');
    return `${base}/uploads/${key}`;
  }
}

function createStorage(): ImageStorage {
  switch (env.STORAGE_PROVIDER) {
    case 'r2':
      return new R2Storage();
    case 'cloudinary':
      return new CloudinaryStorage();
    default:
      return new LocalStorage();
  }
}

export const storage: ImageStorage = createStorage();

export const imageUrl = (key: string | null | undefined) => (key ? storage.publicUrl(key) : null);

/** מחיקה שקטה – אם המחיקה מהאחסון נכשלת, לא מכשילים את כל הפעולה */
export async function removeImageQuietly(key: string | null | undefined) {
  if (!key) return;
  try {
    await storage.remove(key);
  } catch (err) {
    if (env.NODE_ENV !== 'test') console.warn(`Could not delete image ${key}:`, err);
  }
}
