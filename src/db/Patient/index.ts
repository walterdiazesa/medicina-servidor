import { Prisma, Patient } from "@prisma/client";
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
  if (!patient)
    return await prisma.patient.findMany({ select, orderBy: { name: "asc" } });
  const _patients = await prisma.patient.findMany({
    where: {
      OR: [
        { email: patient },
        { dui: patient },
        { phone: patient },
        { name: { contains: patient } },
      ],
    },
    orderBy: { name: "asc" },
    select,
  });
  return !_patients.length ? null : _patients;
}
