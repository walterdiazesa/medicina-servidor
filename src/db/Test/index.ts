import { Prisma, Test } from "@prisma/client";
import axios from "axios";
import { tests } from "../../mockdata.js";
import { prisma } from "../handler.js";
import { emit } from "../../socketio/index.js";
import { DefaultSelectMany } from "../../types/select.js";
import { ListenerPayload, Payload } from "../../types/Auth/index.js";
import { parseChem } from "../../Chem/index.js";
import { ResponseError } from "../../types/Responses/error.js";

export async function getTest(id: string) {
  // if (process.env.NODE_ENV.trim() === "DEV") return tests[0];
  return await prisma.test.findUnique({ where: { id } });
}

export async function getTestAccess(id: string, user: Payload) {
  // if (process.env.NODE_ENV.trim() === "DEV") return tests[0];
  return (
    (await prisma.test.count({
      where: {
        id,
        AND: [
          {
            OR: [
              { labId: user["sub-lab"] },
              {
                lab: {
                  OR: [
                    {
                      userIds: user["sub-user"]
                        ? { has: user["sub-user"] }
                        : undefined,
                    },
                    {
                      ownerIds: user["sub-user"]
                        ? { has: user["sub-user"] }
                        : undefined,
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    })) !== 0
  );
}

export async function getTests(
  { limit, order = "asc" }: DefaultSelectMany,
  user: Payload
) {
  // if (process.env.NODE_ENV.trim() === "DEV") return tests;
  // console.log({ user });
  return await prisma.test.findMany({
    take: limit,
    orderBy: { date: order },
    where: {
      OR: [
        { labId: user["sub-lab"] },
        {
          ...(user["sub-user"] && {
            lab: {
              OR: [
                { userIds: { has: user["sub-user"] } },
                { ownerIds: { has: user["sub-user"] } },
              ],
            },
          }),
        },
      ],
    },
    include: {
      lab: {
        select: { name: true },
      },
    },
  });
}

export async function createTest(
  {
    chemData,
    issuer,
    patient,
    listenerUsername,
  }: {
    chemData: string;
    issuer: string;
    patient: string;
    listenerUsername: string;
  },
  listener: ListenerPayload
) {
  // date: new Date(), labId: req.listener.labId
  const parsedChemData = parseChem(chemData);
  if (!parsedChemData)
    return new ResponseError({ error: "Invalid chemData", key: "chemdata" });
  const test = await prisma.test.create({
    data: {
      ...parsedChemData,
      date: new Date(),
      labId: listener.labId,
      patientId: patient,
      issuerId: issuer,
    },
  });
  prisma.listenerRequest
    .create({
      data: {
        testId: test.id,
        ip: listener.ip,
        reqUsername: listenerUsername,
      },
    })
    .then(() => {});
  /* : {
      ...data,
      tests: data.tests,
    } */
  emit({ event: "test_created", to: listener.labId }, test);
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
