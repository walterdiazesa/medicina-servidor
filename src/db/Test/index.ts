import { Prisma, Test } from "@prisma/client";
import axios from "axios";
import { prisma } from "../handler.js";
import { emit } from "../../socketio/index.js";
import { DefaultSelectMany } from "../../types/select.js";
import { ListenerPayload, Payload } from "../../types/Auth/index.js";
import { parseChem } from "../../Chem/index.js";
import { ResponseError } from "../../types/Responses/error.js";
import { isValidObjectID } from "../../utils/index.js";
import { NotFound } from "../../routes/Responses/index.js";
import { emailPrivateRsaEncrypt } from "../../crypto/index.js";
import mailTransport from "../../Mail/index.js";
import { validateByRequest } from "../../Mail/Templates/validatebyrequest.js";

export async function getTest(id: string) {
  // if (process.env.NODE_ENV.trim() === "DEV") return tests[0];
  return await prisma.test.findUnique({
    where: { id },
    include: {
      lab: {
        select: {
          name: true,
          address: true,
          img: true,
          publicEmail: true,
          publicPhone: true,
          web: true,
        },
      },
      patient: {
        select: {
          name: true,
          dui: true,
          sex: true,
          dateBorn: true,
          phone: true,
          email: true,
        },
      },
      issuer: {
        select: {
          name: true,
          profileImg: true,
          slug: true,
          email: true,
        },
      },
      validator: {
        select: {
          name: true,
          profileImg: true,
          slug: true,
          email: true,
        },
      },
    },
  });
}

export async function getTestAccess(id: string, user: Payload) {
  // if (process.env.NODE_ENV.trim() === "DEV") return tests[0];
  return (
    (await prisma.test.count({
      where: {
        id,
        isDeleted: false,
        AND: [
          {
            OR: [
              {
                labId: !user["sub-lab"].length
                  ? undefined
                  : { in: user["sub-lab"] },
              },
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
        {
          labId: !user["sub-lab"].length ? undefined : { in: user["sub-lab"] },
        },
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
      isDeleted: false,
    },
    include: {
      lab: {
        select: { name: true },
      },
      patient: {
        select: { dui: true },
      },
    },
  });
}

export async function createTest(
  {
    chemData,
    listenerUsername,
  }: {
    chemData: string;
    listenerUsername: string;
  },
  listener: ListenerPayload
) {
  // return console.log({ arguments }, { listener });
  const parsedChemData = parseChem(chemData);
  if (!parsedChemData)
    return new ResponseError({ error: "Invalid chemData", key: "chemdata" });

  const test = await prisma.test.create({
    data: {
      ...parsedChemData,
      date: new Date(),
      labId: listener.labId,
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

//#region ChemTest
export async function createChemTest(
  {
    raw,
    chem,
    listenerUsername,
  }: {
    raw: string;
    chem: string;
    listenerUsername: string;
  },
  listener: ListenerPayload
) {
  return await prisma.chem.create({
    data: {
      raw,
      chem,
      ip: listener.ip,
      reqUsername: listenerUsername,
    },
  });
}
//#endregion

export async function deleteTest(id: string, user: Payload) {
  if (!(await getTestAccess(id, user)))
    return new ResponseError({
      error: "Not enough permissions for this action",
      key: "role",
    });
  return !!(await prisma.test.update({
    data: { isDeleted: true },
    where: { id },
  }));
}

export async function updateTest(
  id: string,
  data: Partial<Test>,
  user: Payload
) {
  if (!(await getTestAccess(id, user)))
    return new ResponseError({
      error: "Not enough permissions for this action",
      key: "role",
    });
  if (data.id) delete data.id;
  if (data.patientId && !isValidObjectID(data.patientId))
    return new ResponseError({ error: "Invalid field", key: "patientid" });
  if (data.issuerId && !isValidObjectID(data.issuerId))
    return new ResponseError({ error: "Invalid field", key: "issuerid" });
  if (
    data.validatorId &&
    (data.validatorId !== user["sub-user"] ||
      !isValidObjectID(data.validatorId))
  )
    return new ResponseError({ error: "Invalid field", key: "validatorid" });

  if (
    data.remark &&
    (!data.remark.hasOwnProperty("by") ||
      !data.remark.hasOwnProperty("text") ||
      user.sub !== (data.remark as any).by)
  )
    return new ResponseError({
      error: "Invalid remark format",
      key: "format",
    });

  /* const select: Prisma.TestSelect = {}
  for (const key of Object.keys(data)) select[key as keyof Test] = true */
  try {
    const searchTest = await prisma.test.findUnique({
      where: { id },
      select: { patientId: true, issuerId: true, validatorId: true },
    });
    if (!searchTest)
      return new ResponseError({ error: "Not test found", key: "id" });

    if (data.patientId && searchTest.patientId)
      return new ResponseError({
        error: "Cannot update a patient after being setted",
        key: "patientid",
      });
    if (data.issuerId && searchTest.issuerId)
      return new ResponseError({
        error: "Cannot update a issuer after being setted",
        key: "issuerid",
      });

    const test = await prisma.test.update({
      data,
      where: { id },
      ...((data["issuerId"] || data["patientId"]) && {
        include: {
          ...(data["issuerId"] && {
            issuer: {
              select: { name: true, email: true, slug: true, profileImg: true },
            },
          }),
          ...(data["patientId"] && {
            patient: {
              select: {
                id: true,
                email: true,
                name: true,
                dui: true,
                phone: true,
                sex: true,
                dateBorn: true,
              },
            },
          }),
        },
      }),
    });
    axios
      .get(`${process.env.APP_HOST}/api/revalidatetest`, {
        params: {
          test: id,
          revalidate_token: process.env.REVALIDATE_TOKEN,
        },
      })
      .then(({ status }) => {
        if (status === 500)
          console.error(`revalidation on /tests/${id} failed!`);
        if (status === 401)
          console.error(`invalid token for revalidating /tests/${id}`);
      })
      .catch((e) => {
        if (e.response.status === 500)
          console.error(`revalidation on /tests/${id} failed!`);
        if (e.response.status === 401)
          console.error(`invalid token for revalidating /tests/${id}`);
      });
    return test;
  } catch (e) {
    // if (e.code !== "P2016") P2016 = RecordNotFound
    console.error(e);
  }
}

export async function requestValidation(
  requester: Payload,
  validatorId: string,
  testId: string
) {
  const testPromise = prisma.test.findUnique({
    where: { id: testId },
    include: {
      lab: {
        select: {
          name: true,
          img: true,
          email: true,
          ownerIds: true,
          userIds: true,
        },
      },
      issuer: { select: { name: true, email: true } },
      patient: {
        select: {
          name: true,
          email: true,
          dui: true,
          sex: true,
          dateBorn: true,
          phone: true,
        },
      },
    },
  });
  const validatorPromise = prisma.user.findUnique({
    where: { id: validatorId },
    select: { name: true, email: true },
  });

  try {
    const [test, validator] = await Promise.all([
      testPromise,
      validatorPromise,
    ]);
    if (!test) return NotFound("test");
    if (!validator) return NotFound("validator");
    if (test.isDeleted)
      return new ResponseError({
        error: "Cannot update a already deleted test",
        key: "deleted",
      });

    const testLabList = new Set([
      test.lab.email,
      ...test.lab.ownerIds,
      ...test.lab.userIds,
    ]);
    if (
      !testLabList.has(requester["sub"]) &&
      !(requester["sub-user"] && !testLabList.has(requester["sub-user"])) &&
      !requester["sub-lab"].some((lab) => testLabList.has(lab))
    )
      return new ResponseError({
        error:
          "Can't request a validation on this test with your current privileges",
        key: "role",
      });

    if (!testLabList.has(validatorId))
      return new ResponseError({
        error: "The requested validator doesn't have permissions for that test",
        key: "role",
      });

    const validationByRequestHash = emailPrivateRsaEncrypt(
      JSON.stringify({ validatorId, testId, expires: Date.now() + 259_200_000 })
    );

    await mailTransport.sendMail({
      from: `"Flemik 🧪" <${process.env.MAILER_USERNAME.trim().split("|")[1]}>`,
      to: validator.email,
      subject: `"${test.lab.name}" te ha solicitado una validación`,
      html: validateByRequest({ test, validator, validationByRequestHash }),
    });

    return true;
  } catch (e) {
    console.error(e);
    return new ResponseError({
      error: "Something went wrong",
      key: e.message.toLowerCase(),
    });
  }
}

export async function validateTest(id: string, validatorId: string) {
  try {
    await prisma.test.update({
      data: { validatorId, validated: new Date() },
      where: { id },
    });

    return () =>
      axios
        .get(`${process.env.APP_HOST}/api/revalidatetest`, {
          params: {
            test: id,
            revalidate_token: process.env.REVALIDATE_TOKEN,
          },
        })
        .then(({ status }) => {
          if (status === 500)
            console.error(`revalidation on /tests/${id} failed!`);
          if (status === 401)
            console.error(`invalid token for revalidating /tests/${id}`);
        })
        .catch((e) => {
          if (e.response.status === 500)
            console.error(`revalidation on /tests/${id} failed!`);
          if (e.response.status === 401)
            console.error(`invalid token for revalidating /tests/${id}`);
        });
  } catch (e) {
    // if (e.code !== "P2016") P2016 = RecordNotFound
    console.error(e);
    return new ResponseError({
      error: "Uncatched error",
      key: e.message.toLowerCase(),
    });
  }
}
