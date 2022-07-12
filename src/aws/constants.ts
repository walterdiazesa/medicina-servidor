export const BUCKETS = ["public-files", "listener", "user-signatures"] as const;

export const S3_CONFIG = Object.freeze({
  endpoint: "https://s3.filebase.com",
  signatureVersion: "v4",
  httpOptions: {
    timeout: 1_200_000 /* 20 min */,
  },
});
