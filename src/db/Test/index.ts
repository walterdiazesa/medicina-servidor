import { Prisma } from "@prisma/client";
import { prisma } from "../handler.js";

interface TestItem {
  name: string;
  assign: string; // "=" | "<"
  value: string;
  range?: { item: number; between: { from: number; to: number } };
}

interface Test {
  labId: string;
  patientId: string;
  sex: string;
  date: Date;
  tests: TestItem[];
}

export async function getTest(id: string) {
  return await prisma.test.findUnique({ where: { id } });
}

export async function getTests(limit?: number) {
  return await prisma.test.findMany(limit ? { take: limit } : undefined);
}

export async function createTest(data: Test) {
  const json = data.tests as unknown as Prisma.JsonArray;
  return await prisma.test.create({
    data: {
      ...data,
      tests: json,
    },
  });
}
