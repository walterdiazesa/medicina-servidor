import pkg from "@prisma/client";
const { PrismaClient } = pkg;

const _prisma = new PrismaClient();
await _prisma.$connect();
export const prisma = _prisma;
