import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaProxy(): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get(_target, prop) {
      const client =
        globalForPrisma.prisma ?? (globalForPrisma.prisma = new PrismaClient());
      const value = Reflect.get(client, prop, client);
      return typeof value === "function" ? value.bind(client) : value;
    },
  });
}

export const prisma: PrismaClient = createPrismaProxy();
