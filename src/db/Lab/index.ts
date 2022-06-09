import { DefaultSelectMany } from "../../types/select";
import { prisma } from "../handler.js";
import {
  emailPrivateRsaEncrypt,
  hash as hashPassword,
} from "../../crypto/index.js";
import { NotUnique } from "../../routes/Responses/index.js";
import { signJWT } from "../../auth/index.js";
import { Lab, Prisma } from "@prisma/client";
import { isValidObjectID } from "../../utils/index.js";
import { Payload } from "../../types/Auth";
import { generateListener } from "../../pkg/index.js";
import { emit } from "../../socketio/index.js";
import { getSignedFileUrl } from "../../aws/s3.js";
import { ResponseError } from "../../types/Responses/error.js";

const LISTENER_SIGNED_URL_EXPIRE = 3600;

export async function getLaboratory(lab: string) {
  const select: Prisma.LabSelect = {
    id: true,
    email: true,
    name: true,
    phone: true,
    address: true,
    publicPhone: true,
    web: true,
    publicEmail: true,
    img: true,
  };

  return isValidObjectID(lab)
    ? await prisma.lab.findUnique({ where: { id: lab }, select })
    : await prisma.lab.findFirst({
        where: { OR: [{ email: lab }, { name: lab }] },
        select,
      });
}

export async function getLaboratories(
  {
    limit,
    order = "asc",
    fields = {
      id: true,
      email: true,
      name: true,
      phone: true,
      address: true,
      publicPhone: true,
      web: true,
      publicEmail: true,
      img: true,
    },
    labFromUser = true,
  }: DefaultSelectMany & {
    fields?: Prisma.LabSelect;
    labFromUser?: boolean;
  },
  user: Payload
) {
  if (fields.hash) fields.hash = false;
  if (fields.rsaPrivateKey) fields.rsaPrivateKey = false;
  if (!user["sub-user"] && !labFromUser) return [];
  const labs = await prisma.lab.findMany({
    take: limit,
    orderBy: { id: order },
    where: {
      OR: [
        { id: labFromUser ? user["sub-lab"] : undefined },
        { ownerIds: user["sub-user"] ? { has: user["sub-user"] } : undefined },
        { userIds: user["sub-user"] ? { has: user["sub-user"] } : undefined },
      ],
    },
    select: fields,
  });

  if (fields.installer) {
    for (const lab of labs as Lab[]) {
      const labInstaller = lab["installer"];
      if (labInstaller && labInstaller !== "generating")
        lab["installer"] = await getSignedFileUrl(
          labInstaller.split("/")[0],
          labInstaller.split("/")[1],
          LISTENER_SIGNED_URL_EXPIRE
        );
    }
  }

  return labs;
}

export async function createLaboratory({
  email,
  password,
  name,
  phone,
  address,
  publicEmail,
  publicPhone,
  web,
  img,
}: {
  email: string;
  password: string;
  name: string;
  phone: string;
  address: string;
  publicPhone: string;
  web?: string;
  publicEmail: string;
  img: string;
}) {
  const hash = await hashPassword(password);
  try {
    const lab = await prisma.lab.create({
      data: {
        email,
        hash,
        name,
        phone,
        address,
        publicPhone,
        web,
        publicEmail,
        img,
        installer: "generating",
        rsaPrivateKey: "generating",
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        address: true,
        publicPhone: true,
        web: true,
        publicEmail: true,
        img: true,
      },
    });
    generateListener(lab.id).then(async ({ listenerKey, rsaPrivateKey }) => {
      if (!listenerKey || !rsaPrivateKey) return;
      await prisma.lab.update({
        data: { installer: listenerKey, rsaPrivateKey },
        where: { id: lab.id },
      });
      const signedUrl = await getSignedFileUrl(
        listenerKey.split("/")[0],
        listenerKey.split("/")[1],
        LISTENER_SIGNED_URL_EXPIRE
      );
      if (signedUrl)
        emit(
          { event: "installer_created", to: lab.id },
          { lab: lab.id, signedUrl }
        );
    });
    return {
      access_token: signJWT({ "sub-lab": lab.id, sub: lab.email }),
      lab,
    };
  } catch (e) {
    /* !@unique */
    if (e.code === "P2002" && e.meta) {
      return NotUnique(
        e.meta["target"].replace("Lab_", "").replace("_key", "")
      );
    }
  }
}

export async function upsertOwner(
  owner: string,
  labId: string,
  type: "ADD" | "REMOVE"
) {
  try {
    if (type === "REMOVE") {
      await prisma.lab.update({
        data: {
          ownerIds: {
            set: (
              await prisma.lab.findUnique({
                where: { id: labId },
                select: { ownerIds: true },
              })
            ).ownerIds.filter((ownerId) => ownerId !== owner),
          },
        },
        where: { id: labId },
        select: { id: true },
      });
      await prisma.user.update({
        data: {
          ownerIds: {
            set: (
              await prisma.user.findUnique({
                where: { id: owner },
                select: { ownerIds: true },
              })
            ).ownerIds.filter((ownerId) => ownerId !== labId),
          },
        },
        where: { id: labId },
        select: { id: true },
      });
    } else {
      await prisma.lab.update({
        data: {
          ownerIds: {
            push: owner,
          },
        },
        where: { id: labId },
        select: { id: true },
      });
      await prisma.user.update({
        data: {
          ownerIds: {
            push: labId,
          },
        },
        where: { id: owner },
        select: { id: true },
      });
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function inviteUser(user: string, labId: string) {
  const alreadyInApp = await prisma.user.findUnique({
    where: {
      email: user,
    },
  });

  if (alreadyInApp) {
    await prisma.lab.update({
      data: {
        userIds: {
          push: alreadyInApp.id,
        },
      },
      where: { id: labId },
      select: { id: true },
    });
    await prisma.user.update({
      data: {
        labIds: {
          push: labId,
        },
      },
      where: { id: alreadyInApp.id },
      select: { id: true },
    });
    return { ...alreadyInApp, owner: false };
  }

  /*
  @deprecated
  if (alreadyInLab)
    return new ResponseError({
      error: "User already a employee for this lab",
      key: "redundant",
    });
  */

  return {
    hash: emailPrivateRsaEncrypt(
      JSON.stringify({ email: user, labId, expires: Date.now() + 259_200_000 })
    ),
    length: JSON.stringify({
      email: user,
      labId,
      expires: Date.now() + 259_200_000,
    }).length,
  };
}

export async function removeUser(user: string, labId: string) {
  try {
    const { userIds, ownerIds: labOwnerIds } = await prisma.lab.findUnique({
      where: { id: labId },
      select: { ownerIds: true, userIds: true },
    });
    const { labIds, ownerIds: userOwnerIds } = await prisma.user.findUnique({
      where: { id: user },
      select: { ownerIds: true, labIds: true },
    });
    const newLabUserIds = userIds.filter((userId) => userId !== user);
    const newLabOwnerIds = labOwnerIds.filter((ownerId) => ownerId !== user);

    const newUserLabIds = labIds.filter((_labId) => _labId !== labId);
    const newUserOwnerIds = userOwnerIds.filter((_labId) => _labId !== labId);
    await prisma.lab.update({
      data: {
        ownerIds: {
          set: newLabOwnerIds,
        },
        userIds: {
          set: newLabUserIds,
        },
      },
      where: { id: labId },
      select: { id: true },
    });
    await prisma.user.update({
      data: {
        ownerIds: {
          set: newUserLabIds,
        },
        labIds: {
          set: newUserOwnerIds,
        },
      },
      where: {
        id: user,
      },
    });
    return true;
  } catch (e) {
    return false;
  }
}
