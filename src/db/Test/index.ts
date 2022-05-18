import { Prisma } from "@prisma/client";
import axios from "axios";
import { tests } from "../../mockdata.js";
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
  // if (process.env.NODE_ENV.trim() === "DEV") return tests[0];
  return await prisma.test.findUnique({ where: { id } });
}

export async function getTests({
  limit,
  order = "asc",
}: {
  limit?: number;
  order?: "asc" | "desc";
}) {
  // if (process.env.NODE_ENV.trim() === "DEV") return tests;
  return await prisma.test.findMany({
    take: limit,
    orderBy: { date: order },
  });
}

export async function createTest(data: Test) {
  const json = data.tests as unknown as Prisma.JsonArray;
  const test = await prisma.test.create({
    data: {
      ...data,
      tests: json,
    },
  });
  try {
    const { status } = await axios.get(
      `${process.env.APP_HOST}/api/revalidatetest`,
      {
        params: {
          test: test.id,
          revalidate_token: process.env.REVALIDATE_TOKEN,
        },
      }
    );
    if (status === 500)
      console.error(`revalidation on /tests/${test.id} failed!`);
    if (status === 401)
      console.error(`invalid token for revalidating /tests/${test.id}`);
  } catch (e) {
    if (e.response) {
      if (e.response.status === 500)
        console.error(`revalidation on /tests/${test.id} failed!`);
      if (e.response.status === 401)
        console.error(`invalid token for revalidating /tests/${test.id}`);
    } else {
      console.error(
        `Error on createTest, revalidating test/${test.id}`,
        e.message
      );
    }
  }
  return test;
}
