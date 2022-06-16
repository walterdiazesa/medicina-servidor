import AWSSDK from "aws-sdk";

let argvAPIHost = process.argv.find((value) => value.startsWith("api="));
if (argvAPIHost) argvAPIHost = argvAPIHost.split("=")[1];

let argvAPPHost = process.argv.find((value) => value.startsWith("app="));
if (argvAPPHost) argvAPPHost = argvAPPHost.split("=")[1];

const API_HOST = process.env.API_HOST || argvAPIHost;
const APP_HOST = process.env.APP_HOST || argvAPPHost;

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

const s3 = new AWSSDK.S3({
  endpoint: "https://s3.filebase.com",
  signatureVersion: "v4",
  httpOptions: {
    timeout: 1_200_000 /* 20 min */,
  },
});

const APP = 0;
const API = 1;
const IS_PROD =
  process.argv.includes("prod") ||
  process.argv.includes("PROD") ||
  process.argv.includes("production") ||
  process.argv.includes("PRODUCTION");

const publicFilesCors: {
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

publicFilesCors.CORSRules[APP].AllowedMethods = ["GET", "PUT"];
publicFilesCors.CORSRules[APP].AllowedOrigins = [APP_HOST.trim()];
publicFilesCors.CORSRules[API].AllowedMethods = ["GET", "PUT", "DELETE"];
publicFilesCors.CORSRules[API].AllowedOrigins = [API_HOST.trim()];

if (!IS_PROD) {
  publicFilesCors.CORSRules[APP].AllowedOrigins.push("http://localhost:3000");
  publicFilesCors.CORSRules[API].AllowedOrigins.push("http://localhost:8080");
}

await s3
  .putBucketCors({
    Bucket: "public-files",
    CORSConfiguration: publicFilesCors,
  })
  .promise();

const publicFilesCorsStatus = await s3
  .getBucketCors({
    Bucket: "public-files",
  })
  .promise();

console.log("\x1b[36mpublicFilesCorsStatus:\x1b[0m");
console.log(JSON.stringify(publicFilesCorsStatus));
