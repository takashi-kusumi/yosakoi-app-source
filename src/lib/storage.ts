import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * 写真の保存先（Cloudflare R2など、S3互換のオブジェクトストレージ）。
 * ファイル本体はデータベースには保存せず、ここで発行する署名付きURLを使って
 * ブラウザから直接アップロード/取得する。
 */

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} が設定されていません。写真アップロード機能を使うには、.env にオブジェクトストレージ（Cloudflare R2など）の接続情報を設定してください。`
    );
  }
  return value;
}

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.R2_ENDPOINT &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME
  );
}

let cachedClient: S3Client | null = null;

function client(): S3Client {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    region: "auto",
    endpoint: requiredEnv("R2_ENDPOINT"),
    credentials: {
      accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
    },
    forcePathStyle: true,
  });
  return cachedClient;
}

function bucket(): string {
  return requiredEnv("R2_BUCKET_NAME");
}

/** ブラウザから直接PUTアップロードするための署名付きURLを発行する */
export async function createUploadUrl(
  objectKey: string,
  contentType: string,
  expiresInSeconds = 300
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: objectKey,
    ContentType: contentType,
  });
  return getSignedUrl(client(), command, { expiresIn: expiresInSeconds });
}

/** アップロードが実際に成功したかどうかを確認する */
export async function headObject(
  objectKey: string
): Promise<{ exists: boolean; size: number; contentType: string }> {
  try {
    const res = await client().send(new HeadObjectCommand({ Bucket: bucket(), Key: objectKey }));
    return {
      exists: true,
      size: res.ContentLength ?? 0,
      contentType: res.ContentType ?? "",
    };
  } catch {
    return { exists: false, size: 0, contentType: "" };
  }
}

/** オブジェクトの中身をまとめて取得する（サムネイル無しの小さめ画像を想定） */
export async function getObjectBytes(
  objectKey: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: objectKey }));
    if (!res.Body) return null;
    const bytes = await res.Body.transformToByteArray();
    return { buffer: Buffer.from(bytes), contentType: res.ContentType ?? "application/octet-stream" };
  } catch {
    return null;
  }
}

export async function deleteObject(objectKey: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: objectKey }));
}
