import { Prisma, User } from "@prisma/client";
import { login, signJWT } from "../../auth/index.js";
import {
  getSignedFileUrl,
  SIGNATURES_SIGNED_URL_EXPIRE,
  uploadFile,
} from "../../aws/s3.js";
import { hash as hashPassword } from "../../crypto/index.js";
import { NotUnique } from "../../routes/Responses/index.js";
import { ResponseError } from "../../types/Responses/error.js";
import { DefaultSelectMany } from "../../types/select";
import { isValidObjectID } from "../../utils/index.js";
import { prisma } from "../handler.js";
import { slug as slugName } from "./utils/slug.js";
import { UploadedFile } from "express-fileupload";

export async function getUser(user: string, signatures: boolean = false) {
  const select: Prisma.UserSelect = {
    id: true,
    email: true,
    name: true,
    slug: true,
  };
  const _user: Partial<User> = isValidObjectID(user)
    ? await prisma.user.findUnique({ where: { id: user }, select })
    : await prisma.user.findFirst({
        where: { OR: [{ email: user }, { slug: user }] },
        select,
      });

  return _user;
}

export async function getEmployee(labId: string, employee: string) {
  const select: Prisma.UserSelect = {
    id: true,
    email: true,
    name: true,
    slug: true,
  };
  /*
  Can't send a empty employee because how routes with express work
  if (!employee)
    return await prisma.user.findMany({
      where: { OR: [{ labIds: { has: labId } }, { ownerIds: { has: labId } }] },
      select,
      orderBy: { name: "asc" },
    });
  */

  const employees = await prisma.user.findMany({
    where: {
      AND: [
        {
          OR: [
            { email: employee },
            { slug: employee },
            { name: { contains: employee, mode: "insensitive" } },
          ],
        },
        { OR: [{ labIds: { has: labId } }, { ownerIds: { has: labId } }] },
      ],
    },
    select,
    orderBy: { name: "asc" },
  });
  return !employees.length ? null : employees;
}

/* @deprecated */
export async function getListenerEmployee(labId: string, user: string) {
  if (!user) return null;
  const select: Prisma.UserSelect = {
    id: true,
    email: true,
    name: true,
  };
  if (isValidObjectID(user)) {
    const employee = await prisma.user.findUnique({
      where: { id: user },
      select: { ...select, labIds: true, ownerIds: true },
    });
    return employee &&
      ((employee as User).labIds.includes(labId) ||
        (employee as User).ownerIds.includes(labId))
      ? delete employee.labIds && delete employee.ownerIds && employee
      : null;
  }

  const employee = await prisma.user.findFirst({
    where: {
      AND: [
        { OR: [{ email: user }, { slug: user }] },
        { OR: [{ labIds: { has: labId } }, { ownerIds: { has: labId } }] },
      ],
    },
    select,
  });
  if (employee) return employee;
  const employees = await prisma.user.findMany({
    where: {
      AND: [
        { name: { contains: user } },
        { OR: [{ labIds: { has: labId } }, { ownerIds: { has: labId } }] },
      ],
    },
    orderBy: { name: "asc" },
    select,
  });
  for (let i = 0; i < employees.length; i++) {
    (employees[i] as any).idx = i + 1;
  }
  return !employees.length ? null : employees;
}

export async function getUsers({
  limit,
  order = "asc",
  labId,
}: DefaultSelectMany & { labId?: string }) {
  const users = await prisma.user.findMany({
    take: limit,
    orderBy: { name: order },
    where: {
      ...(labId && {
        OR: [
          {
            labIds: {
              has: labId,
            },
          },
          {
            ownerIds: {
              has: labId,
            },
          },
        ],
      }),
    },
    select: { id: true, email: true, name: true, slug: true },
  });
  const response: any = { users };
  if (labId) {
    response["ownersIds"] = (
      await prisma.lab.findUnique({
        where: { id: labId },
        select: { ownerIds: true },
      })
    ).ownerIds;
  }
  return response;
}

export async function createUser({
  email,
  name,
  password,
  profileImg,
  labId,
}: {
  email: string;
  name: string;
  password: string;
  profileImg?: string;
  labId: string;
}) {
  const hash = await hashPassword(password);
  let slug = slugName(name);
  try {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        hash,
        slug,
        labIds: {
          set: [labId],
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        slug: true,
      },
    });
    await prisma.lab.update({
      where: { id: labId },
      data: { userIds: { push: user.id } },
      select: { id: true },
    });
    const userHaveLab = await login(email, password);
    return {
      access_token:
        userHaveLab instanceof ResponseError
          ? signJWT({ "sub-user": user.id, sub: user.email })
          : userHaveLab.access_token,
      user,
    };
  } catch (e) {
    console.error(
      new Date().toLocaleString(),
      "🙎‍♂️ \x1b[35m(src/db/User/index.ts > createUser > e)\x1b[0m",
      `\x1b[31m${JSON.stringify(e)}\x1b[0m`
    );
    /* !@unique */
    if (e.code === "P2002" && e.meta) {
      if (e.meta["target"] === "User_slug_key") {
        try {
          slug = slugName(name);
          const slugCount = await prisma.user.count({ where: { slug } });
          if (slugCount) slug += slugCount;
          const user = await prisma.user.create({
            data: {
              email,
              name,
              hash,
              slug,
              labIds: {
                set: [labId],
              },
            },
            select: {
              id: true,
              email: true,
              name: true,
              slug: true,
            },
          });
          await prisma.lab.update({
            where: { id: labId },
            data: { userIds: { push: user.id } },
            select: { id: true },
          });
          const userHaveLab = await login(email, password);
          return {
            access_token:
              userHaveLab instanceof ResponseError
                ? signJWT({ "sub-user": user.id, sub: user.email })
                : userHaveLab.access_token,
            user,
          };
        } catch (eIn) {
          console.error(
            new Date().toLocaleString(),
            "🙎‍♂️ \x1b[35m(src/db/User/index.ts > createUser > eIn)\x1b[0m",
            `\x1b[31m${JSON.stringify(eIn)}\x1b[0m`
          );
        }
      } else if (e.meta["target"] === "User_email_key") {
        return NotUnique("email");
      }
    }
  }
}

export async function updateUser(id: string, user: Partial<User>) {
  try {
    delete user.hash;
    delete user.id;
    delete user.createdAt;
    delete user.labIds;
    delete user.ownerIds;
    delete user.slug;

    return await prisma.user.update({
      where: { id },
      data: user,
      select: {
        id: true,
        email: true,
        name: true,
        slug: true,
      },
    });
  } catch (e) {
    console.error(
      new Date().toLocaleString(),
      "🙎‍♂️ \x1b[35m(src/db/User/index.ts > updateUser)\x1b[0m",
      `\x1b[31m${JSON.stringify(e)}\x1b[0m`
    );
    return false;
  }
}
