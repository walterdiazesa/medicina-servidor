import { Response, NextFunction } from "express";
import { verifyJWT } from "../../../auth/index.js";
import {
  listenerAesRSAKeyDecrypt,
  listenerRsaDecrypt,
} from "../../../crypto/index.js";
import { prisma } from "../../../db/handler.js";
import { AuthRequest, ListenerRequest } from "../../../types/Express/index.js";
import { ResponseError } from "../../../types/Responses/error.js";
import { isValidObjectID } from "../../../utils/index.js";
import { NoAuth } from "../../Responses/index.js";

// onlyAdmin?: true
export function authGuard(req: AuthRequest, res: Response, next: NextFunction) {
  const token: string | undefined =
    process.env.NODE_ENV.trim() === "DEV"
      ? req.headers.authorization || req.cookies.session
      : req.cookies.session;
  const jwt = verifyJWT(token);
  if (!jwt) {
    if (req.cookies.session)
      res.cookie("session", "", {
        expires: new Date(0),
        httpOnly: true,
        secure: process.env.NODE_ENV.trim() === "PROD",
        sameSite: process.env.NODE_ENV.trim() === "PROD" ? "none" : undefined,
      });
    return res.status(401).send(NoAuth());
  }
  req.user = jwt;
  next();
}

export async function listenerGuard(
  req: ListenerRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.headers.authorization || !isValidObjectID(req.headers.authorization))
    return res.status(401).send(NoAuth());
  const labId = req.headers.authorization;

  const { iv, data, key }: { iv: string; data: string; key: string } = req.body;

  if (!iv || !data || !key)
    return res
      .status(400)
      .send(
        new ResponseError({ error: "Test body bad formatted", key: "protocol" })
      );

  // RedisCache
  const { rsaPrivateKey } = await prisma.lab.findUnique({
    where: { id: labId },
    select: { rsaPrivateKey: true },
  });
  if (!rsaPrivateKey || rsaPrivateKey === "generating")
    return res.status(400).send(
      new ResponseError({
        error: "Private key for lab still generating",
        key: "rsaprivatekey",
      })
    );

  let bodyStep: "Decrypt" | "Json" = "Decrypt";
  try {
    const decryptBody = listenerAesRSAKeyDecrypt(
      { iv, key, data },
      rsaPrivateKey
    );
    bodyStep = "Json";
    const body: {
      chemData: string;
      listenerUsername: string;
      signedAt: number;
    } = JSON.parse(decryptBody);
    if (!body.chemData || !body.signedAt)
      return res.status(400).send(
        new ResponseError({
          error: "Invalid test body format",
          key: "fields",
        })
      );

    // If signedAt difference with now more than ONE MINUTE (60000)ms, invalid because timeout
    if (Math.abs(body.signedAt - Date.now()) > 60000)
      return res.status(400).send(
        new ResponseError({
          error: "Invalid session",
          key: "timeout",
        })
      );

    req.body = body;
  } catch (e) {
    console.error(
      new Date().toLocaleString(),
      "🔐 \x1b[35m(src/routes/middlewares/auth/index.ts > listenerGuard)\x1b[0m",
      `\x1b[31m${JSON.stringify(e)}\x1b[0m`
    );
    switch (bodyStep) {
      case "Decrypt":
        return res.status(400).send(
          new ResponseError({
            error: "Invalid decryption",
            key: "decryptmethod",
          })
        );
      case "Json":
        return res.status(400).send(
          new ResponseError({
            error: "Invalid test body format",
            key: "json",
          })
        );
    }
  }

  req.listener = { labId, ip: req.ip };
  next();
}
