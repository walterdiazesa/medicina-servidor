import AWSSDK from "aws-sdk";
import { BUCKETS, S3_CONFIG } from "../constants.js";

// npm run aws-dev app= api= key= secret= name= app_methods= api_methods=

const METHODS = ["GET", "PUT", "POST", "DELETE"] as const;

const bucketCorsStatus = async (bucketName: string, s3: AWSSDK.S3) => {
  const _bucketCorsStatus = await s3
    .getBucketCors({
      Bucket: bucketName,
    })
    .promise();
  console.log(`\x1b[36m<${bucketName}>CorsStatus:\x1b[0m`);
  console.log(JSON.stringify(_bucketCorsStatus));
};

// HOSTS
let argvAPIHost = process.argv.find((value) => value.startsWith("api="));
if (argvAPIHost) argvAPIHost = argvAPIHost.split("=")[1];

let argvAPPHost = process.argv.find((value) => value.startsWith("app="));
if (argvAPPHost) argvAPPHost = argvAPPHost.split("=")[1];

const API_HOST = process.env.API_HOST || argvAPIHost;
const APP_HOST = process.env.APP_HOST || argvAPPHost;

// SECRETS
let argvAccessKeyId = process.argv.find((value) => value.startsWith("key="));
if (argvAccessKeyId) argvAccessKeyId = argvAccessKeyId.split("=")[1];

let argvSecretAccessKey = process.argv.find((value) =>
  value.startsWith("secret=")
);
if (argvSecretAccessKey)
  argvSecretAccessKey = argvSecretAccessKey.split("=")[1];

const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || argvAccessKeyId;
const SECRET_ACCESS_KEY =
  process.env.AWS_SECRET_ACCESS_KEY || argvSecretAccessKey;

// BUCKET NAME
let argvBucketName = process.argv.find((value) =>
  value.startsWith("name=")
) as typeof BUCKETS[number];

if (!argvBucketName) {
  console.log(
    `\x1b[31mError: \x1b[33mname \x1b[37marg was not provided.\x1b[0m`
  );
  process.exit(1);
}
argvBucketName = argvBucketName.split("=")[1].trim() as typeof BUCKETS[number];
if (!BUCKETS.includes(argvBucketName)) {
  console.log(
    `\x1b[31mError: \x1b[33mbucket name \x1b[37mnot in [${BUCKETS.join(
      ", "
    )}].\x1b[0m`
  );
  process.exit(1);
}

if (!API_HOST || !APP_HOST) {
  console.log(
    `\x1b[31mError: \x1b[33mapi \x1b[37m& \x1b[33mapp \x1b[37margs where not provided.\x1b[0m`
  );
  process.exit(1);
}

if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.log(
    `\x1b[31mError: \x1b[33msecret \x1b[37m& \x1b[33mkey \x1b[37margs where not provided.\x1b[0m`
  );
  process.exit(1);
}

AWSSDK.config.update({
  accessKeyId: ACCESS_KEY_ID.trim(),
  secretAccessKey: SECRET_ACCESS_KEY.trim(),
});

const s3 = new AWSSDK.S3(S3_CONFIG);

// JUST STATUS FOR BUCKET?
if (process.argv.find((value) => value.startsWith("status"))) {
  await bucketCorsStatus(argvBucketName, s3);
  process.exit(1);
}

// APP METHODS
let argvAPPMethods = process.argv.find((value) =>
  value.startsWith("app_methods=")
);
if (!argvAPPMethods) {
  console.log(
    `\x1b[31mError: \x1b[33mapp_methods \x1b[37marg was not provided.\x1b[0m`
  );
  process.exit(1);
}
argvAPPMethods = argvAPPMethods.split("=")[1] as typeof BUCKETS[number];
if (!argvAPPMethods.trim()) {
  console.log(
    `\x1b[31mError: \x1b[33mapp method \x1b[37mnot in [${METHODS.join(
      ", "
    )}].\x1b[0m`
  );
  process.exit(1);
}
const APP_METHODS = argvAPPMethods
  .split(",")
  .map((method) => method.toUpperCase().trim()) as unknown as Partial<
  typeof METHODS
>;

if (APP_METHODS.some((method) => !METHODS.includes(method))) {
  console.log(
    `\x1b[31mError: \x1b[33mapp method \x1b[37mnot in [${METHODS.join(
      ", "
    )}].\x1b[0m`
  );
  process.exit(1);
}

// API METHODS
let argvAPIMethods = process.argv.find((value) =>
  value.startsWith("api_methods=")
);
if (!argvAPIMethods) {
  console.log(
    `\x1b[31mError: \x1b[33mapi_methods \x1b[37marg was not provided.\x1b[0m`
  );
  process.exit(1);
}
argvAPIMethods = argvAPIMethods.split("=")[1] as typeof BUCKETS[number];
if (!argvAPIMethods.trim()) {
  console.log(
    `\x1b[31mError: \x1b[33mapi method \x1b[37mnot in [${METHODS.join(
      ", "
    )}].\x1b[0m`
  );
  process.exit(1);
}
const API_METHODS = argvAPIMethods
  .split(",")
  .map((method) => method.toUpperCase().trim()) as unknown as Partial<
  typeof METHODS
>;
if (API_METHODS.some((method) => !METHODS.includes(method))) {
  console.log(
    `\x1b[31mError: \x1b[33mapi method \x1b[37mnot in [${METHODS.join(
      ", "
    )}].\x1b[0m`
  );
  process.exit(1);
}

const APP = 0;
const API = 1;
const IS_PROD =
  process.argv.includes("prod") ||
  process.argv.includes("PROD") ||
  process.argv.includes("production") ||
  process.argv.includes("PRODUCTION");

const bucketCorsConfig: {
  CORSRules: { AllowedMethods: string[]; AllowedOrigins: string[] }[];
} = {
  CORSRules: [
    {
      AllowedMethods: [],
      AllowedOrigins: [],
    },
    {
      AllowedMethods: [],
      AllowedOrigins: [],
    },
  ],
};

bucketCorsConfig.CORSRules[APP].AllowedMethods = [...APP_METHODS]; // "GET", "PUT"
bucketCorsConfig.CORSRules[APP].AllowedOrigins = [APP_HOST.trim()];
bucketCorsConfig.CORSRules[API].AllowedMethods = [...API_METHODS]; // "GET", "PUT", "DELETE"
bucketCorsConfig.CORSRules[API].AllowedOrigins = [API_HOST.trim()];

if (!IS_PROD) {
  bucketCorsConfig.CORSRules[APP].AllowedOrigins.push("http://localhost:3000");
  bucketCorsConfig.CORSRules[API].AllowedOrigins.push("http://localhost:8080");
}

await s3
  .putBucketCors({
    Bucket: argvBucketName,
    CORSConfiguration: bucketCorsConfig,
  })
  .promise();

await bucketCorsStatus(argvBucketName, s3);
