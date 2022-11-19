import { Prisma, Patient } from "@prisma/client";
import { NotUnique } from "../../routes/Responses/index.js";
import { ResponseErrorDataKey } from "../../types/Responses/error.js";
import { DefaultSelectMany } from "../../types/select";
import { isValidObjectID } from "../../utils/index.js";
import { prisma } from "../handler.js";

const select: Prisma.PatientSelect = {
  id: true,
  email: true,
  name: true,
  dui: true,
  phone: true,
  sex: true,
  dateBorn: true,
};

/**
 * @deprecated use getPatient instead
 */
export async function get(patient: string) {
  if (!patient) return null;
  if (isValidObjectID(patient)) {
    const _patient = await prisma.patient.findUnique({
      where: { id: patient },
      select,
    });
    return _patient;
  }

  const _patient = await prisma.patient.findFirst({
    where: { OR: [{ email: patient }, { dui: patient }, { phone: patient }] },
    select,
  });
  if (_patient) return _patient;
  const _patients = await prisma.patient.findMany({
    where: { name: { contains: patient } },
    orderBy: { name: "asc" },
    select,
  });
  return !_patients.length ? null : _patients;
}

export async function getPatient(patient: string) {
  /* if (!patient)
    return await prisma.patient.findMany({ select, orderBy: { name: "asc" } });
  const _patients = await prisma.patient.findMany({
    where: {
      OR: [
        { email: patient },
        { dui: patient },
        { phone: patient },
        { name: { contains: patient, mode: "insensitive" } },
      ],
    },
    orderBy: { name: "asc" },
    select,
  });
  return !_patients.length ? null : _patients; */
  const _patient = await prisma.patient.findFirst({
    where: {
      OR: [
        { email: patient },
        { dui: patient },
        { phone: patient },
        // { name: { contains: patient, mode: "insensitive" } },
      ],
    },
    select,
  });
  return _patient ? [_patient] : null;
}

// Make upsert?
export async function createPatient(data: Patient) {
  delete data.id;
  try {
    return await prisma.patient.create({ data });
  } catch (e) {
    /* !@unique */
    if (e.code === "P2002" && e.meta) {
      return NotUnique(
        (e.meta["target"] as string)
          .replace("Patient_", "")
          .replace("_key", "") as ResponseErrorDataKey
      );
    }
    console.error({ e });
  }
}

export async function updatePatient(id: string, data: Patient) {
  try {
    return await prisma.patient.update({ data, where: { id } });
  } catch (e) {
    /* !@unique */
    if (e.code === "P2002" && e.meta) {
      return NotUnique(
        (e.meta["target"] as string)
          .replace("Patient_", "")
          .replace("_key", "") as ResponseErrorDataKey
      );
    }
    console.error({ e });
  }
}
