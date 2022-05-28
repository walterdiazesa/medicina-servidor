import pkg from "@prisma/client";
const { PrismaClient } = pkg;

const _prisma = new PrismaClient({
  // ...(process.env.NODE_ENV.trim() === "DEV" && { log: ["query"] }),
});
await _prisma.$connect();
export const prisma = _prisma;
