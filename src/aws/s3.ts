import AWSSDK from "aws-sdk";
import { v4 } from "uuid";
import { BUCKETS, S3_CONFIG } from "./constants.js";

AWSSDK.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
const s3 = new AWSSDK.S3(S3_CONFIG);

export const uploadFile = async (
  Bucket: typeof BUCKETS[number],
  fileKey: string,
  file: Buffer,
  ContentType?: string
) => {
  const params: AWSSDK.S3.PutObjectRequest = {
    Bucket,
    Key: fileKey,
    Body: file,
    ContentType,
  };

  const s3Response = await s3.putObject(params).promise();
  if (s3Response.$response.error) {
    const error = s3Response as unknown as AWSSDK.AWSError;
    console.log({ path: "uploadFile", error });
    return false;
  }
  // const data = s3Response as AWSSDK.S3.PutObjectOutput;
  return true;
};

export const getFileUrl = (Bucket: typeof BUCKETS[number], fileKey: string) =>
  `https://${Bucket}.s3.filebase.com/${fileKey}`;

export const getSignedFileUrl = async (
  Bucket: typeof BUCKETS[number],
  fileKey: string,
  expireSeconds: number
) => {
  try {
    return await s3.getSignedUrlPromise("getObject", {
      Bucket,
      Key: fileKey,
      Expires: expireSeconds,
    });
  } catch (error) {
    console.error({ path: "getSignedFileUrl", error });
    return null;
  }
};

export const getFileUploadUrl = async (
  Bucket: typeof BUCKETS[number],
  Expires: number
) => {
  try {
    return await s3.getSignedUrlPromise("putObject", {
      Bucket,
      Key: v4(),
      Expires,
    });
  } catch (error) {
    console.error({ path: "getFileUploadUrl", error });
    return null;
  }
};

export const SIGNATURES_SIGNED_URL_EXPIRE = 15;
export const LISTENER_SIGNED_URL_EXPIRE = 3600;
export const EXPIRE_PUBLIC_FILES_BUCKET_SECONDS = 300;
