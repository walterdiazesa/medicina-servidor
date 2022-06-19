import argon2 from "argon2";
import crypto from "crypto";

const argon2Options = Object.freeze({
  saltLength: 128,
  type: argon2.argon2id,
  hashLength: 64,
  secret: Buffer.from(process.env.HASH_SECRET),
  timeCost: 80,
});

export const hash = async (text: string) =>
  await argon2.hash(text, argon2Options);
export const verify = async (hash: string, text: string) =>
  await argon2.verify(hash, text, argon2Options);

/*
const CRYPTO_ALGORITHM = "aes-256-ctr";
const CRYPTO_SECRET = process.env.CRYPTO_SECRET.trim();
  const encrypt = (text: string, iv?: string) => {
  const _iv = iv ? Buffer.from(iv, "hex") : crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(CRYPTO_ALGORITHM, CRYPTO_SECRET, _iv);

  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

  if (iv) return encrypted.toString("hex");
  return JSON.stringify({
    iv: _iv.toString("hex"),
    content: encrypted.toString("hex"),
  });
};

const decrypt = (hash: string, constIV?: string) => {
  let _iv: string, _content: string;

  if (!constIV)
    try {
      const { iv, content }: { iv: string; content: string } = JSON.parse(hash);
      if (iv && content) {
        _iv = iv;
        _content = content;
      } else return false;
    } catch (e) {
      return false;
    }
  else {
    _content = hash;
    _iv = constIV;
  }

  const decipher = crypto.createDecipheriv(
    CRYPTO_ALGORITHM,
    CRYPTO_SECRET,
    Buffer.from(_iv, "hex")
  );

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(_content, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString();
};

const digest = (cypherObj: string) =>
  encrypt(
    Buffer.from(cypherObj).toString("base64"),
    process.env.DIGESTIV_SECRET.trim()
  );

const indigest = (digestString: string) =>
  decrypt(
    Buffer.from(
      Buffer.from(digestString).toString("base64"),
      "base64"
    ).toString("utf-8"),
    process.env.DIGESTIV_SECRET.trim()
  );

export const generateSecret = (secret: string) => digest(encrypt(secret));
export const revealSecret = (safe: string) => {
  const decodebase64 = indigest(safe);
  if (!decodebase64) return false;
  return decrypt(Buffer.from(decodebase64, "base64").toString("utf-8"));
}; */

const AES_ALGORITHM = "aes-256-cbc";

export const emailPrivateRsaEncrypt = (data: string) => {
  console.log(
    "emailPrivateRsaEncrypt PEM",
    process.env.PRIVATE_EMAIL_RSA_KEY.trim()
  );
  return crypto
    .privateEncrypt(process.env.PRIVATE_EMAIL_RSA_KEY.trim(), Buffer.from(data))
    .toString("hex");
};

export const emailPublicRsaDecrypt = (encryptedData: string) => {
  console.log(
    "emailPublicRsaDecrypt PEM",
    process.env.PRIVATE_EMAIL_RSA_KEY.trim()
  );
  try {
    return crypto
      .publicDecrypt(
        process.env.PUBLIC_EMAIL_RSA_KEY!.trim(),
        Buffer.from(encryptedData, "hex")
      )
      .toString();
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const listenerRsaDecrypt = (
  encryptedData: string,
  privateKey: string
) => {
  return crypto
    .privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(encryptedData, "hex")
    )
    .toString();
};

export const listenerAesRSAKeyDecrypt = (
  encryptedObj: { iv: string; key: string; data: string },
  privateKey: string
) => {
  const decipher = crypto.createDecipheriv(
    AES_ALGORITHM,
    Buffer.from(listenerRsaDecrypt(encryptedObj["key"], privateKey), "hex"),
    Buffer.from(encryptedObj["iv"], "hex")
  );

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedObj["data"], "hex")),
    decipher.final(),
  ]);

  return decrypted.toString();
};
