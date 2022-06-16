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
import mailTransport from "../../Mail/index.js";
import { registerByInvite } from "../../Mail/Templates/registerbyinvite.js";

const LISTENER_SIGNED_URL_EXPIRE = 3600;

const labPublicSelect: Prisma.LabSelect = {
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

export async function getLaboratory(lab: string) {
  return isValidObjectID(lab)
    ? await prisma.lab.findUnique({
        where: { id: lab },
        select: labPublicSelect,
      })
    : await prisma.lab.findFirst({
        where: { OR: [{ email: lab }, { name: lab }] },
        select: labPublicSelect,
      });
}

export async function getLaboratories(
  {
    limit,
    order = "asc",
    fields = labPublicSelect,
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
      const [{ ownerIds: labOwnerIds }, { ownerIds: userOwnerIds }] =
        await Promise.all([
          prisma.lab.findUnique({
            where: { id: labId },
            select: { ownerIds: true },
          }),
          prisma.user.findUnique({
            where: { id: owner },
            select: { ownerIds: true },
          }),
        ]);
      const ownerIdsSet = new Set(labOwnerIds);
      ownerIdsSet.delete(owner);
      const userIdsSet = new Set(userOwnerIds);
      userIdsSet.delete(labId);
      await prisma.lab.update({
        data: {
          ownerIds: {
            set: Array.from(ownerIdsSet),
          },
        },
        where: { id: labId },
        select: { id: true },
      });
      await prisma.user.update({
        data: {
          ownerIds: {
            set: Array.from(userIdsSet),
          },
        },
        where: { id: owner },
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
    select: {
      id: true,
      name: true,
      profileImg: true,
      slug: true,
      email: true,
      labIds: true,
      ownerIds: true,
    },
  });

  if (alreadyInApp) {
    const userLabsList = new Set([
      ...alreadyInApp.ownerIds,
      ...alreadyInApp.labIds,
    ]);
    if (userLabsList.has(labId))
      return new ResponseError({
        error: "User already a employee for this lab",
        key: "redundant",
      });

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

  const invitationHash = emailPrivateRsaEncrypt(
    JSON.stringify({ email: user, labId, expires: Date.now() + 259_200_000 })
  );

  const { name, img } = await prisma.lab.findUnique({
    where: { id: labId },
    select: { name: true, img: true },
  });

  await mailTransport.sendMail({
    from: `"Flemik 🧪" <${process.env.MAILER_USERNAME.trim().split("|")[1]}>`,
    to: user,
    subject: `"${name}" te ha invitado a su laboratorio`,
    html: registerByInvite({ name, img, invitationHash }),
  });

  return true;
}

export async function removeUser(user: string, labId: string) {
  try {
    const [
      { userIds, ownerIds: labOwnerIds },
      { labIds, ownerIds: userOwnerIds },
    ] = await Promise.all([
      prisma.lab.findUnique({
        where: { id: labId },
        select: { ownerIds: true, userIds: true },
      }),
      prisma.user.findUnique({
        where: { id: user },
        select: { ownerIds: true, labIds: true },
      }),
    ]);

    const newLabUserIds = new Set(userIds);
    newLabUserIds.delete(user);
    const newLabOwnerIds = new Set(labOwnerIds);
    newLabOwnerIds.delete(user);

    const newUserLabIds = new Set(labIds);
    newUserLabIds.delete(labId);
    const newUserOwnerIds = new Set(userOwnerIds);
    newUserOwnerIds.delete(labId);

    await prisma.lab.update({
      data: {
        ownerIds: {
          set: Array.from(newLabOwnerIds),
        },
        userIds: {
          set: Array.from(newLabUserIds),
        },
      },
      where: { id: labId },
      select: { id: true },
    });
    await prisma.user.update({
      data: {
        ownerIds: {
          set: Array.from(newUserLabIds),
        },
        labIds: {
          set: Array.from(newUserOwnerIds),
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

export async function updateLab(id: string, lab: Partial<Lab>) {
  try {
    delete lab.hash;
    delete lab.id;
    delete lab.installer;
    delete lab.ownerIds;
    delete lab.rsaPrivateKey;
    delete lab.userIds;

    if (lab.img) {
      if (!lab.img.startsWith("https://public-files.s3.filebase.com/"))
        return new ResponseError({
          error: "Invalid image storage host",
          key: "storage",
        });
      lab.img = await getSignedFileUrl(
        "public-files",
        lab.img.split("/").reverse()[0],
        0
      );
    }

    return (await prisma.lab.update({
      where: { id },
      data: lab,
      select: labPublicSelect,
    })) as Lab;
  } catch (e) {
    console.error(e);
    return false;
  }
}
