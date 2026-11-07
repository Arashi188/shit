import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { config } from "../config.js";

let prisma: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (!config.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  prisma ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: config.DATABASE_URL }) });
  return prisma;
}
