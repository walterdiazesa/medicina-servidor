import { DefaultSelectMany } from "../../types/select";
import { prisma } from "../handler.js";
import { hash as hashPassword } from "../../crypto/index.js";
import { NotUnique } from "../../routes/Responses/index.js";
import { signJWT } from "../../auth/index.js";
import { Lab, Prisma } from "@prisma/client";
import { isValidObjectID } from "../../utils/index.js";
import { Payload } from "../../types/Auth";
import { generateListener } from "../../pkg/index.js";
import { emit } from "../../socketio/index.js";
import { getSignedFileUrl } from "../../aws/s3.js";

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
