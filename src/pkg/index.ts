import { exec } from "pkg";
import fs from "fs";
import { generateSecret } from "../crypto/index.js";
import AWSSDK from "aws-sdk";
import { v4 } from "uuid";
import path from "path";
import { getSignedFileUrl, uploadFile } from "../aws/s3.js";

//#region @deprecated
function setLicenseListener(license: string) {
  const data = fs.readFileSync("./Listener.js", "utf-8");
  const dataWithLicense = data.replace("%LICENSE%", license);
  fs.writeFileSync("./Listener.js", dataWithLicense, "utf-8");
}
function clearLicenseListener(license: string) {
  const data = fs.readFileSync("./Listener.js", "utf-8");
  const defaultData = data.replace(license, "%LICENSE%");
  fs.writeFileSync("./Listener.js", defaultData, "utf-8");
}
//#endregion

const LISTENER_BUCKET = "listener";

const getListenerName = (labId: string = "", ext: "exe" | "js" = "js") =>
  path.resolve("dist", "pkg", `Listener${labId}.${ext}`);

const generateListenerFile = (labId: string, licenseHash: string) => {
  const data = fs.readFileSync(getListenerName(), "utf-8");
  let dataWithLicenseHash = data.replace("%LICENSE%", licenseHash);
  if (process.env.NODE_ENV.trim() === "DEV")
    dataWithLicenseHash = dataWithLicenseHash.replace("%ENV%", "DEV");
  fs.writeFileSync(getListenerName(labId), dataWithLicenseHash, "utf-8");
};

const removeListenerFile = (labId: string, ext: "exe" | "js" = "js") => {
  if (fs.existsSync(getListenerName(labId, ext)))
    fs.unlinkSync(getListenerName(labId, ext));
};

export const generateListener = async (labId: string) => {
  const licenseHash = generateSecret(labId);
  generateListenerFile(labId, licenseHash);
  await exec([
    "--compress",
    "GZip",
    "-t",
    "node16-win-x64",
    getListenerName(labId),
    "--out-path",
    path.resolve("dist", "pkg"),
  ]);
  const listenerS3Key = `i${v4()}.exe`;
  const isListenerUploader = await uploadFile(
    LISTENER_BUCKET,
    listenerS3Key,
    fs.readFileSync(getListenerName(labId, "exe")),
    "application/x-msdownload"
  );
  removeListenerFile(labId);
  removeListenerFile(labId, "exe");
  if (isListenerUploader) return `${LISTENER_BUCKET}/${listenerS3Key}`;
};
