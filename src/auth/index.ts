import jsonwebtoken from "jsonwebtoken";
import { prisma } from "../db/handler.js";
import { verify as verifyPassword } from "../crypto/index.js";
import { ResponseError } from "../types/Responses/error.js";
import { isValidObjectID } from "../utils/index.js";
import { Prisma } from "@prisma/client";
import { Payload } from "../types/Auth/index.js";

export const signJWT = (payload: Object) => {
  return jsonwebtoken.sign(payload, process.env.JWT_SECRET.trim(), {
    issuer: "medicina-servidor",
    algorithm: "HS256",
    expiresIn: "7d",
  });
};

export const verifyJWT = (jwt: string) => {
  if (!jwt) return false;
  try {
    return jsonwebtoken.verify(jwt, process.env.JWT_SECRET.trim(), {
      issuer: "medicina-servidor",
      algorithms: ["HS256"],
    }) as Payload;
  } catch (e) {
    return false;
  }
};

export const login = async (username: string, password: string) => {
  const _isValidObjectID = isValidObjectID(username);
  const userPromise = _isValidObjectID
    ? prisma.user.findUnique({
        where: { id: username },
        select: { id: true, hash: true, email: true },
      })
    : prisma.user.findFirst({
        where: {
          OR: [{ email: username }, { slug: username }],
        },
        select: { id: true, hash: true, email: true }, // labIds: true, ownerIds: true,
      });
  const labPromise = _isValidObjectID
    ? prisma.lab.findUnique({
        where: { id: username },
        select: { id: true, hash: true, email: true },
      })
    : prisma.lab.findFirst({
        where: { OR: [{ name: username }, { email: username }] },
        select: { id: true, hash: true, email: true },
      });
  const [user, lab] = await Promise.all([userPromise, labPromise]);

  const payload: { [id: string]: string | Object } = {};

  if (user && (await verifyPassword(user.hash, password)))
    payload["sub-user"] = user.id;
  if (lab && (await verifyPassword(lab.hash, password)))
    payload["sub-lab"] = lab.id;

  if (user && !lab && _isValidObjectID) {
    const labFromEmail = await prisma.lab.findUnique({
      where: { email: user.email },
      select: { id: true, hash: true },
    });
    if (labFromEmail && (await verifyPassword(labFromEmail.hash, password)))
      payload["sub-lab"] = labFromEmail.id;
  } else if (lab && !user && _isValidObjectID) {
    const userFromEmail = await prisma.user.findUnique({
      where: { email: lab.email },
      select: { id: true, hash: true },
    });
    if (userFromEmail && (await verifyPassword(userFromEmail.hash, password)))
      payload["sub-user"] = userFromEmail.id;
  }

  if (!Object.keys(payload).length)
    return new ResponseError({ error: "Inválid auth", key: "auth" });

  return { access_token: signJWT(payload), payload };
};
