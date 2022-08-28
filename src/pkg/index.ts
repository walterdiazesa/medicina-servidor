import { exec } from "pkg";
import fs from "fs";
import { v4 } from "uuid";
import path from "path";
import { uploadFile } from "../aws/s3.js";
import crypto from "crypto";
import { prisma } from "../db/handler.js";

const LISTENER_BUCKET = "listener";

const getListenerName = (labId: string = "", ext: "exe" | "js" = "js") =>
  path.resolve("src", "pkg", `Listener${labId}.${ext}`);

const generateListenerFile = (labId: string, rsaPublicKey: string) => {
  const data = fs.readFileSync(getListenerName(), "utf-8");
  let dataWithLicenseHash = data.replace("%LICENSE%", labId);
  dataWithLicenseHash = dataWithLicenseHash.replace(
    "%RSA_PUBLIC%",
    rsaPublicKey
  );
  if (process.env.NODE_ENV.trim() === "DEV")
    dataWithLicenseHash = dataWithLicenseHash.replace("%ENV%", "DEV");
  fs.writeFileSync(getListenerName(labId), dataWithLicenseHash, "utf-8");
};

const removeListenerFile = (labId: string, ext: "exe" | "js" = "js") => {
  if (fs.existsSync(getListenerName(labId, ext)))
    fs.unlinkSync(getListenerName(labId, ext));
};

export const generateListener = async (labId: string) => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  generateListenerFile(
    labId,
    publicKey.export({ type: "pkcs1", format: "pem" }) as string
  );
  await exec([
    "--compress",
    "GZip",
    "-t",
    "node16-win-x64",
    getListenerName(labId),
    "--out-path",
    path.resolve("src", "pkg"),
  ]);
  const listenerS3Key = `i${v4()}.exe`;
  const isListenerUploader = await uploadFile(
    LISTENER_BUCKET,
    listenerS3Key,
    fs.readFileSync(getListenerName(labId, "exe")),
    "application/x-msdownload"
  );
  // removeListenerFile(labId);
  removeListenerFile(labId, "exe");
  if (isListenerUploader)
    return {
      listenerKey: `${LISTENER_BUCKET}/${listenerS3Key}`,
      rsaPrivateKey: privateKey.export({
        type: "pkcs1",
        format: "pem",
      }) as string,
    };
};
