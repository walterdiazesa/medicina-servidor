import jsonwebtoken from "jsonwebtoken";
import { prisma } from "../db/handler.js";
import {
  verify as verifyPassword,
  hash as hashPassword,
} from "../crypto/index.js";
import { ResponseError } from "../types/Responses/error.js";
import { isValidObjectID } from "../utils/index.js";
import { Prisma } from "@prisma/client";
import { Payload } from "../types/Auth/index.js";

export const signJWT = (payload: Partial<Payload>) => {
  delete payload.iat;
  delete payload.exp;
  delete payload.iss;
  if (!payload["sub-lab"]) payload["sub-lab"] = [];
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

export const login = async (
  username: string,
  password: string,
  ignorePassword: boolean = false
) => {
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
        select: { id: true, hash: true, email: true, img: true },
      })
    : prisma.lab.findFirst({
        where: { OR: [{ name: username }, { email: username }] },
        select: { id: true, hash: true, email: true, img: true },
      });
  const [user, lab] = await Promise.all([userPromise, labPromise]);

  const payload: { [id: string]: string | Object } = {};

  if (user && (ignorePassword || (await verifyPassword(user.hash, password))))
    payload["sub-user"] = user.id;
  if (lab && (ignorePassword || (await verifyPassword(lab.hash, password))))
    payload["sub-lab"] = [lab.id];

  let isLabAndImg;
  if (user && !lab) {
    const labFromEmail = await prisma.lab.findUnique({
      where: { email: user.email },
      select: { id: true, hash: true, img: true },
    });
    if (
      labFromEmail &&
      (ignorePassword || (await verifyPassword(labFromEmail.hash, password)))
    ) {
      payload["sub-lab"] = [labFromEmail.id];
      isLabAndImg = labFromEmail.img;
    }
  } else if (lab && !user && _isValidObjectID) {
    const userFromEmail = await prisma.user.findUnique({
      where: { email: lab.email },
      select: { id: true, hash: true },
    });
    if (
      userFromEmail &&
      (ignorePassword || (await verifyPassword(userFromEmail.hash, password)))
    )
      payload["sub-user"] = userFromEmail.id;
  }

  if (payload["sub-user"]) {
    // GET LabOwners
    const labsWhoOwn = await prisma.lab.findMany({
      where: { ownerIds: { has: payload["sub-user"] as string } },
      select: { id: true },
    });
    if (labsWhoOwn && labsWhoOwn.length) {
      (payload["sub-lab"] as string[]).push(...labsWhoOwn.map(({ id }) => id));
      payload["sub-lab"] = Array.from(new Set(payload["sub-lab"] as string[]));
    }
  }

  if (!Object.keys(payload).length)
    return new ResponseError({ error: "Invalid auth", key: "auth" });

  payload["sub"] = user?.email || lab?.email;
  payload["img"] =
    lab?.img || ((payload["sub-lab"] as string[])?.length === 1 && isLabAndImg);

  return { access_token: signJWT(payload), payload };
};

export async function changePassword(
  auth: string,
  newPassword: string,
  oldPassword?: string
) {
  try {
    const loginResponse = await login(auth, oldPassword, !oldPassword);
    if (loginResponse instanceof ResponseError) return loginResponse;
    const payload = loginResponse.payload as Payload;
    let hash = await hashPassword(newPassword);
    const updatePassAccounts: Promise<any>[] = [];
    if (payload["sub-user"])
      updatePassAccounts.push(
        prisma.user.update({
          where: { id: payload["sub-user"] },
          data: { hash },
        })
      );
    if (payload["sub-lab"].length)
      updatePassAccounts.push(
        prisma.lab.updateMany({
          where: { id: { in: payload["sub-lab"] } },
          data: { hash },
        })
      );
    await Promise.allSettled(updatePassAccounts);
    return true;
  } catch (e) {
    console.error(
      new Date().toLocaleString(),
      "🔐 \x1b[35m(src/auth/index.ts > changePassword)\x1b[0m",
      `\x1b[31m${JSON.stringify(e)}\x1b[0m`
    );
    return false;
  }
}
