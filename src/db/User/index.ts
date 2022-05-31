import { Prisma, User } from "@prisma/client";
import { signJWT } from "../../auth/index.js";
import { hash as hashPassword } from "../../crypto/index.js";
import { NotUnique } from "../../routes/Responses/index.js";
import { DefaultSelectMany } from "../../types/select";
import { isValidObjectID } from "../../utils/index.js";
import { prisma } from "../handler.js";
import { slug as slugName } from "./utils/slug.js";

export async function getUser(user: string) {
  const select: Prisma.UserSelect = {
    id: true,
    email: true,
    name: true,
    slug: true,
    profileImg: true,
  };
  return isValidObjectID(user)
    ? await prisma.user.findUnique({ where: { id: user }, select })
    : await prisma.user.findFirst({
        where: { OR: [{ email: user }, { slug: user }] },
        select,
      });
}

export async function getEmployee(labId: string, user: string) {
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
  return await prisma.user.findMany({
    take: limit,
    orderBy: { name: order },
    where: {
      ...(labId && {
        labIds: {
          has: labId,
        },
      }),
    },
    select: { id: true, email: true, name: true, slug: true, profileImg: true },
  });
}

export async function createUser({
  email,
  name,
  password,
  profileImg,
}: {
  email: string;
  name: string;
  password: string;
  profileImg?: string;
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
        profileImg,
      },
      select: {
        id: true,
        email: true,
        name: true,
        slug: true,
        profileImg: true,
      },
    });
    return {
      access_token: signJWT({ "sub-user": user.id, sub: user.email }),
      user,
    };
  } catch (e) {
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
              profileImg,
            },
            select: {
              id: true,
              email: true,
              name: true,
              slug: true,
              profileImg: true,
            },
          });
          return {
            access_token: signJWT({ "sub-user": user.id, sub: user.email }),
            user,
          };
        } catch (eIn) {
          console.error(eIn);
        }
      } else if (e.meta["target"] === "User_email_key") {
        return NotUnique("email");
      }
    } else {
      console.error(e);
    }
  }
}
