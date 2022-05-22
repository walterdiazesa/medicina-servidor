import { Prisma, Test } from "@prisma/client";
import axios from "axios";
import { tests } from "../../mockdata.js";
import { prisma } from "../handler.js";
import { emit } from "../../socketio/index.js";
import { DefaultSelectMany } from "../../types/select.js";

export async function getTest(id: string) {
  // if (process.env.NODE_ENV.trim() === "DEV") return tests[0];
  return await prisma.test.findUnique({ where: { id } });
}

export async function getTests({ limit, order = "asc" }: DefaultSelectMany) {
  // if (process.env.NODE_ENV.trim() === "DEV") return tests;
  return await prisma.test.findMany({
    take: limit,
    orderBy: { date: order },
  });
}

export async function createTest(data: Test) {
  const test = await prisma.test.create({
    data: {
      ...data,
      tests: data.tests,
    },
  });
  emit("test_created", test);
  axios
    .get(`${process.env.APP_HOST}/api/revalidatetest`, {
      params: {
        test: test.id,
        revalidate_token: process.env.REVALIDATE_TOKEN,
      },
    })
    .then(({ status }) => {
      if (status === 500)
        console.error(`revalidation on /tests/${test.id} failed!`);
      if (status === 401)
        console.error(`invalid token for revalidating /tests/${test.id}`);
    })
    .catch((e) => {
      if (e.response.status === 500)
        console.error(`revalidation on /tests/${test.id} failed!`);
      if (e.response.status === 401)
        console.error(`invalid token for revalidating /tests/${test.id}`);
    });
  return test;
}
